import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vuepress/client'

// The URL owns filters: reload, copied URLs and back/forward all retain the same results.
export function useCourseFilters(defaultGroup = '') {
  const route = useRoute()
  const router = useRouter()
  const text = value => typeof value === 'string' ? value : ''
  // Static HTML is generated without a query string. Apply URL filters after hydration.
  const query = ref('')
  const group = ref(defaultGroup)
  const ready = ref(false)
  onMounted(() => {
    ready.value = true
    query.value = text(route.query.q)
    group.value = text(route.query.group) || defaultGroup
  })
  watch(() => [route.query.q, route.query.group], ([q, g]) => {
    query.value = text(q)
    group.value = text(g) || defaultGroup
  })
  watch([query, group], ([q, g]) => {
    if (!ready.value) return
    const next = { ...route.query }
    if (q) next.q = q; else delete next.q
    if (g && g !== defaultGroup) next.group = g; else delete next.group
    if (text(route.query.q) === q && (text(route.query.group) || defaultGroup) === g) return
    router.replace({ path: route.path, query: next, hash: route.hash })
  }, { flush: 'post' })
  return { query, group, ready }
}
