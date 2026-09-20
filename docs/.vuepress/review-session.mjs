import { SUBJECTS, REVIEW_LABELS, isDue, questionSignature, equivalentPoliticsDefinition } from '../../scripts/runtime/mistake-store.mjs'
import { safeReturnTo } from '../../scripts/runtime/study-state.mjs'

export const REVIEW_SESSION_KEY = 'zhixu-review-session-v1'
export const REVIEW_LIMITS = [1, 5, 10]

export function reviewSettings(search = '', base = '/blog/') {
  const params = new URLSearchParams(search)
  return {
    subject: Object.hasOwn(SUBJECTS, params.get('subject')) ? params.get('subject') : 'all',
    state: ['due', 'all', ...Object.keys(REVIEW_LABELS)].includes(params.get('state')) ? params.get('state') : 'due',
    search: (params.get('q') || '').slice(0, 200),
    limit: REVIEW_LIMITS.includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 5,
    returnTo: safeReturnTo(params.get('returnTo'), base) || '',
    practice: params.get('practice') === '1',
    resume: params.get('resume') === '1',
  }
}

export function reviewHref(settings = {}, base = '/blog/', action = '') {
  const params = new URLSearchParams()
  if (Object.hasOwn(SUBJECTS, settings.subject)) params.set('subject', settings.subject)
  if (settings.state && settings.state !== 'due') params.set('state', settings.state)
  if (settings.search) params.set('q', settings.search.slice(0, 200))
  if (REVIEW_LIMITS.includes(settings.limit) && settings.limit !== 5) params.set('limit', settings.limit)
  const back = safeReturnTo(settings.returnTo, base)
  if (back) params.set('returnTo', back)
  if (['practice', 'resume'].includes(action)) params.set(action, '1')
  return `${base}review/${params.size ? '?' + params : ''}`
}

export function filterReviewEntries(entries, settings, now = Date.now()) {
  const query = settings.search.trim().toLowerCase()
  return Object.values(entries).filter(q => (settings.subject === 'all' || q.slug === settings.subject)
    && (settings.state === 'all' || (settings.state === 'due' ? isDue(q, now) : q.status === settings.state))
    && `${q.stem} ${q.title} ${q.note || ''}`.toLowerCase().includes(query))
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0) || b.wrongs - a.wrongs)
}

export function reviewOverview(entries, now = Date.now()) {
  const items = Object.values(entries)
  const upcoming = items.filter(q => q.status !== 'mastered' && !isDue(q, now))
  return { total: items.length, due: items.filter(q => isDue(q, now)).length,
    mastered: items.filter(q => q.status === 'mastered').length,
    scheduled: upcoming.length, nextAt: upcoming.length ? Math.min(...upcoming.map(q => q.dueAt)) : null }
}

export function createReviewSession(items, context, now = Date.now()) {
  const selected = [...new Map(items.map(q => [q.id, q])).values()].slice(0, context.limit)
  return { version: 1, id: `${now}-${Math.random().toString(36).slice(2, 10)}`, startedAt: now,
    context: { ...context }, ids: selected.map(q => q.id), position: 0, finished: false,
    signatures: Object.fromEntries(selected.map(q => [q.id, questionSignature(q)])),
    drafts: Object.fromEntries(selected.map(q => [q.id, {
      picked: [], recalled: '', note: q.note || '', noteDirty: false, revealed: false, peeked: false,
      submitted: false, correct: null, independent: false, feedback: '',
    }])) }
}

// Session drafts live in this tab only. They never replace the durable mistake store.
export function restoreReviewSession(raw, entries, base = '/blog/') {
  try {
    if (!raw || raw.length > 200000) return null
    const saved = JSON.parse(raw)
    if (saved.version !== 1 || typeof saved.id !== 'string' || saved.id.length > 100
      || !Array.isArray(saved.ids) || !saved.ids.length || saved.ids.length > 10
      || !Number.isInteger(saved.position) || saved.position < 0 || saved.position >= saved.ids.length) return null
    saved.ids = saved.ids.map(id => {
      const target = entries[id] || Object.values(entries).find(q => q.legacyIds?.includes(id))
      if (!target) return id
      if (target.id !== id) {
        saved.drafts[target.id] = saved.drafts[id]
        saved.signatures[target.id] = saved.signatures[id]
      }
      try {
        const [stem, options, answer] = JSON.parse(saved.signatures[target.id])
        if (equivalentPoliticsDefinition({ stem, options, answer }, target)) saved.signatures[target.id] = questionSignature(target)
      } catch { /* Invalid signatures are handled by the normal revision guard. */ }
      return target.id
    })
    const ids = [...new Set(saved.ids)].filter(id => typeof id === 'string' && Object.hasOwn(entries, id))
    if (!ids.length) return null
    const context = reviewSettings(new URL(reviewHref(saved.context, base), 'https://study.invalid').search, base)
    const session = createReviewSession(ids.map(id => entries[id]), { ...context, limit: 10 }, saved.startedAt)
    session.context = context
    session.id = saved.id
    session.position = Math.max(0, ids.indexOf(saved.ids[saved.position]))
    session.finished = saved.finished === true
    session.revised = 0
    for (const id of ids) {
      const old = saved.drafts?.[id]
      if (!old || typeof old !== 'object') continue
      const draft = session.drafts[id]
      draft.note = typeof old.note === 'string' ? old.note.slice(0, 2000) : draft.note
      draft.noteDirty = old.noteDirty === true
      if (saved.signatures?.[id] !== questionSignature(entries[id])) { session.revised++; continue }
      draft.picked = Array.isArray(old.picked) ? [...new Set(old.picked)].filter(value => entries[id].options?.some(o => o.value === value)) : []
      draft.recalled = typeof old.recalled === 'string' ? old.recalled.slice(0, 4000) : ''
      draft.revealed = old.revealed === true
      draft.peeked = old.peeked === true
      draft.submitted = old.submitted === true && typeof old.correct === 'boolean'
      draft.correct = draft.submitted ? old.correct : null
      draft.independent = draft.submitted && old.independent === true
      draft.feedback = draft.submitted && typeof old.feedback === 'string' ? old.feedback.slice(0, 500) : ''
    }
    if (session.revised) {
      session.finished = false
      session.id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
    return session
  } catch { return null }
}

export function reviewSessionSummary(session) {
  const drafts = (session?.ids || []).map(id => session.drafts[id])
  const answered = drafts.filter(d => d?.submitted)
  return { total: drafts.length, answered: answered.length,
    correct: answered.filter(d => d.correct).length,
    incorrect: answered.filter(d => !d.correct).length,
    independent: answered.filter(d => d.correct && d.independent).length,
    skipped: drafts.length - answered.length }
}
