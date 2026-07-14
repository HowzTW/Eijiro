<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Cloud, CloudOff, Gauge, Menu, RefreshCw, Settings2, X } from 'lucide-vue-next'
import LoadingState from './components/LoadingState.vue'
import PhraseCard from './components/PhraseCard.vue'
import QuantifiersTopic from './components/QuantifiersTopic.vue'
import ResourcesTopic from './components/ResourcesTopic.vue'
import { useSpeech } from './composables/useSpeech'
import { useTopicSwipe } from './composables/useTopicSwipe'
import { fixedTopics } from './fixed-topics'
import { fetchKoreanNoteContent, readCachedContent, saveCachedContent } from './services/koreanNoteApi'

const accentColors = {
  indigo: '#5965a8', green: '#5f8c73', pink: '#c96e82', yellow: '#c69a35',
  sky: '#4e8da4', violet: '#8a6daa', orange: '#d87647', teal: '#3d8a83',
}

const dynamicTopics = ref([])
const activeTopicId = ref('')
const contentStatus = ref('loading')
const contentMessage = ref('')
const contentHash = ref('')
const updatedAt = ref('')
const settingsOpen = ref(false)
const mobileMenuOpen = ref(false)
const tabElements = new Map()

const { voices, rate, selectedVoiceURI, setRate, setVoice, stop } = useSpeech()

const allTopics = computed(() => [
  ...dynamicTopics.value.map((topic) => ({ ...topic, type: 'phrases' })),
  ...fixedTopics,
].sort((left, right) => left.displayOrder - right.displayOrder))

const activeIndex = computed(() => Math.max(0, allTopics.value.findIndex((topic) => topic.id === activeTopicId.value)))
const activeTopic = computed(() => allTopics.value[activeIndex.value] || null)
const activeAccent = computed(() => accentColors[activeTopic.value?.accentColor] || '#5965a8')
const previousTopic = computed(() => allTopics.value[activeIndex.value - 1] || null)
const nextTopic = computed(() => allTopics.value[activeIndex.value + 1] || null)
const isInitialLoading = computed(() => contentStatus.value === 'loading' && dynamicTopics.value.length === 0)
const statusLabel = computed(() => {
  if (contentStatus.value === 'live') return '內容已同步'
  if (contentStatus.value === 'cached') return '顯示離線內容'
  if (contentStatus.value === 'error') return '動態內容未載入'
  return '讀取旅遊筆記'
})

function routeTopicId() {
  return decodeURIComponent(window.location.hash.replace(/^#\/?/, '').trim())
}

function setActiveTopic(id, { replace = false } = {}) {
  if (!allTopics.value.some((topic) => topic.id === id)) return
  activeTopicId.value = id
  const hash = `#/${id}`
  if (replace) window.history.replaceState(null, '', hash)
  else if (window.location.hash !== hash) window.location.hash = hash
  mobileMenuOpen.value = false
  stop()
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  nextTick(() => tabElements.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }))
}

function syncRoute() {
  const requested = routeTopicId()
  const fallback = allTopics.value[0]?.id
  if (allTopics.value.some((topic) => topic.id === requested)) activeTopicId.value = requested
  else if (fallback) setActiveTopic(fallback, { replace: true })
}

function goPrevious() {
  if (previousTopic.value) setActiveTopic(previousTopic.value.id)
}

function goNext() {
  if (nextTopic.value) setActiveTopic(nextTopic.value.id)
}

const swipe = useTopicSwipe(goPrevious, goNext)

function applyPayload(payload, status) {
  dynamicTopics.value = payload.data.topics
  contentHash.value = payload.contentHash || ''
  updatedAt.value = payload.generatedAt || ''
  contentStatus.value = status
  syncRoute()
}

async function loadContent() {
  contentMessage.value = ''
  const cached = readCachedContent()
  if (cached) applyPayload(cached.payload, 'cached')
  else contentStatus.value = 'loading'

  try {
    const payload = await fetchKoreanNoteContent()
    saveCachedContent(payload)
    applyPayload(payload, 'live')
  } catch (error) {
    contentMessage.value = error?.name === 'AbortError' ? '連線時間較久，請稍後再試。' : '目前無法取得最新內容。'
    contentStatus.value = cached ? 'cached' : 'error'
    if (!cached) syncRoute()
  }
}

function setTabElement(id, element) {
  if (element) tabElements.set(id, element)
}

onMounted(() => {
  window.addEventListener('hashchange', syncRoute)
  loadContent()
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRoute)
  stop()
})
</script>

<template>
  <div class="app-shell" :style="{ '--topic-accent': activeAccent }">
    <header class="mobile-header">
      <button class="mobile-header__menu" type="button" aria-label="開啟主題選單" @click="mobileMenuOpen = true"><Menu /></button>
      <div class="mobile-header__brand"><strong>Hatarō</strong><span>KoreanNote</span></div>
      <button class="mobile-header__settings" type="button" aria-label="語音設定" @click="settingsOpen = true"><Settings2 /></button>
    </header>

    <aside class="side-rail" :class="{ 'side-rail--open': mobileMenuOpen }">
      <button class="side-rail__close" type="button" aria-label="關閉主題選單" @click="mobileMenuOpen = false"><X /></button>
      <div class="brand-block">
        <div class="brand-block__mark" aria-hidden="true"><span>하</span><small>KR</small></div>
        <p>Hatarō</p>
        <h1>KoreanNote</h1>
        <span>旅途中隨手就能用的韓語筆記</span>
      </div>

      <nav class="topic-nav" aria-label="韓語筆記主題">
        <button
          v-for="(topic, index) in allTopics"
          :key="topic.id"
          class="topic-nav__item"
          :class="{ 'topic-nav__item--active': topic.id === activeTopic?.id }"
          type="button"
          :aria-current="topic.id === activeTopic?.id ? 'page' : undefined"
          @click="setActiveTopic(topic.id)"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <div><strong>{{ topic.navLabel }}</strong><small>{{ topic.title }}</small></div>
          <ChevronRight :size="17" />
        </button>
      </nav>

      <div class="side-rail__footer">
        <span class="sync-dot" :class="`sync-dot--${contentStatus}`"></span>
        <div><strong>{{ statusLabel }}</strong><small v-if="contentHash">版本 {{ contentHash.slice(0, 8) }}</small></div>
      </div>
    </aside>
    <button v-if="mobileMenuOpen" class="menu-backdrop" type="button" aria-label="關閉主題選單" @click="mobileMenuOpen = false"></button>

    <main class="main-content">
      <div class="mobile-tabs" aria-label="快速切換主題">
        <button
          v-for="topic in allTopics"
          :key="topic.id"
          :ref="(element) => setTabElement(topic.id, element)"
          type="button"
          :class="{ active: topic.id === activeTopic?.id }"
          @click="setActiveTopic(topic.id)"
        >{{ topic.navLabel }}</button>
      </div>

      <div v-if="contentMessage" class="notice-bar" :class="{ 'notice-bar--cached': contentStatus === 'cached' }" role="status">
        <CloudOff :size="18" />
        <span>{{ contentMessage }}<template v-if="contentStatus === 'cached'"> 已顯示最近一次保存的內容。</template></span>
        <button type="button" @click="loadContent"><RefreshCw :size="16" />重試</button>
      </div>

      <template v-if="isInitialLoading">
        <div class="page-heading page-heading--loading">
          <p class="eyebrow">Preparing your phrasebook</p>
          <h2>正在整理旅途用語</h2>
        </div>
        <LoadingState />
      </template>

      <template v-else-if="activeTopic">
        <header class="page-heading">
          <div>
            <p class="eyebrow">Travel phrasebook · {{ String(activeIndex + 1).padStart(2, '0') }}</p>
            <h2>{{ activeTopic.title }}</h2>
            <p v-if="activeTopic.type === 'phrases'">把想說的話放大、聽清楚，再帶著走。</p>
            <p v-else-if="activeTopic.type === 'quantifiers'">從數字、量詞到點餐例句，一次整理成隨身小抄。</p>
            <p v-else>挑一段影片，讓耳朵先熟悉韓語的聲音。</p>
          </div>
          <div class="page-heading__tools">
            <span v-if="activeTopic.type === 'phrases'"><BookOpen :size="17" />{{ activeTopic.phrases.length }} 句</span>
            <button type="button" @click="settingsOpen = true"><Settings2 :size="18" />語音設定</button>
          </div>
        </header>

        <section
          class="topic-stage"
          :aria-labelledby="`topic-${activeTopic.id}`"
          @touchstart.passive="swipe.onTouchStart"
          @touchend.passive="swipe.onTouchEnd"
          @touchcancel.passive="swipe.onTouchCancel"
        >
          <h2 :id="`topic-${activeTopic.id}`" class="sr-only">{{ activeTopic.title }}</h2>
          <div v-if="activeTopic.type === 'phrases'" class="phrase-grid">
            <PhraseCard v-for="phrase in activeTopic.phrases" :key="phrase.id" :phrase="phrase" :accent="activeAccent" />
          </div>
          <QuantifiersTopic v-else-if="activeTopic.type === 'quantifiers'" :topic="activeTopic" :accent="activeAccent" />
          <ResourcesTopic v-else :topic="activeTopic" />
        </section>

        <nav class="page-turner" aria-label="前後主題">
          <button type="button" :disabled="!previousTopic" @click="goPrevious">
            <ArrowLeft :size="19" /><span><small>上一個主題</small>{{ previousTopic?.navLabel || '已是第一頁' }}</span>
          </button>
          <div aria-hidden="true"><span v-for="topic in allTopics" :key="topic.id" :class="{ active: topic.id === activeTopic.id }"></span></div>
          <button type="button" :disabled="!nextTopic" @click="goNext">
            <span><small>下一個主題</small>{{ nextTopic?.navLabel || '旅程完成' }}</span><ArrowRight :size="19" />
          </button>
        </nav>
      </template>
    </main>

    <div v-if="settingsOpen" class="settings-layer" role="presentation" @click.self="settingsOpen = false">
      <section class="settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-no-swipe>
        <div class="settings-card__heading">
          <div><span><Gauge :size="18" /></span><div><p>Listening preferences</p><h2 id="settings-title">語音設定</h2></div></div>
          <button type="button" aria-label="關閉語音設定" @click="settingsOpen = false"><X /></button>
        </div>

        <fieldset>
          <legend>朗讀速度</legend>
          <label :class="{ selected: rate === 1 }"><input type="radio" name="speech-rate" :checked="rate === 1" @change="setRate(1)" /><span><Check :size="16" />正常</span><small>適合跟讀與日常確認</small></label>
          <label :class="{ selected: rate === 0.72 }"><input type="radio" name="speech-rate" :checked="rate === 0.72" @change="setRate(0.72)" /><span><Check :size="16" />慢速</span><small>拆解發音、第一次練習</small></label>
        </fieldset>

        <label v-if="voices.length > 1" class="voice-select">
          <span>韓語語音</span>
          <select :value="selectedVoiceURI" @change="setVoice($event.target.value)">
            <option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">{{ voice.name }}</option>
          </select>
        </label>
        <p v-else class="settings-card__note"><Cloud :size="17" />裝置會自動使用目前可用的韓語語音。</p>
      </section>
    </div>
  </div>
</template>
