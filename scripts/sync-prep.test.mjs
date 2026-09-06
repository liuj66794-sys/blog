import assert from 'node:assert/strict'
import test from 'node:test'
import { renderReadme, renderSubject, stripUnmirroredLinks } from './sync-prep.mjs'

const plan = {
  examDate: '2027-03-27',
  general: '保留原学习计划正文。',
  weeks: [
    { no: 1, label: 'W1', start: '09-07', end: '09-13', phase: '强化刷题', items: { 全科: '复习基础' } },
    { no: 2, label: 'W2', start: '01-04', end: '01-10', phase: '真题两轮', items: { 全科: '真题练习' } },
    { no: 3, label: 'W3', start: '03-22', end: '03-27', phase: '冲刺押题', items: { 全科: '错题复习' } },
  ],
}

test('镜像保留公开配套资源，去除本机笔记跳转且保留来源文字', () => {
  const result = stripUnmirroredLinks(`<a href="obsidian://open?vault=notes">原文笔记</a>
    <a href='../private/a.md'>课程来源</a><a href="../reference/terms.html">术语表</a>`, { keep: ['reference'] })
  assert.ok(result.includes('原文笔记') && result.includes('课程来源'))
  assert.ok(!result.includes('obsidian:') && !result.includes('../private'))
  assert.ok(result.includes('href="../reference/terms.html"'))
})

test('备考首页的四科入口在长计划之前，保留倒计时和计划正文', () => {
  const page = renderReadme(plan)
  assert.ok(page.indexOf('<PrepDashboard />') < page.indexOf(plan.general))
  assert.equal((page.match(/<PrepDashboard \/>/g) ?? []).length, 1)
  assert.doesNotMatch(page, /\| 科目 \| 周打卡/)
  assert.match(page, /id="exam-countdown" data-exam="2027-03-27"/)
  assert.match(page, /id="prep-now"/)
  assert.match(page, /\| W3 \| 03-22 ~ 03-27 \|/)
})

test('四科计划提供可部署的互动入口和课程目录，打卡键保持不变', () => {
  for (const [key, slug, course, interactive] of [
    ['高数', 'gaoshu', 'zsb-math', '/blog/lessons/zsb-math/'],
    ['英语', 'yingyu', 'zsb-english', '/blog/lessons/zsb-english/lessons/course.html'],
    ['政治', 'zhengzhi', 'zsb-politics', '/blog/lessons/zsb-politics/'],
    ['计算机', 'jisuanji', 'zsb-cs', '/blog/lessons/zsb-cs/lessons/index.html'],
  ]) {
    const page = renderSubject({ key, slug }, plan)
    assert.ok(page.includes(`](${interactive})`), key)
    assert.ok(page.includes(`](/courses/${course}/)`), key)
    assert.ok(page.includes(`permalink: /prep/${slug}/`), key)
    assert.ok(page.includes('id="prep-progress"'), key)
    for (const week of plan.weeks) assert.ok(page.includes(`data-key="w${week.no}"`), key)
    assert.doesNotMatch(page, /\]\(\/lessons\//)
  }
})
