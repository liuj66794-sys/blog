const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const safe = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value) && !['constructor', 'prototype'].includes(value)
export const isCsLearningKey = key => key === 'zhixu:cs-pointer:1' || /^zhixu:cs-course:(?:[1-9]|1\d|2\d):1$/.test(key)
export function validCsLearningState(value) {
  if (!plain(value) || value.version !== 1 || !safe(value.step)) return false
  if (Object.keys(value).some(k => !['version','step','answers','labs','updatedAt','signature'].includes(k))) return false
  if (value.updatedAt !== undefined && (!Number.isSafeInteger(value.updatedAt) || value.updatedAt < 0)) return false
  if (value.signature !== undefined && (typeof value.signature !== 'string' || value.signature.length > 80)) return false
  if (!plain(value.answers) || !plain(value.labs) || Object.keys(value.answers).length > 100 || Object.keys(value.labs).length > 100) return false
  return Object.entries(value.answers).every(([id, a]) => safe(id) && plain(a)
    && Object.keys(a).every(k => ['choice','submitted'].includes(k))
    && Number.isInteger(a.choice) && a.choice >= 0 && a.choice < 20 && typeof a.submitted === 'boolean')
    && Object.entries(value.labs).every(([id, n]) => safe(id) && Number.isInteger(n) && n >= 0 && n < 100)
}
