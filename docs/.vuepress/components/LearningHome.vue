<script setup>
import { ref } from 'vue'
import { withBase } from 'vuepress/client'
import { prepSubjects, topicCourses } from '../learning-data.mjs'
import SubjectCards from './SubjectCards.vue'
import TodayTasks from './TodayTasks.vue'
import CourseSearch from './CourseSearch.vue'
import ReviewEntry from './ReviewEntry.vue'
import StudyDesk from './StudyDesk.vue'

const query = ref('')
const searchExamples = ['洛必达', '名词', '导论']
const total = prepSubjects.reduce((sum, subject) => sum + subject.count, 0)
</script>

<template>
  <main class="learning-surface learning-home">
    <header class="student-home-heading">
      <div>
        <p class="learning-eyebrow"><span class="brand-rule" aria-hidden="true" />知序 · 学习与实践</p>
        <h1>今天，学懂一个知识点。</h1>
        <p class="student-home-heading__lead">接着上次学，或者选一门课，从一小步开始。</p>
      </div>
      <div class="student-home-heading__search">
        <form class="home-course-search" :action="withBase('/courses/')" method="get" role="search" aria-label="查找一节课">
          <CourseSearch id="home-course-search" v-model="query" placeholder="今天想学哪个知识点？" />
          <button class="learn-button" type="submit">找课 <span aria-hidden="true">→</span></button>
        </form>
        <div class="home-search-examples"><span>试着找</span><a v-for="keyword in searchExamples" :key="keyword" :href="withBase('/courses/') + '?q=' + encodeURIComponent(keyword)">{{ keyword }}</a></div>
      </div>
    </header>

    <StudyDesk />

    <div class="study-start-grid student-home-tasks">
      <ReviewEntry />

      <aside class="study-week">
        <TodayTasks compact />
        <a class="learning-text-link" :href="withBase('/prep/')+'#week-tasks'">本周四科任务与学习备份 <span aria-hidden="true">→</span></a>
      </aside>
    </div>

    <section class="learning-section" aria-labelledby="home-prep-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">01 / 系统备考 · {{ total }} 节讲义</p><h2 id="home-prep-heading">四门课程，一步步打牢基础。</h2></div><a class="learning-text-link" :href="withBase('/courses/')">全部课程 <span aria-hidden="true">→</span></a></div>
      <SubjectCards />
    </section>

    <section class="learning-section" aria-labelledby="home-topics-heading">
      <div class="learning-section__heading"><div><p class="learning-eyebrow">02 / 持续探索</p><h2 id="home-topics-heading">课本之外，让好奇心继续。</h2></div></div>
      <div class="topic-grid"><article v-for="course in topicCourses.filter(c => c.group !== '已归档')" :key="course.slug" class="topic-card"><span class="topic-card__number" aria-hidden="true">{{ course.mark }}</span><h3><a :href="withBase(course.interactive)">{{ course.name }}</a></h3><p>{{ course.description }}</p><a class="learning-text-link" :href="withBase(course.interactive)">开始学习 <span aria-hidden="true">→</span></a></article></div>
    </section>

    <div class="study-library-links"><a :href="withBase('/knowledge/')"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 4h5v16H3zM8 6h5v14H8zM15 4l4-1 4 16-4 1zM3 16h10" /></svg><span><strong>知识库</strong><small>概念、速查与参考资料</small></span><span aria-hidden="true">↗</span></a><a :href="withBase('/blog/')"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 15-1 6 6-1L21 8l-5-5L4 15Zm9-9 5 5M4 15l5 5M12 21h10" /></svg><span><strong>学习手记</strong><small>留下自己的理解，也记录问题</small></span><span aria-hidden="true">↗</span></a></div>
    <div class="learning-project-footer"><span>学习、实践，也把想法做成作品。</span><a :href="withBase('/projects/')">查看项目</a><a :href="withBase('/hire/')">找我开发 <span aria-hidden="true">↗</span></a></div>
  </main>
</template>

<style scoped>
.student-home-heading{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:center;gap:36px;padding-bottom:28px}
.student-home-heading .learning-eyebrow{display:flex;align-items:center;gap:10px;font-size:11px;margin-bottom:10px!important;color:var(--study-muted)}
.student-home-heading h1{font:500 clamp(27px,3vw,38px)/1.45 var(--study-display-font);letter-spacing:-.035em}
.student-home-heading__lead{font-size:13px;line-height:1.8;color:var(--study-muted);margin-top:10px}
.student-home-heading__search{min-width:0}.student-home-heading .home-course-search{margin-top:0}
.student-home-tasks{margin-top:26px}
@media(max-width:700px){.student-home-heading{grid-template-columns:minmax(0,1fr);gap:18px;padding-bottom:20px}.student-home-heading h1{font-size:27px}.student-home-heading__lead{font-size:12px}.student-home-heading .home-search-examples{display:none}.student-home-tasks{margin-top:20px}}
</style>
