<script setup>
import { ref } from 'vue'
import { Check, Copy, Square, Volume2 } from 'lucide-vue-next'
import { useSpeech } from '../composables/useSpeech'

const props = defineProps({
  phrase: { type: Object, required: true },
  accent: { type: String, default: '#df6a50' },
})

const copied = ref(false)
const { activeId, supported, speak } = useSpeech()

async function copyKorean() {
  try {
    await navigator.clipboard.writeText(props.phrase.korean)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.phrase.korean
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <article class="phrase-card" :style="{ '--card-accent': accent }">
    <div class="phrase-card__topline">
      <span class="phrase-card__label">{{ phrase.cardTitle }}</span>
      <span class="phrase-card__stamp" aria-hidden="true">KR</span>
    </div>

    <p class="phrase-card__korean" lang="ko">{{ phrase.korean }}</p>
    <p v-if="phrase.romanization" class="phrase-card__romanization">{{ phrase.romanization }}</p>
    <p class="phrase-card__translation">{{ phrase.translation }}</p>
    <p v-if="phrase.usageNote" class="phrase-card__usage">{{ phrase.usageNote }}</p>

    <div class="phrase-card__actions" data-no-swipe>
      <button
        class="action-button"
        type="button"
        :disabled="!supported"
        :aria-label="activeId === phrase.id ? `停止朗讀 ${phrase.korean}` : `朗讀 ${phrase.korean}`"
        :title="supported ? '朗讀韓文' : '此瀏覽器不支援語音朗讀'"
        @click="speak(phrase.korean, phrase.id)"
      >
        <Square v-if="activeId === phrase.id" :size="17" fill="currentColor" />
        <Volume2 v-else :size="19" />
        <span>{{ activeId === phrase.id ? '停止' : '朗讀' }}</span>
      </button>

      <button class="action-button" type="button" :aria-label="`複製 ${phrase.korean}`" @click="copyKorean">
        <Check v-if="copied" :size="19" />
        <Copy v-else :size="18" />
        <span>{{ copied ? '已複製' : '複製' }}</span>
      </button>
    </div>
  </article>
</template>
