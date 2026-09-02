import assert from 'node:assert/strict'
import test from 'node:test'
import { trackPortfolioEvent } from '../../docs/.vuepress/analytics.mjs'

test('转化事件统一透传给 gtag，并在未加载统计脚本时安全跳过', () => {
  assert.equal(trackPortfolioEvent('portfolio_hire_cta'), false)

  const calls = []
  globalThis.window = {
    gtag(...args) {
      calls.push(args)
    },
  }

  try {
    assert.equal(trackPortfolioEvent('portfolio_case_open', { case_slug: 'tlisily' }), true)
    assert.deepEqual(calls, [
      ['event', 'portfolio_case_open', { case_slug: 'tlisily' }],
    ])
  } finally {
    delete globalThis.window
  }
})
