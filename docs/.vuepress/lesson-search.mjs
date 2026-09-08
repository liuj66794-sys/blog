import { lessonSearchIndex } from './lesson-search-index.mjs'

/**
 * Keep search data serialisable so the same module works during VuePress SSR
 * and in the hydrated browser. The generated index is intentionally imported
 * from a separate file; this module must never read from node:fs.
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '')
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asText(value) {
  return typeof value === 'string' ? value : ''
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeChapter(chapter) {
  if (typeof chapter === 'string') return { heading: chapter }
  return {
    heading: asText(chapter?.heading || chapter?.title),
    href: asText(chapter?.href),
  }
}

function normalizeLesson(lesson) {
  const chapterHits = asArray(lesson?.chapterHits)
    .map(normalizeChapter)
    .filter((chapter) => chapter.heading)

  return {
    id: asText(lesson?.id),
    label: asText(lesson?.label),
    title: asText(lesson?.title),
    group: asText(lesson?.group),
    kind: asText(lesson?.kind) || 'lesson',
    kindLabel: asText(lesson?.kindLabel) || '课程',
    readingHref: asText(lesson?.readingHref || lesson?.href),
    interactiveHref: asText(lesson?.interactiveHref || lesson?.interactive),
    aliases: asArray(lesson?.aliases).map(asText).filter(Boolean),
    chapterHits,
  }
}

function normalizeCourse(course, slug = '') {
  const lessons = asArray(course?.lessons).map(normalizeLesson)
  const references = asArray(course?.references).map((reference) => ({
    ...normalizeLesson(reference),
    kind: asText(reference?.kind) || 'reference',
    kindLabel: asText(reference?.kindLabel) || '速查',
  }))

  return {
    slug: asText(course?.slug) || slug,
    name: asText(course?.name),
    short: asText(course?.short),
    group: asText(course?.group),
    mark: asText(course?.mark),
    tone: asText(course?.tone),
    description: asText(course?.description),
    topics: asText(course?.topics),
    lessonCount: Number.isFinite(course?.lessonCount) ? course.lessonCount : lessons.length,
    lessonRange: asText(course?.lessonRange),
    courseHref: asText(course?.courseHref || `/courses/${asText(course?.slug)}/`),
    interactiveHref: asText(course?.interactiveHref || course?.interactive),
    aliases: asArray(course?.aliases).map(asText).filter(Boolean),
    lessons,
    references,
  }
}

/**
 * Normalise either the generated `{ courses: [...] }` shape or a plain course
 * array/object. Accepting a keyed object keeps the contract useful to tests
 * and to future catalog producers without coupling the browser to prep data.
 */
export function buildLessonSearchIndex(source = lessonSearchIndex) {
  const courses = Array.isArray(source)
    ? source
    : Array.isArray(source?.courses)
      ? source.courses
      : Object.entries(source || {}).map(([slug, course]) => ({ ...course, slug }))

  return courses.map((course) => normalizeCourse(course, course?.slug))
}

export const createLessonSearchIndex = buildLessonSearchIndex

function searchableCourseText(course) {
  return normalizeSearchText([
    course.name,
    course.short,
    course.group,
    course.description,
    course.topics,
    ...course.aliases,
  ].join(' '))
}

function searchableLessonText(lesson) {
  return normalizeSearchText([
    lesson.id,
    lesson.label,
    lesson.title,
    lesson.group,
    lesson.kindLabel,
    ...lesson.aliases,
  ].join(' '))
}

function chapterMatches(lesson, query) {
  return lesson.chapterHits.filter((chapter) => normalizeSearchText(chapter.heading).includes(query))
}

function matchLesson(lesson, query, isReference = false) {
  const matches = []
  if (searchableLessonText(lesson).includes(query)) matches.push(isReference ? 'reference' : 'lesson')
  const chapters = chapterMatches(lesson, query)
  if (chapters.length) matches.push('chapter')
  if (!matches.length) return null

  return {
    ...lesson,
    chapterHits: chapters,
    matchFields: unique(matches),
  }
}

function includeCourse(course, group) {
  if (!group || group === '全部') return course.group !== '已归档'
  return course.group === group
}

/**
 * Return one result per course. Lesson and reference hits remain nested under
 * that course so a broad topic such as “极限” is easy to scan without turning
 * the page into a flat list of duplicate course cards.
 */
export function searchLessons(index, query = '', options = {}) {
  const normalizedIndex = buildLessonSearchIndex(index)
  const text = normalizeSearchText(query).trim()
  const group = asText(options.group)
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : Infinity

  return normalizedIndex
    .filter((course) => includeCourse(course, group))
    .map((course) => {
      if (!text) {
        return {
          ...course,
          lessons: [],
          references: [],
          matchedCount: 0,
          courseMatched: false,
          matchFields: [],
        }
      }

      const courseMatched = searchableCourseText(course).includes(text)
      const lessons = course.lessons
        .map((lesson) => matchLesson(lesson, text))
        .filter(Boolean)
      const references = course.references
        .map((reference) => matchLesson(reference, text, true))
        .filter(Boolean)
      const matchFields = unique([
        ...(courseMatched ? ['course'] : []),
        ...lessons.flatMap((lesson) => lesson.matchFields),
        ...references.flatMap((reference) => reference.matchFields),
      ])

      return {
        ...course,
        lessons,
        references,
        matchedCount: lessons.length + references.length,
        courseMatched,
        matchFields,
      }
    })
    .filter((course) => !text || course.courseMatched || course.matchedCount > 0)
    .slice(0, limit)
}

export const defaultLessonSearchIndex = buildLessonSearchIndex()

/**
 * Build a same-site return context. `pathname` is expected to be the
 * VuePress route path without the deployment base (`/blog/`); query values
 * are encoded once by URLSearchParams and can therefore be safely placed in
 * a `returnTo` URL parameter.
 */
export function createReturnTo(pathname = '/', query = {}, hash = '') {
  let path = asText(pathname) || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) path = '/'

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) params.append(key, String(item))
    }
  }
  const search = params.toString()
  const safeHash = asText(hash)
  return `${path}${search ? `?${search}` : ''}${safeHash ? (safeHash.startsWith('#') ? safeHash : `#${safeHash}`) : ''}`
}

/**
 * Add the configured deployment base before creating a return context. The
 * lesson shell receives a complete same-site path such as
 * `/blog/courses/?q=极限`, which lets it validate the destination against the
 * current VuePress base before navigating back.
 */
export function makeSearchReturnTo(pathname = '/', query = {}, hash = '', base = '') {
  const prefix = asText(base).replace(/\/+$/, '')
  const rawPath = asText(pathname)
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  return createReturnTo(`${prefix}${path}`, query, hash)
}

/**
 * Append the return context to an internal relative target while preserving
 * any existing target query/hash. The destination lesson shell can read
 * `new URL(location.href).searchParams.get('returnTo')` and navigate there.
 */
export function appendReturnTo(target, returnTo) {
  const value = asText(target)
  const context = asText(returnTo)
  if (!value || !context) return value

  const hashIndex = value.indexOf('#')
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex)
  const withoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex)
  const queryIndex = withoutHash.indexOf('?')
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex)
  const existing = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1)
  const params = new URLSearchParams(existing)
  params.set('returnTo', context)
  return `${pathname}?${params.toString()}${hash}`
}

export const withReturnTo = appendReturnTo
