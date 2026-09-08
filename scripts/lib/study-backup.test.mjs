import assert from 'node:assert/strict'
import test from 'node:test'
import { prepCatalog } from '../../docs/.vuepress/prep-catalog.mjs'
import {
  BACKUP_AT_KEY,
  applyStudyImport,
  createStudyBackup,
  isAllowedStudyKey,
  parseStudyBackupText,
  previewStudyImport,
  readLastBackupAt,
  serializeStudyBackup,
  studyConflictId,
  validateStudyBackup,
  writeLastBackupAt,
} from '../../docs/.vuepress/study-backup.mjs'
import { READING_KEY, readEntries, saveReading } from '../runtime/reading-state.mjs'

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries))
    this.failKey = null
    this.failOnce = false
  }

  get length() { return this.values.size }

  key(index) { return [...this.values.keys()][index] ?? null }

  getItem(key) { return this.values.has(key) ? this.values.get(key) : null }

  setItem(key, value) {
    if (this.failOnce && key === this.failKey) {
      this.failOnce = false
      throw new Error(`simulated write failure for ${key}`)
    }
    this.values.set(String(key), String(value))
  }

  removeItem(key) { this.values.delete(String(key)) }
}

const base = '/blog/'
const answerPath = (slug, name) => `${base}lessons/${slug}/lessons/${name}.html`

function allStudyValues() {
  return {
    'l1uj-reading-v1': JSON.stringify({
      version: 1,
      entries: [{
        path: `${base}courses/zsb-math/l/10/`, slug: 'zsb-math', subject: '高等数学', mode: 'reading',
        title: '极限与连续', updatedAt: 1000, y: 240, offset: 8, anchor: 'section-2', chapter: '极限',
      }],
    }),
    'zc-progress-v1': JSON.stringify({ '0010': { visits: 1, quizRight: 1, quizTotal: 2, recallOk: 0, recallNo: 1 } }),
    'zc-progress-items-v1:0010': JSON.stringify({
      quiz: { '0-hash': { attempts: ['B'], done: true } },
      recall: { '1-hash': { shown: true, vote: 'bad' } },
      legacy: { quizRight: 1, quizTotal: 2, recallOk: 0, recallNo: 1 },
    }),
    'zsb-course-done-0001': '1',
    [`l1uj-english-answers-v1:${answerPath('zsb-english', '0001-pronouns')}:quiz`]: JSON.stringify({
      0: { signature: 'question-signature', picked: 2 },
    }),
    'zsb-mistakes-v1': JSON.stringify({
      '0001': { 1: { wrongs: 2, fixed: false, t: '指针题' } },
    }),
    [`l1uj-cs-answers-v1:${answerPath('zsb-cs', '0001-intro')}`]: JSON.stringify({
      1: { signature: 'cs-signature', attempts: ['C', 'A'] },
    }),
    'zzkk:v2:lesson:mzt01': JSON.stringify({
      best: 80, done: true, at: '2026-09-01T01:02:03.000Z', visits: 2,
      quizTotal: 4, quizRoundTotal: 4, quizAnswered: 4, quizCorrect: 3,
      quizComplete: true, exerciseComplete: true, quizAllCorrect: false,
      quizReviewNeeded: true, reviewNeeded: true,
      exerciseStatus: 'exercise-complete', status: 'exercise-complete',
      cardsReviewed: 5, cardsGood: 4, cardsBad: 1, cardsReviewNeeded: true,
      manualActivity: true, manualDone: true,
    }),
    'zzkk:v2:lesson:review:毛中特': JSON.stringify({ best: 60, at: '2026-09-01T01:02:03.000Z' }),
    'zzkk:v2:card:hcard1': JSON.stringify({ box: 2, streak: 3, at: '2026-09-01' }),
    'zzkk:v2:wrong:hwrong1': JSON.stringify({
      count: 2, firstAt: '2026-08-30', lastAt: '2026-09-01', stem: '题干',
      options: [{ letter: 'A', text: '选项' }], answer: 'A', exp: '解析', from: 'mzt01',
    }),
    [`l1uj-politics-answers-v1:${answerPath('zsb-politics', 'mzt01')}:quiz`]: JSON.stringify({
      hquestion: { picked: ['A'], done: true },
    }),
    'zsb-prep-checks': JSON.stringify({ [`${base}prep/gaoshu/#w1`]: 1 }),
    'l1uj-study-progress-v1': JSON.stringify({
      version: 1,
      entries: {
        'zsb-math:10': {
          slug: 'zsb-math', id: '10', title: '极限与连续', path: answerPath('zsb-math', '0010-limit'),
          total: 4, answered: 0, correct: 0, reviewNeeded: 1, updatedAt: 3000,
        },
      },
    }),
    'l1uj-study-tasks-v1': JSON.stringify({
      version: 1,
      entries: {
        'lesson:zsb-math:10': { deferUntil: '2026-09-09', limit: 5, updatedAt: 3000 },
        'review:politics': { limit: 1, updatedAt: 3000 },
        'wrong:cs': { limit: 10, updatedAt: 3000 },
        'wrong:politics': { deferUntil: '2026-09-10', updatedAt: 3000 },
      },
    }),
    'zsb-prep-checks-meta-v1': JSON.stringify({
      [`${base}prep/gaoshu/#w1`]: { checked: true, updatedAt: 3000 },
    }),
  }
}

test('exports and restores every real study key while excluding unrelated storage', () => {
  const originalValues = allStudyValues()
  const source = new MemoryStorage({ ...originalValues, [BACKUP_AT_KEY]: '7777', 'vuepress-theme-appearance': 'dark', unrelated: 'keep me' })
  const exported = createStudyBackup(source, { base, now: 9000 })

  assert.deepEqual(exported.skipped, [])
  assert.deepEqual(new Set(exported.includedKeys), new Set(Object.keys(originalValues)))
  assert.equal(validateStudyBackup(exported.backup, { base }).valid, true)
  assert.equal(exported.backup.createdAt, 9000)
  assert.equal(Object.hasOwn(exported.backup.records, 'vuepress-theme-appearance'), false)
  assert.equal(Object.hasOwn(exported.backup.records, BACKUP_AT_KEY), false)

  const restored = new MemoryStorage({ unrelated: 'keep me' })
  const parsed = parseStudyBackupText(serializeStudyBackup(exported.backup, { base }), { base })
  assert.equal(parsed.valid, true)
  const result = applyStudyImport(parsed.payload, restored, { base })
  assert.equal(result.applied, true)
  assert.deepEqual(result.writtenKeys.sort(), Object.keys(originalValues).sort())
  for (const [key, value] of Object.entries(originalValues)) assert.equal(restored.getItem(key), value, key)
  assert.equal(restored.getItem('unrelated'), 'keep me')
})

test('persists the latest successful backup time outside the exported study records', () => {
  assert.equal(readLastBackupAt(new MemoryStorage()), null)
  assert.equal(readLastBackupAt(new MemoryStorage({ [BACKUP_AT_KEY]: '' })), null)
  const storage = new MemoryStorage()
  assert.equal(writeLastBackupAt(storage, 1234), true)
  assert.equal(readLastBackupAt(storage), 1234)
  assert.equal(storage.getItem(BACKUP_AT_KEY), '1234')
  assert.equal(readLastBackupAt(new MemoryStorage({ [BACKUP_AT_KEY]: 'not-a-time' })), null)
})

test('merges timestamped records and keeps local newer entries by default', () => {
  const key = 'l1uj-study-progress-v1'
  const local = {
    version: 1,
    entries: {
      'zsb-math:10': {
        slug: 'zsb-math', id: '10', title: '本机较新', path: answerPath('zsb-math', '0010-limit'),
        total: 4, answered: 3, correct: 2, reviewNeeded: 1, updatedAt: 5000,
      },
      'zsb-cs:1': {
        slug: 'zsb-cs', id: '1', title: '本机旧记录', path: answerPath('zsb-cs', '0001-intro'),
        total: 2, answered: 1, correct: 1, reviewNeeded: 0, updatedAt: 1000,
      },
    },
  }
  const incoming = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 9000,
    records: {
      [key]: {
        version: 1,
        entries: {
          'zsb-math:10': { ...local.entries['zsb-math:10'], title: '备份旧记录', answered: 1, correct: 0, updatedAt: 3000 },
          'zsb-cs:1': { ...local.entries['zsb-cs:1'], title: '备份较新', answered: 2, correct: 2, updatedAt: 7000 },
          'zsb-english:2': {
            slug: 'zsb-english', id: '2', title: '新增英语', path: answerPath('zsb-english', '0002-grammar'),
            total: 3, answered: 1, correct: 1, reviewNeeded: 0, updatedAt: 7000,
          },
        },
      },
    },
  }
  const storage = new MemoryStorage({ [key]: JSON.stringify(local) })
  const preview = previewStudyImport(incoming, storage, { base })
  assert.equal(preview.valid, true)
  assert.equal(preview.requiresChoice, false)
  assert.equal(preview.conflicts.find((item) => item.itemKey === 'zsb-math:10').action, 'keep-local')
  assert.equal(preview.conflicts.find((item) => item.itemKey === 'zsb-cs:1').action, 'import')
  assert.equal(preview.summary.needsChoice, 0)
  const result = applyStudyImport(incoming, storage, { base })
  assert.equal(result.applied, true)
  const final = JSON.parse(storage.getItem(key))
  assert.equal(final.entries['zsb-math:10'].title, '本机较新')
  assert.equal(final.entries['zsb-cs:1'].title, '备份较新')
  assert.equal(final.entries['zsb-english:2'].title, '新增英语')
})

test('requires an explicit decision for records without timestamps', () => {
  const key = 'zsb-prep-checks'
  const firstWeek = `${base}prep/gaoshu/#w1`
  const secondWeek = `${base}prep/gaoshu/#w2`
  const payload = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 9000,
    records: { [key]: { [firstWeek]: 1, [secondWeek]: 1 } },
  }
  const local = new MemoryStorage({ [key]: JSON.stringify({ [firstWeek]: 1 }) })
  const preview = previewStudyImport(payload, local, { base })
  assert.equal(preview.requiresChoice, true)
  assert.equal(preview.conflicts[0].status, 'missing-timestamp')
  const blocked = applyStudyImport(payload, local, { base })
  assert.equal(blocked.applied, false)
  assert.equal(local.getItem(key), JSON.stringify({ [firstWeek]: 1 }))

  const decision = { [studyConflictId(key)]: 'import' }
  const applied = applyStudyImport(payload, local, { base, decisions: decision })
  assert.equal(applied.applied, true)
  assert.deepEqual(JSON.parse(local.getItem(key)), payload.records[key])
})

test('rolls back all affected writes after a storage failure and preserves unrelated data', () => {
  const progressKey = 'l1uj-study-progress-v1'
  const tasksKey = 'l1uj-study-tasks-v1'
  const oldProgress = JSON.stringify({ version: 1, entries: {} })
  const incoming = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 9000,
    records: {
      [progressKey]: {
        version: 1,
        entries: {
          'zsb-math:10': {
            slug: 'zsb-math', id: '10', title: '新进度', path: answerPath('zsb-math', '0010-limit'),
            total: 4, answered: 1, correct: 0, reviewNeeded: 1, updatedAt: 2000,
          },
        },
      },
      [tasksKey]: { version: 1, entries: { 'lesson:zsb-math:10': { limit: 5, updatedAt: 2000 } } },
    },
  }
  const storage = new MemoryStorage({ [progressKey]: oldProgress, unrelated: 'leave me' })
  storage.failKey = tasksKey
  storage.failOnce = true
  const result = applyStudyImport(incoming, storage, { base })
  assert.equal(result.applied, false)
  assert.equal(result.rolledBack, true)
  assert.equal(storage.getItem(progressKey), oldProgress)
  assert.equal(storage.getItem(tasksKey), null)
  assert.equal(storage.getItem('unrelated'), 'leave me')
})

test('emits refresh events only after a successful import', () => {
  const previousWindow = globalThis.window
  const events = []
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) }
  try {
    const payload = {
      format: 'l1uj-study-backup', version: 1, base, createdAt: 1,
      records: { 'l1uj-study-progress-v1': { version: 1, entries: {} } },
    }
    const result = applyStudyImport(payload, new MemoryStorage(), { base })
    assert.equal(result.applied, true)
    assert.deepEqual(events, ['l1uj:study', 'l1uj:reading', 'l1uj:backup-imported'])
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('rejects unknown keys and paths outside the deployed /blog/ base', () => {
  assert.equal(isAllowedStudyKey('l1uj-reading-v1', base), true)
  assert.equal(isAllowedStudyKey('l1uj-reading-v1', '/other/'), true)
  const payload = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 1,
    records: {
      unknown: {},
      [`l1uj-cs-answers-v1:/other/lessons/zsb-cs/lessons/0001.html`]: {},
    },
  }
  const result = validateStudyBackup(payload, { base })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('不在白名单')))
})

test('keeps the unified progress bounds aligned with the real pre-answer review state', () => {
  const valid = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 1,
    records: {
      'l1uj-study-progress-v1': {
        version: 1,
        entries: {
          'zsb-math:10': {
            slug: 'zsb-math', id: '10', title: '尚未答题但待复习', path: answerPath('zsb-math', '0010-limit'),
            total: 4, answered: 0, correct: 0, reviewNeeded: 1, updatedAt: 1,
          },
        },
      },
    },
  }
  assert.equal(validateStudyBackup(valid, { base }).valid, true)
  const invalid = structuredClone(valid)
  invalid.records['l1uj-study-progress-v1'].entries['zsb-math:10'].reviewNeeded = 5
  const result = validateStudyBackup(invalid, { base })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('reviewNeeded') && error.includes('total')))
})

test('accepts only the three known auxiliary task records and validates politics additions', () => {
  const valid = {
    format: 'l1uj-study-backup', version: 1, base, createdAt: 1,
    records: {
      'l1uj-study-tasks-v1': {
        version: 1,
        entries: {
          'review:politics': { limit: 1, updatedAt: 1 },
          'wrong:cs': { limit: 5, updatedAt: 1 },
          'wrong:politics': { deferUntil: '2026-09-10', updatedAt: 1 },
        },
      },
      'zzkk:v2:lesson:mzt01': {
        visits: 1, quizTotal: 4, quizRoundTotal: 4, quizAnswered: 2, quizCorrect: 1,
        quizComplete: false, exerciseComplete: false, quizAllCorrect: false,
        quizReviewNeeded: true, reviewNeeded: true,
        exerciseStatus: 'in-progress', status: 'in-progress',
        cardsReviewed: 1, cardsGood: 0, cardsBad: 1, cardsReviewNeeded: true,
        manualActivity: true, manualDone: false, at: '2026-09-01T01:02:03.000Z',
      },
    },
  }
  assert.equal(validateStudyBackup(valid, { base }).valid, true)
  const invalid = structuredClone(valid)
  invalid.records['l1uj-study-tasks-v1'].entries['review:math'] = { limit: 1, updatedAt: 1 }
  invalid.records['zzkk:v2:lesson:mzt01'].unexpected = true
  const result = validateStudyBackup(invalid, { base })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('任务键格式不正确')))
  assert.ok(result.errors.some((error) => error.includes('unexpected')))
})

test('round-trips a generated Chinese prepCatalog path and rejects encoded separators or base escape', () => {
  const lesson = prepCatalog['zsb-math'].lessons.find((item) => item.id === '10')
  assert.ok(lesson, 'generated prepCatalog should contain math lesson 10')
  const generatedPath = `${base.slice(0, -1)}${lesson.interactive}`
  const encodedPath = encodeURI(generatedPath)
  const progressKey = 'l1uj-study-progress-v1'
  const progress = {
    version: 1,
    entries: {
      'zsb-math:10': {
        slug: 'zsb-math', id: '10', title: lesson.title, path: generatedPath,
        total: 6, answered: 0, correct: 0, reviewNeeded: 1, updatedAt: 4000,
      },
    },
  }
  const source = new MemoryStorage()
  assert.equal(saveReading({ path: encodedPath, title: lesson.title, y: 320 }, base, source), true)
  assert.equal(readEntries(base, source)[0].path, generatedPath, 'reading-state decodes the generated URL before saving')
  source.setItem(progressKey, JSON.stringify(progress))

  const exported = createStudyBackup(source, { base, now: 5000 })
  assert.deepEqual(exported.skipped, [])
  assert.equal(exported.backup.records[READING_KEY].entries[0].path, generatedPath)
  assert.equal(exported.backup.records[progressKey].entries['zsb-math:10'].answered, 0)
  assert.equal(exported.backup.records[progressKey].entries['zsb-math:10'].reviewNeeded, 1)

  const restored = new MemoryStorage()
  const result = applyStudyImport(exported.backup, restored, { base })
  assert.equal(result.applied, true)
  assert.equal(readEntries(base, restored)[0].path, generatedPath)
  assert.deepEqual(JSON.parse(restored.getItem(progressKey)), progress)

  const invalidPaths = [
    `${base}lessons/zsb-math/lessons/0010-%2Fescape.html`,
    `${base}lessons/zsb-math/lessons/0010-%2e%2e%2Fescape.html`,
    `/outside/lessons/zsb-math/lessons/0010-%E6%9E%81%E9%99%90.html`,
  ]
  for (const path of invalidPaths) {
    const invalid = structuredClone(progress)
    invalid.entries['zsb-math:10'].path = path
    const payload = {
      format: 'l1uj-study-backup', version: 1, base, createdAt: 5000,
      records: { [progressKey]: invalid },
    }
    assert.equal(validateStudyBackup(payload, { base }).valid, false, path)
  }
})
