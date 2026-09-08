import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  appendReturnTo,
  buildLessonSearchIndex,
  defaultLessonSearchIndex,
  makeSearchReturnTo,
  normalizeSearchText,
  searchLessons,
} from '../../docs/.vuepress/lesson-search.mjs'
import { lessonSearchIndex } from '../../docs/.vuepress/lesson-search-index.mjs'

test('静态索引覆盖四科与五门专题课程，并保留真实课次范围', () => {
  assert.equal(lessonSearchIndex.courses.length, 9)
  const index = buildLessonSearchIndex(lessonSearchIndex)
  assert.deepEqual(index.map((course) => course.slug), [
    'zsb-math',
    'zsb-english',
    'zsb-politics',
    'zsb-cs',
    'pi-agent',
    'engineering-skills',
    'a-shares',
    'english',
    'policy',
  ])
  for (const course of index) {
    assert.ok(course.lessonCount > 0, `${course.slug} 缺少讲义数`)
    assert.equal(course.lessons.length, course.lessonCount, `${course.slug} 课次索引不完整`)
    assert.match(course.lessonRange, /\d/)
  }
})

test('洛必达检索直达高数第 14 课，并返回章节命中', () => {
  const [course] = searchLessons(defaultLessonSearchIndex, ' 洛必达 ')
  assert.equal(course.slug, 'zsb-math')
  assert.equal(course.matchedCount, 1)
  assert.equal(course.lessons[0].id, '14')
  assert.equal(course.lessons[0].kindLabel, '计算课')
  assert.equal(course.lessons[0].interactiveHref, '/lessons/zsb-math/lessons/0014-洛必达法则.html')

  const [chapterCourse] = searchLessons(defaultLessonSearchIndex, '未定式')
  const chapterLesson = chapterCourse.lessons.find((lesson) => lesson.id === '14')
  assert.ok(chapterLesson)
  assert.ok(chapterLesson.chapterHits.some(({ heading }) => heading.includes('未定式')))
})

test('极限检索按课程聚合，同时区分概念课、计算课与速查资料', () => {
  const [course] = searchLessons(defaultLessonSearchIndex, '极限')
  assert.equal(course.slug, 'zsb-math')
  assert.ok(course.lessons.some((lesson) => lesson.id === '10' && lesson.kindLabel === '概念课'))
  assert.ok(course.lessons.some((lesson) => lesson.id === '11' && lesson.kindLabel === '计算课'))
  assert.ok(course.references.some((reference) => reference.kindLabel === '速查'))
  assert.ok(course.references.some((reference) => reference.title.includes('极限速查')))
  assert.ok(course.lessons.some((lesson) => lesson.chapterHits.length > 0))
})

test('专题课程可按真实课次标题检索，归档课程通过归档筛选仍可访问', () => {
  const engineering = searchLessons(defaultLessonSearchIndex, 'grill', { group: '专题学习' })
  assert.equal(engineering.length, 1)
  assert.equal(engineering[0].slug, 'engineering-skills')
  assert.ok(engineering[0].lessons.some((lesson) => lesson.title.includes('grill')))

  assert.deepEqual(searchLessons(defaultLessonSearchIndex, '政策', { group: '全部' }), [])
  const archived = searchLessons(defaultLessonSearchIndex, '政策', { group: '已归档' })
  assert.equal(archived[0].slug, 'policy')
  assert.equal(archived[0].courseMatched, true)
})

test('返回上下文是同站相对路径并且只编码一次', () => {
  assert.equal(normalizeSearchText(' 第　14 课 '), '第14课')
  const returnTo = makeSearchReturnTo('/courses/', { q: '洛必达', group: '专升本备考' }, '', '/blog/')
  assert.equal(returnTo, '/blog/courses/?q=%E6%B4%9B%E5%BF%85%E8%BE%BE&group=%E4%B8%93%E5%8D%87%E6%9C%AC%E5%A4%87%E8%80%83')
  const target = appendReturnTo('/lessons/zsb-math/lessons/0014-洛必达法则.html', returnTo)
  const parsed = new URL(target, 'https://example.test')
  assert.equal(parsed.pathname, '/lessons/zsb-math/lessons/0014-%E6%B4%9B%E5%BF%85%E8%BE%BE%E6%B3%95%E5%88%99.html')
  assert.equal(parsed.searchParams.get('returnTo'), returnTo)
})

test('浏览器搜索模块不依赖 node:fs，生成器才负责读目录', () => {
  const source = readFileSync(new URL('../../docs/.vuepress/lesson-search.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /(?:from|import)\s+['"]node:fs/)
})
