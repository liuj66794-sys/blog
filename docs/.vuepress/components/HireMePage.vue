<script setup>
import { nextTick, onMounted } from 'vue'
import { withBase } from 'vuepress/client'
import { developer, services, workflow } from '../portfolio-data.mjs'
import ContactPanel from './ContactPanel.vue'
import PortfolioCards from './PortfolioCards.vue'

function trackHire(location) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'portfolio_hire_cta', { location })
  }
}

function scrollToContact(event) {
  event?.preventDefault()
  const target = document.querySelector('#contact')
  if (!target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const navHeight = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height'),
  ) || 64
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#contact`)
  window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
  trackHire('hire_hero')
}

onMounted(async () => {
  if (window.location.hash !== '#contact') return
  await nextTick()
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToContact()))
})
</script>

<template>
  <main class="commercial-page hire-page">
    <header class="commercial-hero">
      <div class="commercial-hero__copy">
        <p class="commercial-kicker">HIRE ME / 找我开发</p>
        <h1>把需求变成<br><span>可用、可验收、可交付</span>的产品</h1>
        <p class="commercial-hero__role">{{ developer.brand }}</p>
        <p class="commercial-hero__subtitle">{{ developer.role }}</p>
        <p class="commercial-hero__description">{{ developer.promise }}</p>
        <div class="contact-actions">
          <button class="commercial-button" type="button" @click="scrollToContact">
            开始聊项目 <span aria-hidden="true">→</span>
          </button>
          <a class="commercial-button is-secondary" :href="withBase('/projects/')">先看项目</a>
        </div>
      </div>
      <div class="commercial-hero__proof" aria-label="合作特点">
        <p>从沟通到交付</p>
        <strong>ONE PERSON<br>FULL PRODUCT</strong>
        <dl>
          <div><dt>交付</dt><dd>源码 + 构建产物</dd></div>
          <div><dt>过程</dt><dd>原型 + 阶段验收</dd></div>
          <div><dt>方向</dt><dd>Web / Desktop / Android / AI</dd></div>
        </dl>
      </div>
    </header>

    <section class="commercial-section" aria-labelledby="services-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">SERVICES</p>
          <h2 id="services-heading">我可以帮你</h2>
        </div>
        <p>可以从零搭建，也可以接手已有项目。先把目标和范围说清楚，再选择合适的技术。</p>
      </div>
      <div class="service-grid">
        <article v-for="service in services" :key="service.title" class="service-card">
          <span class="service-card__icon" aria-hidden="true"><Icon :name="service.icon" size="24" /></span>
          <h3>{{ service.title }}</h3>
          <p>{{ service.description }}</p>
        </article>
      </div>
    </section>

    <section class="commercial-section" aria-labelledby="hire-projects-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">PROOF OF WORK</p>
          <h2 id="hire-projects-heading">不是只会技术栈，而是做完产品</h2>
        </div>
        <p>案例只展示能够核验的源码、真实截图和明确实现范围；没有的证据不会用占位按钮冒充。</p>
      </div>
      <PortfolioCards />
    </section>

    <section class="commercial-section" aria-labelledby="workflow-heading">
      <div class="commercial-section__heading">
        <div>
          <p class="commercial-kicker">WORKFLOW</p>
          <h2 id="workflow-heading">合作怎么进行</h2>
        </div>
        <p>每一步都有明确产出。需求或范围变化会先沟通影响，再进入下一阶段。</p>
      </div>
      <ol class="workflow-list">
        <li v-for="(step, index) in workflow" :key="step.title">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <div><h3>{{ step.title }}</h3><p>{{ step.description }}</p></div>
        </li>
      </ol>
    </section>

    <div id="contact" class="contact-anchor">
      <ContactPanel />
    </div>
  </main>
</template>
