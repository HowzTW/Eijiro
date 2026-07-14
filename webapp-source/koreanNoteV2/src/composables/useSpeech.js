import { computed, onMounted, onUnmounted, ref } from 'vue'

const voices = ref([])
const activeId = ref('')

function readPreference(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Privacy modes may disable storage; speech still works for this visit.
  }
}

const savedRate = Number(readPreference('hataro-korean-note:speech-rate'))
const rate = ref(savedRate === 0.72 ? 0.75 : [1, 0.75, 0.6].includes(savedRate) ? savedRate : 1)
const selectedVoiceURI = ref(readPreference('hataro-korean-note:voice'))

function refreshVoices() {
  if (!('speechSynthesis' in window)) return
  voices.value = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ko'))
  if (!voices.value.some((voice) => voice.voiceURI === selectedVoiceURI.value)) {
    selectedVoiceURI.value = voices.value[0]?.voiceURI || ''
  }
}

export function useSpeech() {
  const supported = computed(() => 'speechSynthesis' in window)

  function setRate(value) {
    rate.value = Number(value)
    savePreference('hataro-korean-note:speech-rate', String(rate.value))
  }

  function setVoice(value) {
    selectedVoiceURI.value = value
    savePreference('hataro-korean-note:voice', value)
  }

  function stop() {
    if (!supported.value) return
    window.speechSynthesis.cancel()
    activeId.value = ''
  }

  function speak(text, id) {
    if (!supported.value || !text) return
    if (activeId.value === id) {
      stop()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = rate.value
    utterance.voice = voices.value.find((voice) => voice.voiceURI === selectedVoiceURI.value) || voices.value[0] || null
    utterance.onstart = () => { activeId.value = id }
    utterance.onend = () => { if (activeId.value === id) activeId.value = '' }
    utterance.onerror = () => { if (activeId.value === id) activeId.value = '' }
    window.speechSynthesis.speak(utterance)
  }

  onMounted(() => {
    refreshVoices()
    if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  })

  onUnmounted(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
  })

  return { voices, activeId, rate, selectedVoiceURI, supported, speak, stop, setRate, setVoice }
}
