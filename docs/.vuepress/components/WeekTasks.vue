<script setup>
import {computed} from 'vue'
import {withBase} from 'vuepress/client'
import {prepCatalog} from '../prep-catalog.mjs'
import {studyPlan} from '../study-plan-data.mjs'
import {weeklyTasks} from '../study-tasks.mjs'
import {lessonStatus,storageObject,withStudyContext,STUDY_EVENT} from '../../../scripts/runtime/study-state.mjs'
import {useStudyUpdates} from '../composables/useStudyUpdates.mjs'
const {revision,refresh,storage}=useStudyUpdates()
const siteBase=__VUEPRESS_BASE__
const tasks=computed(()=>{revision.value;return weeklyTasks(studyPlan,prepCatalog,__VUEPRESS_BASE__,storage.value)})
const checks=computed(()=>{revision.value;return storageObject('zsb-prep-checks',storage.value)})
const key=task=>`${__VUEPRESS_BASE__}prep/${task.prep}/#w${task.week.no}`
function check(task,event) {
  const checked=event.target.checked,all=storageObject('zsb-prep-checks'),meta=storageObject('zsb-prep-checks-meta-v1')
  if(checked) all[key(task)]=1;else delete all[key(task)]
  try {localStorage.setItem('zsb-prep-checks',JSON.stringify(all));localStorage.setItem('zsb-prep-checks-meta-v1',JSON.stringify({...meta,[key(task)]:{checked,updatedAt:Date.now()}}));window.dispatchEvent(new CustomEvent(STUDY_EVENT))} catch {event.target.checked=!checked}
  refresh()
}
const href=lesson=>withStudyContext(lesson.interactive,`${__VUEPRESS_BASE__}prep/#week-tasks`,__VUEPRESS_BASE__)
</script>
<template>
  <section class="week-tasks" id="week-tasks" aria-labelledby="week-task-heading">
    <div class="learning-section__heading"><div><p class="learning-eyebrow">{{tasks[0]?.week.start}} — {{tasks[0]?.week.end}}</p><h2 id="week-task-heading">{{tasks[0]?.week.label}} · 本周四科任务</h2></div></div>
    <p class="learning-meta">计划中的任务保留原文。配套课程帮助开始练习；完成一课不会自动勾选整周。</p>
    <div class="week-task-grid"><article v-for="task in tasks" :key="task.slug">
      <h3><a :href="withBase(`/courses/${task.slug}/`)">{{task.subject}}</a></h3><p>{{task.text}}</p>
      <p v-if="task.lessons.length" class="learning-meta">配套课程已完成练习 {{task.completed}} / {{task.lessons.length}}</p>
      <div class="week-lesson-links"><a v-for="lesson in task.lessons.slice(0,3)" :key="lesson.id" :href="href(lesson)">{{lesson.label}} · {{lesson.title}} <span>{{lessonStatus(task.slug,lesson,siteBase,storage).label}}</span></a></div>
      <div v-if="task.tools?.length" class="week-lesson-links"><a v-for="tool in task.tools" :key="tool.href" :href="withStudyContext(tool.href,`${siteBase}prep/#week-tasks`,siteBase)">{{tool.title}} →</a></div>
      <details v-if="task.lessons.length>3"><summary>其余 {{task.lessons.length-3}} 节配套课</summary><div class="week-lesson-links"><a v-for="lesson in task.lessons.slice(3)" :key="lesson.id" :href="href(lesson)">{{lesson.label}} · {{lesson.title}}</a></div></details>
      <p v-if="!task.lessons.length" class="learning-meta">这项任务需要结合计划中的材料完成，可从科目目录查阅配套工具。</p>
      <label class="week-check"><input type="checkbox" :checked="Boolean(checks[key(task)])" @change="check(task,$event)">确认已完成本周{{task.subject}}计划</label>
      <a class="learning-text-link" :href="withBase(`/prep/${task.prep}/`)+`#w${task.week.no}`">查看完整{{task.subject}}周计划 →</a>
    </article></div>
  </section>
</template>
