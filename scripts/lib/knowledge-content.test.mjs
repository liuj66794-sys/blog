import test from 'node:test'
import assert from 'node:assert/strict'
import { knowledgeTitle, normalizeKnowledgeDocument, referenceTitle, resolveRecordLesson, stripLeadingH1 } from './knowledge-content.mjs'

test('knowledge publishing replaces filename titles without changing saved URLs or metadata', () => {
  const document = '---\ntitle: 0001-mobile-single-file-inline\npermalink: /knowledge/engineering-skills/docs/adr/0001-mobile-single-file-inline/\ncreateTime: 2026/08/21 12:19:23\ntags:\n  - 移动端\n---\n# 手机版采用单文件内联分发\n\n正文\n\n## 影响\n后果\n'
  const options = { relativePath: 'docs/adr/0001-mobile-single-file-inline.md', permalink: '/changed/', createTime: 'new' }
  const result = normalizeKnowledgeDocument(document, options)
  assert.match(result, /title: "手机版采用单文件内联分发"/)
  assert.match(result, /permalink: \/knowledge\/engineering-skills\/docs\/adr\/0001-mobile-single-file-inline\//)
  assert.match(result, /createTime: 2026\/08\/21 12:19:23\ntags:\n  - 移动端/)
  assert.doesNotMatch(result, /^# /m)
  assert.match(result, /^## 影响/m)
  assert.equal(normalizeKnowledgeDocument(result, options), result)
})

test('stable document names and human headings work with Windows paths and colon titles', () => {
  assert.equal(knowledgeTitle('# CONTEXT.md — 工作区\n', 'CONTEXT.md'), '课程术语与学习约定')
  assert.equal(knowledgeTitle('# Agent 求职课程 Glossary\n', 'GLOSSARY.md'), '术语表')
  assert.equal(knowledgeTitle('# ADR 0004: AI 辅助三档工具栈与红线\n', 'docs\\adr\\0004-ai.md'), '决策 0004 · AI 辅助三档工具栈与红线')
  assert.match(normalizeKnowledgeDocument('# 术语: 示例\n\n正文', { relativePath: 'note.md', permalink: '/note/', createTime: '2026-09-05' }), /title: "术语: 示例"/)
  assert.equal(stripLeadingH1('正文\n\n# 正文内的标题\n'), '正文\n\n# 正文内的标题\n')
  assert.equal(referenceTitle('<title>C &amp; 数据结构 | 课程</title>', 'raw-filename'), 'C & 数据结构')
})

const lessons = [
  { no: 2, file: '0002-exchanges-and-boards.html' },
  { no: 5, file: '0005-trading-fees.html' },
  { no: 4, file: '0004-to-tickets.html' },
]

test('record 0002 reporting lesson 5 links to lesson 5, never sequence number 2', () => {
  assert.equal(resolveRecordLesson({ filename: '0002-lesson-5-trading-fees-completed.md', title: '第 5 课完成记录：交易费用' }, lessons)?.no, 5)
  assert.equal(resolveRecordLesson({ filename: '0002-trading-fees.md' }, lessons)?.no, 5)
})

test('uncertain record matches are omitted; a single explicit source link is authoritative', () => {
  assert.equal(resolveRecordLesson({ filename: '0005-to-tickets-understanding.md', title: 'to-tickets 的核心机制' }, lessons), null)
  assert.equal(resolveRecordLesson({ filename: '0005-record.md', body: '[讲义](../lessons/0004-to-tickets.html)' }, lessons)?.no, 4)
  assert.equal(resolveRecordLesson({ filename: '0005-record.md', body: '[A](../lessons/0004-to-tickets.html) [B](../lessons/0005-trading-fees.html)' }, lessons), null)
})
