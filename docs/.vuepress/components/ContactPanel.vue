<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vuepress/client'
import { trackPortfolioEvent } from '../analytics.mjs'
import { consultationBrief, contact } from '../portfolio-data.mjs'

const copyStatus = ref('')
const mailto = computed(
  () => `mailto:${contact.email}?subject=${encodeURIComponent(contact.emailSubject)}&body=${encodeURIComponent(consultationBrief)}`,
)

function trackContact(channel) {
  trackPortfolioEvent('portfolio_contact_click', { channel })
}

async function copyText(value) {
  let copied = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      copied = true
    }
  } catch {
    copied = false
  }

  if (!copied) {
    const input = document.createElement('textarea')
    input.value = value
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    copied = document.execCommand('copy')
    input.remove()
  }

  return copied
}

function showCopyStatus(message) {
  copyStatus.value = message
  window.setTimeout(() => {
    copyStatus.value = ''
  }, 3000)
}

async function copyWechat() {
  const copied = await copyText(contact.wechat)

  showCopyStatus(copied ? `已复制微信号：${contact.wechat}` : `请手动复制：${contact.wechat}`)
  trackContact('wechat_copy')
}

async function copyBrief() {
  const copied = await copyText(consultationBrief)
  showCopyStatus(copied ? '已复制项目咨询模板' : '复制失败，请手动选择模板内容')
  trackPortfolioEvent('portfolio_brief_copy', { location: 'contact_panel', success: copied })
}
</script>

<template>
  <section class="contact-panel" aria-labelledby="contact-heading">
    <div class="contact-panel__copy">
      <p class="commercial-kicker">START A PROJECT</p>
      <h2 id="contact-heading">有想法、半成品或棘手问题？</h2>
      <p>
        发我一句需求背景、期望结果和大致时间。我会先帮你判断范围，再决定是否适合合作。
      </p>

      <div class="consultation-brief">
        <div>
          <strong>不知道怎么描述？</strong>
          <p>复制这份简短模板，填得越具体，首次沟通越高效。</p>
        </div>
        <button class="commercial-button is-secondary" type="button" @click="copyBrief">
          <Icon name="ph:copy" size="20" />
          复制咨询模板
        </button>
        <pre>{{ consultationBrief }}</pre>
      </div>

      <div class="contact-actions">
        <button class="commercial-button" type="button" @click="copyWechat">
          <Icon name="ph:wechat-logo" size="20" />
          复制微信号
        </button>
        <a class="commercial-button is-secondary" :href="mailto" @click="trackContact('email')">
          <Icon name="ph:envelope-simple" size="20" />
          发送邮件
        </a>
        <a
          class="commercial-button is-ghost"
          href="https://github.com/liuj66794-sys"
          target="_blank"
          rel="noreferrer"
          @click="trackContact('github')"
        >
          <Icon name="ph:github-logo" size="20" />
          GitHub
        </a>
      </div>

      <dl class="contact-details">
        <div>
          <dt>微信</dt>
          <dd>{{ contact.wechat }}</dd>
        </div>
        <div>
          <dt>邮箱</dt>
          <dd><a :href="mailto">{{ contact.email }}</a></dd>
        </div>
      </dl>
      <p class="sr-only" aria-live="polite">{{ copyStatus }}</p>
      <p v-if="copyStatus" class="copy-status" aria-hidden="true">{{ copyStatus }}</p>
    </div>

    <div class="contact-panel__qr">
      <div class="wechat-qr-crop">
        <img
          :src="withBase(contact.wechatQr)"
          alt="微信二维码，联系知序网站作者"
          width="579"
          height="1280"
          loading="lazy"
        >
      </div>
      <p>微信扫码添加 · 添加时请备注“项目咨询”</p>
    </div>
  </section>
</template>
