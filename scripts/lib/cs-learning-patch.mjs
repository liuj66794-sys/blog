import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { withBase } from '../../docs/.vuepress/site-meta.mjs'
import { renderCourseGuide } from '../data/cs/course-guides.mjs'

const lessonFile = 'lessons/0011-pointers-basics.html'
const templateUrl = new URL('../data/cs/pointer-lesson.html', import.meta.url)
const assetUrl = (name) => new URL(`../runtime/${name}`, import.meta.url)

/** Repository-owned teaching edition. Source files in the private vault stay intact.
 * Existing quiz markup/IDs are retained verbatim so old attempts remain compatible.
 */
export function patchCsLearning(html, slug, file) {
  if (slug === 'zsb-cs' && file === 'lessons/index.html') {
    if (html.includes('data-cs-guide-index')) return html
    const goal = /<div class="goal">[\s\S]*?<\/div>/
    if (!goal.test(html)) throw new Error('计算机课程大纲结构已变化。')
    return html.replace('<html', '<html data-cs-guide-index="1"')
      .replace('每课约 15 分钟 + 练习', '按小节学习 · 支持暂停与继续')
      .replace(goal, `<div class="goal"><p class="goal-title">先理解过程，再独立尝试</p><p>29 课都可以逐节学习，也可以展开全文查阅。先用生活类比理解核心概念，逐步查看变量或数据结构的变化，再完成带理由反馈的小判断和迁移练习，最后深入各知识点与原课测验。每课的学习位置、演示进度与判断保存在此浏览器，可通过学习记录备份转移。</p><p>C 语言侧重代码执行与变量变化；数据结构侧重操作、访问顺序与边界；第 27–29 课侧重复习与模拟复盘。先看<a href="0007-loops.html">循环</a>、<a href="0011-pointers-basics.html">指针</a>或<a href="0023-graph-basics-traversal.html">图遍历</a>，也可从第 1 课依次开始。</p></div>`)
  }
  if (slug !== 'zsb-cs' || !/^lessons\/\d{4}-[\w-]+\.html$/.test(file)) return html
  if (html.includes('data-cs-pointer="1"')) return html
  if (file !== lessonFile) {
    const result = renderCourseGuide(html, Number(file.slice(8, 12)))
    return result ? attachAssets(result, result) : html
  }
  const start = html.indexOf('<h1>')
  const quiz = html.indexOf('<h2>六、测验（点击选项作答）</h2>')
  const footer = html.indexOf('<nav class="footer-nav">')
  if (start < 0 || quiz < start || footer < quiz) throw new Error('指针课原始结构已变化，请核对教学版插入位置。')
  const template = fs.readFileSync(templateUrl, 'utf8')
  const tail = html.slice(quiz, footer)
    .replace('<h2>六、测验（点击选项作答）</h2>', '<h2 tabindex="-1">07 / 原课测验与复习</h2>')
    .replace(/<div class="teacher-note">[\s\S]*?<\/div>/, '')
  const result = html.slice(0, start) + template + tail + '</section></section></section>\n' + html.slice(footer)
  return attachAssets(result, template)
}

function attachAssets(result, content) {
  const version = createHash('sha256').update(content)
    .update(fs.readFileSync(assetUrl('cs-pointer.css')))
    .update(fs.readFileSync(assetUrl('cs-pointer.mjs'))).digest('hex').slice(0, 12)
  return result.replace('<html', '<html data-cs-pointer="1" data-cs-course="1"')
    .replace('</head>', `<link rel="stylesheet" data-cs-asset href="${withBase('/learning/cs-pointer.css')}?v=${version}">\n<script type="module" data-cs-asset src="${withBase('/learning/cs-pointer.mjs')}?v=${version}"></script>\n</head>`)
}

/** Reading edition contains all teaching/answers; only interactive controls disappear. */
export function csReadingHtml(html) {
  return html.replace(/<aside class="cs-path"[\s\S]*?<\/aside>/, '')
    .replace(/<script type="application\/json" id="cs-course-data">[\s\S]*?<\/script>/g, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/g, '')
    .replace(/<section data-cs-lab="[^"]*"><\/section>/g, '')
    .replace(/<section data-cs-check="[^"]*"><\/section>/g, '')
    .replace(/<p class="cs-interactive-note">[\s\S]*?<\/p>/g, '')
}
