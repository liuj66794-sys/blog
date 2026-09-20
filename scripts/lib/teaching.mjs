/* 教学补充数据：仓库内集中维护的"小节 / 知识点 / 前置关系 / 结构化解析"。
   同步期把补充注入镜像 HTML（#teaching-data）并并入题目索引（questions-*.json），
   运行时与阅读版共用同一份数据；题目身份与旧解析字段（why/exp/explanation）不动。

   目录结构（scripts/data/teaching/）：
   ├── content-patches.json              已审校修正层 [{id, subject, file, reason, changes:[{from,to}]}]
   ├── zsb-english/knowledge-points.json { points: [{id, name, summary, lessonRefs, prereqs}] }
   ├── zsb-english/lessons/<lessonId>.json
   └── zsb-politics/…                     题库详解：lessons/<lessonId>.json + bank/<卷id>.json

   课级补充格式：
   {
     "lessonId": "1",
     "sections": [{ "id": "pt-1"(锚定互动页 h2 id), "title", "goal", "minutes",
                    "knowledgePoints": [kpId], "prereqs": [kpId],
                    "teaching": [讲解块…], "practiceRefs": [题目ref], "retell": "课末复述提示" }],
     "questions": { "<ref>": {…} },       ref：英语 groupId:ordinal；政治课内 mcq:N（第N道）或题库题 id
     "subjective": { "<ref>": { "keyPoints": [], "derivation": "", "selfEval": [] } }
   }

   题目补充字段（并入索引后位于 q.teaching / q.subjective，均为可选）：
   - knowledgePoints [kpId]
   - translation 整句翻译；phrases [{text, meaning}]
   - optionAnalysis [{option, verdict: correct|wrong, why}]  option：英语 0 起索引，政治字母
   - steps 分步判断；wrongPick/missedPick 政治多选错选/漏选解释
   - compareTo 对比自测题 ref；sourceContext {label, quote} 原文定位句
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TEACHING_ROOT = fileURLToPath(new URL('../data/teaching/', import.meta.url))
const SLUGS = ['zsb-english', 'zsb-politics']

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`教学补充 JSON 解析失败 ${file}：${err.message}`)
  }
}

function loadKnowledgePoints(slug) {
  const dir = path.join(TEACHING_ROOT, slug)
  const files = []
  const base = path.join(dir, 'knowledge-points.json')
  if (fs.existsSync(base)) files.push(base)
  const shardDir = path.join(dir, 'knowledge-points')
  if (fs.existsSync(shardDir)) {
    for (const f of fs.readdirSync(shardDir).filter((f) => f.endsWith('.json')).sort()) files.push(path.join(shardDir, f))
  }
  const points = []
  const seen = new Map()
  for (const file of files) {
    const data = readJson(file)
    const list = Array.isArray(data) ? data : data.points
    if (!Array.isArray(list)) throw new Error(`知识点文件缺 points 数组：${file}`)
    for (const point of list) {
      if (!point.id) throw new Error(`知识点缺 id：${file}`)
      if (seen.has(point.id)) throw new Error(`知识点 id 重复：${point.id}（${path.basename(seen.get(point.id))} 与 ${path.basename(file)}）`)
      seen.set(point.id, file)
      points.push(point)
    }
  }
  return { points }
}

function loadLessonSupplements(slug) {
  const dir = path.join(TEACHING_ROOT, slug, 'lessons')
  const out = {}
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const data = readJson(path.join(dir, f))
    if (!data.lessonId) throw new Error(`课级补充缺 lessonId：${slug}/lessons/${f}`)
    out[String(data.lessonId)] = data
  }
  return out
}

function loadBankSupplements(slug) {
  const dir = path.join(TEACHING_ROOT, slug, 'bank')
  const out = {}
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const data = readJson(path.join(dir, f))
    if (!data.paperId) throw new Error(`题库补充缺 paperId：${slug}/bank/${f}`)
    out[String(data.paperId)] = data
  }
  return out
}

/** 读取全部教学补充。缺目录/缺文件按"尚无补充"处理，保证增量推进。 */
export function loadTeachingCatalog() {
  const catalog = { patches: [], subjects: {} }
  const patchFile = path.join(TEACHING_ROOT, 'content-patches.json')
  if (fs.existsSync(patchFile)) {
    const data = readJson(patchFile)
    if (!Array.isArray(data)) throw new Error(`content-patches.json 必须是数组：${patchFile}`)
    catalog.patches = data
  }
  for (const slug of SLUGS) {
    catalog.subjects[slug] = {
      knowledgePoints: loadKnowledgePoints(slug),
      lessons: loadLessonSupplements(slug),
      bank: loadBankSupplements(slug),
    }
  }
  return catalog
}

/** 把课内补充 + 按卷题库补充合并成"题目 ref → 补充"映射（题库补充按 lessonId=卷id 对齐）。 */
export function supplementsForLesson(catalog, slug, lessonId) {
  const subject = catalog.subjects[slug]
  if (!subject) return null
  const lesson = subject.lessons[String(lessonId)]
  const bank = subject.bank[String(lessonId)]
  if (!lesson && !bank) return null
  const mergeQuestions = (dst, src) => {
    for (const [ref, q] of Object.entries(src?.questions ?? {})) dst.set(ref, { ...(dst.get(ref) ?? {}), ...q })
    for (const [ref, s] of Object.entries(src?.subjective ?? {})) {
      const prev = dst.get(ref) ?? {}
      dst.set(ref, { ...prev, subjective: s })
    }
  }
  const questions = new Map()
  mergeQuestions(questions, lesson)
  mergeQuestions(questions, bank)
  const subjective = { ...(lesson?.subjective ?? {}), ...(bank?.subjective ?? {}) }
  for (const [ref, s] of Object.entries(subjective)) {
    const prev = questions.get(ref) ?? {}
    questions.set(ref, { ...prev, subjective: s })
  }
  return {
    lessonId: String(lessonId),
    sections: lesson?.sections ?? [],
    sectionNotes: bank?.sections ?? [],
    questions,
    subjective,
  }
}

/** 题目补充键 → 真实题目 ref。支持：精确 ref、政治课内 mcq:N（1 起）。
    qa:N / anchor:xxx 锚定讲义问答块，不对应索引题目，按格式校验。 */
export function resolveQuestionRef(key, questions) {
  if (/^(qa|anchor)[:.]/.test(key)) return key
  if (questions.some((q) => q.ref === key)) return key
  const mcq = key.match(/^mcq:(\d+)$/)
  if (mcq) {
    const index = Number(mcq[1]) - 1
    const pool = questions.filter((q) => q.kind === 'choice')
    if (pool[index]) return pool[index].ref
  }
  return null
}

function checkPrereqCycles(points) {
  const ids = new Set(points.map((p) => p.id))
  const visiting = new Set(), done = new Set()
  const visit = (id, trail) => {
    if (done.has(id)) return
    if (visiting.has(id)) throw new Error(`知识点前置关系成环：${[...trail, id].join(' → ')}`)
    visiting.add(id)
    const p = points.find((x) => x.id === id)
    for (const pre of p?.prereqs ?? []) {
      if (ids.has(pre)) visit(pre, [...trail, id])
      else throw new Error(`知识点 ${id} 的前置 ${pre} 不存在`)
    }
    visiting.delete(id)
    done.add(id)
  }
  for (const p of points) visit(p.id, [])
}

/** 校验单课补充与题目的对应关系。返回错误数组（空 = 通过）。 */
export function validateSupplement(supplement, { slug, questions, knowledgePoints }) {
  const errors = []
  const kpIds = new Set(knowledgePoints.map((p) => p.id))
  const resolve = (key) => resolveQuestionRef(key, questions)
  const refError = (kind, key) => errors.push(`${slug}/${supplement.lessonId}：${kind} 引用了不存在的题目 "${key}"`)

  for (const [key, q] of supplement.questions) {
    const ref = resolve(key)
    if (!ref) { refError('questions', key); continue }
    const target = questions.find((x) => x.ref === ref)
    if (q.knowledgePoints) for (const kp of q.knowledgePoints) if (!kpIds.has(kp)) errors.push(`${slug}/${supplement.lessonId}：题 ${ref} 知识点 ${kp} 未定义`)
    if (target && q.optionAnalysis) {
      const n = target.options.length
      const seen = new Set()
      for (const oa of q.optionAnalysis) {
        const idx = slug === 'zsb-english' ? Number(oa.option) : String(oa.option).toUpperCase().charCodeAt(0) - 65
        if (!(idx >= 0 && idx < n)) errors.push(`${slug}/${supplement.lessonId}：题 ${ref} 选项解析越界 ${oa.option}`)
        else seen.add(idx)
        if (oa.verdict === 'correct' && !target.answer.includes(slug === 'zsb-english' ? String(idx) : String.fromCharCode(65 + idx))) {
          errors.push(`${slug}/${supplement.lessonId}：题 ${ref} 把非答案项标为 correct`)
        }
      }
      for (let i = 0; i < n; i++) if (!seen.has(i)) errors.push(`${slug}/${supplement.lessonId}：题 ${ref} 缺少选项 ${slug === 'zsb-english' ? i : String.fromCharCode(65 + i)} 的解析`)
    }
    if (q.compareTo && !resolve(q.compareTo)) refError(`题 ${ref} 的 compareTo`, q.compareTo)
    if (q.subjective && !q.subjective.keyPoints?.length) errors.push(`${slug}/${supplement.lessonId}：题 ${ref} subjective 缺 keyPoints`)
  }
  // subjective 可能是 Map（原样传入）或普通对象（validateSubject 合并后传入）
  const subjective = supplement.subjective instanceof Map
    ? [...supplement.subjective.entries()]
    : Object.entries(supplement.subjective ?? {})
  for (const [key] of subjective) if (!resolve(key)) refError('subjective', key)
  for (const s of supplement.sections) {
    if (!s.id || !s.title) errors.push(`${slug}/${supplement.lessonId}：小节缺 id/title`)
    if (s.practiceRefs) for (const r of s.practiceRefs) if (!resolve(r)) refError(`小节 ${s.id} 的 practiceRefs`, r)
    for (const kp of [...(s.knowledgePoints ?? []), ...(s.prereqs ?? [])]) if (!kpIds.has(kp)) errors.push(`${slug}/${supplement.lessonId}：小节 ${s.id} 知识点 ${kp} 未定义`)
  }
  return errors
}

/** 校验某科目全部补充（知识点图 + 全部课/卷）。返回错误数组。 */
export function validateSubject(catalog, slug, questionsByLesson) {
  const subject = catalog.subjects[slug]
  const errors = []
  const points = subject.knowledgePoints.points
  const dup = points.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i)
  if (dup.length) errors.push(`${slug}：知识点 id 重复 ${dup.join('、')}`)
  try { checkPrereqCycles(points) } catch (err) { errors.push(err.message) }
  for (const [lessonId, supplement] of Object.entries(subject.lessons)) {
    const questions = questionsByLesson(lessonId) ?? []
    const merged = supplementsForLesson(catalog, slug, lessonId)
    errors.push(...validateSupplement({ lessonId, sections: supplement.sections ?? [], subjective: supplement.subjective ?? {}, questions: merged.questions }, { slug, questions, knowledgePoints: points }))
  }
  for (const [paperId, supplement] of Object.entries(subject.bank)) {
    const questions = questionsByLesson(paperId) ?? []
    const merged = supplementsForLesson(catalog, slug, paperId)
    errors.push(...validateSupplement({ lessonId: paperId, sections: supplement.sections ?? [], subjective: supplement.subjective ?? {}, questions: merged.questions }, { slug, questions, knowledgePoints: points }))
  }
  return errors
}

/** 应用已审校修正层（content-patches.json）。仅对匹配 file 的 HTML 做确定性 from→to 替换。
    catalog 可注入（同步主流程加载一次后复用；缺省现读，保证单用也正确）。 */
export function applyContentPatches(html, slug, relPath, catalog = loadTeachingCatalog()) {
  const normalized = relPath.replace(/\\/g, '/')
  for (const patch of catalog.patches) {
    if (patch.absorbed) continue // 已核实在基线吸收的修正，仅留档
    if (patch.subject !== slug) continue
    const file = String(patch.file).replace(/\\/g, '/')
    if (!normalized.endsWith(file) && normalized !== file) continue
    for (const change of patch.changes ?? []) {
      if (!change.from || change.to == null) throw new Error(`内容补丁 ${patch.id} 缺 from/to`)
      if (!html.includes(change.from)) throw new Error(`内容补丁 ${patch.id} 未命中：${change.from.slice(0, 60)}…（源已变化？）`)
      html = html.split(change.from).join(change.to)
    }
  }
  return html
}

/** 注入镜像 HTML 的 #teaching-data 负载：小节 + 题目补充 + 本课涉及的知识点定义。
    resolveRef 把补充题键（如政治课内 mcq:N）解析为真实题目 ref；qa:/anchor: 锚点键原样保留。 */
export function teachingPayloadFor(catalog, slug, lessonId, knowledgePointDefs, resolveRef) {
  const merged = supplementsForLesson(catalog, slug, lessonId)
  if (!merged || (!merged.sections.length && !merged.questions.size)) return null
  const questions = {}
  for (const [ref, q] of merged.questions) {
    const key = resolveRef ? resolveRef(ref) : ref
    if (!key) throw new Error(`教学补充题键无法解析：${slug}/${lessonId} ${ref}`)
    const { subjective, ...rest } = q
    questions[key] = { ...(questions[key] ?? {}), ...rest }
    if (subjective) questions[key].subjective = subjective
  }
  return {
    version: 1,
    lessonId: merged.lessonId,
    sections: merged.sections,
    questions,
    knowledgePoints: knowledgePointDefs ?? [],
  }
}

/** 把题目补充并入索引条目（q.teaching / q.subjective；旧字段不动）。 */
export function mergeQuestionTeaching(q, supplement) {
  if (!supplement) return q
  const { subjective, ...rest } = supplement
  if (!Object.keys(rest).length && !subjective) return q
  const merged = { ...q }
  if (Object.keys(rest).length) merged.teaching = { ...(q.teaching ?? {}), ...rest }
  if (subjective) merged.subjective = subjective
  return merged
}
