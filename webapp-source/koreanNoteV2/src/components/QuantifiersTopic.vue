<script setup>
import PhraseCard from './PhraseCard.vue'

defineProps({
  topic: { type: Object, required: true },
  accent: { type: String, required: true },
})
</script>

<template>
  <div class="quantifier-page">
    <section class="pattern-card">
      <p class="eyebrow">一句就能開始點餐</p>
      <div class="pattern-card__formula" aria-label="基本句型">
        <template v-for="(part, index) in topic.pattern.parts" :key="part">
          <span>{{ part }}</span>
          <b v-if="index < topic.pattern.parts.length - 1">＋</b>
        </template>
      </div>
      <p>{{ topic.pattern.translation }}</p>
    </section>

    <div class="reference-grid">
      <section class="reference-card">
        <div class="section-number">01</div>
        <h2>常用量詞</h2>
        <ul class="reference-list">
          <li v-for="counter in topic.counters" :key="counter[0]">
            <strong lang="ko">{{ counter[0] }}</strong>
            <span>{{ counter[1] }}</span>
            <p>{{ counter[2] }}</p>
          </li>
        </ul>
      </section>

      <section class="reference-card">
        <div class="section-number">02</div>
        <h2>數字用法</h2>
        <ul class="number-list">
          <li v-for="number in topic.numbers" :key="number[0]">
            <span>{{ number[0] }}</span>
            <strong lang="ko">{{ number[1] }}</strong>
            <small>{{ number[2] }}</small>
          </li>
        </ul>
      </section>
    </div>

    <section class="example-section">
      <div class="section-heading">
        <div><span>03</span><h2>帶著唸的例句</h2></div>
        <p>換掉名詞和數量，就能直接使用。</p>
      </div>
      <div class="phrase-grid">
        <PhraseCard v-for="phrase in topic.phrases" :key="phrase.id" :phrase="phrase" :accent="accent" />
      </div>
    </section>

    <aside class="memory-note">
      <span>記憶小抄</span>
      <p><strong>數字＋量詞</strong> 表達數量，<strong>주세요</strong> 是「請給我」，想要什麼就替換前面的名詞。</p>
    </aside>
  </div>
</template>
