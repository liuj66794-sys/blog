#!/usr/bin/env node
/**
 * sync-learn.mjs —— 把本地学习仓库（D:\01-Documents\learn）同步进站点。
 *
 * 1. 讲义镜像（收录名单）→ docs/.vuepress/public/lessons/<slug>/（只发布
 *                          lessons/assets/reference 等被站点引用的内容，
 *                          保留相对链接与随堂测交互；私人笔记不进公开镜像）
 * 2. 学习记录 → 博客文章  → docs/blog/<slug>/*.md（补 frontmatter，重写相对链接）
 * 3. 知识库文档          → docs/knowledge/<slug>/（保留相对层级，站内链接不散）
 * 4. 课程目录页          → docs/courses/<slug>/README.md（有模块信息时按模块分页）
 * 5. 知识库索引页        → docs/knowledge/<slug>/README.md
 *
 * 增量：按 mtime 跳过未变更文件（复制后用 utimesSync 回写源 mtime）。
 * 幂等：镜像目录会删除源端已不存在的多余文件。
 *
 * 用法：node scripts/sync-learn.mjs [--force]   （--force 忽略 mtime 全量复制）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// base 单一数据来源：site-meta.mjs。讲义是 public/ 下的静态 .html，VuePress 不会
// 给这类链接自动加 base，生成 Markdown 时必须显式拼上，否则子路径部署点击即 404。
// 纯函数（frontmatter/链接重写/摘要提取等）在 lib/learn-utils.mjs，有 node:test 单测。
import { COURSES } from '../docs/.vuepress/site-meta.mjs'
import {
  buildFrontmatter,
  extractDescription,
  extractLessonText,
  fmtTime,
  minimatchName,
  parseFrontmatter,
  rewriteRelativeLinks,
  rewriteRootDocLinks,
  sameMtime,
  walk,
  withBase,
} from './lib/learn-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS = path.resolve(__dirname, '..', 'docs')
const PUBLIC_LESSONS = path.join(DOCS, '.vuepress', 'public', 'lessons')
const LEARN_ROOT = process.env.LEARN_ROOT || 'D:\\01-Documents\\learn'
const FORCE = process.argv.includes('--force')
/** 镜像暂存目录（.vuepress 下，不进 public、不随构建拷贝），换入成功/失败都在结束时清理 */
const STAGING_DIR = '.staging-lessons'

/** 镜像时跳过的目录名（含所有点目录：.git/.playwright-mcp/.hallmark 等本地工具状态） */
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'tools'])

function isExcludedDir(name) {
  return EXCLUDE_DIRS.has(name) || name.startsWith('.')
}

/**
 * 镜像只发布站点真正引用的内容（项目根一级收录名单，名单内子树仍递归全量）：
 * - lessons/assets/reference/modules：课程目录页、知识库参考表与讲义内部导航引用
 * - index.html：工程技能根导航页（学习地图）
 * - MISSION/RESOURCES/GLOSSARY/ROADMAP/课程总纲：讲义导航栏直接链接的根文档
 * NOTES.md、learning-records/ 等内部工作文件不进公开镜像——
 * 学习记录经博客渠道发布，总纲/术语表/CONTEXT/SPEC 等经知识库渠道发布。
 * mobile/ 移动版学习地图无入口且内部链接本就断裂，不发布（learn 仓库保留）。
 * tokens.css 是 lesson.css 的设计令牌依赖（CSS url() 引用），必须随镜像发布。
 */
const MIRROR_KEEP = new Set([
  'lessons', 'assets', 'reference', 'modules', 'index.html',
  'MISSION.md', 'RESOURCES.md', 'GLOSSARY.md', 'ROADMAP.md', '课程总纲.md', 'tokens.css',
])

/** 收录名单中的根级 md——知识库根文档链接重写的目标名单 */
const ROOT_DOC_NAMES = [...MIRROR_KEEP].filter((n) => n.endsWith('.md'))

/** 知识库收录的根级 md（存在才收；支持 * 通配） */
const KNOWLEDGE_ROOT_FILES = ['课程总纲.md', 'CONTEXT.md', 'GLOSSARY.md', 'ROADMAP.md', 'design.md', 'STANDARDS.md', 'SPEC-*.md']
/** 知识库收录的子目录（整体保留相对层级） */
const KNOWLEDGE_DIRS = ['docs', 'specs', 'modules']

const PROJECTS = [
  {
    src: 'gupiao', sub: '', slug: 'a-shares', name: 'A 股入门',
    tags: ['A 股入门', '投资'],
    desc: '22 周 A 股投资课程：从概念扫盲到实战。每课 40 分钟三段式——20 分钟输入、15 分钟动手、5 分钟费曼自测。',
    plan: '按《[22 周课程总纲](/knowledge/a-shares/)》滚动生成，每周新增讲义。',
  },
  {
    src: 'pi_agent_learning', sub: '', slug: 'pi-agent', name: 'TypeScript Agent',
    tags: ['TypeScript Agent', 'TypeScript'],
    desc: '用 TypeScript 从零构建命令行 Agent：环境搭建、类型系统、模块与 npm scripts、异步、文件系统、子进程。',
  },
  {
    src: 'mattpocock-skills-learning', sub: '', slug: 'engineering-skills', name: '工程技能',
    tags: ['工程技能', 'AI 工具链'],
    desc: 'Matt Pocock 的 AI 工程技能课程：grill、to-spec、to-tickets、implement、diagnosing-bugs、wayfinder 等技能的原理与实战。',
  },
  {
    src: 'policy', sub: '', slug: 'policy', name: '政策学习',
    tags: ['政策学习', '专升本政治'],
    desc: '广东专升本政治课程：党史重大事件、毛著重要论断、党的建设、军队建设、新民主主义理论。',
  },
  {
    src: 'English', sub: 'teaching', slug: 'english', name: '英语教学',
    tags: ['英语教学', '中考英语'],
    desc: '中考英语教学与练习设计：不定代词、介词搭配、比较级结构等专题训练与错误分析。',
  },
]

/* ---------------- 工具函数（纯函数见 lib/learn-utils.mjs） ---------------- */

/** 复制文件并保留源 mtime，返回是否实际复制 */
function copyIfStale(src, dest) {
  const st = fs.statSync(src)
  if (!FORCE && fs.existsSync(dest) && sameMtime(fs.statSync(dest).mtimeMs, st.mtimeMs)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  fs.utimesSync(dest, st.atime, st.mtime)
  return true
}

/** 原子写入：先写 .tmp 再 rename，中断不会留下半截文件 */
function writeAtomic(dest, content, mtime) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const tmp = `${dest}.tmp`
  fs.writeFileSync(tmp, content)
  fs.renameSync(tmp, dest)
  if (mtime) fs.utimesSync(dest, mtime.atime, mtime.mtime)
}

/** 统计目录树中的文件数（排除镜像跳过的目录），用于空源/错源防护 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && isExcludedDir(e.name)) continue
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name))
    else n += 1
  }
  return n
}

/** 镜像目录：复制（暂存目录为全新目录，无需清理逻辑） */
function mirrorDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const e of srcEntries) {
    if (e.isDirectory() && isExcludedDir(e.name)) continue
    const s = path.join(srcDir, e.name)
    const d = path.join(destDir, e.name)
    if (e.isDirectory()) mirrorDir(s, d)
    else if (e.isFile()) copyIfStale(s, d)
  }
}

/* ---------------- 各同步环节 ---------------- */

function projectRoot(p) {
  return path.join(LEARN_ROOT, p.src, p.sub)
}

/** rename 带重试：Windows 上瞬时文件锁（杀毒/索引）会导致 EPERM，稍候重试即可 */
function renameWithRetry(from, to, attempts = 5) {
  for (let i = 0; ; i++) {
    try {
      fs.renameSync(from, to)
      return
    } catch (err) {
      if (i === attempts - 1) throw err
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
}

/** 1. 收录名单镜像（讲义 + assets + reference + 被讲义链接的根文档，保持相对结构）。
 *  事务化：先全量镜像到暂存目录，数量校验通过后整体换入——
 *  换入采用"旧目录改名 backup → staging 就位 → 失败回滚"三步，
 *  消除"旧已删、新未入"的丢失窗口（曾发生 rename EPERM 导致整个镜像被删）。 */
function syncMirror(p) {
  const src = projectRoot(p)
  const dest = path.join(PUBLIC_LESSONS, p.slug)
  const srcCount = countFiles(src)
  if (srcCount < 3) {
    throw new Error(`[sync-learn] 源目录异常（仅 ${srcCount} 个文件）：${src}\n  已中止镜像，避免误删已发布讲义。请检查 LEARN_ROOT 与项目目录。`)
  }
  // 暂存目录放在 .vuepress 下而非 public 内，避免构建时被误拷贝
  const staging = path.join(DOCS, '.vuepress', STAGING_DIR, p.slug)
  fs.rmSync(staging, { recursive: true, force: true })

  // 根一级只镜像收录名单内的条目，名单外（私人笔记、知识库文档等）不进公开镜像
  fs.mkdirSync(staging, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (!MIRROR_KEEP.has(e.name) || isExcludedDir(e.name)) continue
    const s = path.join(src, e.name)
    const d = path.join(staging, e.name)
    if (e.isDirectory()) mirrorDir(s, d)
    else if (e.isFile()) copyIfStale(s, d)
  }

  const stagedCount = countFiles(staging)
  if (stagedCount < 3) {
    throw new Error(`[sync-learn] 暂存镜像异常（仅 ${stagedCount} 个文件）：${src}\n  已中止换入，已发布镜像未受影响。请检查 MIRROR_KEEP 与项目目录。`)
  }
  const destCount = fs.existsSync(dest) ? countFiles(dest) : 0
  if (destCount >= 6 && stagedCount < destCount / 2) {
    throw new Error(
      `[sync-learn] 新镜像仅 ${stagedCount} 个文件，不足现存 ${destCount} 的一半，疑似源目录/收录名单异常，已中止换入（已发布镜像未受影响）。\n  若确属正常的大规模缩减，请先手动清空 ${dest} 后重跑。`,
    )
  }
  // 三步换入：dest → backup（同卷 rename 瞬时完成）→ staging → dest；失败回滚
  const backup = path.join(DOCS, '.vuepress', STAGING_DIR, `${p.slug}.bak`)
  fs.rmSync(backup, { recursive: true, force: true })
  const hadDest = fs.existsSync(dest)
  if (hadDest) renameWithRetry(dest, backup)
  try {
    renameWithRetry(staging, dest)
  } catch (err) {
    if (hadDest && fs.existsSync(backup)) {
      try {
        renameWithRetry(backup, dest)
      } catch {
        // rename 回滚仍失败（极端情况），用复制把旧镜像救回来
        fs.cpSync(backup, dest, { recursive: true })
      }
      console.warn(`[sync-learn] ${p.name} 镜像换入失败，已回滚为旧镜像：${err instanceof Error ? err.message : err}`)
    }
    throw err
  }
  fs.rmSync(backup, { recursive: true, force: true })
}

/** 2. 学习记录 → 博客文章（按课号互链配套讲义） */
function syncBlog(p, lessons) {
  const dir = path.join(projectRoot(p), 'learning-records')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []
  let copied = 0
  for (const f of files) {
    const src = path.join(dir, f)
    const raw = fs.readFileSync(src, 'utf8')
    const { fm, body } = parseFrontmatter(raw)
    const h1 = body.match(/^#\s+(.+)$/m)
    const title = (fm && fm.title) || (h1 ? h1[1].trim() : f.replace(/\.md$/, ''))
    const createTime = (fm && fm.createTime) || fmtTime(fs.statSync(src).mtime)
    const tags = p.tags
    // 摘要取自原文正文，避免被下方插入的讲义引导行污染
    const description = (fm && fm.description) || extractDescription(body)
    // 显式 permalink：避免 VuePress slugify 改写文件名（如 day2 → day-2）导致互链失配
    // categories 以课程名归类，补齐 /blog/categories/ 页内容（方案 P1 遗留项）
    const fmText = buildFrontmatter({
      title,
      createTime,
      tags,
      categories: [p.name],
      description,
      permalink: `/blog/${p.slug}/${f.replace(/\.md$/, '')}/`,
    })

    const no = Number(f.match(/^(\d+)/)?.[1] ?? 0)
    const lesson = lessons.find((l) => l.no === no)
    const lessonNote = lesson
      ? `> 配套讲义：[${lesson.title}](${withBase(`/lessons/${p.slug}/lessons/${lesson.file}`)}){target="_blank"}（含随堂测，新标签页打开）\n\n`
      : ''
    const content = fmText + '\n' + lessonNote + rewriteRelativeLinks(body, p.slug).trim() + '\n'
    const dest = path.join(DOCS, 'blog', p.slug, f)
    const st = fs.statSync(src)
    // 按内容而非 mtime 跳过：生成模板变更（如新增 categories 字段）时
    // 源文件 mtime 没变，mtime 跳过会让模板改动永远落不了地
    if (!FORCE && fs.existsSync(dest) && fs.readFileSync(dest, 'utf8') === content) continue
    writeAtomic(dest, content, st)
    copied++
  }
  return { count: files.length, copied }
}

/** 3. 知识库文档（保留相对层级） */
function syncKnowledgeFiles(p) {
  const root = projectRoot(p)
  let copied = 0
  const sources = []
  for (const f of KNOWLEDGE_ROOT_FILES) {
    if (f.includes('*')) {
      for (const s of fs.readdirSync(root).filter((n) => n.endsWith('.md') && minimatchName(n, f))) {
        sources.push({ src: path.join(root, s), rel: s })
      }
    } else {
      const s = path.join(root, f)
      if (fs.existsSync(s)) sources.push({ src: s, rel: f })
    }
  }
  for (const d of KNOWLEDGE_DIRS) {
    for (const s of walk(path.join(root, d), (n) => n.endsWith('.md'))) {
      sources.push({ src: s, rel: path.relative(root, s) })
    }
  }
  for (const { src, rel } of sources) {
    const dest = path.join(DOCS, 'knowledge', p.slug, rel)
    const srcText = fs.readFileSync(src, 'utf8')
    let text = rewriteRootDocLinks(srcText, p.slug, ROOT_DOC_NAMES)
    const st = fs.statSync(src)
    // 源文件无 frontmatter 时，为它生成与 plume autoFrontmatter 注入等价的
    // frontmatter（permalink 取既有值或按 slug/路径推导，createTime 保留既有
    // 或取源 mtime）——否则构建期注入与 sync 裸复制互相覆盖，git status 永远有假变更。
    if (!parseFrontmatter(srcText).fm) {
      const prevBlock = fs.existsSync(dest)
        ? fs.readFileSync(dest, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
        : null
      const prevFm = prevBlock ? parseFrontmatter(prevBlock[0]).fm : null
      const relNoExt = rel.replace(/\.md$/, '')
      const baseName = path.posix.basename(relNoExt)
      const permalink = (prevFm && prevFm.permalink)
        || (/^readme$/i.test(baseName)
          ? `/knowledge/${p.slug}/${path.posix.dirname(relNoExt).replace(/^\.$/, '')}/`.replace(/\/+/g, '/')
          : `/knowledge/${p.slug}/${relNoExt.toLowerCase()}/`)
      const createTime = (prevFm && prevFm.createTime) || fmtTime(st.mtime).replace(/-/g, '/')
      const title = (prevFm && prevFm.title)
        || (text.match(/^#\s+(.+)$/m)?.[1] ?? baseName).replace(/\.md$/i, '').trim()
      text = buildFrontmatter({ title, createTime, permalink }) + text
    }
    // 按内容而非 mtime 跳过（理由同 syncBlog：模板/链接重写逻辑变更要能落地）
    if (!FORCE && fs.existsSync(dest) && fs.readFileSync(dest, 'utf8') === text) continue
    writeAtomic(dest, text, st)
    copied++
  }
  return { count: sources.length, copied }
}

/** 解析讲义：标题 + 模块信息（gupiao 风格 lesson-meta） */
function parseLesson(file) {
  const html = fs.readFileSync(file, 'utf8')
  const name = path.basename(file)
  const no = Number(name.match(/^(\d+)/)?.[1] ?? 0)
  const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? name).split('|')[0].trim()
  const meta = html.match(/模块\s*(\d+)\s*·\s*([^|<\n]+)/)
  return {
    file: name,
    no,
    title,
    mtimeMs: fs.statSync(file).mtimeMs,
    module: meta ? { no: Number(meta[1]), name: meta[2].trim() } : null,
  }
}

/** 列出项目全部讲义（按文件名排序），供课程页生成与博客互链复用 */
function listLessons(p) {
  const lessonsDir = path.join(projectRoot(p), 'lessons')
  return fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.html')).sort()
      .map((f) => parseLesson(path.join(lessonsDir, f)))
    : []
}

/** 4. 课程目录页（含博客复盘互链列） */
function syncCourse(p, lessons) {
  const dir = path.join(DOCS, 'courses', p.slug)
  fs.mkdirSync(dir, { recursive: true })

  // 博客复盘按课号匹配：docs/blog/<slug>/000N-*.md → /blog/<slug>/<article>/
  const blogDir = path.join(DOCS, 'blog', p.slug)
  const postByNo = new Map()
  if (fs.existsSync(blogDir)) {
    for (const f of fs.readdirSync(blogDir).filter((n) => n.endsWith('.md'))) {
      const no = Number(f.match(/^(\d+)/)?.[1] ?? 0)
      if (no) postByNo.set(no, f.replace(/\.md$/, ''))
    }
  }
  const reviewCell = (no) => (postByNo.has(no) ? `[学习复盘](/blog/${p.slug}/${postByNo.get(no)}/)` : '—')

  const lessonLink = (l) => `[${l.title}](${withBase(`/lessons/${p.slug}/lessons/${l.file}`)}){target="_blank"}`

  const hasModules = lessons.some((l) => l.module)
  let modulePages = []

  if (hasModules) {
    const groups = new Map()
    for (const l of lessons) {
      const key = l.module?.no ?? 99
      if (!groups.has(key)) groups.set(key, { no: key, name: l.module?.name ?? '其他', lessons: [] })
      groups.get(key).lessons.push(l)
    }
    modulePages = [...groups.values()].sort((a, b) => a.no - b.no).map((g) => {
      const filename = `module-${String(g.no).padStart(2, '0')}.md`
      const rows = g.lessons.map((l) => `| 第 ${l.no} 课 | ${lessonLink(l)} | ${reviewCell(l.no)} |`).join('\n')
      const permalink = `/courses/${p.slug}/module-${String(g.no).padStart(2, '0')}/`
      const createTime = fmtTime(new Date(Math.min(...g.lessons.map((l) => l.mtimeMs))))
      writeAtomic(
        path.join(dir, filename),
        `---\ntitle: 模块 ${g.no} · ${g.name}\ncreateTime: ${createTime}\npermalink: ${permalink}\n---\n\n# 模块 ${g.no} · ${g.name}\n\n| 课次 | 讲义 | 复盘 |\n| --- | --- | --- |\n${rows}\n\n> 讲义为独立页面（含随堂测交互），点击在新标签页打开。\n`,
      )
      return { no: g.no, name: g.name, filename, count: g.lessons.length }
    })
  }

  const tocSection = hasModules
    ? `| 模块 | 讲义数 | 目录 |\n| --- | --- | --- |\n${modulePages
        .map((m) => `| 模块 ${m.no} · ${m.name} | ${m.count} | [进入](./module-${String(m.no).padStart(2, '0')}/) |`)
        .join('\n')}`
    : `| 课次 | 讲义 | 复盘 |\n| --- | --- | --- |\n${lessons.map((l) => `| 第 ${l.no} 课 | ${lessonLink(l)} | ${reviewCell(l.no)} |`).join('\n')}`

  // 讲义摘要卡（courses/<slug>/l/<no>.md）：讲义本体是 public/ 静态页、不进搜索索引，
  // 每课生成一张摘要卡承接搜索流量，卡内一键跳转交互讲义
  const cardsDir = path.join(dir, 'l')
  fs.rmSync(cardsDir, { recursive: true, force: true })
  fs.mkdirSync(cardsDir, { recursive: true })
  const cardLink = (no) => `/courses/${p.slug}/l/${no}/`
  lessons.forEach((l, i) => {
    const html = fs.readFileSync(path.join(projectRoot(p), 'lessons', l.file), 'utf8')
    const summary = extractLessonText(html).slice(0, 800)
    const prev = lessons[i - 1]
    const next = lessons[i + 1]
    const moduleLine = l.module ? `**模块 ${l.module.no} · ${l.module.name}**\n\n` : ''
    const nav = [
      prev ? `[← ${prev.title}](${cardLink(prev.no)})` : '',
      `[课程目录](/courses/${p.slug}/)`,
      next ? `[${next.title} →](${cardLink(next.no)})` : '',
    ].filter(Boolean).join(' · ')
    writeAtomic(
      path.join(cardsDir, `${l.no}.md`),
      `---
title: ${l.title}
createTime: ${fmtTime(new Date(l.mtimeMs))}
permalink: ${cardLink(l.no)}
---

${moduleLine}> 本页为摘要卡（供搜索与速览）。完整交互讲义（含随堂测）：[**打开讲义**](${withBase(`/lessons/${p.slug}/lessons/${l.file}`)}){target="_blank"}

${summary}…

---

${nav}
`,
    )
  })

  const readmePath = path.join(dir, 'README.md')
  // 保留既有 createTime，避免手工补充的字段被生成模板覆盖丢失
  const prevFm = fs.existsSync(readmePath) ? parseFrontmatter(fs.readFileSync(readmePath, 'utf8')).fm : null
  const createTime = (prevFm && prevFm.createTime)
    || (lessons.length ? fmtTime(new Date(Math.min(...lessons.map((l) => l.mtimeMs)))) : fmtTime(new Date()))

  writeAtomic(
    readmePath,
    `---
title: ${p.name}
createTime: ${createTime}
permalink: /courses/${p.slug}/
---

# ${p.name}

${p.desc}

${p.plan ?? ''}

> 已生成 **${lessons.length}** 课。讲义为独立 HTML 页面（含随堂测交互），点击在新标签页打开。

## 目录

${tocSection}

## 延伸阅读

- [知识库：${p.name}](/knowledge/${p.slug}/) —— 总纲、术语表、参考资料
- [博客标签](/blog/tags/) —— 学习记录与复盘
`,
  )
  // 新页面全部写完后再清理过期的 module-*.md（目录结构可能随课程更新变化；
  // 后置删除避免中断时留下"旧页已删、新页未写"的缺口）
  const keepFiles = new Set(['README.md', ...modulePages.map((m) => m.filename)])
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.md') && !keepFiles.has(f)) fs.rmSync(path.join(dir, f))
  }
  return { lessons: lessons.length, modules: modulePages.length }
}

/** 5. 知识库索引页 */
function syncKnowledgeIndex(p) {
  const root = projectRoot(p)
  const kdir = path.join(DOCS, 'knowledge', p.slug)
  const mdFiles = walk(kdir, (n) => n.endsWith('.md') && n !== 'README.md')
    .map((f) => path.relative(kdir, f).replace(/\\/g, '/'))
    .sort()

  const refDir = path.join(root, 'reference')
  const refFiles = fs.existsSync(refDir)
    ? fs.readdirSync(refDir).filter((f) => f.endsWith('.html')).sort()
    : []

  const mdRows = mdFiles
    .map((rel) => `| [${rel.replace(/\.md$/, '')}](${encodeURI(rel)}) |`)
    .join('\n')
  const refRows = refFiles
    .map((f) => `| [${f.replace(/\.html$/, '')}](${withBase(`/lessons/${p.slug}/reference/${encodeURI(f)}`)}){target="_blank"} |`)
    .join('\n')

  fs.mkdirSync(kdir, { recursive: true })
  // 保留既有 createTime，避免手工补充的字段被生成模板覆盖丢失
  const indexPrevFm = fs.existsSync(path.join(kdir, 'README.md'))
    ? parseFrontmatter(fs.readFileSync(path.join(kdir, 'README.md'), 'utf8')).fm
    : null
  const indexCreateTime = (indexPrevFm && indexPrevFm.createTime) || fmtTime(fs.statSync(root).mtime)
  writeAtomic(
    path.join(kdir, 'README.md'),
    `---
title: ${p.name} · 知识库
permalink: /knowledge/${p.slug}/
createTime: ${indexCreateTime}
---

# ${p.name} · 知识库

${p.desc}

## 文档

| 文档 |
| --- |
${mdRows || '| （暂无） |'}

## HTML 参考资料

原样托管的独立参考页面（词典、速查表等）：

| 资料 |
| --- |
${refRows || '| （暂无） |'}

## 相关入口

- [课程目录：${p.name}](/courses/${p.slug}/)
`,
  )
  return { docs: mdFiles.length, refs: refFiles.length }
}

/* ---------------- 名单一致性断言 ---------------- */

/**
 * PROJECTS 承载源仓库信息（src/sub/tags/desc），COURSES（site-meta.mjs）派生
 * 导航/集合/分类名——两处名单一旦漂移，课程会"有页面没导航"或"导航指向空目录"。
 * 这里在动任何文件前做快速失败：slug 必须互相覆盖且显示名一致；
 * COURSES 多出条目仅告警（允许纯手写、无学习仓库源的课程）。
 */
{
  const courseBySlug = new Map(COURSES.map((c) => [c.slug, c]))
  const fatal = []
  for (const p of PROJECTS) {
    const c = courseBySlug.get(p.slug)
    if (!c) {
      fatal.push(`[sync-learn] PROJECTS 中的 ${p.slug}（${p.name}）未登记到 site-meta.mjs 的 COURSES，导航/集合/分类页不会包含它。请先在 COURSES 补一行。`)
    } else if (c.name !== p.name) {
      fatal.push(`[sync-learn] 课程显示名不一致：site-meta.mjs COURSES 为「${c.name}」，sync-learn PROJECTS 为「${p.name}」（${p.slug}）。请统一后重跑。`)
    }
  }
  if (fatal.length) {
    for (const msg of fatal) console.error(msg)
    process.exit(1)
  }
  for (const c of COURSES) {
    if (!PROJECTS.some((p) => p.slug === c.slug)) {
      console.warn(`[sync-learn] COURSES 中的 ${c.slug}（${c.name}）没有对应的 PROJECTS 源仓库，跳过其内容同步（仅出现在导航/集合中）。`)
    }
  }
}

/* ---------------- 主流程 ---------------- */

if (!fs.existsSync(LEARN_ROOT)) {
  console.error(`[sync-learn] 找不到学习仓库：${LEARN_ROOT}（可用 LEARN_ROOT 环境变量覆盖）`)
  process.exit(1)
}

const stagingRoot = path.join(DOCS, '.vuepress', STAGING_DIR)
fs.rmSync(stagingRoot, { recursive: true, force: true })

const done = []
try {
  for (const p of PROJECTS) {
    if (!fs.existsSync(projectRoot(p))) {
      console.warn(`[sync-learn] 跳过不存在的项目：${p.src}`)
      continue
    }
    const lessons = listLessons(p)
    syncMirror(p)
    const blog = syncBlog(p, lessons)
    const kFile = syncKnowledgeFiles(p)
    const course = syncCourse(p, lessons)
    const kIndex = syncKnowledgeIndex(p)
    done.push(p.name)
    console.log(
      `[sync-learn] ${p.name.padEnd(18)} 讲义镜像 ✓  博客 ${String(blog.count).padStart(2)} 篇（新增 ${blog.copied}）  ` +
        `知识库 ${kFile.count} 文件（更新 ${kFile.copied}）  课程 ${course.lessons} 课/${course.modules} 模块页  参考 ${kIndex.refs} 篇`,
    )
  }
  console.log('[sync-learn] 完成。ts-playground 无讲义/记录，未纳入站点。')
} catch (err) {
  console.error(`[sync-learn] 同步中断${done.length ? `（已完成：${done.join('、')}；其后项目未执行）` : ''}：`)
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  fs.rmSync(stagingRoot, { recursive: true, force: true })
}
