import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { readPoliticsPayload } from './politics-data.mjs'
import { auditPoliticsContent } from './politics-content-audit.mjs'
const root = new URL('../../docs/.vuepress/public/lessons/zsb-politics/lessons/', import.meta.url)
const cards = readPoliticsPayload(fs.readFileSync(new URL('srs.html', root), 'utf8'), 'cards')
const questions = readPoliticsPayload(fs.readFileSync(new URL('review.html', root), 'utf8'), 'bank')
test('full political content has no structural or editorial contract errors', () => {
  const result = auditPoliticsContent(cards, questions)
  assert.equal(result.cards, 669); assert.equal(result.questions, 1380)
  assert.deepEqual(result.errors, [])
})
test('audit detects empty, title-only, metadata, bad options, invalid answers and repeated definitions', () => {
  const c = cards[0], q = questions[0]
  const result = auditPoliticsContent([
    { ...c, id: 'empty', question: '', answer: '' },
    { ...c, id: 'title', question: c.knowledgePoint },
    { ...c, id: 'meta', question: '【导论】一个完整问题？' },
    { ...c, id: 'invalid', answer: 'undefined\n\nnull' },
    { ...c, id: 'duplicate-a' }, { ...c, id: 'duplicate-b' },
  ], [{ ...q, options: [], answer: ['Z'] }])
  for (const reason of ['question', 'answer', 'independent-question-required', 'metadata-is-question', 'metadata-prefix', 'malformed-answer', 'options']) assert.ok(result.errors.some(e => e.reason === reason), reason)
  assert.equal(result.duplicates.length, 1)
})
