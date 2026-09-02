import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import test from 'node:test'
import {
  buildCaseSearchText,
  caseStudies,
  consultationBrief,
  contact,
  validatePortfolioData,
} from '../../docs/.vuepress/portfolio-data.mjs'

test('商业案例数据满足公开页面契约', () => {
  assert.deepEqual(validatePortfolioData(), [])
  assert.equal(new Set(caseStudies.map((item) => item.slug)).size, caseStudies.length)
  assert.ok(caseStudies.every((item) => item.source.startsWith('https://github.com/')))
})

test('案例只展示可核验的真实视觉素材或明确的源码证据边界', () => {
  const policy = caseStudies.find((item) => item.slug === 'policy-analyzer-pro')
  const visualCases = caseStudies.filter((item) => item.evidenceStatus === 'visual')

  assert.deepEqual(policy.screenshots, [])
  assert.equal(policy.evidenceStatus, 'source-only')
  assert.match(policy.evidenceNote, /不使用概念图|不用概念图/)
  assert.equal(policy.demo, '')
  assert.ok(visualCases.every((item) => item.cover && item.screenshots.length >= 3))

  for (const item of visualCases) {
    for (const image of [item.cover, ...item.screenshots]) {
      const imageFile = new URL(`../../docs/.vuepress/public${image.src}`, import.meta.url)
      assert.ok(existsSync(imageFile), `${item.slug}: 素材不存在 ${image.src}`)
      assert.ok(statSync(imageFile).size < 200_000, `${item.slug}: 素材未压缩 ${image.src}`)
    }
  }
})

test('公开联系方式与已授权值一致', () => {
  assert.equal(contact.wechat, 'Aa6635613')
  assert.equal(contact.email, '386239680@qq.com')
  assert.match(contact.wechatQr, /^\/images\/contact\//)
})

test('咨询模板覆盖首次需求判断所需信息', () => {
  for (const field of ['项目背景', '目标用户', '希望解决的问题', '期望交付物', '期望上线时间']) {
    assert.match(consultationBrief, new RegExp(field))
  }
})

test('自定义案例页提供给本地搜索的正文覆盖名称、技术与核心功能', () => {
  for (const item of caseStudies) {
    const markdown = readFileSync(
      new URL(`../../docs/projects/${item.slug}.md`, import.meta.url),
      'utf8',
    )
    const expected = buildCaseSearchText(item)
    assert.match(markdown, new RegExp(item.name, 'i'))
    for (const technology of item.technologies) assert.ok(markdown.includes(technology), `${item.slug}: 搜索正文缺少 ${technology}`)
    assert.ok(expected.includes(item.features[0]))
    assert.ok(markdown.includes(item.features[0].split('，')[0]), `${item.slug}: 搜索正文缺少核心功能`)
  }
})
