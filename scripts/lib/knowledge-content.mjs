import path from 'node:path'
import { parseFrontmatter } from './learn-utils.mjs'

const DOCUMENT_NAMES = {
  context: '课程术语与学习约定',
  glossary: '术语表',
  roadmap: '学习路线图',
  design: '课程设计',
  standards: '教学与页面规范',
}

function plainTitle(value) {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').trim()
}

/** Titles describe the document; filenames and existing permalinks remain stable. */
export function knowledgeTitle(text, relativePath) {
  const { fm, body } = parseFrontmatter(text)
  const stem = path.posix.basename(relativePath.replace(/\\/g, '/'), '.md')
  if (DOCUMENT_NAMES[stem.toLowerCase()]) return DOCUMENT_NAMES[stem.toLowerCase()]
  const heading = body.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1]
  const rawTitle = text.match(/^title:\s*(.+)$/m)?.[1]
  let existing = fm?.title
  if (rawTitle?.startsWith('"')) {
    try { existing = JSON.parse(rawTitle) } catch { /* Keep the source title when it is not JSON-quoted. */ }
  }
  const title = heading || existing || stem
  return plainTitle(title)
    .replace(/^ADR\s*[- ]?(\d+)\s*[:：]\s*/i, '决策 $1 · ')
    .replace(/^Spec\s*[- ]?(\d+)\s*[:：]\s*/i, '规范 $1 · ')
}

/** VuePress renders the page title from frontmatter; remove only the leading H1. */
export function stripLeadingH1(body) {
  return body.replace(/^(?:\uFEFF)?\s*#\s+[^\r\n]+(?:\r?\n|$)\s*/, '')
}

/** Preserve unrecognized/nested frontmatter and permalink while replacing display title. */
export function normalizeKnowledgeDocument(text, { relativePath, permalink, createTime }) {
  const title = knowledgeTitle(text, relativePath)
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const fields = block?.[1] ?? ''
  const setField = (source, key, value) => {
    const line = `${key}: ${JSON.stringify(value)}`
    const pattern = new RegExp(`^${key}:.*$`, 'm')
    return pattern.test(source) ? source.replace(pattern, () => line) : `${source}${source ? '\n' : ''}${line}`
  }
  let metadata = setField(fields, 'title', title)
  if (!/^permalink:/m.test(metadata)) metadata = setField(metadata, 'permalink', permalink)
  if (!/^createTime:/m.test(metadata)) metadata = setField(metadata, 'createTime', createTime)
  const body = block ? text.slice(block[0].length) : text
  return `---\n${metadata}\n---\n\n${stripLeadingH1(body).trim()}\n`
}

export function referenceTitle(html, fallback) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    || fallback
  return title.replace(/<[^>]*>/g, '').split('|')[0].trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

/** A record sequence is not a lesson number. Omit links without explicit evidence. */
export function resolveRecordLesson({ filename, title = '', body = '' }, lessons) {
  const explicitFiles = [...body.matchAll(/\]\([^\s)]*\/lessons\/([^/\s)#?]+\.html)(?:[?#][^\s)]*)?\)/g)]
    .map((match) => {
      try { return decodeURIComponent(match[1]) } catch { return match[1] }
    })
  const explicit = lessons.filter((lesson) => explicitFiles.includes(lesson.file))
  if (explicit.length === 1) return explicit[0]
  if (explicit.length > 1) return null
  const lessonNumber = title.match(/第\s*(\d+)\s*课/)?.[1]
  if (lessonNumber) return lessons.find((lesson) => lesson.no === Number(lessonNumber)) ?? null
  const stem = filename.replace(/^\d+-/, '').replace(/\.md$/, '')
  return lessons.find((lesson) => lesson.file.replace(/^\d+-/, '').replace(/\.html$/, '') === stem) ?? null
}
