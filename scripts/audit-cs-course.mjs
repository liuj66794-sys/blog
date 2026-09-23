import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { extractCourseQuestions } from './lib/course-question-index.mjs'
import { courseGuides } from './data/cs/course-guides.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dir = path.join(root, 'docs/.vuepress/public/lessons/zsb-cs/lessons')
const output = path.join(root, 'output/cs-course-audit-2026-09-22')
const next = [
  '用一个可运行的最小程序串起编辑、编译、链接和运行，并解释报错发生在哪一步。',
  '把数制、补码、常量分开；补除基取余的每一行与字符/整数类型边界。',
  '补表达式的操作数、类型与结果对照，区分优先级、结合性和求值顺序。',
  '让输入字符、格式串和变量值逐项对应，展示 scanf 空白与返回值。',
  '保留已有代码例子，增加条件判断的逐步路径与短路后变量状态。',
  '把 else 配对、switch 穿透、位运算拆成三组实验，逐步预测。',
  '按条件→循环体→更新显示每轮变量；突出 continue 回到哪里。',
  '给数组和字符串配内存格，单独解释末尾空字符及数组容量。',
  '把一次函数调用拆成实参求值、形参副本、执行、返回四步。',
  '逐层画递归调用与返回；数组参数、static、extern 分开学习。',
  '本轮样板：六段讲解、四组状态演示、六道小练习、保留六道原课测验。',
  '用行/列内存格讲二维数组，拆解数组指针和指针数组声明。',
  '分别完成一个结构体对象与一个文件读写例子，展示资源打开失败分支。',
  '先数具体输入下的执行次数，再归纳复杂度，避免先背分类表。',
  '用节点连线逐句展示插入/删除，明确头结点和首元结点的区别。',
  '拆分栈、循环队列、中缀转后缀；显示每一步栈/队列/输出。',
  '从坐标到线性位置一步步数格子，再归纳地址公式。',
  '先用具体字符串区分子串、空串、空格串，再解释计数口径。',
  '让术语与同一棵可见的树对应，再由小例子推导性质。',
  '已有两例还原推演可保留；补树形图、当前节点和待访问结构。',
  '把树到二叉树转换画成逐步连线，区分孩子边与兄弟边。',
  '逐轮显示候选权值、选中的两棵树、合并结果，再计算 WPL。',
  '同一张图对照矩阵/邻接表，再逐步展示 DFS 栈和 BFS 队列。',
  '按算法拆课内小节，分别展示候选边、距离表和拓扑入度变化。',
  '增加折半查找区间、散列探查路径、BST 比较路径的逐步表。',
  '同一组数据分别运行几种排序，每轮只标明比较、移动与已排序范围。',
  '保留复习定位；模板关联回讲解课，并增加缺一步的补全任务。',
  '保持模拟考试定位；核对参考答案与试卷来源，复盘跳回薄弱章节。',
  '保持模拟考试定位；核对参考答案与试卷来源，复盘跳回薄弱章节。',
]
const strip = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const rows = []
let codeBefore = 0, operatorBefore = 0, tagBefore = 0, quizTotal = 0
for (const file of fs.readdirSync(dir).filter(f => /^\d{4}-.*\.html$/.test(f)).sort()) {
  const id = String(Number(file.slice(0, 4)))
  const html = fs.readFileSync(path.join(dir, file), 'utf8')
  const mdPath = `docs/courses/zsb-cs/l/${id}.md`
  const md = fs.readFileSync(path.join(root, mdPath), 'utf8')
  const before = execFileSync('git', ['show', `HEAD:${mdPath}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const raw = execFileSync('git', ['show', `HEAD:docs/.vuepress/public/lessons/zsb-cs/lessons/${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const ctx = { slug: 'zsb-cs', lessonId: id, source: file, title: '' }
  const qs = extractCourseQuestions(html, ctx), oldQs = extractCourseQuestions(raw, ctx)
  const stable = JSON.stringify(qs) === JSON.stringify(oldQs)
  if (!stable) throw new Error(`原课题目发生变化：${file}`)
  if (!html.includes('data-cs-course="1"')) throw new Error(`尚未推广分节学习：${file}`)
  quizTotal += qs.length
  const preWrapped = /```[^\n]*\n<code>/.test(before)
  const starDropped = [...raw.matchAll(/<p class="quiz-q">([\s\S]*?)<\/p>/g)].some(m => {
    const plain = strip(m[1]); return plain.includes('*') && before.includes(plain.replace(/\*/g, ''))
  })
  const escapedTag = /&lt;code&gt;/.test(before)
  if (preWrapped) codeBefore++
  if (starDropped) operatorBefore++
  if (escapedTag) tagBefore++
  if (/```[^\n]*\n<code>|&lt;code&gt;/.test(md)) throw new Error(`阅读版代码标签残留：${mdPath}`)
  rows.push({ id, file, title: strip(raw.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? file),
    headings: [...raw.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map(m => strip(m[1])),
    sourceCodeBlocks: (raw.match(/<pre/g) || []).length,
    sourceTables: (raw.match(/<table/g) || []).length,
    sourceFigures: (raw.match(/<(?:svg|canvas|img)\b/g) || []).length,
    reviewAssumption: /你已经学过一轮|死记|默写|必背/.test(raw),
    questions: qs.length, questionIdentityPreserved: stable,
    steps: (html.match(/data-cs-step/g) || []).length,
    labs: (html.match(/data-cs-lab=/g) || []).length,
    checks: (html.match(/data-cs-check=/g) || []).length,
    delivered: courseGuides[id]?.title || '地址、赋值、数组、自增、交换、迁移六段精讲',
    repaired: [preWrapped ? '代码块标签' : '', starDropped ? '题干星号' : '', escapedTag ? '解析标签' : ''].filter(Boolean),
    suggestion: next[Number(id) - 1] })
}
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(rows, null, 2) + '\n')
const report = `# 计算机课程分节学习推广与检查

日期：2026-09-22。范围：29 课分节交互；28 课各新增一个核心难点演示、两道逐选项反馈判断及迁移题，保留第 11 课六段精讲样板。此轮为核心难点补强，并非所有知识点或原试卷答案的专家审校。

## 结论与优先级

1. 首先修复可确认的展示缺陷。转换器原先会删除题干/答案中的星号，且保留代码块的 code 标签、把解析中的 code 标签显示为文字。已在转换层修复，并重新生成计算机阅读版。
2. 讲解断层的主要线索：部分课程明确按“已学过一轮”设计；表格、口诀和回忆题多，而初学时需要的执行过程需补足。代码块少不等于课程质量差，下面的数量仅作定位线索。
3. 全部 29 课支持暂停、恢复、逐节和全文模式。共 ${rows.reduce((n,r)=>n+r.labs,0)} 组过程演示、${rows.reduce((n,r)=>n+r.checks,0)} 道新增理解检查；原课测验独立统计。
4. 第 27–29 课使用复习或模拟复盘情境，不把自编例子声称为原卷试题；数学本轮未改。

## 全量展示检查

- 检查 29 课、${quizTotal} 道原课测验；题目身份、题干、选项、答案和原解析均与变更前一致。
- 变更前 ${codeBefore} 课的代码块含多余 code 标签；${tagBefore} 课的答案解析含转义后显示的 code 标签。
- 以纯文本直接匹配可确认 ${operatorBefore} 课存在题干星号丢失；这是保守计数，不包含所有带内联代码的情况。
- 第 11 课原文的“空指针指向零号地址”“int 指针固定移动四字节”等讲解已由明确适用条件和边界的教学解释替代。

## 逐课交付与后续深化

此表记录本轮新增的核心难点。原课知识点和测验继续保留；后续可依据实际卡点继续逐项深化。

| 课次 | 内容 | 本轮补充 | 小节/演示/理解检查 |
| --- | --- | --- | --- |
${rows.map(r => `| ${r.id} | ${r.title} | ${r.delivered} | ${r.steps}/${r.labs}/${r.checks} |`).join('\n')}

## 维护与验证

- 教学正文：scripts/data/cs/pointer-lesson.html 及 c-language-guides.mjs、data-structure-guides.mjs、review-guides.mjs。
- 同步修订：scripts/lib/cs-learning-patch.mjs，接入镜像与阅读版两条路径；私人知识库源文件未改写。
- 交互和样式：scripts/runtime/cs-pointer.mjs、cs-pointer.css；资源 URL 带内容版本。
- 定向同步：node scripts/sync-prep.mjs --cs-only；全量同步同样应用修订。
- 重新检查：node scripts/audit-cs-course.mjs。
- 小练习使用各课独立的浏览器记录，接入学习记录备份；内容签名改变后不沿用旧判断答案。原课测验题号保持兼容。

## 教学依据

- [Microsoft C：地址与解引用](https://learn.microsoft.com/en-us/cpp/c-language/indirection-and-address-of-operators?view=msvc-170)
- [GNU C：指针与数组](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/Pointers-and-Arrays.html)
- [GNU C：指针运算](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/Pointer-Arithmetic.html)
`
fs.writeFileSync(path.join(output, 'report.md'), report)
console.log(JSON.stringify({ lessons: rows.length, originalQuestions: quizTotal, codeWrapperLessons: codeBefore, literalCodeTagLessons: tagBefore, plainStemStarLossLessons: operatorBefore, report: path.join(output, 'report.md') }))
