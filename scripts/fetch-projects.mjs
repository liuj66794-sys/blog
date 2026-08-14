#!/usr/bin/env node
/**
 * fetch-projects.mjs —— 生成 GitHub 项目墙页面 docs/projects/README.md
 *
 * 数据源优先级：
 *   1. gh CLI（本地已登录，无需配置）
 *   2. GH_TOKEN / GITHUB_TOKEN 环境变量（CI 中使用）
 *   3. 都不可用 → 保留已有生成文件（首次则写占位页），构建不中断
 *
 * 用法：node scripts/fetch-projects.mjs
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'docs', 'projects', 'README.md')

const USER = 'liuj66794-sys'
/** 方案 §5.2 的四个主力项目 */
const FEATURED = ['PolicyAnalyzerPro', 'Tlisily', 'boxuegu', 'mattpocock-skills-learning']
const THEME = 'theme=tokyonight&locale=cn&hide_border=true'

function fetchViaGh() {
  try {
    const out = execFileSync(
      'gh',
      ['api', `users/${USER}/repos?per_page=100&sort=pushed`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return JSON.parse(out)
  } catch {
    return null
  }
}

async function fetchViaToken() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (!token) return null
  try {
    const res = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'blog-fetch-projects' } },
    )
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

const esc = (s) =>
  (s ?? '').replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim()

const statsCard = `https://github-readme-stats.vercel.app/api?username=${USER}&show_icons=true&${THEME}`
const langsCard = `https://github-readme-stats.vercel.app/api/top-langs/?username=${USER}&layout=compact&${THEME}`
const pinCard = (repo) =>
  `https://github-readme-stats.vercel.app/api/pin/?username=${USER}&repo=${repo}&${THEME}`

function render(repos) {
  const byName = new Map(repos.map((r) => [r.name, r]))
  const featured = FEATURED.filter((n) => byName.has(n))

  const featuredSection = featured
    .map(
      (n) =>
        `[![${n}](${pinCard(n)})](https://github.com/${USER}/${n})`,
    )
    .join('\n\n')

  const rest = repos
    .filter((r) => !FEATURED.includes(r.name) && r.name !== `${USER}`)
    .sort((a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? ''))
  const tableRows = rest
    .map((r) => {
      const pushed = r.pushed_at ? r.pushed_at.slice(0, 10) : '-'
      return `| [${r.name}](${r.html_url}) | ${esc(r.description) || '—'} | ${r.language || '—'} | ${r.stargazers_count} | ${pushed} |`
    })
    .join('\n')

  return `---
title: 开源项目
icon: 🚀
---

# 开源项目

GitHub 项目墙：主力项目置顶展示，全部公开仓库自动列示（构建时由 [fetch-projects.mjs](https://github.com/${USER}/${USER}.github.io/blob/main/scripts/fetch-projects.mjs) 从 GitHub API 生成）。

## ⭐ 主力项目

${featuredSection}

## 📊 开发统计

[![L1U.J's GitHub stats](${statsCard})](https://github.com/${USER})

[![Top Langs](${langsCard})](https://github.com/${USER})

## 🗂 全部公开仓库（${repos.length}）

| 仓库 | 简介 | 语言 | Stars | 最近推送 |
| --- | --- | --- | --- | --- |
${tableRows || '| （暂无） | | | | |'}
`
}

const PLACEHOLDER = `---
title: 开源项目
icon: 🚀
---

# 开源项目

项目墙由构建脚本自动生成。若看到此页，说明生成脚本未能访问 GitHub API（本地未登录 gh、也未设置 GH_TOKEN）。
`

const repos = fetchViaGh() ?? (await fetchViaToken())
if (!repos) {
  if (fs.existsSync(OUT)) {
    console.log('[fetch-projects] 无法访问 GitHub API，保留已有生成文件。')
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, PLACEHOLDER)
    console.log('[fetch-projects] 无法访问 GitHub API，写入占位页。')
  }
  process.exit(0)
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, render(repos))
console.log(`[fetch-projects] 已生成项目墙：${repos.length} 个仓库，置顶 ${FEATURED.length} 个。`)
