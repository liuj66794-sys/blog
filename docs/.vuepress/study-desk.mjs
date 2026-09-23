import { readEntries, lessonIdentity, resumeUrl } from '../../scripts/runtime/reading-state.mjs'
import { studyIdentity, subjectProgress, withStudyContext } from '../../scripts/runtime/study-state.mjs'

// One row per lesson, even when a student switches between reading and practice.
// Resolve old prep-course URLs through the current catalog before offering a link.
export function recentLessons(catalog, base = '/blog/', storage, limit = 4) {
  const seen = new Set(), result = []
  for (const entry of readEntries(base, storage)) {
    const identity = lessonIdentity(entry.path, base)
    const prep = studyIdentity(entry.path, base)
    const course = catalog[identity.slug]
    const lesson = course?.lessons.find(item => item.id === prep?.id)
    if (course && !lesson) continue
    const topicId = identity.mode === 'reading'
      ? entry.path.match(/\/l\/([^/]+)\/$/)?.[1]
      : String(Number(entry.path.match(/\/(\d{4})[-_]/)?.[1]))
    const key = `${identity.slug}:${lesson?.id || topicId}`
    if (seen.has(key)) continue
    seen.add(key)
    const canonical = lesson && withStudyContext(identity.mode === 'reading' ? lesson.href : lesson.interactive, null, base)
    const current = !canonical || decodeURI(canonical) === entry.path
    result.push({ ...entry, ...identity, key, title: lesson?.title || entry.title,
      href: current ? resumeUrl(entry, base) : canonical, restored: current,
      chapter: current ? entry.chapter : '',
    })
    if (result.length >= limit) break
  }
  return result
}

export function deskProgress(catalog, base = '/blog/', storage) {
  return Object.fromEntries(Object.entries(catalog).map(([slug, course]) => [
    slug, subjectProgress(slug, course.lessons, base, storage),
  ]))
}
