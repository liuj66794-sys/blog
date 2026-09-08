<script setup>
import {computed,ref} from 'vue'
import {prepCatalog} from '../prep-catalog.mjs'
import {studyPlan} from '../study-plan-data.mjs'
import {todayTasks} from '../study-tasks.mjs'
import {changeTask,localDay,taskPreferences} from '../../../scripts/runtime/study-state.mjs'
import {useStudyUpdates} from '../composables/useStudyUpdates.mjs'
defineProps({compact:Boolean})
const {revision,refresh,storage}=useStudyUpdates()
const message=ref('')
const tasks=computed(()=>{revision.value;return todayTasks(studyPlan,prepCatalog,__VUEPRESS_BASE__,storage.value)})
const deferred=computed(()=>{revision.value;return Object.values(taskPreferences(storage.value)).some(item=>item.deferUntil>localDay())})
function defer(task) {
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1)
  message.value=changeTask(task.id,{deferUntil:localDay(tomorrow)})?'已延至明天，仍可从本周计划打开。':'浏览器未能保存，请检查存储设置。';refresh()
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
