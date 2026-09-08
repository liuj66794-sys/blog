import fs from 'node:fs'
import path from 'node:path'

/** Split CSS values without splitting commas/semicolons inside url(), local(), or quotes. */
function splitCssValue(value, separator) {
  const parts = []
  let start = 0
  let depth = 0
  let quote = ''
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '\\') {
      i++
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === '(') {
      depth++
    } else if (char === ')') {
      depth--
    } else if (char === separator && depth === 0) {
      parts.push(value.slice(start, i))
      start = i + 1
    }
  }
  parts.push(value.slice(start))
  return parts
}

/**
 * Drop unavailable local font formats from a mirrored stylesheet.
 * Keep every declaration/block delimiter: minified KaTeX ends src without a
 * semicolon, so capturing through `}` would swallow all following layout rules.
 * Remote, root-relative, data and local() sources are not filesystem lookups.
 */
export function stripMissingFontUrls(css, cssDir) {
  return css.replace(/@font-face\s*\{([^{}]*)\}/gi, (block, body) => {
    const declarations = splitCssValue(body, ';')
    const srcIndex = declarations.findIndex((declaration) => /^\s*src\s*:/i.test(declaration))
    if (srcIndex < 0) return block
    const [, prefix, value] = declarations[srcIndex].match(/^(\s*src\s*:)([\s\S]*)$/i)
    const kept = splitCssValue(value, ',').filter((source) => {
      const match = source.match(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/i)
      if (!match) return true
      const url = (match[1] ?? match[2] ?? match[3]).trim()
      if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(url)) return true
      let pathname = url.split(/[?#]/)[0]
      try {
        pathname = decodeURIComponent(pathname)
      } catch {
        // A literal percent is allowed in a local file name.
      }
      return fs.existsSync(path.resolve(cssDir, pathname))
    })
    if (!kept.length) return ''
    declarations[srcIndex] = prefix + kept.join(',')
    return block.slice(0, block.indexOf('{') + 1) + declarations.join(';') + '}'
  })
}

/** Website-specific fixes live in the repository; mirroring never edits the private source. */
export function installLessonRuntime(courseRoot, slug) {
  const runtimes = { 'zsb-math': 'math', 'zsb-english': 'english', 'zsb-politics': 'politics', 'zsb-cs': 'cs' }
  if (!runtimes[slug]) return
  fs.mkdirSync(path.join(courseRoot, 'assets'), { recursive: true })
  fs.copyFileSync(new URL(`../runtime/${runtimes[slug]}-quiz.js`, import.meta.url), path.join(courseRoot, 'assets', 'quiz.js'))
}

export function installLearningAssets(publicRoot) {
  const dest = path.join(publicRoot, 'learning')
  fs.mkdirSync(dest, { recursive: true })
  for (const file of ['learning-tokens.css', 'lesson-shell.css', 'lesson-shell.mjs', 'reading-state.mjs', 'study-state.mjs', 'lesson-session.mjs', 'study-session.css']) {
    fs.copyFileSync(new URL(`../runtime/${file}`, import.meta.url), path.join(dest, file))
  }
}
