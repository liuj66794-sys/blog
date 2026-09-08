import { computed, ref, onMounted, onUnmounted } from 'vue'
import { STUDY_EVENT } from '../../../scripts/runtime/study-state.mjs'
const emptyStorage = Object.freeze({length:0,key:()=>null,getItem:()=>null})
export function useStudyUpdates() {
  const revision = ref(0)
  // Match static HTML on the first render; read this device only after hydration.
  const storage = computed(() => revision.value ? undefined : emptyStorage)
  const refresh = () => { revision.value++ }
  const events = ['storage','pageshow','focus',STUDY_EVENT,'l1uj:reading','l1uj:backup-imported']
  onMounted(() => {refresh();events.forEach(event => window.addEventListener(event,refresh))})
  onUnmounted(() => events.forEach(event => window.removeEventListener(event,refresh)))
  return {revision,refresh,storage}
}
