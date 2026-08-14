#!/usr/bin/env node
/* 构建手机版（见 CONTEXT.md「手机版」、docs/adr/0001-mobile-single-file-inline.md）：
 * 扫描工作区中的内容 HTML，把外部 CSS/JS 全部内联为单文件，
 * 按源目录结构镜像输出到 mobile/。源文件不动，mobile/ 是生成物。
 *
 * 用法：node tools/build-mobile.js [srcDir] [outDir]
 *   默认 srcDir = 工作区根，outDir = <工作区根>/mobile
 */
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const OUT = path.resolve(process.argv[3] || path.join(SRC, 'mobile'));

const IMPORT_RE = /@import\s+url\((['"]?)([^'")]+)\1\)\s*;?/g;
const LINK_RE = /<link\s[^>]*rel="stylesheet"[^>]*>/g;
const HREF_RE = /href="([^"]+)"/;
const SCRIPT_RE = /<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g;

function isRemote(url) {
  return /^https?:\/\//.test(url);
}

/** 读 CSS 文件并递归展开本地 @import；返回 { body, remotes }。 */
function resolveCss(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const remotes = [];
  const body = text.replace(IMPORT_RE, (match, _q, url) => {
    if (isRemote(url)) {
      remotes.push(`@import url("${url}");`);
      return '';
    }
    const nested = resolveCss(path.resolve(path.dirname(filePath), url));
    remotes.push(...nested.remotes);
    return nested.body;
  });
  return { body: body.trim(), remotes };
}

/** 把 CSS 文件渲染为可内联的完整样式文本：远程 @import 置顶。 */
function inlineStylesheet(filePath) {
  const { body, remotes } = resolveCss(filePath);
  return [...remotes, body].filter(Boolean).join('\n');
}

/** toc.js 中从自身 script src 推导工作区根路径的代码块；内联后 src 为空，推导失效。 */
const TOC_ROOT_DERIVATION_RE =
  /var src = document\.currentScript[\s\S]*?var root = idx >= 0 \? src\.slice\(0, idx\) : '\.\/';/;

/** 内联 JS 文件内容；toc.js 按页面层级补丁根路径推导（仅作用于生成物，源文件不改）。 */
function inlineScript(filePath, htmlDir) {
  let js = fs.readFileSync(filePath, 'utf8').trim();
  if (path.basename(filePath) === 'toc.js') {
    const depth = path.relative(SRC, htmlDir); // '' = 根目录页面，'lessons' 等 = 子目录页面
    // 只支持一层子目录：与工作区约定（lessons/、reference/ 均为一层）绑定；若将来出现两层目录需改这里
    const root = depth === '' ? './' : '../';
    const patched = `var root = '${root}'; // 构建时按页面层级写入（原逻辑从 script src 推导，内联后失效）`;
    if (!TOC_ROOT_DERIVATION_RE.test(js)) {
      throw new Error(`toc.js 的根路径推导代码块未匹配，补丁失败：${filePath}`);
    }
    js = js.replace(TOC_ROOT_DERIVATION_RE, patched);
  }
  // 裸 </script> 会提前终结 inline script 元素（哪怕出现在注释或字符串里），必须转义
  return js.replace(/<\/script/gi, '<\\/script');
}

function transformHtml(html, htmlPath) {
  const htmlDir = path.dirname(htmlPath);
  return html
    .replace(LINK_RE, (tag) => {
      const href = tag.match(HREF_RE)[1];
      if (isRemote(href)) return tag;
      const css = inlineStylesheet(path.resolve(htmlDir, href));
      return `<style>\n${css}\n</style>`;
    })
    .replace(SCRIPT_RE, (_tag, src) => {
      if (isRemote(src)) return _tag;
      const js = inlineScript(path.resolve(htmlDir, src), htmlDir);
      return `<script>\n${js}\n</script>`;
    });
}

/** 递归收集内容 HTML：跳过输出目录、assets、node_modules 与点目录。 */
function collectHtml(dir, outDir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === outDir || entry.name.startsWith('.') ||
          entry.name === 'assets' || entry.name === 'node_modules') continue;
      collectHtml(full, outDir, acc);
    } else if (entry.name.endsWith('.html')) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const files = collectHtml(SRC, OUT);
  for (const file of files) {
    const rel = path.relative(SRC, file);
    const target = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, transformHtml(fs.readFileSync(file, 'utf8'), file));
    console.log(`built ${rel}`);
  }
  console.log(`手机版已生成：${files.length} 个文件 → ${path.relative(process.cwd(), OUT) || OUT}`);
}

main();
