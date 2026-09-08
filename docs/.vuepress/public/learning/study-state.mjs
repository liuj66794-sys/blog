import { readEntries } from './reading-state.mjs'

export const STUDY_KEY = 'l1uj-study-progress-v1'
export const TASKS_KEY = 'l1uj-study-tasks-v1'
export const STUDY_EVENT = 'l1uj:study'
export function storageObject(key, storage) {
  try { const value = JSON.parse((storage || window.localStorage).getItem(key) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} }
}
export function studyIdentity(pathname, base = '/blog/') {
  let decoded
  try { decoded = decodeURI(pathname) } catch { return null }
  if (!decoded.startsWith(base)) return null
  const relative = decoded.slice(base.length)
  const reading = relative.match(/^courses\/(zsb-(?:math|english|politics|cs))\/l\/(\d+|(?:xg|mzt|sz)\d+)\/$/)
  const practice = relative.match(/^lessons\/(zsb-(?:math|english|politics|cs))\/lessons\/(\d{4}|(?:xg|mzt|sz)\d+)(?:[-_][^/]+)?\.html$/)
  const match = reading || practice
  if (!match) return null
  const id = /^\d+$/.test(match[2]) ? String(Number(match[2])) : match[2]
  return { slug: match[1], id, key: `${match[1]}:${id}` }
}
export function safeReturnTo(value, base = '/blog/') {
  if (typeof value !== 'string' || /[\\\u0000-\u001f]/.test(value) || value.length > 1800) return null
  try {
    const url = new URL(value, 'https://study.invalid')
    if (url.origin !== 'https://study.invalid' || !url.pathname.startsWith(base)) return null
    if (!/^(?:courses|prep|knowledge)(?:\/|$)/.test(url.pathname.slice(base.length))) return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}
export function withStudyContext(href, returnTo, base = '/blog/', extra = {}) {
  const path = href.startsWith(base) ? href : base + href.replace(/^\//, '')
  const url = new URL(path, 'https://study.invalid')
  const back = safeReturnTo(returnTo, base)
  if (back) url.searchParams.set('returnTo', back)
  for (const [key, value] of Object.entries(extra)) if (value != null) url.searchParams.set(key, String(value))
  return url.pathname + url.search + url.hash
}
export function lessonStatus(slug, lesson, base = '/blog/', storage) {
  const key = `${slug}:${lesson.id}`
  const saved = storageObject(STUDY_KEY, storage).entries?.[key]
  if (saved && Number.isFinite(saved.total) && Number.isFinite(saved.answered) && saved.total >= 0) {
    const total = Math.max(0, saved.total), answered = Math.min(total, Math.max(0, saved.answered))
    return { ...saved, total, answered, state: total > 0 && answered === total ? 'complete' : 'learning', label: total > 0 && answered === total ? '已完成练习' : '学习中' }
  }
  const visited = readEntries(base, storage).some(entry => studyIdentity(entry.path, base)?.key === key)
  // Legacy manual flags do not tell us which exercises were done or whether they were correct.
  const math = slug === 'zsb-math' && storageObject('zc-progress-v1', storage)[String(lesson.id).padStart(4, '0')]
  const political = slug === 'zsb-politics' && storageObject(`zzkk:v2:lesson:${lesson.id}`, storage)
  let english = false
  try { english = slug === 'zsb-english' && (storage || window.localStorage).getItem('zsb-course-done-' + String(lesson.id).padStart(4, '0')) === '1' } catch {}
  const legacy = Boolean(math?.visits || political?.at || english)
  return { total: 0, answered: 0, correct: 0, reviewNeeded: 0, state: visited || legacy ? 'learning' : 'new', label: visited || legacy ? '学习中' : '未开始', legacy }
}
export function saveStudyProgress(entry, storage) {
  const store = storageObject(STUDY_KEY, storage)
  const entries = store.version === 1 && store.entries && typeof store.entries === 'object' ? store.entries : {}
  const key = `${entry.slug}:${entry.id}`
  const old = entries[key]
  const fields = ['slug','id','title','path','total','answered','correct','reviewNeeded']
  if (old && fields.every(field => old[field] === entry[field])) return false
  try {
    ;(storage || window.localStorage).setItem(STUDY_KEY, JSON.stringify({version:1,entries:{...entries,[key]:{...entry,updatedAt:Date.now()}}}))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(STUDY_EVENT))
    return true
  } catch { return false }
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function reviewCounts(storage, date = new Date()) {
  const result = { due: 0, politicalWrong: 0, csWrong: 0 }
  try {
    const source = storage || window.localStorage
    const day = Date.parse(localDay(date) + 'T00:00:00Z')
    for (let i=0;i<source.length;i++) {
      const key = source.key(i)
      if (key?.startsWith('zzkk:v2:card:')) {
        const card = storageObject(key, source)
        if ([1,2,3].includes(card.box) && (!card.at || (Number.isFinite(Date.parse(card.at)) && day - Date.parse(card.at) >= [1,3,7][card.box-1]*86400000))) result.due++
      }
      if (key?.startsWith('zzkk:v2:wrong:')) result.politicalWrong++
    }
    for (const lesson of Object.values(storageObject('zsb-mistakes-v1', source))) if (lesson && typeof lesson === 'object') {
      result.csWrong += Object.values(lesson).filter(item => item && item.wrongs > 0 && !item.fixed).length
    }
  } catch {}
  return result
}
export function taskPreferences(storage) { return storageObject(TASKS_KEY, storage).entries || {} }
export function changeTask(id, patch, storage) {
  try {
    const entries = taskPreferences(storage)
    const next = {...entries[id],...patch,updatedAt:Date.now()}
    if (!next.deferUntil) delete next.deferUntil
    ;(storage || window.localStorage).setItem(TASKS_KEY, JSON.stringify({version:1,entries:{...entries,[id]:next}}))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(STUDY_EVENT))
    return true
  } catch { return false }
}
