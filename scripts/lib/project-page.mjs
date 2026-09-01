const esc = (value) =>
  (value ?? '').replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim()

export function renderRepositoriesPage(repos) {
  const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0)
  const languageCount = new Map()

  for (const repo of repos) {
    if (repo.language) {
      languageCount.set(repo.language, (languageCount.get(repo.language) ?? 0) + 1)
    }
  }

  const languages = [...languageCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language, count]) => `${language} ×${count}`)
    .join(' · ') || '—'

  const rows = [...repos]
    .sort((a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? ''))
    .map((repo) => {
      const pushed = repo.pushed_at ? repo.pushed_at.slice(0, 10) : '-'
      return `| [${esc(repo.name)}](${repo.html_url}) | ${esc(repo.description) || '—'} | ${esc(repo.language) || '—'} | ${repo.stargazers_count ?? 0} | ${pushed} |`
    })
    .join('\n')

  return `---
title: 全部 GitHub 仓库
description: L1U.J 的公开 GitHub 仓库、语言分布、Stars 与最近更新；页面由 GitHub API 在构建时自动刷新。
icon: ph:github-logo
permalink: /projects/repositories/
sidebar: false
aside: false
comments: false
---

# 全部 GitHub 仓库

这里是源码目录；如果想先了解产品解决了什么问题，请从[项目案例](/projects/)开始。

<CardGrid cols="3">

<Card title="${repos.length}" icon="ph:cube">公开仓库</Card>

<Card title="${totalStars}" icon="ph:star-four">累计 Stars</Card>

<Card title="语言分布" icon="ph:chart-bar">${languages}</Card>

</CardGrid>

## 仓库列表（${repos.length}）

| 仓库 | 简介 | 语言 | Stars | 最近推送 |
| --- | --- | --- | --- | --- |
${rows || '| （暂无） | | | | |'}
`
}
