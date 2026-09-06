<script setup>
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects, topicCourses } from '../learning-data.mjs'
import { useCourseFilters } from '../composables/useCourseFilters.mjs'
const { query, group } = useCourseFilters('全部')
const groups = ['全部', '专升本备考', '专题学习', '已归档']
const courses = [...prepSubjects.map(s => ({ ...s, group: '专升本备考' })), ...topicCourses]
const matches = computed(() => courses.filter(c => (group.value === '全部' ? c.group !== '已归档' : group.value === c.group) && `${c.name} ${c.short ?? ''} ${c.description} ${c.topics}`.toLowerCase().includes(query.value.trim().toLowerCase())))
</script>

<template>
  <main class="learning-surface learning-hub">
    <header class="learning-page-heading"><p class="learning-eyebrow">COURSES / 课程</p><h1>找到今天想学的一课。</h1><p>在互动课里边读边练，也可以打开阅读版专注查阅。</p></header>
    <div class="course-toolbar"><div class="course-filters" role="group" aria-label="课程分类"><button v-for="g in groups" :key="g" :aria-pressed="group === g" @click="group = g">{{ g }}</button></div><label class="course-search"><Icon name="ph:magnifying-glass" size="19" /><span class="sr-only">筛选课程</span><input v-model="query" type="search" placeholder="查找课程或知识点" aria-label="筛选课程"></label></div>
    <p class="learning-meta course-results" aria-live="polite">{{ matches.length }} 门课程<span v-if="group === '全部'"> · 历史课程收录在「已归档」</span></p>
    <div v-if="matches.length" class="catalog-grid"><article v-for="course in matches" :key="course.slug" class="subject-card" :data-tone="course.tone"><div class="subject-card__top"><span class="subject-mark" aria-hidden="true">{{ course.mark }}</span><span class="learning-meta">{{ course.count ? `${course.count} 节讲义` : course.group }}</span></div><h2><a :href="withBase(course.interactive)">{{ course.name }}</a></h2><p>{{ course.description }}</p><small class="course-topics">{{ course.topics }}</small><div class="subject-actions"><a :href="withBase(course.interactive)">互动学习 <span aria-hidden="true">→</span></a><a :href="withBase(`/courses/${course.slug}/`)">课程目录 / 阅读版</a></div></article></div>
    <div v-else class="learning-empty"><h2>暂时没有匹配的课程</h2><p>试试“数学”“英语”或“Agent”，也可以清除筛选。</p><button class="learn-button is-secondary" @click="query = ''; group = '全部'">查看全部课程</button></div>
    <aside class="learning-note"><div><h2>读懂 → 练习 → 回顾</h2><p>在一节课里完成阅读与练习，再用自己的话解释一遍。</p></div><a class="learning-text-link" :href="withBase('/prep/')">安排本周学习 <span aria-hidden="true">→</span></a></aside>
  </main>
</template>
