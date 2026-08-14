/* 单文件构建：把 tokens.css + lesson.css + quiz.js + recall.js 内联进每个 HTML，
 * 输出自包含页面到 dist/（镜像目录结构），供微信文件助手传手机使用。
 * 用法：node build.mjs
 * 注意：quiz.js / recall.js 依赖 defer 时序，内联后必须插到 </body> 前，
 *       否则脚本在 DOM 建好前执行，组件全部失效。 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const tokens = readFileSync("tokens.css", "utf8");
const lesson = readFileSync("assets/lesson.css", "utf8")
  .replace('@import url("../tokens.css");', "");
const css = tokens + "\n" + lesson;

const quiz = readFileSync("assets/quiz.js", "utf8");
const recall = readFileSync("assets/recall.js", "utf8");

for (const asset of [quiz, recall]) {
  if (asset.includes("</script>")) throw new Error("JS 含 </script>，不能安全内联");
}
if (css.includes("</style>")) throw new Error("CSS 含 </style>，不能安全内联");

const scripts =
  `<script>\n${quiz}\n</script>\n<script>\n${recall}\n</script>\n</body>`;

const dirs = ["lessons", "reference"];
let count = 0;

for (const dir of dirs) {
  const outDir = join("dist", dir);
  mkdirSync(outDir, { recursive: true });

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".html")) continue;
    let html = readFileSync(join(dir, file), "utf8");

    if (!html.includes('<link rel="stylesheet" href="../assets/lesson.css">')) {
      throw new Error(`${dir}/${file}: 未找到样式 link 标签`);
    }
    html = html.replace(
      '<link rel="stylesheet" href="../assets/lesson.css">',
      () => `<style>\n${css}\n</style>`
    );

    // 移除外链脚本（顺序无关，两个组件互不依赖）
    html = html.replace(/<script src="\.\.\/assets\/(quiz|recall)\.js" defer><\/script>\n?/g, "");

    if (!html.includes("</body>")) throw new Error(`${dir}/${file}: 未找到 </body>`);
    html = html.replace("</body>", () => scripts);

    writeFileSync(join(outDir, file), html);
    count++;
    console.log(`built: dist/${dir}/${file}`);
  }
}

console.log(`done: ${count} 个自包含 HTML 已输出到 dist/`);
