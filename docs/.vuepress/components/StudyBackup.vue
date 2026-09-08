<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DEFAULT_BASE,
  applyStudyImport,
  createStudyBackup,
  parseStudyBackupText,
  previewStudyImport,
  readLastBackupAt,
  serializeStudyBackup,
  writeLastBackupAt,
} from '../study-backup.mjs'

const props = defineProps({
  base: { type: String, default: DEFAULT_BASE },
  storage: { type: Object, default: null },
})
const emit = defineEmits(['backup-exported', 'backup-applied'])

const fileInput = ref(null)
const fileName = ref('')
const lastBackupAt = ref(null)
const pending = ref(null)
const decisions = ref({})
const status = ref({ kind: '', text: '' })

const unresolved = computed(() =>
  (pending.value?.conflicts ?? []).filter((conflict) =>
    conflict.defaultAction === 'requires-choice' && !decisions.value[conflict.id],
  ),
)

const source = () => props.storage || (typeof window !== 'undefined' ? window.localStorage : null)

onMounted(() => {
  try { lastBackupAt.value = readLastBackupAt(source()) } catch { lastBackupAt.value = null }
})

function formatStamp(timestamp) {
  if (!Number.isFinite(timestamp)) return '尚未生成'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(timestamp)
}

function showError(error) {
  status.value = { kind: 'error', text: error instanceof Error ? error.message : String(error) }
}

function downloadBackup() {
  try {
    const result = createStudyBackup(source(), { base: props.base })
    const content = serializeStudyBackup(result.backup, { base: props.base })
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l1uj-study-backup-${new Date(result.backup.createdAt).toISOString().slice(0, 10)}.json`
    link.rel = 'noopener'
    link.click()
    URL.revokeObjectURL(url)
    lastBackupAt.value = result.backup.createdAt
    const remembered = writeLastBackupAt(source(), result.backup.createdAt)
    const skippedText = result.skipped.length
      ? `；有 ${result.skipped.length} 个格式异常的已知记录未导出，请先修复后再备份`
      : remembered ? '' : '；本次备份时间未能保存到本机'
    status.value = {
      kind: result.skipped.length || !remembered ? 'warning' : 'success',
      text: `已下载 ${result.includedKeys.length} 组学习记录的备份${skippedText}`,
    }
    emit('backup-exported', result.backup)
  } catch (error) {
    showError(`备份失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

async function readBackupFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  fileName.value = file.name
  try {
    const parsed = parseStudyBackupText(await file.text(), { base: props.base })
    if (!parsed.valid) {
      pending.value = null
      showError(`无法导入：${parsed.errors.join('；')}`)
      return
    }
    const next = previewStudyImport(parsed.payload, source(), { base: props.base })
    if (!next.valid) {
      pending.value = null
      showError(`无法预览：${next.errors.join('；')}`)
      return
    }
    pending.value = next
    decisions.value = {}
    status.value = {
      kind: next.requiresChoice ? 'warning' : 'success',
      text: next.requiresChoice
        ? `已读取 ${file.name}，有 ${next.summary.needsChoice} 项没有可靠时间戳，请先选择处理方式`
        : `已读取 ${file.name}，请确认导入预览`,
    }
  } catch (error) {
    pending.value = null
    showError(`读取备份失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function chooseConflict(conflict, action) {
  decisions.value = { ...decisions.value, [conflict.id]: action }
}
function plannedAction(conflict) { return decisions.value[conflict.id] || conflict.action }

function conflictDescription(conflict) {
  if (conflict.status === 'incoming-newer') return '备份记录较新，默认导入。'
  if (conflict.status === 'local-newer') return '本机记录较新，默认保留本机。'
  if (conflict.status === 'same-time') return '时间相同，默认保留本机以避免无意义覆盖。'
  if (conflict.status === 'local-invalid') return '本机值无法通过格式校验，必须明确选择是否用备份替换。'
  return '这条记录缺少可靠时间戳，不能替你判断哪一份更新。'
}

function applyPending() {
  if (!pending.value) return
  if (unresolved.value.length) {
    status.value = { kind: 'warning', text: '请先处理所有没有时间戳的冲突' }
    return
  }
  const result = applyStudyImport(pending.value.payload, source(), {
    base: props.base,
    decisions: decisions.value,
    untimestampedPolicy: 'require',
  })
  if (!result.applied) {
    if (result.requiresChoice) status.value = { kind: 'warning', text: '还有冲突没有选择处理方式' }
    else showError(`导入失败：${result.error || result.errors?.join('；') || '未知错误'}${result.rolledBack ? '，已回滚' : ''}`)
    return
  }
  const written = result.writtenKeys?.length ?? 0
  pending.value = null
  decisions.value = {}
  status.value = { kind: 'success', text: `导入完成，更新了 ${written} 组学习记录` }
  emit('backup-applied', result)
}

function cancelPreview() {
  pending.value = null
  decisions.value = {}
  status.value = { kind: '', text: '' }
}
</script>

<template>
  <section class="study-backup" aria-labelledby="study-backup-title">
    <div class="study-backup__heading">
      <div>
        <p class="learning-eyebrow">BACKUP / 迁移记录</p>
        <h2 id="study-backup-title">把学习记录带到另一台设备</h2>
        <p class="study-backup__lead">下载一份 JSON 备份，在电脑与手机之间手动迁移。导入前会先列出冲突，默认保留时间较新的记录。</p>
      </div>
      <span class="study-backup__mark" aria-hidden="true">↔</span>
    </div>

    <div class="study-backup__actions">
      <button class="learn-button" type="button" @click="downloadBackup">下载学习记录备份 <span aria-hidden="true">↓</span></button>
      <label class="learn-button is-secondary study-backup__file-button">
        <span>选择备份文件</span>
        <input ref="fileInput" type="file" accept="application/json,.json" @change="readBackupFile" />
      </label>
    </div>

    <div class="study-backup__facts">
      <p><strong>备份范围</strong> 阅读位置、数学练习、英语答案与完成标记、计算机错题与答题、政治进度/闪卡/错题，以及周计划打卡。</p>
      <p><strong>备份时间</strong> {{ formatStamp(lastBackupAt) }} <span>· 记录最近一次导出时间。</span></p>
      <p><strong>导入规则</strong> 只处理本站学习记录；主题偏好和其他网站数据不会进入备份。</p>
    </div>

    <p v-if="status.text" class="study-backup__status" :class="`is-${status.kind}`" role="status">{{ status.text }}</p>

    <section v-if="pending" class="study-backup__preview" aria-labelledby="study-backup-preview-title">
      <div class="study-backup__preview-top">
        <div>
          <p class="learning-eyebrow">IMPORT / 导入预览</p>
          <h3 id="study-backup-preview-title">{{ fileName || '备份文件' }}</h3>
        </div>
        <button class="study-backup__cancel" type="button" @click="cancelPreview">取消</button>
      </div>
      <p class="study-backup__summary">文件生成于 {{ formatStamp(pending.payload.createdAt) }}；共 {{ pending.summary.keys }} 组记录，新增 {{ pending.summary.new }} 项，无变化 {{ pending.summary.unchanged }} 项，冲突 {{ pending.summary.conflicts }} 项。</p>

      <ul v-if="pending.conflicts.length" class="study-backup__conflicts">
        <li v-for="conflict in pending.conflicts" :key="conflict.id" class="study-backup__conflict">
          <div class="study-backup__conflict-title"><strong>{{ conflict.label }}</strong><span :class="`is-${conflict.status}`">{{ plannedAction(conflict) === 'import' ? '将导入' : plannedAction(conflict) === 'keep-local' ? '保留本机' : '需要选择' }}</span></div>
          <p>{{ conflictDescription(conflict) }}</p>
          <fieldset v-if="conflict.defaultAction === 'requires-choice'" class="study-backup__choice">
            <legend>请选择处理方式</legend>
            <label><input type="radio" :name="`study-conflict-${conflict.id}`" value="keep-local" :checked="decisions[conflict.id] === 'keep-local'" @change="chooseConflict(conflict, 'keep-local')" /> 保留本机</label>
            <label><input type="radio" :name="`study-conflict-${conflict.id}`" value="import" :checked="decisions[conflict.id] === 'import'" @change="chooseConflict(conflict, 'import')" /> 导入备份</label>
          </fieldset>
        </li>
      </ul>
      <p v-else class="study-backup__empty">没有需要处理的冲突，可以安全导入。</p>

      <button class="learn-button" type="button" :disabled="unresolved.length > 0" @click="applyPending">确认导入{{ unresolved.length ? `（还需选择 ${unresolved.length} 项）` : '' }}</button>
    </section>
  </section>
</template>

<style scoped>
.study-backup {
  margin-top: 48px;
  padding: 28px;
  color: var(--study-text, var(--vp-c-text-1));
  border: 1px solid var(--study-line, var(--vp-c-divider));
  border-radius: var(--study-card-radius, 16px);
  background: var(--study-panel, var(--vp-c-bg));
  box-shadow: var(--study-card-shadow, none);
}
.study-backup h2, .study-backup h3, .study-backup p { margin: 0; }
.study-backup__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.study-backup__heading h2 { font-size: clamp(21px, 2.3vw, 27px); line-height: 1.5; letter-spacing: -.025em; }
.study-backup__lead { max-width: 700px; margin-top: 10px!important; color: var(--study-muted, var(--vp-c-text-2)); font-size: 14px; line-height: 1.85; }
.study-backup__mark { flex: 0 0 auto; width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; color: var(--study-accent, var(--vp-c-brand-1)); background: var(--study-tint, var(--vp-c-brand-soft)); font-size: 25px; }
.study-backup__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.study-backup__actions .learn-button { border: 1px solid var(--study-blue-600, var(--vp-c-brand-1)); }
.study-backup__file-button { position: relative; cursor: pointer; }
.study-backup__file-button input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0 0 0 0); }
.study-backup__file-button:focus-within { outline: 3px solid var(--vp-c-brand-2); outline-offset: 4px; }
.study-backup__facts { display: grid; gap: 5px; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--study-line, var(--vp-c-divider)); color: var(--study-muted, var(--vp-c-text-2)); font-size: 12px; line-height: 1.75; }
.study-backup__facts strong { color: var(--study-text, var(--vp-c-text-1)); font-weight: 650; }
.study-backup__facts span { opacity: .84; }
.study-backup__status { margin-top: 18px!important; padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.7; }
.study-backup__status.is-success { color: var(--study-success, #25634d); background: var(--study-success-bg, #eaf6ef); }
.study-backup__status.is-warning { color: var(--study-warning, #875d19); background: var(--study-warning-bg, #fff6df); }
.study-backup__status.is-error { color: var(--study-error, #a43e3e); background: var(--study-error-bg, #fff0f0); }
.study-backup__preview { margin-top: 22px; padding-top: 22px; border-top: 1px solid var(--study-line, var(--vp-c-divider)); }
.study-backup__preview-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.study-backup__preview h3 { font-size: 17px; line-height: 1.6; overflow-wrap: anywhere; }
.study-backup__cancel { min-height: 44px; padding: 8px 12px; border: 1px solid var(--study-line, var(--vp-c-divider)); border-radius: 8px; color: var(--study-muted, var(--vp-c-text-2)); background: transparent; font: inherit; cursor: pointer; }
.study-backup__summary { margin-top: 12px!important; color: var(--study-muted, var(--vp-c-text-2)); font-size: 13px; line-height: 1.75; }
.study-backup__conflicts { display: grid; gap: 10px; list-style: none; margin: 18px 0!important; padding: 0!important; }
.study-backup__conflict { padding: 13px 14px; border: 1px solid var(--study-line, var(--vp-c-divider)); border-radius: 10px; background: var(--study-bg, var(--vp-c-bg-alt)); }
.study-backup__conflict-title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 13px; }
.study-backup__conflict-title strong { overflow-wrap: anywhere; }
.study-backup__conflict-title span { flex: 0 0 auto; color: var(--study-muted, var(--vp-c-text-2)); font-size: 12px; }
.study-backup__conflict-title span.is-incoming-newer { color: #25634d; }
.study-backup__conflict-title span.is-local-newer { color: var(--study-accent, var(--vp-c-brand-1)); }
.study-backup__conflict p { margin-top: 5px!important; color: var(--study-muted, var(--vp-c-text-2)); font-size: 12px; line-height: 1.7; }
.study-backup__choice { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 10px 0 0; padding: 0; border: 0; color: var(--study-text, var(--vp-c-text-1)); font-size: 12px; }
.study-backup__choice legend { width: 100%; padding: 0; color: var(--study-accent, var(--vp-c-brand-1)); font-weight: 650; }
.study-backup__choice label { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; cursor: pointer; }
.study-backup__empty { margin: 18px 0!important; color: var(--study-muted, var(--vp-c-text-2)); font-size: 13px; }
.study-backup button:disabled { cursor: not-allowed; opacity: .55; }
@media (max-width: 480px) {
  .study-backup { margin-top: 32px; padding: 20px; }
  .study-backup__mark { width: 40px; height: 40px; font-size: 21px; }
  .study-backup__actions > * { flex: 1 1 100%; }
  .study-backup__actions .learn-button { width: 100%; }
  .study-backup__conflict-title { align-items: flex-start; flex-direction: column; gap: 3px; }
}
@media (max-width: 340px) {
  .study-backup { padding: 16px; }
  .study-backup__heading { gap: 12px; }
  .study-backup__lead { font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) { .study-backup * { transition: none!important; } }
</style>
