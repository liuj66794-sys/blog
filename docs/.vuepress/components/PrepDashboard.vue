<script setup>
import TodayTasks from './TodayTasks.vue'
import WeekTasks from './WeekTasks.vue'
import StudyBackup from './StudyBackup.vue'
import { withBase } from 'vuepress/client'
</script>

<template>
  <div class="prep-dashboard">
    <nav class="prep-quick-nav" aria-label="备考操作"><a href="#week-tasks">本周四科</a><a href="#today-tasks">今日任务</a><a :href="withBase('/review/')">统一错题本</a><a href="#study-backup">学习备份</a></nav>
    <WeekTasks />
    <TodayTasks />
    <section id="study-backup"><StudyBackup /></section>
  </div>
</template>
