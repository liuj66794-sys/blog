<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects } from '../learning-data.mjs'
import { prepCatalog } from '../prep-catalog.mjs'
import { deskProgress, recentLessons } from '../study-desk.mjs'
import { withStudyContext } from '../../../scripts/runtime/study-state.mjs'
import { useStudyUpdates } from '../composables/useStudyUpdates.mjs'

const { storage, revision } = useStudyUpdates()
const siteBase = __VUEPRESS_BASE__
const selected = ref('')
const history = computed(() => recentLessons(prepCatalog, __VUEPRESS_BASE__, storage.value))
const progress = computed(() => deskProgress(prepCatalog, __VUEPRESS_BASE__, storage.value))
const slug = computed(() => selected.value || history.value.find(item => prepCatalog[item.slug])?.slug || prepSubjects[0].slug)
const subject = computed(() => prepSubjects.find(item => item.slug === slug.value))
const current = computed(() => progress.value[slug.value])
const lesson = computed(() => current.value.continueLesson)
const continuing = computed(() => lesson.value && current.value.statuses[lesson.value.id].state === 'learning')
const href = computed(() => lesson.value && withStudyContext(current.value.continueHref, `${__VUEPRESS_BASE__}#study-desk`, __VUEPRESS_BASE__))
const action = computed(() => continuing.value ? '继续这一课' : current.value.started ? '开始下一课' : '开始第一课')
const reason = computed(() => continuing.value
  ? current.value.continueEntry?.chapter && current.value.continueEntry.chapter !== current.value.continueEntry.title ? `上次学到：${current.value.continueEntry.chapter}` : '这节课还在学习中，接着上次的进度往下学。'
  : current.value.started ? '已完成的练习会保留，接着补上这节未学课程。' : '还没有这门课的学习记录，先从第一课打基础。')
function stamp(time) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(time)
}
</script>

<template>
  <section id="study-desk" class="student-desk" aria-labelledby="desk-heading" :aria-busy="!revision">
    <div class="student-desk__heading">
      <div><p class="learning-eyebrow">每次前进一小步</p><h2 id="desk-heading">我的学习工作台</h2></div>
      <a :href="withBase('/prep/') + '#study-backup'">备份 / 换设备 <span aria-hidden="true">↗</span></a>
    </div>
    <div class="student-desk__subjects" role="group" aria-label="选择本次学习科目">
      <button v-for="item in prepSubjects" :key="item.slug" type="button" :aria-pressed="slug === item.slug" @click="selected = item.slug">
        <span>{{ item.short }}</span><small :title="'已完成练习的课次'">{{ progress[item.slug].started ? `${progress[item.slug].complete}/${progress[item.slug].total} 课` : '未开始' }}</small>
      </button>
    </div>
    <div class="student-desk__body">
      <div class="student-desk__next" aria-live="polite" aria-atomic="true">
        <template v-if="lesson">
          <p class="student-desk__label">{{ subject.name }} <span> / {{ continuing ? '接着学' : current.started ? '下一步' : '学习起点' }} · {{ lesson.label }}</span></p>
          <h3>{{ lesson.title }}</h3>
          <p class="student-desk__reason">{{ reason }}</p>
          <p class="student-desk__tip">这次先读懂一个小节，再独立做一道题。不必一次学完整课。</p>
          <div class="student-desk__actions"><a class="learn-button" :href="href">{{ action }} <span aria-hidden="true">→</span></a><a :href="withBase(`/courses/${slug}/`)">自己选课</a></div>
        </template>
        <template v-else>
          <p class="student-desk__label">{{ subject.name }} / 本轮练习已完成</p>
          <h3>把会做，变成隔天也会。</h3>
          <p class="student-desk__reason">{{ current.review ? `还有 ${current.review} 课包含待巩固练习，可以先回顾这些薄弱点。` : '可以重做错题检验记忆，也可以换一门课继续。' }}</p>
          <div class="student-desk__actions"><a class="learn-button" :href="withBase(current.review ? `/courses/${slug}/?status=review` : `/review/?subject=${slug}`)">{{ current.review ? '查看待巩固课程' : '查看复习记录' }} →</a><a :href="withBase(`/courses/${slug}/`)">课程目录</a></div>
        </template>
        <p class="student-desk__footnote">{{ current.complete }}/{{ current.total }} 课已完成练习 · 完成不等于掌握</p>
      </div>
      <aside class="student-desk__recent" aria-labelledby="desk-recent-heading">
        <h3 id="desk-recent-heading">最近学过</h3>
        <ul v-if="history.length">
          <li v-for="entry in history" :key="entry.key">
            <a :href="withStudyContext(entry.href, `${siteBase}#study-desk`, siteBase)">
              <small>{{ entry.subject }} · {{ entry.mode === 'reading' ? '阅读' : '互动' }}</small>
              <strong>{{ entry.title }}</strong>
              <span>{{ stamp(entry.updatedAt) }} · {{ entry.restored ? '接着上次位置' : '打开当前课次' }} <span aria-hidden="true">↗</span></span>
            </a>
          </li>
        </ul>
        <div v-else class="student-desk__empty"><span aria-hidden="true">↗</span><p>选一门课，开始留下学习足迹。</p><p>学到哪里，会记在这里。回来后可以接着读，也可以切换科目。</p></div>
        <p class="student-desk__device">学习记录保存在当前浏览器，换设备前记得备份。</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.student-desk{scroll-margin-top:88px;border:1px solid var(--study-line);border-radius:16px;background:var(--study-panel);overflow:hidden}
.student-desk__heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 26px 16px}
.student-desk__heading .learning-eyebrow{font-size:11px;margin-bottom:5px!important}.student-desk__heading h2{font:500 25px/1.4 var(--study-display-font)}
.student-desk__heading>a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:12px;color:var(--study-accent)}
.student-desk__subjects{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 26px 20px}
.student-desk__subjects button{min-width:0;min-height:60px;border:1px solid var(--study-line);border-radius:8px;background:var(--study-panel);color:var(--study-text);font:inherit;cursor:pointer;padding:9px 12px;text-align:left}
.student-desk__subjects button>span{font-size:15px;font-weight:600}.student-desk__subjects small{display:block;font-size:11px;margin-top:4px;color:var(--study-muted)}
.student-desk__subjects button[aria-pressed=true]{border-color:var(--study-accent);background:var(--study-tint);box-shadow:inset 0 -2px var(--study-accent)}
.student-desk__body{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);border-top:1px solid var(--study-line)}
.student-desk__next{padding:26px;background:var(--study-tint);min-width:0;display:flex;flex-direction:column;align-items:flex-start}
.student-desk__label{font-size:12px;color:var(--study-accent)}.student-desk__label span{color:var(--study-muted)}
.student-desk__next h3{font:500 clamp(22px,2.2vw,28px)/1.5 var(--study-display-font);margin:12px 0;overflow-wrap:anywhere}
.student-desk__reason{font-size:14px;line-height:1.8;color:var(--study-text)}.student-desk__tip{font-size:13px;line-height:1.8;color:var(--study-muted);margin-top:10px}
.student-desk__actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;margin-top:22px}.student-desk__actions>a:last-child{display:flex;align-items:center;min-height:44px;font-size:13px;color:var(--study-accent)}
.student-desk__footnote{font-size:11px;color:var(--study-muted);margin-top:auto;padding-top:22px}
.student-desk__recent{padding:24px 26px;min-width:0;border-left:1px solid var(--study-line)}.student-desk__recent h3{font-size:15px;font-weight:600}
.student-desk__recent ul{list-style:none;margin:10px 0 0;padding:0}.student-desk__recent li+li{border-top:1px solid var(--study-line)}
.student-desk__recent a{display:block;padding:10px 0;color:var(--study-text)}.student-desk__recent a:hover strong{text-decoration:underline;text-underline-offset:4px}
.student-desk__recent small,.student-desk__recent a>span{display:block;font-size:11px;color:var(--study-muted);line-height:1.8}.student-desk__recent strong{display:block;font-size:13px;line-height:1.7;font-weight:550;margin:3px 0;overflow-wrap:anywhere}
.student-desk__empty{padding:16px 0 10px;font-size:13px;color:var(--study-muted);line-height:1.9}.student-desk__empty>span{font-size:28px;color:var(--study-accent)}.student-desk__empty p+p{margin-top:8px}
.student-desk__device{font-size:11px;color:var(--study-muted);line-height:1.8;margin-top:12px}
@media(max-width:700px){.student-desk__heading{padding:18px 18px 14px;gap:8px;align-items:flex-start}.student-desk__heading h2{font-size:22px}.student-desk__heading>a{font-size:11px;gap:4px}.student-desk__subjects{padding:0 18px 16px;gap:6px}.student-desk__subjects button{padding:8px 6px;text-align:center}.student-desk__subjects button>span{font-size:14px}.student-desk__subjects small{font-size:10px}.student-desk__body{grid-template-columns:minmax(0,1fr)}.student-desk__next{padding:20px}.student-desk__next h3{font-size:22px}.student-desk__recent{padding:20px;border-left:0;border-top:1px solid var(--study-line)}.student-desk__empty>span{display:none}.student-desk__empty{padding:10px 0 0}.student-desk__footnote{padding-top:18px}.student-desk__tip{font-size:12px}}
</style>
