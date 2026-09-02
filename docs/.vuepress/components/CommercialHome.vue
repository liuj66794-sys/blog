<script setup>
import { withBase } from 'vuepress/client'
import { trackPortfolioEvent } from '../analytics.mjs'
import { developer, learningLinks, services } from '../portfolio-data.mjs'
import PortfolioCards from './PortfolioCards.vue'
</script>

<template>
  <div class="commercial-home">
    <section class="commercial-section commercial-intro" aria-labelledby="delivery-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">WHAT I SHIP</p>
          <h2 id="delivery-heading">把想法做成可以验收的产品</h2>
        </div>
        <p>
          不只写某一个页面或接口。从需求、原型到完整功能、打包和源码交付，围绕最终可用结果推进。
        </p>
      </div>

      <div class="delivery-principles" aria-label="交付特点">
        <div><strong>01</strong><span>独立完成关键链路</span></div>
        <div><strong>02</strong><span>阶段成果随时可看</span></div>
        <div><strong>03</strong><span>交付源码与运行文档</span></div>
      </div>

      <div class="service-grid is-compact">
        <article v-for="service in services.slice(0, 4)" :key="service.title" class="service-card">
          <span class="service-card__icon" aria-hidden="true">
            <Icon :name="service.icon" size="23" />
          </span>
          <h3>{{ service.title }}</h3>
          <p>{{ service.description }}</p>
        </article>
      </div>
      <div class="commercial-section__action">
        <a
          class="commercial-link is-prominent"
          :href="withBase('/hire/')"
          @click="trackPortfolioEvent('portfolio_hire_cta', { location: 'home_services' })"
        >
          查看合作方式与全部服务 <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <section class="commercial-section" aria-labelledby="featured-projects-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">SELECTED WORK</p>
          <h2 id="featured-projects-heading">我已经做过的完整产品</h2>
        </div>
        <p>每个案例都从“解决什么问题”开始，再说明功能、实现范围和可核验的项目证据。</p>
      </div>
      <PortfolioCards />
      <div class="commercial-section__action">
        <a class="commercial-link is-prominent" :href="withBase('/projects/')">
          查看全部案例 <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <section class="commercial-section learning-bridge" aria-labelledby="learning-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">LEARNING IN PUBLIC</p>
          <h2 id="learning-heading">持续学习，也持续把经验留下来</h2>
        </div>
        <p>{{ developer.brand }} 的学习内容仍然完整保留。这里记录技术判断、课程讲义和真实项目复盘。</p>
      </div>
      <div class="learning-grid">
        <a v-for="item in learningLinks" :key="item.title" :href="withBase(item.href)" class="learning-card">
          <Icon :name="item.icon" size="24" />
          <span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  </div>
</template>
