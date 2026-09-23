import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { prepareEnglishGuides } from './english-guides.mjs'
import { loadTeachingCatalog, supplementsForLesson } from './teaching.mjs'
import { extractCourseQuestions } from './course-question-index.mjs'
import { validateGuide, freshGuideState, validGuideState, guideResults, answerGuide, readGuideState } from '../runtime/guided-state.mjs'
import { lessonHtmlToMarkdown } from './lesson-convert.mjs'
import { createStudyBackup, applyStudyImport } from '../../docs/.vuepress/study-backup.mjs'

const root = new URL('../../docs/.vuepress/public/lessons/zsb-english/lessons/', import.meta.url)
const files = fs.readdirSync(root).filter(f => /^\d{4}-.*\.html$/.test(f))
const catalog = loadTeachingCatalog()
const prepared = files.map(file => {
  const id = String(Number(file.slice(0, 4)))
  const html = fs.readFileSync(new URL(file, root), 'utf8')
  const source = supplementsForLesson(catalog, 'zsb-english', id)
  return { id, html, source, ...prepareEnglishGuides(html, source, id) }
})

test('every English course has valid, serializable guides; generation is deterministic and keeps original quizzes', () => {
  assert.equal(prepared.length, 36)
  for (const course of prepared) {
    assert.ok(course.teaching?.sections.length, `missing course ${course.id}`)
    for (const section of course.teaching.sections) {
      assert.deepEqual(validateGuide(section.guide), [], `${course.id}/${section.id}`)
      assert.equal(validGuideState(freshGuideState(section.guide)), true)
      assert.ok(section.guide.steps.length < 100)
      for (const step of section.guide.steps) if (step.question) {
        assert.doesNotMatch(JSON.stringify(step.question), /存疑|答案有争议|答案待核|答案缺失/)
      }
    }
    const again = prepareEnglishGuides(course.html, course.source, course.id)
    assert.equal(again.html, course.html)
    assert.deepEqual(again.teaching, course.teaching)
    if (course.source) {
      const options = { slug: 'zsb-english', lessonId: course.id, source: '', title: '' }
      const raw = fs.readFileSync(new URL(files.find(f => Number(f.slice(0, 4)) === Number(course.id)), root), 'utf8')
      assert.deepEqual(extractCourseQuestions(raw, options), extractCourseQuestions(course.html, options))
    }
  }
  assert.deepEqual(prepared[0].teaching.sections[0].guide, catalog.subjects['zsb-english'].lessons['1'].sections[0].guide, 'manual pilot and its stored answer signature must stay intact')
})

test('all twelve papers retain per-question prompts, reference provenance, missing question and appendix', () => {
  for (const course of prepared.filter(c => Number(c.id) >= 25)) {
    assert.equal(course.teaching.sections.length, 5, course.id)
    const sections = course.teaching.sections
    assert.deepEqual(sections.map(s => s.guide.steps.length), [course.id === '25' ? 15 : 16, 6, 16, 11, 2], course.id)
    for (const section of sections) {
      assert.ok(course.html.includes(`id="${section.id}"`))
      for (const step of section.guide.steps.slice(1)) {
        assert.ok(step.context?.length)
        assert.ok(step.reference?.length)
        assert.equal(step.question, undefined, 'source paper answers are self-check only')
        assert.ok(step.reference.every(s => !s.includes('未提取到独立解析')), `${course.id}/${step.id}`)
      }
    }
    assert.equal(sections[4].guide.steps[1].writing, true)
    assert.ok(sections[4].guide.steps[1].reference.join('').length > 100, 'writing reference must not disappear')
  }
  const mock1 = prepared.find(c => c.id === '25')
  assert.ok(mock1.html.includes('第 15 题'))
  assert.ok(!mock1.teaching.sections[0].guide.steps.some(s => s.id === 'task-15'))
  assert.match(mock1.teaching.sections[0].guide.steps[1].reference.join(''), /课件标示/)
  const last = prepared.find(c => c.id === '36')
  assert.ok(last.html.includes('考前提醒'))
  assert.match(last.teaching.sections[2].guide.steps[1].context.join(''), /A\. jumped over/)
})

test('open work saves and restores drafts without counting them as correct answers', () => {
  const guide = prepared.find(c => c.id === '36').teaching.sections[4].guide
  const state = freshGuideState(guide)
  state.step = 1
  state.drafts = { task: 'Dear Mark,\nI would like to invite you…' }
  assert.equal(validGuideState(state), true)
  assert.deepEqual(answerGuide(state, guide.steps[1], 0), state)
  assert.equal(guideResults(guide, state).total, 0)
  assert.deepEqual(readGuideState(guide, 'test', { getItem: () => JSON.stringify(state) }), state)
  const key = 'l1uj-guided-v1:zsb-english:36:paper-5'
  const memory = () => {
    const data = new Map()
    return { get length() { return data.size }, key: i => [...data.keys()][i] ?? null,
      getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) }
  }
  const storage = memory()
  storage.setItem(key, JSON.stringify(state))
  const backup = createStudyBackup(storage, { now: 1000 })
  const target = memory()
  assert.equal(applyStudyImport(backup.backup, target).applied, true)
  assert.deepEqual(JSON.parse(target.getItem(key)).drafts, state.drafts)
  assert.equal(validGuideState({ ...state, drafts: { task: 'x'.repeat(6001) } }), false)
  const { body } = lessonHtmlToMarkdown('<main><h1>试卷</h1><h2 id="paper-5">写作</h2><p>原题仍在</p></main>', {
    slug: 'zsb-english', teaching: { ...prepared.find(c => c.id === '36').teaching, sections: [prepared.find(c => c.id === '36').teaching.sections[4]] },
  })
  assert.ok(body.includes(guide.steps[1].reflection))
  assert.ok(body.includes('参考要点（不自动判分）'))
  assert.ok(body.includes('原题仍在'))
})
