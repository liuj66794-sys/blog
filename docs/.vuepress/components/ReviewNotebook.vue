<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { prepCatalog } from '../prep-catalog.mjs'
import { SUBJECTS, REVIEW_LABELS, MISTAKES_EVENT, readMistakes, migrateLegacy, recordAttempt, canGrade as validChoice, isDue, exportMistakes, importMistakes, setMistakeNote, reopenMistake, safeLessonPath, refreshQuestionDefinitions } from '../../../scripts/runtime/mistake-store.mjs'
import { readableText, readableMarkup } from '../../../scripts/runtime/lesson-mistakes.mjs'
import { REVIEW_SESSION_KEY, REVIEW_LIMITS, reviewSettings, reviewHref, filterReviewEntries, reviewOverview, createReviewSession, restoreReviewSession, reviewSessionSummary } from '../review-session.mjs'
import '../styles/review.css'

const base = __VUEPRESS_BASE__
const settings = reactive(reviewSettings())
const entries = ref({}), ready = ref(false), message = ref(''), root = ref(null), shown = ref(30)
const session = ref(null), paused = ref(false), sessionWarning = ref(''), verifiedIds = ref(new Set())
const active = computed(() => !paused.value && !session.value?.finished ? entries.value[session.value?.ids[session.value.position]] || null : null)
const draft = computed(() => active.value ? session.value.drafts[active.value.id] : null)
const summary = computed(() => reviewSessionSummary(session.value))
const all = computed(() => Object.values(entries.value))
const filtered = computed(() => filterReviewEntries(entries.value, settings))
const overview = computed(() => reviewOverview(all.value.filter(q => settings.subject === 'all' || q.slug === settings.subject)))
const hasFilters = computed(() => settings.subject !== 'all' || settings.state !== 'due' || settings.search)
const canGrade = q => verifiedIds.value.has(q.id) && validChoice(q)
const canRecall = q => verifiedIds.value.has(q.id) && q.kind === 'recall' && !q.doubt
const stemMarkup = q => q.slug === 'zsb-politics' && q.question ? readableMarkup(q.question, false) : readableMarkup(q.stemHtml || q.stem || '', Boolean(q.stemHtml) || q.legacyHtml)
const optionMarkup = (option, q) => readableMarkup(option.html || option.text, Boolean(option.html) || q.legacyHtml, true)
const explanationMarkup = q => readableMarkup(q.explanationHtml || q.explanation || '原题未附解析，请回到原课对照知识点解释原因。', Boolean(q.explanationHtml) || q.legacyHtml)
// 教学补充（q.teaching）：分步判断、逐选项解析、原文定位、翻译与词组。无补充时整块不渲染。
const markup = value => readableMarkup(typeof value === 'string' ? value : String(value ?? ''), false)
const teaching = q => (q && typeof q.teaching === 'object' && q.teaching ? q.teaching : null)
const teachingSteps = q => (Array.isArray(teaching(q)?.steps) ? teaching(q).steps : [])
const teachingOptions = q => {
  const list = teaching(q)?.optionAnalysis
  if (!Array.isArray(list)) return []
  return list.map(entry => ({
    label: q.slug === 'zsb-english' ? String.fromCharCode(65 + Number(entry?.option)) : String(entry?.option ?? '').toUpperCase(),
    verdict: entry?.verdict === 'correct' ? '正确' : '错误',
    why: markup(entry?.why || ''),
  }))
}
const teachingPhrases = q => { const list = teaching(q)?.phrases; return Array.isArray(list) ? list.filter(p => p && p.text) : [] }
const dateLabel = value => new Date(value).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
let timer, mathPromise, mounted = false, disposed = false

function refresh() { entries.value = readMistakes() }
async function updateDefinitions() {
  ready.value = false
  const verified = new Set()
  await Promise.all([...new Set(Object.values(readMistakes()).map(q => q.slug))].map(async slug => {
    try {
      const response = await fetch(`${base}learning/questions-${slug}.json`)
      if (!response.ok) throw new Error('题目资料加载失败')
      const index = await response.json()
      if (disposed) return
      if (!refreshQuestionDefinitions(index)) throw new Error('存储未允许写入')
      for (const id of Object.keys(index.entries)) verified.add(id)
    } catch { if (!disposed) message.value = '部分当前题目资料暂未加载。旧记录已保留，可回原课核对后作答。' }
  }))
  if (disposed) return
  verifiedIds.value = verified
  refresh(); ready.value = true
}
function persistSession() {
  if (!mounted) return
  try {
    if (session.value) sessionStorage.setItem(REVIEW_SESSION_KEY + ':' + base, JSON.stringify(session.value))
    else sessionStorage.removeItem(REVIEW_SESSION_KEY + ':' + base)
    sessionWarning.value = ''
  } catch { sessionWarning.value = '此浏览器暂不能保存本组进度，离开前请完成作答并保存错因。' }
}
function syncUrl() {
  if (mounted) history.replaceState(history.state, '', reviewHref(settings, base))
}
function original(q) {
  const path = safeLessonPath(q.source, base)
  const back = reviewHref(settings, base, active.value ? 'resume' : '')
  return path ? `${path}?reviewQuestion=${encodeURIComponent(q.ref)}&returnTo=${encodeURIComponent(back)}` : `${base}courses/${q.slug}/`
}
async function focusPanel(selector = '.review-practice') {
  await nextTick()
  const panel = root.value?.querySelector(selector)
  panel?.focus({ preventScroll: true }); panel?.scrollIntoView({ block: 'start' })
}
function start(items = filtered.value, context = { ...settings }) {
  if (!ready.value || !items.length) return
  session.value = createReviewSession(items, context)
  paused.value = false; message.value = ''
  persistSession(); focusPanel()
}
function resume() {
  paused.value = false
  Object.assign(settings, session.value.context)
  syncUrl(); focusPanel()
}
function advance() {
  if (!session.value) return
  if (session.value.position + 1 >= session.value.ids.length) {
    finish()
  } else { session.value.position++; focusPanel() }
}
function finish() {
  let failed = 0
  for (const id of session.value.ids) {
    const d = session.value.drafts[id]
    if (!d.noteDirty) continue
    if (setMistakeNote(id, d.note)) d.noteDirty = false
    else failed++
  }
  if (failed) { message.value = `${failed} 条错因未能保存，草稿仍在本组中，请保存或复制保留后再结束。`; return }
  session.value.finished = true; paused.value = false
  focusPanel('.review-summary')
}
function choose(value) {
  if (draft.value.submitted) return
  draft.value.picked = active.value.answer.length > 1
    ? draft.value.picked.includes(value) ? draft.value.picked.filter(v => v !== value) : [...draft.value.picked, value]
    : [value]
}
function reveal() {
  draft.value.revealed = true
  draft.value.peeked = active.value.kind !== 'recall' || !draft.value.recalled.trim()
}
function submit(recallResult) {
  const q = active.value, d = draft.value
  if (!q || d.submitted || (q.kind === 'recall' ? !canRecall(q) : (!d.picked.length || !canGrade(q)))) return
  const correct = q.kind === 'recall' ? recallResult : [...d.picked].sort().join('|') === [...q.answer].sort().join('|')
  const independent = !d.peeked && (q.kind !== 'recall' || !!d.recalled.trim())
  const saved = recordAttempt(q, { correct, independent, attemptId: `${session.value.id}:${q.id}` })
  if (!saved) { message.value = '本次记录未能保存，请检查浏览器存储权限后重试。'; return }
  refresh()
  Object.assign(d, { submitted: true, revealed: true, correct, independent })
  d.feedback = correct
    ? entries.value[q.id]?.status === 'mastered' ? '答对了，已完成两次相隔至少 24 小时的独立复测。'
      : independent ? '答对了。已安排后续复测，隔天再检验一次。' : '已完成订正。先看答案的作答不计独立复测，隔天再试一次。'
    : '这次仍需巩固。对照解析说清原因，再回原课重练。'
  message.value = ''; persistSession()
}
function saveNote() {
  const saved = setMistakeNote(active.value.id, draft.value.note)
  if (saved) draft.value.noteDirty = false
  message.value = saved ? '错因笔记已保存。' : '笔记未能保存，请复制保留。'
}
function restartUnanswered() {
  start(session.value.ids.filter(id => !session.value.drafts[id].submitted).map(id => entries.value[id]).filter(Boolean), session.value.context)
}
function clearFilters() { Object.assign(settings, { subject: 'all', state: 'due', search: '' }) }
function download() {
  const url = URL.createObjectURL(new Blob([exportMistakes()], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `知序错题-${new Date().toISOString().slice(0, 10)}.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000); message.value = '错题备份已生成，包含已保存的错因笔记和复习状态。'
}
async function upload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 8000000) throw new Error('文件超过 8 MB。')
    const added = importMistakes(await file.text(), undefined, base)
    message.value = `已合并 ${added} 条记录，保留本机较新的记录。`
    await updateDefinitions()
    if (session.value) session.value = restoreReviewSession(JSON.stringify(session.value), entries.value, base)
  } catch (error) { message.value = error.message }
  event.target.value = ''
}
async function renderMath() {
  await nextTick()
  if (!root.value || !all.value.some(q => q.slug === 'zsb-math')) return
  const dir = `${base}lessons/zsb-math/assets/katex/`
  const script = src => new Promise((resolve, reject) => { const el = document.createElement('script'); el.src = src; el.onload = resolve; el.onerror = reject; document.head.append(el) })
  if (!mathPromise) mathPromise = (async () => {
    if (!document.querySelector('[data-review-math-css]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = dir + 'katex.min.css'; css.dataset.reviewMathCss = ''; document.head.append(css) }
    if (!window.katex) await script(dir + 'katex.min.js')
    if (!window.renderMathInElement) await script(dir + 'contrib/auto-render.min.js')
  })()
  try { await mathPromise; root.value?.querySelectorAll('.review-math').forEach(el => window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }], throwOnError: false, trust: false })) }
  catch { /* Keep the original TeX readable if local math assets cannot load. */ }
}
function onHistory() { Object.assign(settings, reviewSettings(location.search, base)) }
watch([active, () => draft.value?.revealed, filtered, shown], renderMath)
watch(session, persistSession, { deep: true, flush: 'sync' })
watch(settings, () => { shown.value = 30; syncUrl() })
onMounted(async () => {
  Object.assign(settings, reviewSettings(location.search, base))
  const action = { practice: settings.practice, resume: settings.resume }
  const migration = migrateLegacy(undefined, prepCatalog, base)
  if (!migration.saved) message.value = '浏览器未能保存迁移记录，旧错题仍保留在原位置。'
  refresh(); await updateDefinitions()
  if (disposed) return
  try { session.value = restoreReviewSession(sessionStorage.getItem(REVIEW_SESSION_KEY + ':' + base), entries.value, base) } catch {}
  mounted = true
  settings.practice = false; settings.resume = false; syncUrl()
  if (session.value && !session.value.finished) {
    paused.value = !action.resume
    if (action.resume) Object.assign(settings, session.value.context)
    if (action.practice) message.value = '还有上次未完成的一组。可以接着做，或结束本组后按这次的任务量开始。'
    if (!paused.value) focusPanel()
    if (session.value.revised) message.value = '部分题目资料有更新，对应作答已重新开始，错因草稿已保留。'
  } else if (action.practice) start()
  window.addEventListener('storage', refresh); window.addEventListener(MISTAKES_EVENT, refresh)
  window.addEventListener('l1uj:backup-imported', updateDefinitions); window.addEventListener('popstate', onHistory)
  timer = setInterval(refresh, 60000)
})
onUnmounted(() => {
  disposed = true; mounted = false; clearInterval(timer)
  window.removeEventListener('storage', refresh); window.removeEventListener(MISTAKES_EVENT, refresh)
  window.removeEventListener('l1uj:backup-imported', updateDefinitions); window.removeEventListener('popstate', onHistory)
})
</script>

<template>
  <div ref="root" class="review-notebook">
    <header class="review-hero">
      <div><p class="review-eyebrow">练习之后 · 再向前一步</p><p class="review-lead">把答错的一题，<br>变成下次会做的一题。</p>
        <p class="review-muted">先独立回忆，再看解析。从一小组开始，把薄弱点逐个补齐。</p>
        <a v-if="settings.returnTo" :href="settings.returnTo" class="review-back">← 返回原学习任务</a>
      </div>
      <div class="review-overview" :aria-label="(SUBJECTS[settings.subject] || '全部科目') + '复习概况'">
        <div><strong>{{ overview.due }}</strong><span>现在可复习</span></div>
        <div><strong>{{ overview.scheduled }}</strong><span>等待后续复测</span></div>
        <div><strong>{{ overview.mastered }}</strong><span>已巩固</span></div>
      </div>
    </header>
    <p v-if="message" class="review-message" role="status">{{ message }}</p>
    <p v-if="sessionWarning" class="review-message" role="status">{{ sessionWarning }}</p>
    <section v-if="session && !session.finished && paused" class="review-resume" aria-label="未完成的复习">
      <div><strong>接着上次这一组</strong><p>已作答 {{ summary.answered }} / {{ summary.total }} 题，停在第 {{ session.position + 1 }} 题。选项、回忆和错因草稿已保留。</p></div>
      <div class="review-actions"><button class="review-primary" @click="resume">继续本组 →</button><button @click="finish">结束本组</button></div>
    </section>
    <section v-if="active" class="review-practice" tabindex="-1" aria-label="错题复测">
      <div class="review-row"><span>{{ SUBJECTS[active.slug] }} · 第 {{ session.position + 1 }} / {{ session.ids.length }} 题</span><div class="review-actions"><button @click="paused = true">暂停，稍后继续</button><button @click="finish">结束本组</button></div></div>
      <progress class="review-progress" :value="summary.answered" :max="summary.total" :aria-label="'本组已作答 ' + summary.answered + ' / ' + summary.total + ' 题'" />
      <p class="review-muted">章节：{{ active.chapter || active.title }}<span v-if="active.answer.length > 1"> · 多选题，请选全后提交</span></p>
      <h2 class="review-math review-question" v-html="stemMarkup(active)" />
      <p v-if="active.sourceLabel" class="review-muted">答案来源：{{ active.sourceLabel }}</p>
      <div v-if="canGrade(active)" class="review-options" role="group" aria-label="答案选项">
        <button v-for="(option, i) in active.options" :key="option.value" :disabled="draft.submitted" :aria-pressed="draft.picked.includes(option.value)" @click="choose(option.value)">
          <span class="review-option-letter">{{ String.fromCharCode(65 + i) }}</span><span class="review-math" v-html="optionMarkup(option, active)" />
        </button>
      </div>
      <label v-else-if="canRecall(active)">先不看答案，用自己的话回忆<textarea v-model="draft.recalled" :disabled="draft.revealed" maxlength="4000" placeholder="先写一句解释，再核对参考答案" /></label>
      <p v-else class="review-message">{{ active.contextRequired ? '这道题需要结合原课的完整材料。请回原课作答，结果仍会同步到错题本。' : '这条记录暂缺可靠题目资料，请回原课核对；暂不自动判分。' }}</p>
      <div class="review-actions">
        <button v-if="canGrade(active)" class="review-primary" :disabled="draft.submitted || !draft.picked.length" @click="submit()">提交答案</button>
        <button v-if="!draft.revealed && (canGrade(active) || canRecall(active))" @click="reveal">{{ active.kind === 'recall' ? '核对回忆' : '先看解析' }}</button>
        <a :href="original(active)">回原课重新作答 →</a>
      </div>
      <div v-if="draft.revealed" class="review-explanation">
        <div v-if="teaching(active)" class="review-teaching">
          <p v-if="teachingSteps(active).length" class="review-muted">分步判断</p>
          <ol v-if="teachingSteps(active).length" class="review-teaching-steps"><li v-for="(step, i) in teachingSteps(active)" :key="i" class="review-math" v-html="markup(step)" /></ol>
          <p v-if="teaching(active).wrongPick" class="review-math review-teaching-picked" v-html="markup(teaching(active).wrongPick)" />
          <p v-if="teaching(active).missedPick" class="review-math review-teaching-missed" v-html="markup(teaching(active).missedPick)" />
          <details v-if="teachingOptions(active).length" class="review-teaching-options">
            <summary>逐选项解析</summary>
            <ul><li v-for="item in teachingOptions(active)" :key="item.label + item.verdict"><span class="review-teaching-option">{{ item.label }}（{{ item.verdict }}）</span><span class="review-math" v-html="item.why" /></li></ul>
          </details>
          <blockquote v-if="teaching(active).sourceContext && teaching(active).sourceContext.quote" class="review-teaching-source">
            <p class="review-muted">原文定位{{ teaching(active).sourceContext.label ? ' · ' + teaching(active).sourceContext.label : '' }}</p>
            <p class="review-math" v-html="markup(teaching(active).sourceContext.quote)" />
          </blockquote>
          <p v-if="teaching(active).translation" class="review-math"><strong>整句翻译：</strong><span v-html="markup(teaching(active).translation)" /></p>
          <ul v-if="teachingPhrases(active).length" class="review-teaching-phrases"><li v-for="(phrase, i) in teachingPhrases(active)" :key="i" class="review-math"><strong>{{ phrase.text }}</strong> <span v-html="markup(phrase.meaning || '')" /></li></ul>
        </div>
        <p v-if="active.answer.length && canGrade(active)" class="review-math"><strong>参考答案：</strong>{{ active.options.filter(o => active.answer.includes(o.value)).map(o => readableText(o.text, active.legacyHtml)).join('；') }}</p>
        <p class="review-math" v-html="explanationMarkup(active)" />
        <p v-if="!draft.submitted" class="review-muted">{{ draft.peeked ? '已查看答案，这次作答用于订正，不计入独立复测。' : '对照刚才写下的回忆，诚实判断是否正确。回忆卡以自评记录。' }}</p>
        <div v-if="canRecall(active) && !draft.submitted" class="review-actions"><button @click="submit(true)">自评：回忆正确</button><button @click="submit(false)">自评：还没记住</button></div>
      </div>
      <p v-if="draft.feedback" class="review-message" role="status">{{ draft.feedback }}</p>
      <details class="review-note" :open="Boolean(draft.note)">
        <summary>记录这次的错因</summary>
        <label>我错在哪里，下次怎样判断？<textarea v-model="draft.note" @input="draft.noteDirty = true" maxlength="2000" placeholder="例如：忘了定义域；把必要条件当成充分条件……" /></label>
        <div class="review-actions"><button @click="saveNote">保存错因</button><span class="review-muted">草稿随本组保留，结束本组时保存到错题本。</span></div>
      </details>
      <div class="review-practice-footer">
        <p class="review-muted">{{ sessionWarning ? '本组暂不能续做，请在离开前保存错因。' : '本组进度保留在此标签页，刷新或回原课后可继续。' }}</p>
        <button :class="{ 'review-primary': draft.submitted }" @click="advance">{{ draft.submitted ? session.position + 1 < session.ids.length ? '下一题 →' : '查看本组结果' : session.position + 1 < session.ids.length ? '暂时跳过 →' : '跳过并查看结果' }}</button>
      </div>
    </section>
    <section v-if="session?.finished" class="review-summary" tabindex="-1" aria-label="本组复习结果">
      <p class="review-eyebrow">本组回顾</p><h2>{{ summary.answered === summary.total ? '这一组，认真练过了。' : '先停在这里，也记清下一步。' }}</h2>
      <div class="review-summary-grid"><div><strong>{{ summary.answered }} / {{ summary.total }}</strong><span>已作答</span></div><div><strong>{{ summary.correct }}</strong><span>本次答对 / 自评正确</span></div><div><strong>{{ summary.incorrect }}</strong><span>仍需巩固</span></div><div><strong>{{ summary.skipped }}</strong><span>尚未作答</span></div></div>
      <p class="review-muted">本次结果不等于已经掌握。两次相隔至少 24 小时的独立复测通过后，错题才记为“已巩固”；当天订正和看答案后作答不会提前升级。</p>
      <div class="review-actions"><button v-if="summary.skipped" class="review-primary" @click="restartUnanswered">继续未答的 {{ summary.skipped }} 题</button><button v-if="filtered.length" @click="start()">再练一组</button><a v-if="settings.returnTo" :href="settings.returnTo">返回原学习任务 →</a><a :href="base + 'courses/'">去学下一课 →</a></div>
    </section>
    <section class="review-library" aria-label="错题筛选与练习">
      <div class="review-library-heading"><div><p class="review-eyebrow">我的错题库</p><h2>找到这次要巩固的题</h2></div><span class="review-muted">累计 {{ all.length }} 道 · 保存在此浏览器</span></div>
      <div class="review-filters">
        <label>科目<select v-model="settings.subject" aria-label="科目"><option value="all">全部科目</option><option v-for="(label, slug) in SUBJECTS" :key="slug" :value="slug">{{ label }}</option></select></label>
        <label>复习状态<select v-model="settings.state" aria-label="复习状态"><option value="due">现在可复习</option><option value="all">全部记录</option><option v-for="(label, key) in REVIEW_LABELS" :key="key" :value="key">{{ label }}</option></select></label>
        <label class="review-search">找题目或错因<input v-model="settings.search" type="search" maxlength="200" placeholder="知识点、题干、错因" /></label>
      </div>
      <div class="review-start-row">
        <fieldset class="review-size"><legend>本次练几题</legend><div><button v-for="size in REVIEW_LIMITS" :key="size" :aria-pressed="settings.limit === size" @click="settings.limit = size">{{ size }} 题</button></div></fieldset>
        <button class="review-primary" :disabled="!ready || !filtered.length || Boolean(session && !session.finished)" @click="start()">开始复习 {{ Math.min(settings.limit, filtered.length) }} 题 →</button>
      </div>
      <div class="review-row"><p class="review-muted" role="status">{{ ready ? '找到 ' + filtered.length + ' 道错题' : '正在读取此浏览器的学习记录…' }}</p><button v-if="hasFilters" class="review-text-button" @click="clearFilters">清除筛选</button></div>
      <p v-if="session && !session.finished" class="review-muted">先继续当前这一组；完成后可以更换科目和任务量开始新一组。</p>
      <div v-if="ready && !filtered.length" class="review-empty">
        <h3>{{ !all.length ? '从第一次认真尝试开始' : !hasFilters && overview.scheduled ? '今天的到期复习已处理' : '这个筛选下暂时没有题目' }}</h3>
        <p>{{ !all.length ? '在四科互动课里认真作答，答错的题目会自动收进这里。' : overview.nextAt ? '下一批复测安排在 ' + dateLabel(overview.nextAt) + '，现在可以继续学习或查看全部记录。' : '可以清除筛选，或查看已巩固的题目。' }}</p>
        <div class="review-actions"><button v-if="all.length" @click="settings.state = 'all'; settings.search = ''">查看全部记录</button><a :href="base + 'courses/'">去选一节课 →</a></div>
      </div>
      <ol class="review-list"><li v-for="q in filtered.slice(0, shown)" :key="q.id">
        <div class="review-row"><span class="review-badge">{{ SUBJECTS[q.slug] }} · {{ REVIEW_LABELS[q.status] }}</span><span>曾错 {{ q.wrongs }} 次</span></div>
        <h3 class="review-math review-question" v-html="stemMarkup(q)" /><p class="review-muted">{{ q.title }}<span v-if="q.status === 'scheduled' && !isDue(q)"> · {{ dateLabel(q.dueAt) }} 复测</span></p><p v-if="q.note" class="review-saved-note">错因：{{ q.note }}</p>
        <div class="review-actions"><button :disabled="!ready || Boolean(session && !session.finished)" @click="start([q])">{{ q.kind === 'recall' ? '回忆自测' : '重新作答' }}</button><a :href="original(q)">回原课</a><button v-if="q.status === 'mastered'" @click="reopenMistake(q.id); refresh()">仍需巩固</button></div>
      </li></ol>
      <button v-if="filtered.length > shown" @click="shown += 30">继续显示更多错题</button>
    </section>
    <details class="review-backup"><summary>备份与复习规则</summary>
      <p class="review-muted">当场选对算订正；两次相隔至少 24 小时的独立复测通过后记为“已巩固”。回忆卡采用自评。换设备前请导出备份；本组草稿仅保留在当前标签页，不包含在备份中。</p>
      <div class="review-actions"><button @click="download">导出错题</button><label class="review-file">导入错题<input type="file" accept=".json,application/json" @change="upload" /></label><a :href="base + 'prep/#study-backup'">全部学习备份</a></div>
    </details>
  </div>
</template>
