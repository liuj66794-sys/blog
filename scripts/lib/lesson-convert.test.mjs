/**
 * lesson-convert.test.mjs —— 讲义 HTML → Markdown 转换器单测。
 *
 * 主体用 a-shares 镜像里的 6 篇真实讲义做结构断言（转换器就是为这一族模板写的，
 * 真实文件是最可靠的 fixture）；另配合成用例锁代码块/未知块/嵌套列表/实体解码
 * 等通用行为。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lessonHtmlToMarkdown, decodeEntities } from './lesson-convert.mjs'
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LESSONS_DIR = path.resolve(__dirname, '../../docs/.vuepress/public/lessons/a-shares/lessons')

const convert = (html, onWarn) => lessonHtmlToMarkdown(html, { slug: 'a-shares', onWarn })
const convertAs = (slug, html) => lessonHtmlToMarkdown(html, { slug })

const realLessons = fs.existsSync(LESSONS_DIR)
  ? fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.html')).sort().map((f) => ({
    file: f,
    html: fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'),
  }))
  : []

test('六个真实讲义：结构完整转换（容器/quiz/表格齐全，无残留标签）', () => {
  assert.ok(realLessons.length >= 6, `镜像讲义不足 6 篇（实际 ${realLessons.length}），请先跑 pnpm sync`)
  for (const { file, html } of realLessons) {
    const conv = convert(html)
    assert.ok(conv.headline, `${file}：缺少 headline`)
    assert.ok(conv.metaLine.includes('模块'), `${file}：metaLine 缺少模块信息：${conv.metaLine}`)
    assert.ok(conv.body.length > 500, `${file}：正文过短（${conv.body.length} 字符），疑似转换不全`)
    // quiz 全部转为折叠答案容器，且数量与源一致（class="quiz" 与 class="quiz review" 都计）
    const quizCount = (html.match(/class="quiz/g) || []).length
    const detailsCount = (conv.body.match(/::: details 点开核对答案/g) || []).length
    assert.equal(detailsCount, quizCount, `${file}：quiz 转换数量不符`)
    // 已知块全部消费：不残留 div/表格/quiz 标记
    assert.ok(!conv.body.includes('<div'), `${file}：正文残留 <div`)
    assert.ok(!conv.body.includes('</table>'), `${file}：正文残留 </table>`)
    assert.ok(!conv.body.includes('data-answer'), `${file}：正文残留 data-answer`)
    assert.ok(!/<\/?(b|span)\b/.test(conv.body), `${file}：正文残留 b/span 标签`)
  }
})

test('第 5 课：容器映射、表格、答案字母、nav 重写的具体断言', () => {
  const html = fs.readFileSync(path.join(LESSONS_DIR, '0005-trading-fees.html'), 'utf8')
  const conv = convert(html)

  assert.equal(conv.headline, '交易费用：每笔买卖的隐形成本')
  assert.ok(conv.metaLine.includes('模块 1 · 概念扫盲'))
  assert.ok(conv.metaLine.includes('三段式：20 分钟读 + 15 分钟动手 + 5 分钟费曼'))

  // 语义块 → 容器
  assert.ok(conv.body.includes('::: tip 学完你能'), 'win 容器缺失')
  assert.ok(conv.body.includes('::: info 与考核的关系'), 'mission-tie 容器缺失')
  assert.ok(conv.body.includes('::: warning 动手 15 分钟：亲手算一笔完整交易'), 'task 容器缺失')
  assert.ok(conv.body.includes('::: info 费曼自测（5 分钟）'), 'feynman 容器缺失')
  assert.ok(conv.body.includes('出声讲：三笔费用各是谁收'), 'feynman data-topic 内容缺失')
  assert.ok(conv.body.includes('::: tip 全程算例（按万 2.5 + 最低 5 元假设）'), 'example 标签标题缺失')

  // 标题与表格
  assert.ok(conv.body.includes('## 一、三笔费用，各收各的'), 'h2 分节缺失')
  assert.ok(conv.body.includes('| 费用 | 谁收 | 什么时候收 | 通行标准 |'), '表格表头缺失')
  assert.ok(conv.body.includes('| **佣金** | 券商 |'), '表格单元格加粗转换缺失')
  assert.ok(conv.body.includes('**万 16.7**'), 'b + span.num 混排加粗缺失')

  // quiz：data-answer 索引 → 字母 + 选项原文 + 解析
  assert.ok(conv.body.includes('**答案：A（五元整）**'), '第 1 题答案缺失')
  assert.ok(conv.body.includes('不足 5 元按 5 元收'), '第 1 题解析缺失')
  assert.ok(conv.body.includes('**答案：B（卖出的时候收）**'), '第 2 题答案字母错误（应为 B）')
  assert.ok(conv.body.includes('- A. 十三块五'), '选项 A 缺失')
  assert.ok(conv.body.includes('- C. 十六块五'), '选项 C 缺失')

  // nav：相邻课走站内全文页，reference 走镜像
  assert.equal(conv.nav.prev?.url, '/courses/a-shares/l/4/')
  assert.equal(conv.nav.next?.url, '/courses/a-shares/l/6/')
  assert.deepEqual(
    conv.nav.middle.map((m) => [m.text, m.url]),
    [['术语参考表', withBase('/lessons/a-shares/reference/a-share-terms.html')]],
  )
})

test('代码块：<pre><code> 转围栏并解码实体（pi-agent 风格合成用例）', () => {
  const html = [
    '<!DOCTYPE html><html><body><h1>标题</h1>',
    '<pre><code>const s = "a&amp;b";\nif (s &lt; 2) console.log(s)</code></pre>',
    '</body></html>',
  ].join('')
  const conv = convert(html)
  assert.ok(
    conv.body.includes('const s = "a&b";\nif (s < 2) console.log(s)'),
    `代码块内容/实体解码不符：${conv.body}`,
  )
  assert.ok(conv.body.trimStart().startsWith('```') && conv.body.trimEnd().endsWith('```'), '代码块未用围栏包裹')
})

test('未知块兜底：class 不认识时告警且内容不丢', () => {
  const warns = []
  const html = '<body><h1>t</h1><div class="mystery-box">一段未知语义的文字</div><p>普通段</p></body>'
  const conv = convert(html, (m) => warns.push(m))
  assert.ok(conv.body.includes('一段未知语义的文字'), '未知块内容丢失')
  assert.ok(conv.body.includes('普通段'), '未知块后的正常块丢失')
  assert.ok(warns.some((w) => w.includes('未识别的块')), `应产生未识别告警，实际：${warns}`)
})

test('异构 quiz 模板兜底：无 li 选项的 quiz 整块原样保留并告警', () => {
  const warns = []
  const html = '<body><h1>t</h1><div class="quiz"><p class="q">Q</p><div class="option">甲</div></div></body>'
  const conv = convert(html, (m) => warns.push(m))
  // 选项是 div.option 而非 li：整块原样保留（内容不丢），并产生告警
  assert.ok(conv.body.includes('class="option"'), '异构 quiz 应整块原样保留')
  assert.ok(warns.some((w) => w.includes('quiz 块模板不匹配')), `应产生 quiz 模板告警，实际：${warns}`)
})

test('嵌套列表：li 内 ul 降层缩进', () => {
  const html = '<body><h1>t</h1><ul><li>外层<ul><li>内层</li></ul></li><li>同级</li></ul></body>'
  const conv = convert(html)
  assert.ok(conv.body.includes('- 外层\n  - 内层\n- 同级'), `嵌套缩进不符：\n${conv.body}`)
})

test('实体解码：命名与数字形式', () => {
  assert.equal(decodeEntities('a&amp;b&nbsp;c&#65;'), 'a&b cA')
})

test('正文相对链接重写：../reference 走镜像，./0004-x.html 走站内课页', () => {
  const html = '<body><h1>t</h1><p>见<a href="../reference/a-share-terms.html">术语表</a>与<a href="./0004-price-limits-and-call-auction.html">第 4 课</a></p></body>'
  const conv = convert(html)
  assert.ok(conv.body.includes(`[术语表](${withBase('/lessons/a-shares/reference/a-share-terms.html')})`), '镜像链接重写缺失')
  assert.ok(conv.body.includes('[第 4 课](/courses/a-shares/l/4/)'), '相邻课链接重写缺失')
})

test('表格竖线转义：单元格内 | 不破坏表格', () => {
  const html = '<body><h1>t</h1><table><tr><th>列</th></tr><tr><td>a|b</td></tr></table></body>'
  const conv = convert(html)
  assert.ok(conv.body.includes('| a\\|b |'), `竖线未转义：${conv.body}`)
})

/* ---------------- 其余四门课模板族 ---------------- */

const FAMILY_DIR = (slug) => path.resolve(__dirname, '../../docs/.vuepress/public/lessons', slug, 'lessons')
const familyLesson = (slug, file) => fs.readFileSync(path.join(FAMILY_DIR(slug), file), 'utf8')

test('pi-agent 族：recall 折叠答案、callout 标题、button.option 选项、字母答案', () => {
  const conv = convertAs('pi-agent', familyLesson('pi-agent', '0005-nodejs-file-system.html'))
  assert.ok(conv.metaLine.includes('阶段 0 · 模块 B'), 'lesson-meta（纯文本形态）未捕获')
  assert.ok(conv.body.includes('::: info 为什么学这个 · Mission 关联'), 'callout label 标题缺失')
  assert.ok(conv.body.includes('::: details 显示答案'), 'recall 折叠答案缺失')
  assert.ok(conv.body.includes('只暂停当前函数，不冻住整个程序'), 'recall 答案内容缺失')
  // quiz：data-answer=b（字母）+ button.option[data-key]；泛型文本已转义防 Vue 误解析
  assert.ok(conv.body.includes('**答案：B（Promise&lt;string&gt;）**'), '字母答案解析错误')
  assert.ok(conv.body.includes('writeFile 对不存在的文件会创建'), 'data-explain 解析缺失')
  assert.ok(conv.body.includes('- D. boolean 成功与否'), '选项 D 缺失')
  // further 的课程导航链接重写：0004-*.html → 站内课页
  assert.ok(conv.body.includes('](/courses/pi-agent/l/4/)') || conv.nav.prev, '相邻课链接未重写')
})

test('engineering-skills 族：label 选项、大写字母答案、script 解析提取、step 编号', () => {
  const conv = convertAs('engineering-skills', familyLesson('engineering-skills', '0002-grill-with-docs.html'))
  assert.ok(conv.body.includes('::: info 主源推荐（Primary Source）'), 'callout-title 标题缺失')
  assert.ok(/\*\*1\.\*\* \*\*按轮/.test(conv.body), 'step 编号段落缺失')
  // quiz：data-answer="C"（大写）+ label>input[value]
  assert.ok(conv.body.includes('**答案：C（都不写）**'), '大写字母答案错误')
  // 解析来自页尾 script 的 explanations 对象（正确项文本）
  assert.ok(conv.body.includes('正确。这是具体实现细节，应出现在 spec 或代码里'), 'script 解析未提取')
  assert.ok(conv.body.includes('- A. CONTEXT.md'), 'label 选项缺失')
})

test('english 族：card 容器、ul[data-answer] 索引答案、h4 题号合并', () => {
  const conv = convertAs('english', familyLesson('english', '0002-day1-indefinite-pronouns-practice.html'))
  assert.ok(conv.body.includes('::: info 做题第一步：先数个数'), 'card-info 容器与 h3 标题缺失')
  assert.ok(conv.body.includes('::: tip 任务 1：画对比表格'), 'card-success→tip 容器缺失')
  assert.ok(conv.body.includes('**第 1 题：I have two dictionaries'), 'h4 题号未合并进题干')
  assert.ok(conv.body.includes('**答案：B（the other）**'), 'ul[data-answer=1] 索引答案错误')
  assert.ok(conv.body.includes('两者中的另一个 → the other'), 'data-explain 解析缺失')
  assert.ok(conv.body.includes('[语法速查手册 §1](/blog/lessons/english/reference/grammar-points.html)'), '镜像相对链接未重写')
})

test('policy 族：subtitle→metaLine、compare 对比、onclick 布尔答案、口诀容器', () => {
  const conv = convertAs('policy', familyLesson('policy', '0001-party-history-events.html'))
  assert.ok(conv.metaLine.includes('对应错题：第1题、第11题'), 'subtitle 未捕获为 metaLine')
  assert.ok(conv.body.includes('::: danger'), 'compare-wrong→danger 缺失')
  assert.ok(conv.body.includes('::: tip'), 'compare-right/card-tip→tip 缺失')
  assert.ok(conv.body.includes('::: tip 记忆口诀'), 'mnemonic 容器缺失')
  assert.ok(!conv.body.includes('本课口诀：'), '口诀容器标题与正文前缀重复')
  // quiz：onclick checkAnswer(this, true, ...) 标记答案，选项自带 A. 前缀（应剥掉防重复）
  assert.ok(conv.body.includes('**答案：C（遵义会议）**'), 'onclick 布尔答案解析错误')
  assert.ok(conv.body.includes('- A. 中共一大'), '选项应去重字母前缀')
  // nav：下一课 + 两个参考
  assert.equal(conv.nav.next?.url, '/courses/policy/l/2/')
  assert.equal(conv.nav.middle.length, 2)
})

test('policy timeline：时间线项转为加粗年份行', () => {
  const conv = convertAs('policy', familyLesson('policy', '0004-military-building.html'))
  assert.ok(conv.body.includes('**1927.8.1 南昌起义** —— 打响第一枪'), `时间线转换缺失：${conv.body.slice(0, 200)}`)
})

test('五门课全部讲义：结构完整、无块级残留、quiz 全量转换', () => {
  const slugs = ['a-shares', 'pi-agent', 'engineering-skills', 'english', 'policy']
  for (const slug of slugs) {
    const dir = FAMILY_DIR(slug)
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()
    assert.ok(files.length >= 4, `${slug} 讲义不足`)
    for (const f of files) {
      const html = fs.readFileSync(path.join(dir, f), 'utf8')
      const warns = []
      const conv = lessonHtmlToMarkdown(html, { slug, onWarn: (m) => warns.push(m) })
      assert.ok(conv.body.length > 800, `${slug}/${f}：正文过短`)
      assert.ok(!/<div|onclick=|data-answer|<button|class="/.test(conv.body), `${slug}/${f}：残留交互标记`)
      const quizCount = (html.match(/class="quiz[\s"]/g) || []).length
      const detailsCount = (conv.body.match(/::: details /g) || []).length
      assert.ok(detailsCount >= quizCount, `${slug}/${f}：quiz ${quizCount} 个仅转出 ${detailsCount} 个`)
    }
  }
})
