/**
 * Cross-device backup for the study state kept in localStorage.
 *
 * The browser stores several generations of study data.  This module keeps
 * the storage keys as the interchange boundary so a backup can be restored by
 * the existing lessons without a migration step.  Every key is allow-listed
 * and every value has a small, purpose-built schema before it is exported or
 * imported.
 */

export const BACKUP_FORMAT = 'l1uj-study-backup'
export const BACKUP_VERSION = 1
export const DEFAULT_BASE = '/blog/'
// UI-only metadata. It is deliberately outside the study-key allowlist and
// is never included in an exported `records` object.
export const BACKUP_AT_KEY = 'l1uj-study-backup-at'

export const STUDY_STORAGE_KEYS = Object.freeze([
  'l1uj-reading-v1',
  'zc-progress-v1',
  'zsb-mistakes-v1',
  'zsb-prep-checks',
  'l1uj-study-progress-v1',
  'l1uj-study-tasks-v1',
  'zsb-prep-checks-meta-v1',
])

const LESSON_SLUGS = new Set([
  'zsb-math', 'zsb-english', 'zsb-politics', 'zsb-cs',
  'pi-agent', 'engineering-skills', 'a-shares', 'english', 'policy',
])
const EXAM_SLUGS = new Set(['zsb-math', 'zsb-english', 'zsb-politics', 'zsb-cs'])
const SAFE_KEY = /^[A-Za-z0-9_.-]{1,180}$/
const SAFE_ID = /^[A-Za-z0-9_-]{1,120}$/
// The politics mixed-review page uses IDs such as `review:毛中特`.
const SAFE_POLITICS_LESSON_ID = /^[\p{L}\p{N}_.:-]{1,180}$/u
const SAFE_SCOPE = /^#[\p{L}\p{N}_.:-]{1,180}$|^[\p{L}\p{N}_.:-]{1,180}$/u
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const MAX_ENTRIES = 2000
const MAX_JSON_LENGTH = 5_000_000

const PATH_ANSWER_PREFIXES = [
  'l1uj-cs-answers-v1:',
  'l1uj-english-answers-v1:',
  'l1uj-politics-answers-v1:',
]

const DYNAMIC_PREFIXES = [
  'zc-progress-items-v1:',
  'zsb-course-done-',
  'zzkk:v2:lesson:',
  'zzkk:v2:card:',
  'zzkk:v2:wrong:',
]

const CONTAINER_MODES = Object.freeze({
  reading: 'reading',
  studyProgress: 'study-progress',
  studyTasks: 'study-tasks',
  prepMeta: 'prep-meta',
})

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasUnsafeProperty(name) {
  return name === '__proto__' || name === 'prototype' || name === 'constructor'
}

function ownKeys(value) {
  return Object.keys(value)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function equalValue(left, right) {
  return stableStringify(left) === stableStringify(right)
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function isTimestamp(value) {
  return Number.isInteger(value) && value >= 0
}

function isDateString(value) {
  return typeof value === 'string' && ISO_DAY.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
}

function isInstantString(value) {
  return typeof value === 'string' && ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value))
}

function isSafeMapKey(value, pattern = SAFE_KEY) {
  return typeof value === 'string' && !hasUnsafeProperty(value) && pattern.test(value)
}

function normalizeBase(base = DEFAULT_BASE) {
  if (typeof base !== 'string' || !base.startsWith('/') || !base.endsWith('/')
    || /[?#\\\u0000-\u001f]/.test(base) || base.includes('..')) return null
  return base
}

function isSameBasePath(path, base = DEFAULT_BASE) {
  if (typeof path !== 'string' || !path.startsWith(base) || /[?#\\\u0000-\u001f]/.test(path)) return false
  const relative = path.slice(base.length)
  if (!relative || relative.includes('..') || relative.startsWith('/')) return false
  return true
}

function isLessonPath(path, base = DEFAULT_BASE) {
  if (!isSameBasePath(path, base)) return false
  const relative = path.slice(base.length)
  const reading = relative.match(/^courses\/([\w-]+)\/l\/([^/]+)\/$/)
  const interactive = relative.match(/^lessons\/([\w-]+)\/lessons\/([^/]+)\.html$/)
  const match = reading || interactive
  if (!match || !LESSON_SLUGS.has(match[1])) return false
  return isLessonFileName(match[2])
}

function isLessonFileName(value) {
  try {
    const name = decodeURIComponent(value)
    return name.length > 0 && name.length <= 240 && !name.includes('..') &&
      /^[\p{L}\p{N}_().（）·—－-]+$/u.test(name)
  } catch { return false }
}

function isInteractivePath(path, base = DEFAULT_BASE) {
  if (!isSameBasePath(path, base)) return false
  const relative = path.slice(base.length)
  const match = relative.match(/^lessons\/([\w-]+)\/lessons\/([^/]+)\.html$/)
  return Boolean(match && LESSON_SLUGS.has(match[1]) && isLessonFileName(match[2]))
}

function isPrepCheckKey(key, base = DEFAULT_BASE) {
  if (typeof key !== 'string' || !key.startsWith(base) || /[?\\\u0000-\u001f]/.test(key)) return false
  const relative = key.slice(base.length)
  const match = relative.match(/^prep\/[A-Za-z0-9_-]+\/#w(\d{1,2})$/)
  return Boolean(match && Number(match[1]) >= 1 && Number(match[1]) <= 29)
}

function isAllowedPathAnswerKey(key, base = DEFAULT_BASE) {
  for (const prefix of PATH_ANSWER_PREFIXES) {
    if (!key.startsWith(prefix)) continue
    const suffix = key.slice(prefix.length)
    const needsScope = prefix !== 'l1uj-cs-answers-v1:'
    if (needsScope) {
      const delimiter = suffix.lastIndexOf(':')
      if (delimiter <= 0 || !SAFE_SCOPE.test(suffix.slice(delimiter + 1))) return false
      return isInteractivePath(suffix.slice(0, delimiter), base)
    }
    return isInteractivePath(suffix, base)
  }
  return false
}

function keyInfo(key, base = DEFAULT_BASE) {
  if (key === 'l1uj-reading-v1') return { kind: 'l1uj-reading-v1', mode: CONTAINER_MODES.reading }
  if (key === 'zc-progress-v1') return { kind: 'zc-progress-v1' }
  if (key === 'zsb-mistakes-v1') return { kind: 'zsb-mistakes-v1' }
  if (key === 'zsb-prep-checks') return { kind: 'zsb-prep-checks' }
  if (key === 'l1uj-study-progress-v1') return { kind: 'l1uj-study-progress-v1', mode: CONTAINER_MODES.studyProgress }
  if (key === 'l1uj-study-tasks-v1') return { kind: 'l1uj-study-tasks-v1', mode: CONTAINER_MODES.studyTasks }
  if (key === 'zsb-prep-checks-meta-v1') return { kind: 'zsb-prep-checks-meta-v1', mode: CONTAINER_MODES.prepMeta }
  if (key.startsWith('zc-progress-items-v1:') && SAFE_ID.test(key.slice('zc-progress-items-v1:'.length))) {
    return { kind: 'zc-progress-items-v1', id: key.slice('zc-progress-items-v1:'.length) }
  }
  if (key.startsWith('zsb-course-done-') && SAFE_ID.test(key.slice('zsb-course-done-'.length))) {
    return { kind: 'zsb-course-done', id: key.slice('zsb-course-done-'.length) }
  }
  if (key.startsWith('zzkk:v2:lesson:') && SAFE_POLITICS_LESSON_ID.test(key.slice('zzkk:v2:lesson:'.length))) {
    return { kind: 'zzkk:v2:lesson', id: key.slice('zzkk:v2:lesson:'.length) }
  }
  if (key.startsWith('zzkk:v2:card:') && SAFE_ID.test(key.slice('zzkk:v2:card:'.length))) {
    return { kind: 'zzkk:v2:card', id: key.slice('zzkk:v2:card:'.length) }
  }
  if (key.startsWith('zzkk:v2:wrong:') && SAFE_ID.test(key.slice('zzkk:v2:wrong:'.length))) {
    return { kind: 'zzkk:v2:wrong', id: key.slice('zzkk:v2:wrong:'.length) }
  }
  if (isAllowedPathAnswerKey(key, base)) {
    if (key.startsWith('l1uj-cs-answers-v1:')) return { kind: 'l1uj-cs-answers-v1' }
    if (key.startsWith('l1uj-english-answers-v1:')) return { kind: 'l1uj-english-answers-v1' }
    return { kind: 'l1uj-politics-answers-v1' }
  }
  return null
}

/** Return true only for keys written by one of the study runtimes. */
export function isAllowedStudyKey(key, base = DEFAULT_BASE) {
  return Boolean(normalizeBase(base) && typeof key === 'string' && keyInfo(key, base))
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`)
}

function checkObjectKeys(value, allowed, path, errors, required = []) {
  if (!isPlainObject(value)) {
    addError(errors, path, '必须是对象')
    return false
  }
  for (const key of ownKeys(value)) {
    if (hasUnsafeProperty(key) || !allowed.has(key)) addError(errors, `${path}.${key}`, '包含未允许的字段')
  }
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(value, key)) addError(errors, `${path}.${key}`, '缺少字段')
  return true
}

function checkString(value, path, errors, { min = 0, max = 5000, pattern } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max || (pattern && !pattern.test(value))) {
    addError(errors, path, '字符串格式不符合要求')
    return false
  }
  return true
}

function checkNonNegativeInteger(value, path, errors) {
  if (!isNonNegativeInteger(value)) {
    addError(errors, path, '必须是非负整数')
    return false
  }
  return true
}

function checkTimestamp(value, path, errors) {
  if (!isTimestamp(value)) {
    addError(errors, path, '必须是非负毫秒时间戳')
    return false
  }
  return true
}

function validateReading(value, errors, base) {
  if (!checkObjectKeys(value, new Set(['version', 'entries']), 'records.l1uj-reading-v1', errors, ['version', 'entries'])) return
  if (value.version !== 1) addError(errors, 'records.l1uj-reading-v1.version', '只支持版本 1')
  if (!Array.isArray(value.entries) || value.entries.length > 40) {
    addError(errors, 'records.l1uj-reading-v1.entries', '必须是最多 40 项的数组')
    return
  }
  const seen = new Set()
  const allowed = new Set(['path', 'slug', 'subject', 'mode', 'title', 'updatedAt', 'y', 'offset', 'anchor', 'chapter'])
  value.entries.forEach((entry, index) => {
    const path = `records.l1uj-reading-v1.entries[${index}]`
    if (!checkObjectKeys(entry, allowed, path, errors, ['path', 'title', 'updatedAt', 'y'])) return
    if (!isLessonPath(entry.path, base) || seen.has(entry.path)) addError(errors, `${path}.path`, '必须是同一站点下唯一的课程路径')
    seen.add(entry.path)
    checkString(entry.title, `${path}.title`, errors, { min: 1, max: 180 })
    checkTimestamp(entry.updatedAt, `${path}.updatedAt`, errors)
    if (typeof entry.y !== 'number' || !Number.isFinite(entry.y) || entry.y < 0) addError(errors, `${path}.y`, '必须是非负数字')
    if (entry.slug != null) checkString(entry.slug, `${path}.slug`, errors, { pattern: /^[\w-]+$/ })
    if (entry.subject != null) checkString(entry.subject, `${path}.subject`, errors, { max: 80 })
    if (entry.mode != null && entry.mode !== 'reading' && entry.mode !== 'interactive') addError(errors, `${path}.mode`, '只能是 reading 或 interactive')
    if (entry.offset != null && (typeof entry.offset !== 'number' || !Number.isFinite(entry.offset))) addError(errors, `${path}.offset`, '必须是有限数字')
    if (entry.anchor != null) checkString(entry.anchor, `${path}.anchor`, errors, { max: 100 })
    if (entry.chapter != null) checkString(entry.chapter, `${path}.chapter`, errors, { max: 100 })
  })
}

function validateMathProgress(value, errors) {
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), 'records.zc-progress-v1', errors)) return
  const countFields = new Set([
    'visits', 'quizRight', 'quizTotal', 'recallOk', 'recallNo',
    'quizRoundTotal', 'quizAnswered', 'quizCorrect', 'quizFirstTryCorrect',
    'recallRoundTotal', 'recallAnswered', 'recallGood', 'recallBad',
    'answered', 'correct', 'cardsReviewed', 'cardsGood', 'cardsBad',
  ])
  const booleanFields = new Set([
    'exerciseComplete', 'allCorrect', 'quizReviewNeeded', 'reviewNeeded',
    'quizComplete', 'quizAllCorrect', 'manualDone', 'manualActivity', 'cardsReviewNeeded',
  ])
  const stringFields = new Set(['status', 'exerciseStatus', 'statusLabel', 'mastery', 'lessonId'])
  const allowedFields = new Set([...countFields, ...booleanFields, ...stringFields, 'summary'])
  for (const [lesson, record] of Object.entries(value)) {
    if (!isSafeMapKey(lesson, SAFE_ID)) addError(errors, `records.zc-progress-v1.${lesson}`, '课次键不安全')
    if (!checkObjectKeys(record, allowedFields, `records.zc-progress-v1.${lesson}`, errors)) continue
    for (const field of countFields) if (record[field] != null) checkNonNegativeInteger(record[field], `records.zc-progress-v1.${lesson}.${field}`, errors)
    for (const field of booleanFields) if (record[field] != null && typeof record[field] !== 'boolean') addError(errors, `records.zc-progress-v1.${lesson}.${field}`, '必须是布尔值')
    for (const field of stringFields) if (record[field] != null) checkString(record[field], `records.zc-progress-v1.${lesson}.${field}`, errors, { max: 180 })
    if (record.status != null && !['not-started', 'in-progress', 'exercise-complete'].includes(record.status)) addError(errors, `records.zc-progress-v1.${lesson}.status`, '状态值不受支持')
    if (record.exerciseStatus != null && !['not-started', 'in-progress', 'exercise-complete'].includes(record.exerciseStatus)) addError(errors, `records.zc-progress-v1.${lesson}.exerciseStatus`, '状态值不受支持')
    if (record.mastery != null && !['verified', 'needs-review', 'unassessed'].includes(record.mastery)) addError(errors, `records.zc-progress-v1.${lesson}.mastery`, '掌握状态值不受支持')
    if (record.summary != null) validateMathSummary(record.summary, errors, `records.zc-progress-v1.${lesson}.summary`)
  }
}

function validateMathSummary(value, errors, path) {
  const countFields = new Set([
    'quizTotal', 'quizAnswered', 'quizCorrect', 'quizFirstTryCorrect',
    'recallTotal', 'recallAnswered', 'recallGood', 'recallBad',
    'total', 'answered', 'correct', 'visits',
  ])
  const booleanFields = new Set(['quizReviewNeeded', 'recallReviewNeeded', 'exerciseComplete', 'allCorrect', 'reviewNeeded'])
  const stringFields = new Set(['lessonId', 'status', 'statusLabel', 'mastery'])
  if (!checkObjectKeys(value, new Set([...countFields, ...booleanFields, ...stringFields, 'legacy']), path, errors)) return
  for (const field of countFields) if (value[field] != null) checkNonNegativeInteger(value[field], `${path}.${field}`, errors)
  for (const field of booleanFields) if (value[field] != null && typeof value[field] !== 'boolean') addError(errors, `${path}.${field}`, '必须是布尔值')
  for (const field of stringFields) if (value[field] != null) checkString(value[field], `${path}.${field}`, errors, { max: 180 })
  if (value.status != null && !['not-started', 'in-progress', 'exercise-complete'].includes(value.status)) addError(errors, `${path}.status`, '状态值不受支持')
  if (value.mastery != null && !['verified', 'needs-review', 'unassessed'].includes(value.mastery)) addError(errors, `${path}.mastery`, '掌握状态值不受支持')
  if (value.legacy != null && checkObjectKeys(value.legacy, new Set(['quizRight', 'quizTotal', 'recallOk', 'recallNo']), `${path}.legacy`, errors)) {
    for (const field of ['quizRight', 'quizTotal', 'recallOk', 'recallNo']) checkNonNegativeInteger(value.legacy[field], `${path}.legacy.${field}`, errors)
  }
}

function validateMathItems(value, errors) {
  const path = 'records.zc-progress-items-v1'
  if (!checkObjectKeys(value, new Set(['quiz', 'recall', 'legacy']), path, errors, ['quiz', 'recall', 'legacy'])) return
  if (isPlainObject(value.quiz)) {
    for (const [id, item] of Object.entries(value.quiz)) {
      if (!isSafeMapKey(id)) addError(errors, `${path}.quiz.${id}`, '题目键不安全')
      if (!checkObjectKeys(item, new Set(['attempts', 'done']), `${path}.quiz.${id}`, errors, ['attempts', 'done'])) continue
      if (!Array.isArray(item.attempts) || item.attempts.some((attempt) => typeof attempt !== 'string' || attempt.length > 20)) addError(errors, `${path}.quiz.${id}.attempts`, '必须是短字符串数组')
      if (typeof item.done !== 'boolean') addError(errors, `${path}.quiz.${id}.done`, '必须是布尔值')
    }
  }
  if (isPlainObject(value.recall)) {
    for (const [id, item] of Object.entries(value.recall)) {
      if (!isSafeMapKey(id)) addError(errors, `${path}.recall.${id}`, '回忆卡键不安全')
      if (!checkObjectKeys(item, new Set(['shown', 'vote']), `${path}.recall.${id}`, errors)) continue
      if (item.shown != null && typeof item.shown !== 'boolean') addError(errors, `${path}.recall.${id}.shown`, '必须是布尔值')
      if (item.vote != null && item.vote !== 'good' && item.vote !== 'bad') addError(errors, `${path}.recall.${id}.vote`, '只能是 good 或 bad')
    }
  }
  const legacy = value.legacy
  if (checkObjectKeys(legacy, new Set(['quizRight', 'quizTotal', 'recallOk', 'recallNo']), `${path}.legacy`, errors)) {
    for (const field of ['quizRight', 'quizTotal', 'recallOk', 'recallNo']) checkNonNegativeInteger(legacy[field], `${path}.legacy.${field}`, errors)
  }
}

function validateEnglishAnswers(value, errors, path) {
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), path, errors)) return
  for (const [index, item] of Object.entries(value)) {
    if (!/^\d+$/.test(index)) addError(errors, `${path}.${index}`, '题号必须是数字')
    if (!checkObjectKeys(item, new Set(['signature', 'picked']), `${path}.${index}`, errors, ['signature', 'picked'])) continue
    checkString(item.signature, `${path}.${index}.signature`, errors, { min: 1, max: 1000 })
    if (!Number.isInteger(item.picked) || item.picked < 0) addError(errors, `${path}.${index}.picked`, '必须是非负整数')
  }
}

function validateCsAnswers(value, errors, path) {
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), path, errors)) return
  for (const [question, item] of Object.entries(value)) {
    if (!/^\d+$/.test(question)) addError(errors, `${path}.${question}`, '题号必须是数字')
    if (!checkObjectKeys(item, new Set(['signature', 'attempts']), `${path}.${question}`, errors, ['signature', 'attempts'])) continue
    checkString(item.signature, `${path}.${question}.signature`, errors, { min: 1, max: 1000 })
    if (!Array.isArray(item.attempts) || item.attempts.length > 20 || item.attempts.some((attempt) => typeof attempt !== 'string' || attempt.length > 20)) addError(errors, `${path}.${question}.attempts`, '必须是短字符串数组')
  }
}

function validateCsMistakes(value, errors) {
  const path = 'records.zsb-mistakes-v1'
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), path, errors)) return
  for (const [lesson, questions] of Object.entries(value)) {
    if (!/^\d{4}$/.test(lesson)) addError(errors, `${path}.${lesson}`, '课次键必须是四位数字')
    if (!isPlainObject(questions)) { addError(errors, `${path}.${lesson}`, '必须是错题映射'); continue }
    for (const [question, item] of Object.entries(questions)) {
      if (!/^\d+$/.test(question)) addError(errors, `${path}.${lesson}.${question}`, '题号必须是数字')
      if (!checkObjectKeys(item, new Set(['wrongs', 'fixed', 't']), `${path}.${lesson}.${question}`, errors, ['wrongs', 'fixed'])) continue
      if (!Number.isInteger(item.wrongs) || item.wrongs < 1) addError(errors, `${path}.${lesson}.${question}.wrongs`, '必须是正整数')
      if (typeof item.fixed !== 'boolean') addError(errors, `${path}.${lesson}.${question}.fixed`, '必须是布尔值')
      if (item.t != null) checkString(item.t, `${path}.${lesson}.${question}.t`, errors, { max: 2000 })
    }
  }
}

function validatePoliticsProgress(value, errors, path) {
  const allowed = new Set([
    'best', 'done', 'at', 'visits',
    'quizTotal', 'quizRoundTotal', 'quizAnswered', 'quizCorrect', 'quizComplete',
    'exerciseComplete', 'quizAllCorrect', 'quizReviewNeeded', 'reviewNeeded',
    'exerciseStatus', 'status',
    'cardsReviewed', 'cardsGood', 'cardsBad', 'cardsReviewNeeded',
    'manualActivity', 'manualDone',
  ])
  if (!checkObjectKeys(value, allowed, path, errors)) return
  if (value.best != null && (!Number.isFinite(value.best) || value.best < 0 || value.best > 100)) addError(errors, `${path}.best`, '必须是 0 到 100 的数字')
  if (value.done != null && typeof value.done !== 'boolean') addError(errors, `${path}.done`, '必须是布尔值')
  if (value.at != null && !isInstantString(value.at)) addError(errors, `${path}.at`, '必须是 ISO 时间')
  for (const field of [
    'visits', 'quizTotal', 'quizRoundTotal', 'quizAnswered', 'quizCorrect',
    'cardsReviewed', 'cardsGood', 'cardsBad',
  ]) if (value[field] != null) checkNonNegativeInteger(value[field], `${path}.${field}`, errors)
  for (const field of [
    'done', 'quizComplete', 'exerciseComplete', 'quizAllCorrect', 'quizReviewNeeded',
    'reviewNeeded', 'cardsReviewNeeded', 'manualActivity', 'manualDone',
  ]) if (value[field] != null && typeof value[field] !== 'boolean') addError(errors, `${path}.${field}`, '必须是布尔值')
  for (const field of ['exerciseStatus', 'status']) {
    if (value[field] != null && !['not-started', 'in-progress', 'exercise-complete'].includes(value[field])) {
      addError(errors, `${path}.${field}`, '必须是合法的课程状态')
    }
  }
}

function validatePoliticsCard(value, errors, path) {
  if (!checkObjectKeys(value, new Set(['box', 'streak', 'at']), path, errors, ['box', 'streak', 'at'])) return
  if (!Number.isInteger(value.box) || value.box < 0 || value.box > 3) addError(errors, `${path}.box`, '必须是 0 到 3 的整数')
  checkNonNegativeInteger(value.streak, `${path}.streak`, errors)
  if (!isDateString(value.at)) addError(errors, `${path}.at`, '必须是 YYYY-MM-DD 日期')
}

function validatePoliticsWrong(value, errors, path) {
  const allowed = new Set(['count', 'firstAt', 'lastAt', 'stem', 'options', 'answer', 'exp', 'from'])
  if (!checkObjectKeys(value, allowed, path, errors, ['count'])) return
  if (!Number.isInteger(value.count) || value.count < 1) addError(errors, `${path}.count`, '必须是正整数')
  for (const field of ['firstAt', 'lastAt']) if (value[field] != null && !isDateString(value[field])) addError(errors, `${path}.${field}`, '必须是 YYYY-MM-DD 日期')
  for (const field of ['stem', 'exp', 'from']) if (value[field] != null) checkString(value[field], `${path}.${field}`, errors, { max: 5000 })
  if (value.answer != null && typeof value.answer !== 'string') addError(errors, `${path}.answer`, '必须是字符串或 null')
  if (value.options != null) {
    if (!Array.isArray(value.options) || value.options.length > 30) addError(errors, `${path}.options`, '必须是选项数组')
    else value.options.forEach((option, index) => {
      const optionPath = `${path}.options[${index}]`
      if (!checkObjectKeys(option, new Set(['letter', 'text']), optionPath, errors, ['letter', 'text'])) return
      checkString(option.letter, `${optionPath}.letter`, errors, { min: 1, max: 4 })
      checkString(option.text, `${optionPath}.text`, errors, { max: 1000 })
    })
  }
}

function validatePoliticsAnswers(value, errors, path) {
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), path, errors)) return
  for (const [signature, item] of Object.entries(value)) {
    if (!/^h[A-Za-z0-9]+$/.test(signature)) addError(errors, `${path}.${signature}`, '题目签名不安全')
    if (!checkObjectKeys(item, new Set(['picked', 'done']), `${path}.${signature}`, errors, ['picked', 'done'])) continue
    if (!Array.isArray(item.picked) || item.picked.length > 26 || item.picked.some((letter) => typeof letter !== 'string' || letter.length > 3)) addError(errors, `${path}.${signature}.picked`, '必须是短字符串数组')
    if (typeof item.done !== 'boolean') addError(errors, `${path}.${signature}.done`, '必须是布尔值')
  }
}

function validateStudyProgress(value, errors, base) {
  const path = 'records.l1uj-study-progress-v1'
  if (!checkObjectKeys(value, new Set(['version', 'entries']), path, errors, ['version', 'entries'])) return
  if (value.version !== 1) addError(errors, `${path}.version`, '只支持版本 1')
  if (!isPlainObject(value.entries)) { addError(errors, `${path}.entries`, '必须是对象'); return }
  for (const [entryKey, entry] of Object.entries(value.entries)) {
    const match = entryKey.match(/^(zsb-(?:math|english|politics|cs)):([A-Za-z0-9_-]+)$/)
    const entryPath = `${path}.entries.${entryKey}`
    if (!match || !EXAM_SLUGS.has(match[1])) addError(errors, entryPath, '学习记录键格式不正确')
    const allowed = new Set(['slug', 'id', 'title', 'path', 'total', 'answered', 'correct', 'reviewNeeded', 'updatedAt'])
    if (!checkObjectKeys(entry, allowed, entryPath, errors, ['slug', 'id', 'title', 'path', 'total', 'answered', 'correct', 'reviewNeeded', 'updatedAt'])) continue
    if (entry.slug !== match?.[1] || entry.id !== match?.[2]) addError(errors, `${entryPath}.slug/id`, '必须与 entries 键一致')
    checkString(entry.title, `${entryPath}.title`, errors, { min: 1, max: 180 })
    if (!isLessonPath(entry.path, base)) addError(errors, `${entryPath}.path`, '必须是同一站点下的课程路径')
    for (const field of ['total', 'answered', 'correct', 'reviewNeeded']) checkNonNegativeInteger(entry[field], `${entryPath}.${field}`, errors)
    if (isNonNegativeInteger(entry.total) && isNonNegativeInteger(entry.answered) && entry.answered > entry.total) addError(errors, `${entryPath}.answered`, '不能大于 total')
    if (isNonNegativeInteger(entry.answered) && isNonNegativeInteger(entry.correct) && entry.correct > entry.answered) addError(errors, `${entryPath}.correct`, '不能大于 answered')
    if (isNonNegativeInteger(entry.total) && isNonNegativeInteger(entry.reviewNeeded) && entry.reviewNeeded > entry.total) addError(errors, `${entryPath}.reviewNeeded`, '不能大于 total')
    checkTimestamp(entry.updatedAt, `${entryPath}.updatedAt`, errors)
  }
}

function validateStudyTasks(value, errors) {
  const path = 'records.l1uj-study-tasks-v1'
  if (!checkObjectKeys(value, new Set(['version', 'entries']), path, errors, ['version', 'entries'])) return
  if (value.version !== 1) addError(errors, `${path}.version`, '只支持版本 1')
  if (!isPlainObject(value.entries)) { addError(errors, `${path}.entries`, '必须是对象'); return }
  for (const [entryKey, entry] of Object.entries(value.entries)) {
    const entryPath = `${path}.entries.${entryKey}`
    const match = entryKey.match(/^lesson:(zsb-(?:math|english|politics|cs)):([A-Za-z0-9_-]+)$/)
    const auxiliary = new Set(['review:politics', 'wrong:cs', 'wrong:politics'])
    if (!match && !auxiliary.has(entryKey)) addError(errors, entryPath, '任务键格式不正确')
    if (!checkObjectKeys(entry, new Set(['deferUntil', 'limit', 'updatedAt']), entryPath, errors, ['updatedAt'])) continue
    if (entry.deferUntil != null && !isDateString(entry.deferUntil)) addError(errors, `${entryPath}.deferUntil`, '必须是 YYYY-MM-DD 日期')
    if (entry.limit != null && ![1, 5, 10].includes(entry.limit)) addError(errors, `${entryPath}.limit`, '只能是 1、5 或 10')
    checkTimestamp(entry.updatedAt, `${entryPath}.updatedAt`, errors)
  }
}

function validatePrepMeta(value, errors, base) {
  const path = 'records.zsb-prep-checks-meta-v1'
  if (!checkObjectKeys(value, new Set(Object.keys(value || {})), path, errors)) return
  for (const [entryKey, entry] of Object.entries(value)) {
    const entryPath = `${path}.${entryKey}`
    if (!isPrepCheckKey(entryKey, base)) addError(errors, entryPath, '必须是同一站点的周计划路径')
    if (!checkObjectKeys(entry, new Set(['checked', 'updatedAt']), entryPath, errors, ['checked', 'updatedAt'])) continue
    if (typeof entry.checked !== 'boolean') addError(errors, `${entryPath}.checked`, '必须是布尔值')
    checkTimestamp(entry.updatedAt, `${entryPath}.updatedAt`, errors)
  }
}

function validateRecord(key, value, errors, base) {
  const info = keyInfo(key, base)
  if (!info) { addError(errors, `records.${key}`, '存储键不在白名单中'); return }
  switch (info.kind) {
    case 'l1uj-reading-v1': return validateReading(value, errors, base)
    case 'zc-progress-v1': return validateMathProgress(value, errors)
    case 'zc-progress-items-v1': return validateMathItems(value, errors)
    case 'zsb-course-done':
      if (value !== '1') addError(errors, `records.${key}`, '英语完成标记只能是字符串 1')
      return
    case 'l1uj-english-answers-v1': return validateEnglishAnswers(value, errors, `records.${key}`)
    case 'zsb-mistakes-v1': return validateCsMistakes(value, errors)
    case 'l1uj-cs-answers-v1': return validateCsAnswers(value, errors, `records.${key}`)
    case 'zzkk:v2:lesson': return validatePoliticsProgress(value, errors, `records.${key}`)
    case 'zzkk:v2:card': return validatePoliticsCard(value, errors, `records.${key}`)
    case 'zzkk:v2:wrong': return validatePoliticsWrong(value, errors, `records.${key}`)
    case 'l1uj-politics-answers-v1': return validatePoliticsAnswers(value, errors, `records.${key}`)
    case 'zsb-prep-checks':
      if (!isPlainObject(value)) { addError(errors, `records.${key}`, '必须是周计划映射'); return }
      for (const [entryKey, checked] of Object.entries(value)) {
        if (!isPrepCheckKey(entryKey, base)) addError(errors, `records.${key}.${entryKey}`, '必须是同一站点的周计划路径')
        if (checked !== 1) addError(errors, `records.${key}.${entryKey}`, '旧周计划标记只能是数字 1')
      }
      return
    case 'l1uj-study-progress-v1': return validateStudyProgress(value, errors, base)
    case 'l1uj-study-tasks-v1': return validateStudyTasks(value, errors)
    case 'zsb-prep-checks-meta-v1': return validatePrepMeta(value, errors, base)
    default: addError(errors, `records.${key}`, '未知存储键')
  }
}

/** Validate a parsed backup object and return all errors rather than the first one. */
export function validateStudyBackup(payload, { base = DEFAULT_BASE } = {}) {
  const errors = []
  const normalizedBase = normalizeBase(base)
  if (!normalizedBase) {
    addError(errors, 'base', '站点 base 必须是安全的绝对路径')
    return { valid: false, errors }
  }
  if (!isPlainObject(payload)) {
    addError(errors, 'backup', '必须是 JSON 对象')
    return { valid: false, errors }
  }
  if (!checkObjectKeys(payload, new Set(['format', 'version', 'base', 'createdAt', 'records']), 'backup', errors, ['format', 'version', 'base', 'createdAt', 'records'])) {
    return { valid: false, errors }
  }
  if (payload.format !== BACKUP_FORMAT) addError(errors, 'backup.format', `必须是 ${BACKUP_FORMAT}`)
  if (payload.version !== BACKUP_VERSION) addError(errors, 'backup.version', '只支持版本 1')
  if (payload.base !== normalizedBase) addError(errors, 'backup.base', `必须与当前站点 base ${normalizedBase} 一致`)
  checkTimestamp(payload.createdAt, 'backup.createdAt', errors)
  if (!isPlainObject(payload.records)) {
    addError(errors, 'backup.records', '必须是对象')
  } else {
    const keys = ownKeys(payload.records)
    if (keys.length > MAX_ENTRIES) addError(errors, 'backup.records', `最多支持 ${MAX_ENTRIES} 个存储键`)
    for (const key of keys) {
      if (!isAllowedStudyKey(key, normalizedBase)) addError(errors, `backup.records.${key}`, '存储键不在白名单中')
      else validateRecord(key, payload.records[key], errors, normalizedBase)
    }
  }
  return { valid: errors.length === 0, errors }
}

function getStorage(storage) {
  const result = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!result || typeof result.getItem !== 'function' || typeof result.setItem !== 'function') throw new TypeError('需要可用的 localStorage')
  return result
}

export function readLastBackupAt(storage) {
  const source = getStorage(storage)
  try {
    const raw = source.getItem(BACKUP_AT_KEY)
    if (raw === null || raw.trim() === '') return null
    const value = Number(raw)
    return isTimestamp(value) ? value : null
  } catch {
    return null
  }
}

export function writeLastBackupAt(storage, timestamp = Date.now()) {
  const source = getStorage(storage)
  if (!isTimestamp(timestamp)) return false
  try {
    source.setItem(BACKUP_AT_KEY, String(timestamp))
    return true
  } catch {
    return false
  }
}

function parseStoredValue(key, raw, base) {
  const info = keyInfo(key, base)
  if (!info) return { ok: false, errors: [`${key}: 存储键不在白名单中`] }
  if (info.kind === 'zsb-course-done') return { ok: raw === '1', value: raw, errors: raw === '1' ? [] : [`${key}: 本地值不是字符串 1`] }
  if (typeof raw !== 'string' || raw.length > MAX_JSON_LENGTH) return { ok: false, errors: [`${key}: 本地 JSON 过大或不是字符串`] }
  let value
  try { value = JSON.parse(raw) } catch { return { ok: false, errors: [`${key}: 本地 JSON 无法解析`] } }
  const errors = []
  validateRecord(key, value, errors, base)
  return { ok: errors.length === 0, value, errors }
}

function readStudyKeys(storage, base) {
  const keys = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && isAllowedStudyKey(key, base)) keys.push(key)
  }
  return [...new Set(keys)].sort()
}

function rawValueFor(key, value) {
  return keyInfo(key)?.kind === 'zsb-course-done' ? value : JSON.stringify(value)
}

/**
 * Read every valid allow-listed learning key. Invalid recognised values are
 * reported in `skipped`, so a download never quietly contains a partial record.
 */
export function createStudyBackup(storage, { base = DEFAULT_BASE, now = Date.now() } = {}) {
  const source = getStorage(storage)
  const normalizedBase = normalizeBase(base)
  if (!normalizedBase) throw new TypeError('站点 base 必须是安全的绝对路径')
  if (!isTimestamp(now)) throw new TypeError('备份时间必须是非负毫秒时间戳')
  const records = {}
  const skipped = []
  for (const key of readStudyKeys(source, normalizedBase)) {
    let raw
    try { raw = source.getItem(key) } catch (error) {
      skipped.push({ key, reason: `读取失败：${error instanceof Error ? error.message : String(error)}` })
      continue
    }
    const parsed = parseStoredValue(key, raw, normalizedBase)
    if (!parsed.ok) skipped.push({ key, reason: parsed.errors.join('；') })
    else records[key] = parsed.value
  }
  const backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, base: normalizedBase, createdAt: now, records }
  return { backup, includedKeys: Object.keys(records), skipped }
}

export function serializeStudyBackup(payload, options) {
  const result = validateStudyBackup(payload, options)
  if (!result.valid) throw new TypeError(`备份格式无效：${result.errors.join('；')}`)
  return JSON.stringify(payload, null, 2)
}

export function parseStudyBackupText(text, options) {
  if (typeof text !== 'string' || text.length > MAX_JSON_LENGTH) return { valid: false, errors: ['备份文件过大或不是文本'] }
  try {
    const payload = JSON.parse(text)
    const result = validateStudyBackup(payload, options)
    return { ...result, payload: result.valid ? payload : null }
  } catch (error) {
    return { valid: false, errors: [`备份文件不是有效 JSON：${error instanceof Error ? error.message : String(error)}`], payload: null }
  }
}

function isMergeMode(info) {
  return info?.mode || null
}

function itemTimestamp(info, item) {
  if (!item || typeof item !== 'object') return null
  if (info.mode === CONTAINER_MODES.reading || info.mode === CONTAINER_MODES.studyProgress || info.mode === CONTAINER_MODES.studyTasks || info.mode === CONTAINER_MODES.prepMeta) {
    return isTimestamp(item.updatedAt) ? item.updatedAt : null
  }
  if (info.kind === 'zzkk:v2:lesson' && isInstantString(item.at)) return Date.parse(item.at)
  if (info.kind === 'zzkk:v2:card' && isDateString(item.at)) return Date.parse(`${item.at}T00:00:00Z`)
  if (info.kind === 'zzkk:v2:wrong' && isDateString(item.lastAt)) return Date.parse(`${item.lastAt}T00:00:00Z`)
  return null
}

function keyTimestamp(info, value) {
  return itemTimestamp(info, value)
}

function keyLabel(key, itemKey) {
  const labels = {
    'l1uj-reading-v1': '阅读位置',
    'zc-progress-v1': '数学累计进度',
    'zc-progress-items-v1': '数学逐题练习',
    'zsb-course-done': '英语课程完成标记',
    'l1uj-english-answers-v1': '英语答题状态',
    'zsb-mistakes-v1': '计算机错题本',
    'l1uj-cs-answers-v1': '计算机答题轮次',
    'zzkk:v2:lesson': '政治课程进度',
    'zzkk:v2:card': '政治闪卡三盒',
    'zzkk:v2:wrong': '政治错题本',
    'l1uj-politics-answers-v1': '政治答题状态',
    'zsb-prep-checks': '旧版周计划打卡',
    'l1uj-study-progress-v1': '统一课程练习进度',
    'l1uj-study-tasks-v1': '今日任务偏好',
    'zsb-prep-checks-meta-v1': '新版周计划打卡',
  }
  const info = keyInfo(key)
  const text = labels[info?.kind] || key
  if (itemKey == null) return text
  const subjectNames = { 'zsb-math': '高等数学', 'zsb-english': '公共英语', 'zsb-politics': '政治理论', 'zsb-cs': '计算机基础' }
  const lesson = String(itemKey).match(/^(?:lesson:)?(zsb-(?:math|english|politics|cs)):(.+)$/)
  if (lesson) return `${text} · ${subjectNames[lesson[1]]} 第 ${lesson[2]} 课`
  const auxiliary = {
    'review:politics': '政治理论到期复习',
    'wrong:cs': '计算机基础错题',
    'wrong:politics': '政治理论错题',
  }
  if (auxiliary[itemKey]) return `${text} · ${auxiliary[itemKey]}`
  const prep = String(itemKey).match(/\/prep\/([^/]+)\/#(w\d+)$/)
  if (prep) {
    const prepNames = { gaoshu: '高等数学', yingyu: '公共英语', zhengzhi: '政治理论', jisuanji: '计算机基础' }
    return `${text} · ${prepNames[prep[1]] || prep[1]} ${prep[2]}`
  }
  const interactive = String(itemKey).match(/\/lessons\/(zsb-(?:math|english|politics|cs))\/lessons\/([^/]+)\.html$/)
  if (interactive) return `${text} · ${subjectNames[interactive[1]]} · ${interactive[2]}`
  return `${text} · ${itemKey}`
}

export function studyConflictId(key, itemKey = null) {
  return itemKey == null ? key : `${key}::${itemKey}`
}

export function studyKeyLabel(key, itemKey = null) {
  return keyLabel(key, itemKey)
}

function conflictStatus(localTimestamp, incomingTimestamp) {
  if (localTimestamp == null || incomingTimestamp == null) return { status: 'missing-timestamp', defaultAction: 'requires-choice' }
  if (incomingTimestamp > localTimestamp) return { status: 'incoming-newer', defaultAction: 'import' }
  if (incomingTimestamp < localTimestamp) return { status: 'local-newer', defaultAction: 'keep-local' }
  return { status: 'same-time', defaultAction: 'keep-local' }
}

function normalizeDecision(decisions, id, key) {
  if (decisions instanceof Map) return decisions.get(id) || decisions.get(key) || null
  if (decisions && typeof decisions === 'object') return decisions[id] || decisions[key] || null
  return null
}

function resolveAction(conflict, decisions, untimestampedPolicy) {
  const explicit = normalizeDecision(decisions, conflict.id, conflict.key)
  if (explicit === 'import' || explicit === 'keep-local') return explicit
  if (conflict.defaultAction !== 'requires-choice') return conflict.defaultAction
  if (untimestampedPolicy === 'import' || untimestampedPolicy === 'keep-local') return untimestampedPolicy
  return 'requires-choice'
}

function baseConflict({ key, itemKey = null, localTimestamp = null, incomingTimestamp = null, status, defaultAction }) {
  const id = studyConflictId(key, itemKey)
  return {
    id, key, itemKey, label: keyLabel(key, itemKey), status, defaultAction,
    action: defaultAction === 'requires-choice' ? 'requires-choice' : defaultAction,
    localTimestamp, incomingTimestamp,
  }
}

function containerEntries(info, value) {
  if (info.mode === CONTAINER_MODES.reading) return value.entries.map((entry) => [entry.path, entry])
  if (info.mode === CONTAINER_MODES.studyProgress || info.mode === CONTAINER_MODES.studyTasks) return Object.entries(value.entries)
  if (info.mode === CONTAINER_MODES.prepMeta) return Object.entries(value)
  return []
}

function withContainerEntries(info, source, entries) {
  if (info.mode === CONTAINER_MODES.reading) {
    const result = { version: source.version, entries: entries.map(([, entry]) => entry) }
    return result
  }
  if (info.mode === CONTAINER_MODES.studyProgress || info.mode === CONTAINER_MODES.studyTasks) return { version: source.version, entries: Object.fromEntries(entries) }
  return Object.fromEntries(entries)
}

function mergeContainer(key, info, localValue, incomingValue, decisions, untimestampedPolicy) {
  const localEntries = new Map(containerEntries(info, localValue))
  const incomingEntries = containerEntries(info, incomingValue)
  const conflicts = []
  for (const [itemKey, incomingItem] of incomingEntries) {
    const localItem = localEntries.get(itemKey)
    if (localItem == null) {
      localEntries.set(itemKey, clone(incomingItem))
      continue
    }
    if (equalValue(localItem, incomingItem)) continue
    const timestamps = conflictStatus(itemTimestamp(info, localItem), itemTimestamp(info, incomingItem))
    const conflict = baseConflict({
      key, itemKey,
      localTimestamp: itemTimestamp(info, localItem),
      incomingTimestamp: itemTimestamp(info, incomingItem),
      ...timestamps,
    })
    conflict.action = resolveAction(conflict, decisions, untimestampedPolicy)
    conflicts.push(conflict)
    if (conflict.action === 'import') localEntries.set(itemKey, clone(incomingItem))
  }
  const resultEntries = [...localEntries.entries()]
  if (info.mode === CONTAINER_MODES.reading) resultEntries.sort((left, right) => (itemTimestamp(info, right[1]) ?? 0) - (itemTimestamp(info, left[1]) ?? 0))
  return { value: withContainerEntries(info, localValue, resultEntries), conflicts }
}

function makeImportPlan(payload, storage, { base = DEFAULT_BASE, decisions, untimestampedPolicy = 'require' } = {}) {
  const normalizedBase = normalizeBase(base)
  const validation = validateStudyBackup(payload, { base: normalizedBase || base })
  if (!validation.valid) return { valid: false, errors: validation.errors, plan: [], conflicts: [], summary: emptySummary() }
  const plan = []
  const conflicts = []
  const summary = emptySummary()
  for (const key of Object.keys(payload.records).sort()) {
    const incomingValue = payload.records[key]
    let localRaw
    try { localRaw = storage.getItem(key) } catch (error) {
      return { valid: false, errors: [`${key}: 读取本地记录失败：${error instanceof Error ? error.message : String(error)}`], plan, conflicts, summary }
    }
    if (localRaw == null) {
      plan.push({ key, localRaw: null, finalValue: clone(incomingValue), action: 'import', status: 'new', conflicts: [] })
      summary.new += 1; summary.import += 1
      continue
    }
    const local = parseStoredValue(key, localRaw, normalizedBase)
    if (!local.ok) {
      const conflict = baseConflict({ key, status: 'local-invalid', defaultAction: 'requires-choice' })
      conflict.action = resolveAction(conflict, decisions, untimestampedPolicy)
      conflicts.push(conflict)
      const finalValue = conflict.action === 'import' ? clone(incomingValue) : undefined
      plan.push({ key, localRaw, finalValue, action: conflict.action, status: 'local-invalid', conflicts: [conflict] })
      summary.conflicts += 1
      if (conflict.action === 'requires-choice') summary.needsChoice += 1
      else if (conflict.action === 'import') summary.import += 1
      else summary.keepLocal += 1
      continue
    }
    const info = keyInfo(key, normalizedBase)
    if (isMergeMode(info)) {
      const merged = mergeContainer(key, info, local.value, incomingValue, decisions, untimestampedPolicy)
      conflicts.push(...merged.conflicts)
      const finalRaw = rawValueFor(key, merged.value)
      plan.push({ key, localRaw, finalValue: merged.value, action: finalRaw === localRaw ? 'keep-local' : 'merge', status: merged.conflicts.length ? 'merged' : 'unchanged', conflicts: merged.conflicts })
      summary.conflicts += merged.conflicts.length
      for (const conflict of merged.conflicts) {
        if (conflict.action === 'requires-choice') summary.needsChoice += 1
        else if (conflict.action === 'import') summary.import += 1
        else summary.keepLocal += 1
      }
      if (!merged.conflicts.length && finalRaw === localRaw) summary.unchanged += 1
      continue
    }
    if (equalValue(local.value, incomingValue) || localRaw === rawValueFor(key, incomingValue)) {
      plan.push({ key, localRaw, finalValue: local.value, action: 'keep-local', status: 'unchanged', conflicts: [] })
      summary.unchanged += 1
      continue
    }
    const timestamps = conflictStatus(keyTimestamp(info, local.value), keyTimestamp(info, incomingValue))
    const conflict = baseConflict({ key, localTimestamp: keyTimestamp(info, local.value), incomingTimestamp: keyTimestamp(info, incomingValue), ...timestamps })
    conflict.action = resolveAction(conflict, decisions, untimestampedPolicy)
    conflicts.push(conflict)
    const finalValue = conflict.action === 'import' ? clone(incomingValue) : local.value
    plan.push({ key, localRaw, finalValue, action: conflict.action, status: conflict.status, conflicts: [conflict] })
    summary.conflicts += 1
    if (conflict.action === 'requires-choice') summary.needsChoice += 1
    else if (conflict.action === 'import') summary.import += 1
    else summary.keepLocal += 1
  }
  summary.keys = plan.length
  summary.canApply = summary.needsChoice === 0
  return { valid: true, errors: [], plan, conflicts, summary }
}

function emptySummary() {
  return { keys: 0, new: 0, unchanged: 0, conflicts: 0, needsChoice: 0, import: 0, keepLocal: 0, canApply: false }
}

/** Build an import preview. No localStorage mutation occurs here. */
export function previewStudyImport(payload, storage, options = {}) {
  const source = getStorage(storage)
  const result = makeImportPlan(payload, source, options)
  return {
    ...result,
    payload,
    ready: result.valid && result.summary.canApply,
    requiresChoice: result.valid && result.summary.needsChoice > 0,
  }
}

function rollbackStorage(storage, snapshots, attempted) {
  const errors = []
  for (const key of [...attempted].reverse()) {
    try {
      const previous = snapshots.get(key)
      if (previous == null) storage.removeItem(key)
      else storage.setItem(key, previous)
    } catch (error) {
      errors.push(`${key}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return errors
}

function dispatchImportEvents() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  for (const name of ['l1uj:study', 'l1uj:reading', 'l1uj:backup-imported']) {
    try { window.dispatchEvent(new CustomEvent(name)) } catch { /* non-browser test hosts */ }
  }
}

/**
 * Apply a previously previewed backup atomically for the affected keys.
 * `untimestampedPolicy` deliberately defaults to require: old records have no
 * trustworthy ordering information and must receive an explicit user choice.
 */
export function applyStudyImport(payload, storage, options = {}) {
  const source = getStorage(storage)
  const preview = previewStudyImport(payload, source, options)
  if (!preview.valid || preview.requiresChoice) {
    return { ...preview, applied: false, rolledBack: false }
  }
  const writes = preview.plan
    .map((item) => ({ ...item, raw: item.finalValue === undefined ? item.localRaw : rawValueFor(item.key, item.finalValue) }))
    .filter((item) => item.raw !== item.localRaw)
  if (!writes.length) {
    dispatchImportEvents()
    return { ...preview, applied: true, rolledBack: false, writtenKeys: [] }
  }
  const snapshots = new Map()
  for (const item of writes) {
    try { snapshots.set(item.key, source.getItem(item.key)) } catch (error) {
      return { ...preview, applied: false, rolledBack: false, error: `${item.key}: 写入前读取失败：${error instanceof Error ? error.message : String(error)}` }
    }
  }
  const attempted = []
  try {
    for (const item of writes) {
      attempted.push(item.key)
      source.setItem(item.key, item.raw)
      if (source.getItem(item.key) !== item.raw) throw new Error('写入后校验不一致')
    }
    dispatchImportEvents()
    return { ...preview, applied: true, rolledBack: false, writtenKeys: writes.map((item) => item.key) }
  } catch (error) {
    const rollbackErrors = rollbackStorage(source, snapshots, attempted)
    return {
      ...preview,
      applied: false,
      rolledBack: rollbackErrors.length === 0,
      rollbackErrors,
      writtenKeys: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Short aliases make the module convenient to consume from a Vue component.
export const createBackup = createStudyBackup
export const validateBackup = validateStudyBackup
export const previewImport = previewStudyImport
export const applyImport = applyStudyImport
