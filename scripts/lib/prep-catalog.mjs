/** Classify course lessons before publishing so tool pages cannot become numbered lessons. */
export function collectPrepLessons(files, course) {
  const ids = new Set()
  const entries = []
  for (const file of files.filter((f) => f.endsWith('.html')).sort()) {
    const name = file.slice(0, -5)
    if (course.skip.includes(name)) continue
    const match = course.numeric ? name.match(/^(\d{4})-.+$/) : name.match(/^(mzt|xg|sz)\d{2}$/)
    if (!match) throw new Error(`${course.slug}：未分类的课件 ${file}，请登记为课次或互动工具`)
    const no = course.numeric ? Number(match[1]) : null
    const id = course.numeric ? String(no) : name
    if (course.numeric && no < 1) throw new Error(`${course.slug}：课号必须为正整数：${file}`)
    if (ids.has(id)) throw new Error(`${course.slug}：重复课号 ${id}，已中止以免覆盖讲义`)
    ids.add(id)
    entries.push({ name, file, no, id })
  }
  if (!entries.length) throw new Error(`${course.slug}：没有可发布的课次`)
  const orderOf = (entry) => {
    const prefix = entry.name.match(/^[a-z]+/)?.[0]
    const index = course.order?.indexOf(prefix) ?? -1
    return index < 0 ? (course.order?.length ?? 0) : index
  }
  return entries.sort((a, b) => course.numeric
    ? a.no - b.no
    : orderOf(a) - orderOf(b) || a.name.localeCompare(b.name))
}

/** The same catalog powers subject counts, lesson titles and the per-subject search. */
export function filterPrepLessons(lessons, query = '', group = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return lessons.filter((lesson) => {
    if (group && lesson.group !== group) return false
    const text = `${lesson.id} ${lesson.label} ${lesson.title} ${lesson.group}`.toLocaleLowerCase()
    return terms.every((term) => text.includes(term))
  })
}
