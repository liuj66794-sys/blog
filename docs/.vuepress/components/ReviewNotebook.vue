<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { prepCatalog } from '../prep-catalog.mjs'
import { SUBJECTS, REVIEW_LABELS, MISTAKES_EVENT, readMistakes, migrateLegacy, recordAttempt, canGrade as validChoice, isDue, exportMistakes, importMistakes, setMistakeNote, reopenMistake, safeLessonPath, refreshQuestionDefinitions } from '../../../scripts/runtime/mistake-store.mjs'
import { readableText } from '../../../scripts/runtime/lesson-mistakes.mjs'

const base = __VUEPRESS_BASE__
const entries = ref({}), ready = ref(false), subject = ref('all'), state = ref('due'), search = ref(''), message = ref('')
const active = ref(null), picked = ref([]), feedback = ref(''), revealed = ref(false), peeked = ref(false), submitted = ref(false), note = ref(''), recalled = ref('')
const queue = ref([]), position = ref(0), root = ref(null)
const verifiedIds = ref(new Set())
const canGrade = q => verifiedIds.value.has(q.id) && validChoice(q)
const canRecall = q => verifiedIds.value.has(q.id) && q.kind === 'recall'
const optionText = (option, q) => readableText(option.text, q.legacyHtml).replace(/^[A-Z][.、．]\s+/i, '')
let timer, mathPromise
function refresh() { entries.value = readMistakes() }
async function updateDefinitions() {
  ready.value = false
  verifiedIds.value = new Set()
  for (const slug of new Set(Object.values(readMistakes()).map(q => q.slug))) {
    try {
      const response = await fetch(`${base}learning/questions-${slug}.json`)
      if (!response.ok) throw new Error('题目资料加载失败')
      const index = await response.json()
      if (!refreshQuestionDefinitions(index)) throw new Error('存储未允许写入')
      for (const id of Object.keys(index.entries)) verifiedIds.value.add(id)
    } catch { message.value = '部分当前题目资料暂未加载。旧记录已保留，可回原课核对后作答。' }
  }
  refresh(); ready.value = true
}
const all = computed(() => Object.values(entries.value))
const filtered = computed(() => all.value.filter(q => (subject.value === 'all' || q.slug === subject.value)
  && (state.value === 'all' || (state.value === 'due' ? isDue(q) : q.status === state.value))
  && `${q.stem} ${q.title} ${q.note || ''}`.toLowerCase().includes(search.value.trim().toLowerCase()))
  .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0) || b.wrongs - a.wrongs))
const shown = ref(30)
const counts = computed(() => ({ due: all.value.filter(q => isDue(q)).length, mastered: all.value.filter(q => q.status === 'mastered').length }))
const text = q => readableText(q.stem || '', q.legacyHtml)
function original(q) {
  const path = safeLessonPath(q.source, base)
  return path ? `${path}?reviewQuestion=${encodeURIComponent(q.ref)}&returnTo=${encodeURIComponent(base + 'review/')}` : `${base}courses/${q.slug}/`
}
function start(items) {
  queue.value = items.map(q => q.id); position.value = 0; openCurrent()
}
function openCurrent() {
  active.value = entries.value[queue.value[position.value]] || null
  picked.value = []; feedback.value = ''; revealed.value = false; peeked.value = false; submitted.value = false; recalled.value = ''
  note.value = active.value?.note || ''
  nextTick(() => { const panel = root.value?.querySelector('.review-practice'); panel?.focus(); panel?.scrollIntoView({ block: 'start' }) })
}
function next() { if (++position.value >= queue.value.length) { active.value = null; message.value = '本组复习完成，待复测的题目已安排好。' } else openCurrent() }
function choose(value) {
  if (submitted.value) return
  if (active.value.answer.length > 1) picked.value = picked.value.includes(value) ? picked.value.filter(v => v !== value) : [...picked.value, value]
  else picked.value = [value]
}
function submit(recallResult) {
  const q = active.value
  if (!q || submitted.value || (q.kind === 'recall' ? !canRecall(q) : (!picked.value.length || !canGrade(q)))) return
  const correct = q.kind === 'recall' ? recallResult : [...picked.value].sort().join('|') === [...q.answer].sort().join('|')
  const independent = q.kind === 'recall' ? !!recalled.value.trim() : !peeked.value
  const saved = recordAttempt(q, { correct, independent, attemptId: crypto.randomUUID() })
  submitted.value = true; revealed.value = true
  feedback.value = !saved ? '本次记录未能保存，请保留备份并检查浏览器存储权限。'
    : correct ? (entries.value[q.id]?.status === 'mastered' ? '答对了，已完成两次相隔至少 24 小时的独立复测。' : '答对了。已安排后续复测，隔天再检验一次。')
      : '这次仍需巩固。先对照解析说清原因，再回原课重练。'
  refresh()
}
function saveNote() { message.value = setMistakeNote(active.value.id, note.value) ? '错因笔记已保存。' : '笔记未能保存，请复制保留。' }
function download() {
  const url = URL.createObjectURL(new Blob([exportMistakes()], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `知序错题-${new Date().toISOString().slice(0, 10)}.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000); message.value = '错题备份已生成，包含错因笔记和复习状态。'
}
async function upload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 8000000) throw new Error('文件超过 8 MB。')
    const added = importMistakes(await file.text(), undefined, base)
    message.value = `已合并 ${added} 条记录，保留本机较新的记录。`; active.value = null; refresh()
    await updateDefinitions()
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
  catch { /* Keep readable original TeX if local math assets cannot load. */ }
}
watch([active, revealed, filtered], renderMath)
watch([subject, state, search], () => {
  shown.value = 30
  if (!ready.value) return
  const url = new URL(location.href)
  for (const [key, val] of [['subject', subject.value], ['state', state.value], ['q', search.value]]) val ? url.searchParams.set(key, val) : url.searchParams.delete(key)
  history.replaceState(history.state, '', url.pathname + url.search)
})
onMounted(async () => {
  const params = new URLSearchParams(location.search)
  subject.value = SUBJECTS[params.get('subject')] ? params.get('subject') : 'all'
  state.value = ['due', 'all', ...Object.keys(REVIEW_LABELS)].includes(params.get('state')) ? params.get('state') : 'due'
  search.value = params.get('q') || ''
  const migration = migrateLegacy(undefined, prepCatalog, base)
  if (!migration.saved) message.value = '浏览器未能保存迁移记录，旧错题仍保留在原位置。'
  refresh(); await updateDefinitions()
  window.addEventListener('storage', refresh); window.addEventListener(MISTAKES_EVENT, refresh); window.addEventListener('l1uj:backup-imported', refresh)
  timer = setInterval(refresh, 60000)
})
onUnmounted(() => { clearInterval(timer); window.removeEventListener('storage', refresh); window.removeEventListener(MISTAKES_EVENT, refresh); window.removeEventListener('l1uj:backup-imported', refresh) })
</script>

<template>
  <div ref="root" class="review-notebook">
    <p class="review-lead">把答错的一题，变成下一次能独立解决的一题。</p>
    <div class="review-overview"><span><strong>{{ all.length }}</strong> 道历史错题</span><span><strong>{{ counts.due }}</strong> 道现在可复习</span><span><strong>{{ counts.mastered }}</strong> 道已巩固</span></div>
    <p class="review-muted">当场选对算订正；两次相隔至少 24 小时的独立复测通过后记为“已巩固”。回忆卡采用自评，记录保存在此浏览器。</p>
    <div class="review-filters">
      <label>科目<select v-model="subject" aria-label="科目"><option value="all">全部科目</option><option v-for="(label, slug) in SUBJECTS" :key="slug" :value="slug">{{ label }}</option></select></label>
      <label>复习状态<select v-model="state" aria-label="复习状态"><option value="due">现在可复习</option><option value="all">全部记录</option><option v-for="(label, key) in REVIEW_LABELS" :key="key" :value="key">{{ label }}</option></select></label>
      <label class="review-search">找题目或错因<input v-model="search" type="search" placeholder="知识点、题干、错因" /></label>
    </div>
    <div class="review-actions"><button class="review-primary" :disabled="!ready || !filtered.length" @click="start(filtered.slice(0, 5))">复习 {{ Math.min(5, filtered.length) }} 题</button><button @click="download">导出错题</button><label class="review-file">导入错题<input type="file" accept=".json,application/json" @change="upload" /></label><a :href="`${base}prep/#study-backup`">全部学习备份</a></div>
    <p v-if="message" class="review-message" role="status">{{ message }}</p>
    <section v-if="active" class="review-practice" tabindex="-1" aria-label="错题复测">
      <div class="review-row"><span>{{ SUBJECTS[active.slug] }} · 第 {{ position + 1 }} / {{ queue.length }} 题</span><button @click="active = null">结束本组</button></div>
      <h2 class="review-math">{{ text(active) }}</h2>
      <p class="review-muted">{{ active.title }}<span v-if="active.answer.length > 1"> · 多选题，请选全后提交</span></p>
      <p v-if="active.sourceLabel" class="review-muted">答案来源：{{ active.sourceLabel }}</p>
      <div v-if="canGrade(active)" class="review-options" role="group" aria-label="答案选项"><button v-for="(option, i) in active.options" :key="option.value" :disabled="submitted" :aria-pressed="picked.includes(option.value)" @click="choose(option.value)"><span>{{ String.fromCharCode(65 + i) }}.</span><span class="review-math">{{ optionText(option, active) }}</span></button></div>
      <label v-else-if="canRecall(active)">先不看答案，用自己的话回忆<textarea v-model="recalled" :disabled="revealed" placeholder="先写一句解释，再核对参考答案" /></label>
      <p v-else class="review-muted">{{ active.contextRequired ? '这道题需要结合原课的完整材料。请回原课作答，结果仍会同步到错题本。' : '这条记录没有完整题目或可靠答案，请回原课核对；暂不自动判分。' }}</p>
      <div class="review-actions"><button v-if="canGrade(active)" class="review-primary" :disabled="submitted || !picked.length" @click="submit()">提交答案</button><button v-if="!revealed && (canGrade(active) || canRecall(active))" @click="revealed = true; peeked = true">{{ active.kind === 'recall' ? '核对回忆' : '先看解析' }}</button><a :href="original(active)">回原课重新作答 →</a></div>
      <div v-if="revealed" class="review-explanation"><p v-if="active.answer.length && canGrade(active)" class="review-math"><strong>参考答案：</strong>{{ active.options.filter(o => active.answer.includes(o.value)).map(o => readableText(o.text, active.legacyHtml)).join('；') }}</p><p class="review-math">{{ readableText(active.explanation || '原题未附解析，请回到原课对照知识点解释原因。', active.legacyHtml) }}</p><p v-if="!submitted" class="review-muted">已查看答案，这次作答用于订正，不计入独立复测。</p><div v-if="canRecall(active) && !submitted" class="review-actions"><button @click="submit(true)">自评：回忆正确</button><button @click="submit(false)">自评：还没记住</button></div></div>
      <p v-if="feedback" class="review-message" role="status">{{ feedback }}</p>
      <label>我错在哪里，下次怎样判断？<textarea v-model="note" maxlength="2000" placeholder="例如：忘了定义域；把必要条件当成充分条件……" /></label>
      <div class="review-actions"><button @click="saveNote">保存错因</button><button @click="next">{{ position + 1 < queue.length ? '下一题 →' : '完成本组' }}</button></div>
    </section>
    <p class="review-muted" role="status">{{ ready ? `找到 ${filtered.length} 道错题` : '正在读取此浏览器的学习记录…' }}</p>
    <div v-if="ready && !filtered.length" class="review-empty"><h2>{{ all.length ? '这个筛选下暂时没有题目' : '从第一次认真尝试开始' }}</h2><p>{{ all.length ? '切换到“全部记录”可查看后续复测和已巩固的题。' : '在四科互动课里答错，题目会自动来到这里。已有旧错题会合并，原记录保留。' }}</p><a :href="`${base}courses/`">去选一节课 →</a></div>
    <ol class="review-list"><li v-for="q in filtered.slice(0, shown)" :key="q.id"><div class="review-row"><span>{{ SUBJECTS[q.slug] }} · {{ REVIEW_LABELS[q.status] }}</span><span>曾错 {{ q.wrongs }} 次</span></div><h3 class="review-math">{{ text(q) }}</h3><p class="review-muted">{{ q.title }}<span v-if="q.status === 'scheduled' && !isDue(q)"> · {{ new Date(q.dueAt).toLocaleDateString('zh-CN') }} 复测</span></p><p v-if="q.note">错因：{{ q.note }}</p><div class="review-actions"><button @click="start([q])">{{ q.kind === 'recall' ? '回忆自测' : '重新作答' }}</button><a :href="original(q)">回原课</a><button v-if="q.status === 'mastered'" @click="reopenMistake(q.id); refresh()">仍需巩固</button></div></li></ol>
    <button v-if="filtered.length > shown" @click="shown += 30">继续显示更多错题</button>
  </div>
</template>

<style>
.review-notebook{color:var(--vp-c-text-1);--review-line:var(--vp-c-divider);--review-panel:var(--vp-c-bg-soft);--review-accent:var(--vp-c-brand-1)}
.review-notebook p,.review-notebook h3{overflow-wrap:anywhere}.review-lead{font-size:20px}.review-muted{color:var(--vp-c-text-2);font-size:14px;line-height:1.8}.review-overview{display:flex;flex-wrap:wrap;gap:16px 30px;padding:22px;background:var(--review-panel);border-radius:12px}.review-overview strong{font-size:27px;color:var(--review-accent)}
.review-filters{display:flex;flex-wrap:wrap;gap:14px;margin:24px 0}.review-notebook label{display:grid;gap:7px;font-size:14px}.review-search{flex:1;min-width:160px}.review-notebook :is(input,select,textarea){box-sizing:border-box;min-height:44px;width:100%;border:1px solid var(--review-line);border-radius:7px;background:var(--vp-c-bg);color:inherit;padding:10px;font:inherit}.review-notebook textarea{min-height:90px;resize:vertical}.review-notebook :is(button,a,input,textarea,select):focus-visible{outline:3px solid var(--review-accent);outline-offset:3px}.review-notebook button,.review-file{min-height:44px;padding:9px 14px;border:1px solid var(--review-line);border-radius:7px;background:var(--vp-c-bg);color:inherit;font:inherit;cursor:pointer}.review-notebook button:disabled{opacity:.6;cursor:default}.review-notebook .review-primary{background:var(--vp-c-brand-1);color:var(--vp-c-bg)}
.review-actions,.review-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px}.review-actions{margin:16px 0}.review-actions a{display:inline-flex;align-items:center;min-height:44px}.review-row{justify-content:space-between;color:var(--vp-c-text-2);font-size:13px}.review-file{position:relative;display:inline-flex!important;align-items:center}.review-file:focus-within{outline:3px solid var(--review-accent)}.review-file input{position:absolute;inset:0;opacity:0;cursor:pointer}
.review-practice{padding:24px;margin:24px 0;border:2px solid var(--review-accent);border-radius:12px;scroll-margin-top:85px}.review-practice h2{border:0;margin-top:20px;font-size:21px}.review-options{display:grid;gap:10px}.review-options button{text-align:left;display:flex;gap:14px;white-space:pre-wrap;overflow-wrap:anywhere}.review-options button[aria-pressed=true]{background:var(--vp-c-brand-soft);border-color:var(--review-accent)}.review-explanation,.review-message{padding:14px 18px;background:var(--review-panel);border-left:3px solid var(--review-accent);border-radius:6px;white-space:pre-wrap}.review-list{padding:0!important;list-style:none!important;display:grid;gap:18px}.review-list>li{border:1px solid var(--review-line);border-radius:12px;padding:20px;margin:0!important}.review-list h3{font-size:17px;margin:12px 0;line-height:1.8}.review-empty{padding:28px;background:var(--review-panel);border-radius:12px}.review-math{white-space:pre-wrap;min-width:0}.review-math .katex-display{max-width:100%;overflow:auto}.review-math .katex{white-space:nowrap}.review-math>.katex{display:inline-block;max-width:100%;overflow:auto;vertical-align:middle}
@media(max-width:480px){.review-practice{padding:16px}.review-list>li{padding:16px}.review-filters>label{flex:1 1 100%}.review-overview{gap:14px;padding:16px}.review-overview span{flex:1 1 100%}.review-actions{gap:8px}.review-practice h2{font-size:19px}}
</style>
