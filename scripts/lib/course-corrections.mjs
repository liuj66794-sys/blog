import fs from 'node:fs'

export const courseCorrections = JSON.parse(fs.readFileSync(new URL('../data/course-corrections.json', import.meta.url), 'utf8'))
export function applyCourseCorrections(input, subject, file) {
  let content = input.replace(/\r\n?/g, '\n')
  for (const fix of courseCorrections.filter(f => f.subject === subject && f.file === file.replace(/\\/g, '/'))) {
    for (const { from, to, count } of fix.changes) {
      const occurrences = content.split(to).join('').split(from).length - 1
      if (!occurrences && content.split(to).length - 1 >= count) continue
      if (occurrences !== count) throw new Error(`课程修订 ${fix.id} 期望 ${count} 处，实际 ${occurrences} 处；源题有变，请核对后更新修订。`)
      content = content.split(from).join(to)
    }
  }
  return content
}

// Reconstruct only the declared prior version to retain old math question IDs.
export function beforeCourseCorrections(input, subject, file) {
  let content = input
  for (const fix of courseCorrections.filter(f => f.subject === subject && f.file === file.replace(/\\/g, '/')).reverse()) {
    for (const { from, to } of [...fix.changes].reverse()) content = content.split(to).join(from)
  }
  return content
}
