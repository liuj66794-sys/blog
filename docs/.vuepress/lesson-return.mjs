function asText(value) {
  return typeof value === 'string' ? value : ''
}

/** Build a same-site return context without loading the course search index. */
export function createReturnTo(pathname = '/', query = {}, hash = '') {
  let path = asText(pathname) || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) path = '/'

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) params.append(key, String(item))
    }
  }
  const search = params.toString()
  const safeHash = asText(hash)
  return `${path}${search ? `?${search}` : ''}${safeHash ? (safeHash.startsWith('#') ? safeHash : `#${safeHash}`) : ''}`
}

export function makeSearchReturnTo(pathname = '/', query = {}, hash = '', base = '') {
  const prefix = asText(base).replace(/\/+$/, '')
  const rawPath = asText(pathname)
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  return createReturnTo(`${prefix}${path}`, query, hash)
}

export function appendReturnTo(target, returnTo) {
  const value = asText(target)
  const context = asText(returnTo)
  if (!value || !context) return value

  const hashIndex = value.indexOf('#')
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex)
  const withoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex)
  const queryIndex = withoutHash.indexOf('?')
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex)
  const existing = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1)
  const params = new URLSearchParams(existing)
  params.set('returnTo', context)
  return `${pathname}?${params.toString()}${hash}`
}

export const withReturnTo = appendReturnTo

/** Open a matched heading in the indexed lesson, when that heading has an ID. */
export function chapterTarget(hit, chapter) {
  const path = asText(hit?.interactiveHref || hit?.readingHref)
  const hash = asText(chapter?.href)
  if (!/^\/(?!\/)/u.test(path) || !/^#[^\s/?#]+$/u.test(hash)) return ''
  return `${path.split('#')[0]}${hash}`
}
