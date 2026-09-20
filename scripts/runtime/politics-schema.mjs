// Canonical content contracts. Legacy parsing belongs to the build/import layer.
const nonempty = value => typeof value === 'string' && value.trim().length > 0
export function validateFlashcard(card, { editorial = false } = {}) {
  const errors = []
  for (const field of ['id', 'lessonId', 'question', 'answer']) if (!nonempty(card?.[field])) errors.push(field)
  if (card?.schemaVersion !== 1 || !Number.isInteger(card?.contentVersion) || card.contentVersion < 1) errors.push('version')
  for (const field of ['knowledgePoint', 'chapter']) if (typeof card?.[field] !== 'string') errors.push(field)
  if (!card?.source || typeof card.source.label !== 'string') errors.push('source')
  if (['term', 'front', 'back'].some(key => key in (card || {}))) errors.push('duplicate-content')
  if (editorial && card?.editorialStatus !== 'reviewed') errors.push('editorial-review-required')
  if (editorial && nonempty(card?.question) && (card.question.trim().length < 10 || !/[？?]/.test(card.question) || card.question === card.knowledgePoint)) errors.push('independent-question-required')
  return errors
}
export function validateQuestion(q) {
  const errors = []
  const options = Array.isArray(q?.options) ? q.options : []
  if (q?.schemaVersion !== 1 || !Number.isInteger(q?.contentVersion) || q.contentVersion < 1 || !nonempty(q?.id) || !nonempty(q?.lessonId) || !nonempty(q?.question)) errors.push('identity/question')
  if (q?.kind !== 'choice' || !Array.isArray(q.options) || q.options.length < 2) errors.push('options')
  else if (options.some(o => !nonempty(o?.value) || !nonempty(o?.text)) || new Set(options.map(o => o?.value)).size !== options.length) errors.push('options')
  if (!Array.isArray(q?.answer) || new Set(q.answer).size !== q.answer.length || q.answer.some(a => !options.some(o => o?.value === a))) errors.push('answer')
  if (!['provided', 'missing', 'doubt'].includes(q?.answerStatus) || (q?.answerStatus === 'provided' && !q.answer?.length)) errors.push('answerStatus')
  for (const field of ['chapter', 'knowledgePoint', 'explanation']) if (typeof q?.[field] !== 'string') errors.push(field)
  if (!q?.source || typeof q.source.label !== 'string' || typeof q.source.path !== 'string') errors.push('source')
  if ('stem' in (q || {})) errors.push('duplicate-question')
  return errors
}

// The unified, multi-subject notebook still uses stem/source strings. This is a
// one-way projection of canonical content, never a second editable definition.
export function questionForNotebook(q) {
  const errors = validateQuestion(q)
  if (errors.length) throw new Error(`Invalid politics question ${q?.id}: ${errors.join(', ')}`)
  return { ...q, id: `zsb-politics:bank:${q.id}`, slug: 'zsb-politics', ref: q.id,
    stem: q.question, source: q.source.path, sourceMetadata: q.source, sourceLabel: q.source.label,
    title: q.chapter || q.source.paperTitle || '', doubt: q.answerStatus === 'doubt', legacyHtml: false }
}
