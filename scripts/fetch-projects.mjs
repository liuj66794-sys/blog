#!/usr/bin/env node
/**
 * fetch-projects.mjs —— 生成 GitHub 项目墙页面 docs/projects/README.md
 *
 * 数据源优先级：
 *   1. gh CLI（本地已登录，无需配置）
 *   2. GitHub API（CI 优先使用 GH_TOKEN / GITHUB_TOKEN，本地可匿名读取公开仓库）
 *   3. 都不可用 → 保留已有生成文件（首次则写占位页），构建不中断
 *
 * 用法：node scripts/fetch-projects.mjs
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderRepositoriesPage } from './lib/project-page.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'docs', 'projects', 'repositories.md')

const USER = 'liuj66794-sys'

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

async function fetchViaApi() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'blog-fetch-projects',
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
      { headers },
    )
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

const PLACEHOLDER = `---
title: 全部 GitHub 仓库
icon: ph:github-logo
permalink: /projects/repositories/
sidebar: false
aside: false
comments: false
---

# 全部 GitHub 仓库

仓库目录由构建脚本自动生成。当前无法访问 GitHub API，已保留最近一次生成结果。

[返回项目案例](/projects/)
`

const repos = fetchViaGh() ?? (await fetchViaApi())
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
fs.writeFileSync(OUT, renderRepositoriesPage(repos))
console.log(`[fetch-projects] 已生成仓库目录：${repos.length} 个公开仓库。`)
