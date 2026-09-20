// DOM-free session. SRS is durable; the session is a resumable view of that state.
export function createCardSession({ cards, mode = 'due', limit = 10, srs, storage, key, day, getDay = () => day, random = Math.random, onChange = () => {} }) {
  const byId = new Map(cards.filter(c => c && c.id && typeof c.question === 'string' && c.question.trim() && typeof c.answer === 'string' && c.answer.trim()).map(c => [c.id, c]))
  const ids = [...byId.keys()]
  limit = Number.isInteger(limit) ? Math.min(30, Math.max(1, limit)) : 10
  const state = { version: 1, day, mode, batchIds: [], remainingIds: [], currentCardIndex: 0, reviewedIds: [], face: 'front', phase: 'idle' }
  let error = '', resumeWarning = ''
  function rollover() {
    const now = getDay()
    if (now === state.day) return false
    day = now
    Object.assign(state, { day, batchIds: [], remainingIds: [], reviewedIds: [], currentCardIndex: 0, face: 'front', phase: 'idle' })
    error = ''
    return true
  }
  function eligible(id) {
    if (!byId.has(id) || srs.get(id)?.at === day) return false
    return state.mode === 'due' ? srs.isDue(id) : state.mode === 'new' ? srs.isNew(id) : true
  }
  function queue() { return ids.filter(id => eligible(id) && !state.reviewedIds.includes(id)) }
  function persist() {
    try { storage?.setItem(key, JSON.stringify(state)); resumeWarning = '' }
    catch { resumeWarning = '本组进度暂不能保存；已评分的学习记录不受影响。' }
  }
  function emit() { persist(); onChange(view()) }
  function finishPhase() {
    if (!state.remainingIds.length) { state.currentCardIndex = 0; state.face = 'front'; state.phase = queue().length ? 'batchComplete' : 'dailyComplete' }
    else { state.currentCardIndex = Math.min(state.currentCardIndex, state.remainingIds.length - 1); state.phase = state.face }
  }
  function reconcile() {
    const currentId = state.remainingIds[state.currentCardIndex]
    state.remainingIds = state.remainingIds.filter(id => {
      if (eligible(id) && !state.reviewedIds.includes(id)) return true
      if (srs.get(id)?.at === day && !state.reviewedIds.includes(id)) state.reviewedIds.push(id)
      return false
    })
    if (!currentId || currentId !== state.remainingIds[state.currentCardIndex]) state.face = 'front'
    finishPhase()
  }
  function view() {
    return { ...state, batchIds: [...state.batchIds], remainingIds: [...state.remainingIds], reviewedIds: [...state.reviewedIds],
      currentCard: byId.get(state.remainingIds[state.currentCardIndex]) || null,
      queueLength: state.remainingIds.length, dueCount: ids.filter(id => srs.isDue(id)).length,
      newCount: ids.filter(id => srs.isNew(id)).length, available: queue().length, total: ids.length, error, resumeWarning }
  }
  function nextBatch(nextMode = state.mode) {
    if (state.phase === 'saving' || !['due', 'new', 'extra', 'lesson'].includes(nextMode)) return false
    rollover()
    state.mode = nextMode
    let pending = queue()
    if (nextMode === 'extra') pending = shuffled(pending)
    state.batchIds = pending.slice(0, limit)
    state.remainingIds = [...state.batchIds]
    state.currentCardIndex = 0; state.face = 'front'; error = ''
    finishPhase(); emit(); return true
  }
  function shuffled(list) {
    const result = [...list]
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
    return result
  }
  function ready() {
    if (rollover()) { nextBatch(); return false }
    return ['front', 'back'].includes(state.phase) && !!view().currentCard
  }
  function flip() {
    if (!ready()) return false
    state.face = state.face === 'front' ? 'back' : 'front'; state.phase = state.face; emit(); return true
  }
  function move(delta) {
    if (!ready() || !Number.isInteger(delta)) return false
    state.currentCardIndex = (state.currentCardIndex + delta + state.remainingIds.length) % state.remainingIds.length
    state.face = 'front'; state.phase = 'front'; error = ''; emit(); return true
  }
  function shuffle() {
    if (!ready()) return false
    state.remainingIds = shuffled(state.remainingIds); state.currentCardIndex = 0; state.face = 'front'; state.phase = 'front'; emit(); return true
  }
  function grade(ok, expectedId = view().currentCard?.id) {
    if (rollover()) { nextBatch(); return false }
    const c = view().currentCard
    if (typeof ok !== 'boolean' || state.phase !== 'back' || !c || c.id !== expectedId) return false
    state.phase = 'saving'; error = ''; onChange(view())
    let result
    try { result = srs.grade(c.id, ok) } catch { result = null }
    if (!result?.saved) {
      state.phase = 'back'; error = '学习记录保存失败，本卡尚未完成。请重试。'; emit(); return false
    }
    if (!state.reviewedIds.includes(c.id)) state.reviewedIds.push(c.id)
    state.remainingIds = state.remainingIds.filter(id => id !== c.id)
    state.face = 'front'; finishPhase(); emit(); return true
  }
  let restored = false
  try {
    const saved = JSON.parse(storage?.getItem(key) || 'null')
    if (saved?.version === 1 && saved.day === day && ['due', 'new', 'extra', 'lesson'].includes(saved.mode)
      && ['idle', 'front', 'back', 'saving', 'batchComplete', 'dailyComplete'].includes(saved.phase)
      && ['batchIds', 'remainingIds', 'reviewedIds'].every(k => Array.isArray(saved[k]) && saved[k].every(id => typeof id === 'string'))
      && Number.isInteger(saved.currentCardIndex) && saved.currentCardIndex >= 0 && saved.batchIds.length <= limit
      && saved.remainingIds.every(id => saved.batchIds.includes(id))) {
      Object.assign(state, { mode: saved.mode, batchIds: [...new Set(saved.batchIds)].filter(id => byId.has(id)),
        remainingIds: [...new Set(saved.remainingIds)].filter(id => byId.has(id)), reviewedIds: [...new Set(saved.reviewedIds)].filter(id => byId.has(id)),
        currentCardIndex: saved.currentCardIndex, face: saved.face === 'back' ? 'back' : 'front' })
      reconcile(); restored = true
    }
  } catch { /* Corrupt session never replaces durable SRS. */ }
  if (!restored) nextBatch(mode)
  return { view, flip, move, shuffle, grade, nextBatch, refresh() { if (rollover()) nextBatch(); else { reconcile(); emit() } } }
}
