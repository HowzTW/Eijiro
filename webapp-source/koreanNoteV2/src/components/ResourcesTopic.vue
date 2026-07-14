<script setup>
import { ExternalLink, Play } from 'lucide-vue-next'

defineProps({ topic: { type: Object, required: true } })
</script>

<template>
  <div class="resource-grid">
    <a
      v-for="resource in topic.resources"
      :key="resource.id"
      class="resource-card"
      :href="resource.href"
      target="_blank"
      rel="noopener noreferrer"
      data-no-swipe
    >
      <div class="resource-card__image">
        <img :src="resource.thumbnail" :alt="`${resource.title} 影片縮圖`" loading="lazy" decoding="async" />
        <span class="resource-card__play"><Play :size="22" fill="currentColor" /></span>
      </div>
      <div class="resource-card__body">
        <span>自學影片 {{ String(Number(resource.id.split('-')[1])).padStart(2, '0') }}</span>
        <h2>{{ resource.title }}</h2>
        <p>在 YouTube 開啟 <ExternalLink :size="15" /></p>
      </div>
    </a>
  </div>
</template>
