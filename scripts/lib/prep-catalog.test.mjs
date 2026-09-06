import assert from 'node:assert/strict'
import test from 'node:test'
import { collectPrepLessons, filterPrepLessons } from './prep-catalog.mjs'

const computer = { slug: 'zsb-cs', numeric: true, skip: ['index', 'mistakes'] }

test('课次按数字排序，错题本和总览保留为工具，不占课号', () => {
  const lessons = collectPrepLessons(['0010-pointers.html', 'mistakes.html', '0002-types.html', 'index.html'], computer)
  assert.deepEqual(lessons.map(({ id, file }) => [id, file]), [['2', '0002-types.html'], ['10', '0010-pointers.html']])
})

test('重复课号、未知工具、空目录会中止同步，防止覆盖或清空发布内容', () => {
  assert.throws(() => collectPrepLessons(['0001-a.html', '0001-b.html'], computer), /重复课号/)
  assert.throws(() => collectPrepLessons(['review.html'], computer), /未分类/)
  assert.throws(() => collectPrepLessons(['index.html'], computer), /没有可发布/)
  assert.throws(() => collectPrepLessons(['0000-a.html'], computer), /正整数/)
})

test('政治保留毛中特、习概、时政课号及顺序', () => {
  const lessons = collectPrepLessons(['xg02.html', 'sz00.html', 'mzt01.html', 'mzt00.html', 'practice.html'],
    { slug: 'zsb-politics', numeric: false, skip: ['practice'], order: ['mzt', 'xg', 'sz'] })
  assert.deepEqual(lessons.map((lesson) => lesson.id), ['mzt00', 'mzt01', 'xg02', 'sz00'])
})

test('课程搜索组合匹配知识点、课号与分组，支持空结果和清除筛选', () => {
  const lessons = [
    { id: 'mzt01', label: 'mzt01', title: '毛泽东思想及其历史地位', group: '毛中特' },
    { id: 'xg01', label: 'xg01', title: '新时代坚持和发展中国特色社会主义', group: '习概' },
  ]
  assert.deepEqual(filterPrepLessons(lessons, ' MZT01 历史 '), [lessons[0]])
  assert.deepEqual(filterPrepLessons(lessons, '', '习概'), [lessons[1]])
  assert.deepEqual(filterPrepLessons(lessons, '不存在'), [])
  assert.deepEqual(filterPrepLessons(lessons), lessons)
})
