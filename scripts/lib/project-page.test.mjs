import assert from 'node:assert/strict'
import test from 'node:test'
import { renderRepositoriesPage } from './project-page.mjs'

test('仓库目录使用独立路由并保留商业案例入口', () => {
  const output = renderRepositoriesPage([
    {
      name: 'demo',
      html_url: 'https://github.com/example/demo',
      description: 'A | B',
      language: 'TypeScript',
      stargazers_count: 2,
      pushed_at: '2026-08-30T00:00:00Z',
    },
  ])

  assert.match(output, /permalink: \/projects\/repositories\//)
  assert.match(output, /\[项目案例\]\(\/projects\/\)/)
  assert.match(output, /A \\| B/)
  assert.match(output, /TypeScript ×1/)
})
