import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vuepress/client'
import { STUDY_FILTERS } from '../../../scripts/runtime/study-state.mjs'

// Results update immediately. Outgoing links use currentQuery, so a quick click
// during the URL debounce never drops the final characters or filters.
export function useCourseFilters(defaultGroup = '', { withStatus = false } = {}) {
  const route = useRoute()
  const router = useRouter()
  const ownerPath = route.path
  const text = value => typeof value === 'string' ? value : ''
  const normalizeStatus = value => STUDY_FILTERS.some(item => item.value === value) ? value : 'all'
  const query = ref('')
  const group = ref(defaultGroup)
  const status = ref('all')
  const ready = ref(false)
  let timer, pendingPath = '', disposed = false

  const currentQuery = computed(() => {
    const next = { ...route.query }
    if (query.value) next.q = query.value; else delete next.q
    if (group.value && group.value !== defaultGroup) next.group = group.value; else delete next.group
    if (withStatus) {
      if (status.value !== 'all') next.status = status.value; else delete next.status
    }
    return next
  })
  function readRoute() {
    clearTimeout(timer)
    query.value = text(route.query.q)
    group.value = text(route.query.group) || defaultGroup
    status.value = withStatus ? normalizeStatus(text(route.query.status)) : 'all'
  }
  function writeRoute() {
    clearTimeout(timer)
    if (disposed || !ready.value || route.path !== ownerPath) return
    const next = { path: route.path, query: currentQuery.value, hash: route.hash }
    const fullPath = router.resolve(next).fullPath
    if (route.fullPath === fullPath) return
    pendingPath = fullPath
    void router.replace(next).catch(() => { if (!disposed) readRoute() })
  }
  onMounted(() => { readRoute(); ready.value = true })
  watch(() => route.fullPath, path => {
    if (path === pendingPath) { pendingPath = ''; return }
    pendingPath = ''
    readRoute()
  })
  watch([query, group, status], ([q, g, s], [, oldGroup, oldStatus]) => {
    clearTimeout(timer)
    if (!ready.value || route.path !== ownerPath) return
    if (text(route.query.q) === q && (text(route.query.group) || defaultGroup) === g
      && (!withStatus || normalizeStatus(text(route.query.status)) === s)) return
    if (!q || g !== oldGroup || s !== oldStatus) writeRoute()
    else timer = setTimeout(writeRoute, 180)
  }, { flush: 'post' })
  onUnmounted(() => { disposed = true; clearTimeout(timer) })
  function reset() { query.value = ''; group.value = defaultGroup; status.value = 'all' }
  return { query, group, status, ready, currentQuery, reset }
}
