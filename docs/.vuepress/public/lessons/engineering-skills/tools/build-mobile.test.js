/* 构建脚本（tools/build-mobile.js）的行为测试。
   seam：CLI —— 以 `node tools/build-mobile.js <srcDir> <outDir>` 运行，断言产物文件内容。
   不 import 脚本内部函数。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, 'build-mobile.js');

/** 在临时目录搭一个迷你工作区 fixture，返回 { src, out }。 */
function makeFixture() {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-fixture-'));
  const out = path.join(src, 'mobile');
  fs.mkdirSync(path.join(src, 'assets'));
  fs.mkdirSync(path.join(src, 'lessons'));

  fs.writeFileSync(path.join(src, 'assets', 'tokens.css'), [
    '/* 设计令牌 fixture */',
    '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+SC&display=swap");',
    ':root { --color-paper: #fff; }',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'assets', 'style.css'), [
    '@import url("tokens.css");',
    'body { background: var(--color-paper); }',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'assets', 'quiz.css'), [
    '@import url("tokens.css");',
    '.quiz { border: 1px solid; }',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'assets', 'toc.js'), [
    '/* 页内目录组件 fixture。使用方式：',
    '   <script src="../assets/toc.js" defer></script> */',
    '(function () {',
    "  var src = document.currentScript ? document.currentScript.src : '';",
    "  var idx = src.indexOf('assets/toc.js');",
    "  var root = idx >= 0 ? src.slice(0, idx) : './';",
    '})();',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'assets', 'quiz.js'),
    'function checkAnswer(button) { return button.closest(".quiz"); }\n');

  fs.writeFileSync(path.join(src, 'index.html'), [
    '<!DOCTYPE html>',
    '<html><head>',
    '<link rel="stylesheet" href="assets/style.css">',
    '<script src="assets/toc.js" defer></script>',
    '</head><body><h1>导航页</h1></body></html>',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(src, 'lessons', '0001-demo.html'), [
    '<!DOCTYPE html>',
    '<html><head>',
    '<link rel="stylesheet" href="../assets/style.css">',
    '<link rel="stylesheet" href="../assets/quiz.css">',
    '<script src="../assets/toc.js" defer></script>',
    '<script src="../assets/quiz.js"></script>',
    '</head><body>',
    '<h1>demo</h1>',
    '<script>window.quizExplanations = { q1: { A: "对" } };</script>',
    '</body></html>',
    '',
  ].join('\n'));

  return { src, out };
}

function build(src, out) {
  execFileSync(process.execPath, [SCRIPT, src, out], { stdio: 'pipe' });
}

/** 断言 HTML 中没有残留的外部资源引用。
 *  toc.js 头部注释里有一行示例 script 标签（位于块注释内），是注释不是标签，按行豁免。 */
function assertSelfContained(html) {
  assert.ok(!html.includes('<link'), '产物中不应残留 <link>');
  const externalScripts = html.split('\n')
    .filter((l) => /<script\s+src="(?!https?:)/.test(l) && !l.includes('*/'));
  assert.deepEqual(externalScripts, [], '产物中不应残留外部 script');
  assert.ok(!html.includes('@import url("tokens.css")'), '本地 @import 应被展开');
}

test('根目录页面被转换为完全自给自足的单文件', () => {
  const { src, out } = makeFixture();
  build(src, out);

  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assertSelfContained(html);
  assert.ok(html.includes(':root { --color-paper: #fff; }'), 'tokens.css 内容应内联');
  assert.ok(html.includes('body { background: var(--color-paper); }'), 'style.css 内容应内联');
  assert.ok(html.includes('(function ()'), 'toc.js 内容应内联');
});

test('子目录页面：多样式表各自内联，远程 @import 提升到样式块顶部', () => {
  const { src, out } = makeFixture();
  build(src, out);

  const html = fs.readFileSync(path.join(out, 'lessons', '0001-demo.html'), 'utf8');
  assertSelfContained(html);
  assert.ok(html.includes('.quiz { border: 1px solid; }'), 'quiz.css 内容应内联');
  assert.ok(html.includes('function checkAnswer'), 'quiz.js 内容应内联');
  assert.ok(html.includes('window.quizExplanations'), '页面已有内联脚本应保留');

  const remote = '@import url("https://fonts.googleapis.com/';
  const firstStyle = html.indexOf('<style>');
  const remoteIdx = html.indexOf(remote);
  const rootIdx = html.indexOf(':root');
  assert.ok(remoteIdx > firstStyle && remoteIdx < rootIdx,
    '远程 @import 应位于样式块顶部、任何规则之前');
});

test('toc 根路径按页面层级补丁：根目录 ./ 、子目录 ../', () => {
  const { src, out } = makeFixture();
  build(src, out);

  const root = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const nested = fs.readFileSync(path.join(out, 'lessons', '0001-demo.html'), 'utf8');
  assert.ok(root.includes("var root = './';"), '根目录页面的 toc 根路径应为 ./');
  assert.ok(nested.includes("var root = '../';"), '子目录页面的 toc 根路径应为 ../');
  assert.ok(!root.includes('document.currentScript'), '失效的 src 推导应被补丁替换');
});

test('内联 JS 中的 </script> 序列被转义，不会提前终结 script 元素', () => {
  const { src, out } = makeFixture();
  build(src, out);

  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  // fixture 的 toc.js 头部注释含 "</script> */"：浏览器会把裸 </script> 当作脚本结束
  assert.ok(!html.includes('</script> */'), '注释中的裸 </script> 必须被转义');
  assert.ok(html.includes('<\\/script> */'), '应转义为 <\\/script>');
});

/* ---------- 票 03：真实工作区冒烟 ---------- */

/** 独立遍历工作区收集内容 HTML 的相对路径（测试中自备，不复用脚本内部实现）。 */
function collectWorkspaceHtml(dir, outDir, base = dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === outDir || entry.name.startsWith('.') ||
          entry.name === 'assets' || entry.name === 'node_modules') continue;
      collectWorkspaceHtml(full, outDir, base, acc);
    } else if (entry.name.endsWith('.html')) {
      acc.push(path.relative(base, full));
    }
  }
  return acc;
}

test('真实工作区冒烟：全部内容页面生成到 mobile/ 且通过静态检查', () => {
  const workspace = path.join(__dirname, '..');
  const out = path.join(workspace, 'mobile');
  build(workspace, out);

  const expected = collectWorkspaceHtml(workspace, out).sort();
  // 有意硬编码：tripwire——新增内容页时强制来此确认产物清单，而非静默放行
  assert.equal(expected.length, 15, '工作区应有 15 个内容 HTML');

  for (const rel of expected) {
    const html = fs.readFileSync(path.join(out, rel), 'utf8');
    assert.ok(!html.includes('<link'), `${rel}: 不应残留 <link>`);
    // toc.js 头部的用法注释里含一行示例 <script src=…></script>（行尾带 */），是注释不是标签，豁免
    const externalScripts = html.split('\n')
      .filter((l) => /<script\s+src="(?!https?:)/.test(l) && !l.includes('*/'));
    assert.deepEqual(externalScripts, [], `${rel}: 不应残留外部 script`);
    assert.ok(!html.includes('@import url("tokens.css")'), `${rel}: 本地 @import 应被展开`);
    assert.ok(html.includes('fonts.googleapis.com'), `${rel}: 远程字体 @import 应保留`);
    assert.ok(html.includes('class="toc"') || html.includes('toc-home') || html.includes("var root ="),
      `${rel}: toc.js 应已内联`);
    const depth = rel.includes(path.sep) ? '../' : './';
    assert.ok(html.includes(`var root = '${depth}';`), `${rel}: toc 根路径应为 ${depth}`);
  }

  for (const lesson of ['0004-to-tickets', '0005-implement', '0006-diagnosing-bugs', '0007-wayfinder']) {
    const html = fs.readFileSync(path.join(out, 'lessons', `${lesson}.html`), 'utf8');
    assert.ok(html.includes('function checkAnswer'), `${lesson}: quiz.js 应已内联`);
  }
});
