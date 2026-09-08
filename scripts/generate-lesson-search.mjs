import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COURSES } from '../docs/.vuepress/site-meta.mjs'
import { prepCatalog } from '../docs/.vuepress/prep-catalog.mjs'
import { prepSubjects, topicCourses } from '../docs/.vuepress/learning-data.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = dirname(scriptDir)
const docsDir = join(rootDir, 'docs')
const publicLessonsDir = join(docsDir, '.vuepress', 'public', 'lessons')
const outputPath = join(docsDir, '.vuepress', 'lesson-search-index.mjs')

const htmlEntities = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => htmlEntities[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function cleanHtmlText(value) {
  return decodeHtml(String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHeadings(html) {
  const headings = []
  const pattern = /<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi
  for (const match of html.matchAll(pattern)) {
    const heading = cleanHtmlText(match[3])
    if (!heading) continue
    const id = match[2].match(/\bid=["']([^"']+)["']/i)?.[1]
    headings.push({ heading, ...(id ? { href: `#${id}` } : {}) })
  }
  return headings
}

function parseFirstHeading(html, level = 1) {
  const match = html.match(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'i'))
  return match ? cleanHtmlText(match[1]) : ''
}

function readHtml(slug, relativePath) {
  const filePath = join(publicLessonsDir, slug, relativePath)
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function listHtmlFiles(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  } catch {
    return []
  }
}

function lessonHtmlInfo(slug, interactiveHref, fallbackName = '') {
  const relativePath = interactiveHref.replace(/^\/?(?:blog\/)?lessons\/[^/]+\//, '')
  const html = readHtml(slug, relativePath)
  return {
    title: parseFirstHeading(html) || fallbackName,
    chapterHits: parseHeadings(html),
  }
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseFrontmatter(markdown) {
  const block = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? ''
  const title = block.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const permalink = block.match(/^permalink:\s*(.+)$/m)?.[1]?.trim() ?? ''
  return {
    title: title.replace(/^['"]|['"]$/g, ''),
    permalink,
  }
}

function parseLessonLead(markdown) {
  const lead = markdown.match(/^>\s*([^\r\n]+)/m)?.[1] ?? ''
  const beforePipe = lead.split('｜')[0].trim()
  const parts = beforePipe.split('·').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return { group: '', label: beforePipe }
  return { group: parts[0], label: parts.slice(1).join(' · ') }
}

function lessonKind(title, isReference = false) {
  if (isReference || /速查|手册|词表|公式/.test(title)) return '速查'
  if (/概念|定义|导论|入门/.test(title)) return '概念课'
  if (/计算|极限|专练|练习|法则|替换|证明|实战|模拟|复盘|方法/.test(title)) return '计算课'
  if (/基础/.test(title)) return '概念课'
  return '课程'
}

function lessonLabel(id, title, leadLabel = '') {
  if (/^\d+$/.test(id)) return `第 ${Number(id)} 课`
  return leadLabel || id.toUpperCase() || title
}

function numericLessonRange(lessons) {
  const ids = lessons.map((lesson) => Number(lesson.id)).filter(Number.isInteger)
  if (!ids.length) return `${lessons.length} 个章节`
  const min = Math.min(...ids)
  const max = Math.max(...ids)
  return min === max ? `第 ${min} 课` : `第 ${min}–${max} 课`
}

function htmlLessonRecord(slug, lesson, options = {}) {
  const id = asText(lesson.id)
  const interactiveHref = asText(lesson.interactive || lesson.interactiveHref)
  const info = lessonHtmlInfo(slug, interactiveHref, lesson.title)
  const title = asText(lesson.title) || info.title
  return {
    id,
    label: asText(lesson.label) || lessonLabel(id, title),
    title,
    group: asText(lesson.group),
    kind: options.kind || 'lesson',
    kindLabel: options.kindLabel || lessonKind(title, options.kind === 'reference'),
    readingHref: asText(lesson.href || lesson.readingHref),
    interactiveHref,
    aliases: info.title && info.title !== title ? [info.title] : [],
    chapterHits: info.chapterHits,
  }
}

function buildPrepCourse(meta) {
  const source = prepCatalog[meta.slug]
  const lessons = source.lessons.map((lesson) => htmlLessonRecord(meta.slug, lesson))
  const referenceDir = join(publicLessonsDir, meta.slug, 'reference')
  const references = listHtmlFiles(referenceDir)
    .map((entry) => {
      const filename = entry.name
      const html = readHtml(meta.slug, `reference/${filename}`)
      const title = parseFirstHeading(html) || filename.replace(/\.html$/i, '')
      const number = filename.match(/^(\d+)/)?.[1] ?? ''
      return {
        id: number ? `ref-${number}` : `ref-${filename}`,
        label: number ? `速查 ${number}` : '速查资料',
        title,
        group: '速查资料',
        kind: 'reference',
        kindLabel: '速查',
        readingHref: `/lessons/${meta.slug}/reference/${filename}`,
        interactiveHref: '',
        aliases: [],
        chapterHits: parseHeadings(html),
      }
    })

  return {
    ...meta,
    lessonCount: lessons.length,
    lessonRange: numericLessonRange(lessons),
    courseHref: `/courses/${meta.slug}/`,
    interactiveHref: asText(source.interactive || meta.interactive),
    lessons,
    references,
  }
}

function findInteractiveHref(slug, markdown, id) {
  const link = markdown.match(/\]\((?:\/blog)?\/lessons\/([^\s)]+\.html)\)/)?.[1]
  if (link) return `/lessons/${link}`

  const lessonDir = join(publicLessonsDir, slug, 'lessons')
  const candidates = readdirSync(lessonDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name)
  const numericPrefix = /^\d+$/.test(id) ? id.padStart(4, '0') : id
  const file = candidates.find((name) => name.startsWith(`${numericPrefix}-`) || name === `${id}.html`)
  return file ? `/lessons/${slug}/lessons/${file}` : ''
}

function buildTopicCourse(meta) {
  const lessonDir = join(docsDir, 'courses', meta.slug, 'l')
  const lessons = readdirSync(lessonDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))
    .map((entry) => {
      const id = basename(entry.name, '.md')
      const markdown = readFileSync(join(lessonDir, entry.name), 'utf8')
      const frontmatter = parseFrontmatter(markdown)
      const lead = parseLessonLead(markdown)
      const title = frontmatter.title || id
      return htmlLessonRecord(meta.slug, {
        id,
        label: lessonLabel(id, title, lead.label),
        title,
        group: lead.group,
        href: frontmatter.permalink || `/courses/${meta.slug}/l/${id}/`,
        interactiveHref: findInteractiveHref(meta.slug, markdown, id),
      })
    })

  const referenceDir = join(publicLessonsDir, meta.slug, 'reference')
  const references = listHtmlFiles(referenceDir)
    .map((entry) => {
      const filename = entry.name
      const html = readHtml(meta.slug, `reference/${filename}`)
      const title = parseFirstHeading(html) || filename.replace(/\.html$/i, '')
      return {
        id: `ref-${filename.replace(/\.html$/i, '')}`,
        label: '参考资料',
        title,
        group: '参考资料',
        kind: 'reference',
        kindLabel: lessonKind(title, true),
        readingHref: `/lessons/${meta.slug}/reference/${filename}`,
        interactiveHref: '',
        aliases: [],
        chapterHits: parseHeadings(html),
      }
    })

  return {
    ...meta,
    lessonCount: lessons.length,
    lessonRange: numericLessonRange(lessons),
    courseHref: `/courses/${meta.slug}/`,
    interactiveHref: asText(meta.interactive),
    lessons,
    references,
  }
}

function courseMeta() {
  const prep = prepSubjects.map((subject) => ({ ...subject, group: '专升本备考' }))
  const topics = topicCourses.map((course) => ({ ...course }))
  const registered = new Map(COURSES.map((course) => [course.slug, course]))
  return [...prep, ...topics].filter((course) => registered.has(course.slug))
}

function generateIndex() {
  const courses = courseMeta().map((meta) => (
    prepCatalog[meta.slug] ? buildPrepCourse(meta) : buildTopicCourse(meta)
  ))
  const output = [
    '// Generated by node scripts/generate-lesson-search.mjs. Do not edit by hand.',
    '// Source: docs/.vuepress/prep-catalog.mjs, learning-data.mjs, courses/*/l and public/lessons.',
    `export const lessonSearchIndex = ${JSON.stringify({ version: 1, courses }, null, 2)}`,
    'export default lessonSearchIndex',
    '',
  ].join('\n')
  writeFileSync(outputPath, output, 'utf8')
  return { outputPath, courses }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { outputPath: generatedPath, courses } = generateIndex()
  console.log(`Generated ${generatedPath} (${courses.length} courses, ${courses.reduce((sum, course) => sum + course.lessonCount, 0)} lessons)`)
}

export { generateIndex }
