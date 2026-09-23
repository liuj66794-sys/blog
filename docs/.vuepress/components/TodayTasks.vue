<script setup>
import {computed,ref} from 'vue'
import {useRoute,useRouter} from 'vuepress/client'
import {makeSearchReturnTo} from '../lesson-return.mjs'
import {prepCatalog} from '../prep-catalog.mjs'
import {studyPlan} from '../study-plan-data.mjs'
import {todayTasks} from '../study-tasks.mjs'
import {changeTask,localDay,taskPreferences} from '../../../scripts/runtime/study-state.mjs'
import {useStudyUpdates} from '../composables/useStudyUpdates.mjs'
defineProps({compact:Boolean})
const {revision,refresh,storage}=useStudyUpdates()
const route=useRoute(),router=useRouter()
const pace=computed(()=>revision.value && route.query.pace==='week'?'week':'progress')
function setPace(value) {
  const query={...route.query}
  if(value==='week') query.pace='week';else delete query.pace
  router.replace({path:route.path,query,hash:route.hash})
}
const message=ref('')
const tasks=computed(()=>{revision.value;return todayTasks(studyPlan,prepCatalog,__VUEPRESS_BASE__,storage.value,new Date(),{pace:pace.value,returnTo:makeSearchReturnTo(route.path,route.query,'#today-tasks',__VUEPRESS_BASE__)})})
const deferred=computed(()=>{revision.value;return Object.values(taskPreferences(storage.value)).some(item=>item.deferUntil>localDay())})
function defer(task) {
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1)
  message.value=changeTask(task.id,{deferUntil:localDay(tomorrow)})?'已延至明天，也可以随时恢复。':'浏览器未能保存，请检查存储设置。';refresh()
}
function shrink(task) {message.value=changeTask(task.id,{limit:task.limit===1?10:1})?'已调整本次任务量。':'浏览器未能保存。';refresh()}
function restore() {
  let restored = 0, failed = 0
  for (const [id,value] of Object.entries(taskPreferences())) if (value.deferUntil > localDay()) {
    if (changeTask(id,{deferUntil:''})) restored++
    else failed++
  }
  message.value = failed
    ? (restored ? `已恢复 ${restored} 项，另有 ${failed} 项未能保存，请重试。` : '恢复失败：浏览器未能保存，延期任务仍保留，请重试。')
    : restored ? `已恢复 ${restored} 项延期任务。` : '没有需要恢复的延期任务。'
  refresh()
}
</script>
<template>
  <section id="today-tasks" class="today-tasks" :class="{'is-compact':compact}" aria-labelledby="today-heading">
    <div class="learning-section__heading"><div><p class="learning-eyebrow">从一个小任务开始</p><h2 id="today-heading">今天要做</h2></div></div>
    <div class="today-pace" role="group" aria-label="今日任务安排方式"><button type="button" :aria-pressed="pace==='progress'" @click="setPace('progress')">按我的进度</button><button type="button" :aria-pressed="pace==='week'" @click="setPace('week')">跟随本周计划</button></div>
    <p class="learning-meta today-pace-hint">{{pace==='week'?'按本周计划选课；当前不在计划日期内时，按学习进度安排。':'先处理到期复习，再继续未完成的课。新科目从第一课开始。'}} 今天不必全部做完，选一项开始就好。</p>
    <ol class="today-task-list" v-if="tasks.length">
      <li v-for="task in tasks" :key="task.id" :class="{'is-complete':task.status?.state==='complete'}">
        <p class="learning-meta">{{task.subject}} · {{task.kind}} <span v-if="task.status?.state==='complete'">· 已完成练习</span></p>
        <h3><a :href="task.href">{{task.title}}</a></h3>
        <p>{{task.description}}</p>
        <p class="learning-meta">{{task.limit===1?'本次先做 1 题 / 1 张卡 · ':''}}参考用时 {{task.minutes}} 分钟，可自行调整</p>
        <div class="task-actions"><a class="learn-button" :href="task.href">{{task.status?.state==='complete'?'回顾本课':'开始任务'}} →</a><button @click="shrink(task)">{{task.limit===1?'恢复任务量':'缩小任务量'}}</button><button @click="defer(task)">延至明天</button></div>
      </li>
    </ol>
    <p v-else>今日建议任务已完成或已延期。可以查看本周计划，选择下一步。</p>
    <button v-if="deferred" class="task-restore" @click="restore">恢复已延期的任务</button>
    <p class="learning-meta" role="status">{{message}}</p>
  </section>
</template>

<style scoped>
.today-pace{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.today-pace button{min-height:44px;padding:8px 14px;border:1px solid var(--study-line);border-radius:8px;background:var(--study-panel);color:var(--study-muted);font:inherit;font-size:13px;cursor:pointer}.today-pace button[aria-pressed=true]{color:var(--study-on-action);background:var(--study-action);border-color:var(--study-action)}
.today-pace-hint{line-height:1.8;margin:0 0 16px!important}
</style>
