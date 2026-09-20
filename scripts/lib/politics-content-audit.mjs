import { validateFlashcard, validateQuestion } from '../runtime/politics-schema.mjs'

// Structural errors block delivery. Semantic heuristics are review candidates,
// not proof of correctness: political terminology often has no lexical overlap.
export function auditPoliticsContent(cards, questions) {
  const errors = [], warnings = [], duplicates = [], seenIds = new Set(), seenDefinitions = new Map()
  for (const [kind, entries, validate] of [['card', cards, c => validateFlashcard(c, { editorial: true })], ['question', questions, validateQuestion]]) {
    for (const item of entries) {
      const ref = `${kind}:${item?.id}`
      for (const reason of validate(item)) errors.push({ ref, reason })
      if (seenIds.has(ref)) errors.push({ ref, reason: 'duplicate-id' })
      seenIds.add(ref)
      for (const field of ['question', 'answer']) {
        const value = Array.isArray(item?.[field]) ? item[field].join('') : item?.[field]
        if (typeof value === 'string' && /\b(?:undefined|null)\b|\uFFFD|\n\s*\n|\r/.test(value)) errors.push({ ref, reason: `malformed-${field}` })
      }
      const q = item?.question || ''
      if (q.trim().length < 10) warnings.push({ ref, reason: 'short-question', text: q })
      if ([item?.chapter, item?.knowledgePoint, item?.source?.label].filter(Boolean).includes(q)) errors.push({ ref, reason: 'metadata-is-question' })
      if (/^【[^】]+】/.test(q)) errors.push({ ref, reason: 'metadata-prefix' })
      if (!/[？?（(]|什么|哪|谁|如何|为何|怎样|多少|何时|何年/.test(q)) warnings.push({ ref, reason: 'no-question-cue', text: q })
      if (item?.answerStatus && item.answerStatus !== 'provided') warnings.push({ ref, reason: `answer-${item.answerStatus}`, text: q })
      const key = kind + JSON.stringify([q.replace(/\s/g, ''), item?.options, item?.answer])
      if (seenDefinitions.has(key)) duplicates.push({ ref, sameAs: seenDefinitions.get(key), reason: 'same-question-answer' })
      else seenDefinitions.set(key, ref)
    }
  }
  return { cards: cards.length, questions: questions.length, errors, warnings, duplicates }
}
