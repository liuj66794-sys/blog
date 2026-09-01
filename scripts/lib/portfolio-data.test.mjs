import assert from 'node:assert/strict'
import test from 'node:test'
import { caseStudies, contact, validatePortfolioData } from '../../docs/.vuepress/portfolio-data.mjs'

test('商业案例数据满足公开页面契约', () => {
  assert.deepEqual(validatePortfolioData(), [])
  assert.equal(new Set(caseStudies.map((item) => item.slug)).size, caseStudies.length)
  assert.ok(caseStudies.every((item) => item.source.startsWith('https://github.com/')))
})

test('缺少截图或 Demo 时使用空集合或空字符串，供页面条件渲染', () => {
  const policy = caseStudies.find((item) => item.slug === 'policy-analyzer-pro')
  const boxuegu = caseStudies.find((item) => item.slug === 'boxuegu')

  assert.deepEqual(policy.screenshots, [])
  assert.equal(policy.demo, '')
  assert.equal(boxuegu.screenshots.length, 1)
})

test('公开联系方式与已授权值一致', () => {
  assert.equal(contact.wechat, 'Aa6635613')
  assert.equal(contact.email, '386239680@qq.com')
  assert.match(contact.wechatQr, /^\/images\/contact\//)
})
