#!/usr/bin/env node
/**
 * sync-learn.mjs —— 把本地学习仓库（D:\01-Documents\learn）同步进站点。
 *
 * 1. 讲义整目录镜像      → docs/.vuepress/public/lessons/<slug>/（原样托管，
 *                          保留 lessons/assets/reference 相对链接与随堂测交互）
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS = path.resolve(__dirname, '..', 'docs')
const PUBLIC_LESSONS = path.join(DOCS, '.vuepress', 'public', 'lessons')
const LEARN_ROOT = process.env.LEARN_ROOT || 'D:\\01-Documents\\learn'
const FORCE = process.argv.includes('--force')

/**
 * 站点 base 路径，从 config.ts 读取（单一数据来源）。
 * 讲义是 public/ 下的静态 .html，VuePress 不会给这类链接自动加 base，
 * 必须在生成 Markdown 时显式拼上，否则部署在子路径时点击即 404。
 */
const SITE_BASE = (() => {
  try {
    const config = fs.readFileSync(path.join(DOCS, '.vuepress', 'config.ts'), 'utf8')
    return config.match(/base:\s*'([^']*)'/)?.[1] ?? '/'
  } catch {
    return '/'
  }
})()
const withBase = (p) => `${SITE_BASE.replace(/\/$/, '')}${p}`

/** 镜像时跳过的目录名（含所有点目录：.git/.playwright-mcp/.hallmark 等本地工具状态）。
 *  tools/ 是课程工程的开发构建脚本，不属于学习内容，不发布到公开站点。 */
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'tools'])

function isExcludedDir(name) {
  return EXCLUDE_DIRS.has(name) || name.startsWith('.')
}

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

/* ---------------- 工具函数 ---------------- */

function fmtTime(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

/** 复制文件并保留源 mtime，返回是否实际复制 */
function copyIfStale(src, dest) {
  const st = fs.statSync(src)
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).mtimeMs === st.mtimeMs) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  fs.utimesSync(dest, st.atime, st.mtime)
  return true
}

/** 镜像目录：复制 + 清理源端已删除的多余文件 */
function mirrorDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true })
  const seen = new Set()
  for (const e of srcEntries) {
    if (e.isDirectory() && isExcludedDir(e.name)) continue
    seen.add(e.name)
    const s = path.join(srcDir, e.name)
    const d = path.join(destDir, e.name)
    if (e.isDirectory()) mirrorDir(s, d)
    else if (e.isFile()) copyIfStale(s, d)
  }
  for (const name of fs.readdirSync(destDir)) {
    if (!seen.has(name)) fs.rmSync(path.join(destDir, name), { recursive: true, force: true })
  }
}

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), filter, out)
    else if (e.isFile() && filter(e.name)) out.push(path.join(dir, e.name))
  }
  return out
}

/** 极简通配：只支持单个 *（如 SPEC-*.md），够本脚本用 */
function minimatchName(name, pattern) {
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
  return re.test(name)
}

/** 解析 markdown frontmatter（仅顶层 key: value，够用即可） */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { fm: null, body: text }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '')
  }
  return { fm, body: text.slice(m[0].length) }
}

function buildFrontmatter(obj) {
  const lines = Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}:\n${v.map((i) => `  - ${i}`).join('\n')}`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---\n`
}

/** 学习记录里的相对链接重写：../xxx → <base>/lessons/<slug>/xxx（其余保持原样） */
function rewriteRelativeLinks(text, slug) {
  return text.replace(/\]\((\.\.\/[^)\s]+)([^)]*)\)/g, (_, rel, tail) => {
    const clean = rel.replace(/^\.\//, '').replace(/^\.\.\//, '')
    return `](${withBase(`/lessons/${slug}/${clean}`)}${tail})`
  })
}

/* ---------------- 各同步环节 ---------------- */

function projectRoot(p) {
  return path.join(LEARN_ROOT, p.src, p.sub)
}

/** 1. 整目录镜像（讲义 + assets + reference + 根 md，保持相对结构） */
function syncMirror(p) {
  const src = projectRoot(p)
  const dest = path.join(PUBLIC_LESSONS, p.slug)
  mirrorDir(src, dest)
}

/** 2. 学习记录 → 博客文章 */
function syncBlog(p) {
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
    const fmText = buildFrontmatter({ title, createTime, tags })
    const content = fmText + '\n' + rewriteRelativeLinks(body, p.slug).trim() + '\n'
    const dest = path.join(DOCS, 'blog', p.slug, f)
    const st = fs.statSync(src)
    if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).mtimeMs === st.mtimeMs) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content)
    // 生成时间取源文件 mtime，保证构建产物稳定
    fs.utimesSync(dest, st.atime, st.mtime)
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
    if (copyIfStale(src, path.join(DOCS, 'knowledge', p.slug, rel))) copied++
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
    module: meta ? { no: Number(meta[1]), name: meta[2].trim() } : null,
  }
}

/** 4. 课程目录页 */
function syncCourse(p) {
  const lessonsDir = path.join(projectRoot(p), 'lessons')
  const files = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.html')).sort()
    : []
  const lessons = files.map((f) => parseLesson(path.join(lessonsDir, f)))
  const dir = path.join(DOCS, 'courses', p.slug)
  fs.mkdirSync(dir, { recursive: true })
  // 重新生成前先清掉旧 module-*.md（目录结构可能随课程更新变化）
  for (const f of fs.readdirSync(dir)) {
    if (f !== 'README.md' && f.endsWith('.md')) fs.rmSync(path.join(dir, f))
  }

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
      const rows = g.lessons.map((l) => `| 第 ${l.no} 课 | ${lessonLink(l)} |`).join('\n')
      const prev = null // 由侧边栏承担导航
      fs.writeFileSync(
        path.join(dir, filename),
        `---\ntitle: 模块 ${g.no} · ${g.name}\n---\n\n# 模块 ${g.no} · ${g.name}\n\n| 课次 | 讲义 |\n| --- | --- |\n${rows}\n\n> 讲义为独立页面（含随堂测交互），点击在新标签页打开。\n`,
      )
      return { no: g.no, name: g.name, filename, count: g.lessons.length }
    })
  }

  const tocSection = hasModules
    ? `| 模块 | 讲义数 | 目录 |\n| --- | --- | --- |\n${modulePages
        .map((m) => `| 模块 ${m.no} · ${m.name} | ${m.count} | [进入](./module-${String(m.no).padStart(2, '0')}/) |`)
        .join('\n')}`
    : `| 课次 | 讲义 |\n| --- | --- |\n${lessons.map((l) => `| 第 ${l.no} 课 | ${lessonLink(l)} |`).join('\n')}`

  fs.writeFileSync(
    path.join(dir, 'README.md'),
    `---
title: ${p.name}
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
  fs.writeFileSync(
    path.join(kdir, 'README.md'),
    `---
title: ${p.name} · 知识库
permalink: /knowledge/${p.slug}/
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
- [讲义原始目录](${withBase(`/lessons/${p.slug}/lessons/`)}){target="_blank"}
`,
  )
  return { docs: mdFiles.length, refs: refFiles.length }
}

/* ---------------- 主流程 ---------------- */

if (!fs.existsSync(LEARN_ROOT)) {
  console.error(`[sync-learn] 找不到学习仓库：${LEARN_ROOT}（可用 LEARN_ROOT 环境变量覆盖）`)
  process.exit(1)
}

for (const p of PROJECTS) {
  if (!fs.existsSync(projectRoot(p))) {
    console.warn(`[sync-learn] 跳过不存在的项目：${p.src}`)
    continue
  }
  syncMirror(p)
  const blog = syncBlog(p)
  const kFile = syncKnowledgeFiles(p)
  const course = syncCourse(p)
  const kIndex = syncKnowledgeIndex(p)
  console.log(
    `[sync-learn] ${p.name.padEnd(18)} 讲义镜像 ✓  博客 ${String(blog.count).padStart(2)} 篇（新增 ${blog.copied}）  ` +
      `知识库 ${kFile.count} 文件（更新 ${kFile.copied}）  课程 ${course.lessons} 课/${course.modules} 模块页  参考 ${kIndex.refs} 篇`,
  )
}
console.log('[sync-learn] 完成。ts-playground 无讲义/记录，未纳入站点。')
