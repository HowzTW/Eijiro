<script setup>
import { onMounted, ref } from 'vue'
import { Bookmark, CalendarDays, ExternalLink, Globe, Heart, Instagram, Map, MapPin, Utensils, X } from 'lucide-vue-next'
import { formatKrw, statusLabels, teamLabels } from '../utils/restaurants'

const props = defineProps({
  restaurant: { type: Object, required: true },
  favorite: Boolean,
  wishlisted: Boolean,
})

defineEmits(['close', 'toggle-favorite', 'toggle-wishlist'])

const dialog = ref(null)
onMounted(() => dialog.value?.focus())

const featureLabels = {
  fineDining: 'Fine Dining',
  casual: '輕鬆用餐',
  soloFriendly: '一人友善',
  alcoholPairing: '酒類搭配',
  traditionalLiquor: '傳統酒',
  photoFriendly: '適合拍照',
  englishFriendly: '英語友善',
  vegetarianOptions: '有蔬食選項',
}
</script>

<template>
  <Teleport to="body">
    <div class="detail-overlay" @click.self="$emit('close')">
      <article
        ref="dialog"
        class="detail-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`detail-${restaurant.id}`"
        tabindex="-1"
        @keydown.esc="$emit('close')"
      >
        <button class="detail-panel__close" type="button" aria-label="關閉餐廳詳情" @click="$emit('close')"><X /></button>

        <header class="detail-hero">
          <div class="tag-row">
            <span class="pill">第 {{ restaurant.chef.season }} 季</span>
            <span class="pill" :class="`pill--${restaurant.chef.team}`">{{ teamLabels[restaurant.chef.team] }}</span>
            <span v-if="restaurant.restaurant.status !== 'open'" class="status-pill">{{ statusLabels[restaurant.restaurant.status] }}</span>
          </div>
          <p class="eyebrow">HATARO'S SEOUL TABLE · {{ restaurant.recommendation.priorityTier }} LIST</p>
          <h2 :id="`detail-${restaurant.id}`">{{ restaurant.name.zhTw }}</h2>
          <p class="detail-hero__names"><span lang="ko">{{ restaurant.name.ko }}</span><span>{{ restaurant.name.en }}</span></p>
          <p>{{ restaurant.restaurant.description }}</p>
          <div class="detail-score"><strong>{{ restaurant.recommendation.hataroScore }}</strong><span>/ 5</span><small>哈太郎推薦</small></div>
        </header>

        <div v-if="restaurant.id === 'via-toledo-pasta-bar'" class="important-notice" role="note">
          <strong>預約方式請特別確認</strong>
          <span>{{ restaurant.booking.bookingNotes }}</span>
        </div>
        <div v-if="restaurant.id === 'neo-choi-kang-rok'" class="important-notice important-notice--closed" role="note">
          <strong>歷史資料 · 已於 2024 年歇業</strong>
          <span>本頁僅保存節目與首爾餐飲史資訊，不可造訪或預約。</span>
        </div>

        <div class="detail-content">
          <section class="detail-section detail-section--identity">
            <h3><Utensils :size="19" />主廚與節目</h3>
            <dl class="info-grid">
              <div><dt>主廚</dt><dd>{{ restaurant.chef.nameZhTw }}<small lang="ko">{{ restaurant.chef.nameKo }}</small><small>{{ restaurant.chef.nameEn }}</small></dd></div>
              <div><dt>節目身分</dt><dd>第 {{ restaurant.chef.season }} 季 · {{ teamLabels[restaurant.chef.team] }}<small v-if="restaurant.chef.showNickname?.zhTw">{{ restaurant.chef.showNickname.zhTw }}</small></dd></div>
            </dl>
            <p v-if="restaurant.chef.affiliationNotes" class="soft-note">{{ restaurant.chef.affiliationNotes }}</p>
          </section>

          <section class="detail-section">
            <h3><MapPin :size="19" />地址</h3>
            <p v-if="restaurant.restaurant.address.zhTw">{{ restaurant.restaurant.address.zhTw }}</p>
            <p v-else class="pending-value">完整地址尚待確認</p>
            <p v-if="restaurant.id === 'original-numbers'" class="address-warning">地址請於出發前再次確認。</p>
            <p class="muted">{{ restaurant.restaurant.district.zhTw }}<template v-if="restaurant.restaurant.neighborhood?.zhTw"> · {{ restaurant.restaurant.neighborhood.zhTw }}</template></p>
          </section>

          <section class="detail-section">
            <h3><CalendarDays :size="19" />價格與預約</h3>
            <dl class="info-grid">
              <div><dt>人均預算</dt><dd>{{ formatKrw(restaurant.pricing.averagePerPersonKrw) }}</dd></div>
              <div><dt>訂位難度</dt><dd>{{ restaurant.booking.bookingDifficulty }} / 5</dd></div>
            </dl>
            <p>{{ restaurant.pricing.priceNotes }}</p>
            <p v-if="restaurant.id !== 'via-toledo-pasta-bar'">{{ restaurant.booking.bookingNotes }}</p>
            <p class="data-disclaimer">價格為規劃預算用約值，請以餐廳即時公告為準。</p>
          </section>

          <section class="detail-section detail-section--wide">
            <h3>適合這樣的你</h3>
            <div class="feature-chips">
              <span v-for="item in restaurant.recommendation.bestFor" :key="item">{{ item }}</span>
              <template v-for="(enabled, key) in restaurant.features" :key="key">
                <span v-if="enabled === true">{{ featureLabels[key] }}</span>
              </template>
            </div>
          </section>

          <section class="detail-section detail-section--comment detail-section--wide">
            <span class="quote-mark">“</span>
            <h3>衛次郎短評</h3>
            <blockquote>{{ restaurant.recommendation.eijiroComment }}</blockquote>
          </section>

          <section v-if="restaurant.recommendation.cautions.length" class="detail-section detail-section--wide">
            <h3>出發前注意</h3>
            <ul class="caution-list"><li v-for="item in restaurant.recommendation.cautions" :key="item">{{ item }}</li></ul>
          </section>

          <section class="detail-section detail-section--wide">
            <h3>地圖、訂位與官方資訊</h3>
            <div class="external-actions">
              <a v-if="restaurant.maps.naverMapUrl" class="external-button external-button--primary" :href="restaurant.maps.naverMapUrl" target="_blank" rel="noopener noreferrer"><Map :size="18" />開啟 Naver Maps<ExternalLink :size="14" /></a>
              <a v-if="restaurant.maps.googleMapsUrl" class="external-button" :href="restaurant.maps.googleMapsUrl" target="_blank" rel="noopener noreferrer"><MapPin :size="18" />Google Maps<ExternalLink :size="14" /></a>
              <a v-if="restaurant.restaurant.status === 'open' && restaurant.booking.catchTableUrl" class="external-button" :href="restaurant.booking.catchTableUrl" target="_blank" rel="noopener noreferrer"><CalendarDays :size="18" />查看 CatchTable<ExternalLink :size="14" /></a>
              <a v-if="restaurant.media.instagramUrl" class="external-button" :href="restaurant.media.instagramUrl" target="_blank" rel="noopener noreferrer"><Instagram :size="18" />Instagram<ExternalLink :size="14" /></a>
              <a v-if="restaurant.media.officialWebsite" class="external-button" :href="restaurant.media.officialWebsite" target="_blank" rel="noopener noreferrer"><Globe :size="18" />官方網站<ExternalLink :size="14" /></a>
            </div>
          </section>

          <section class="detail-section detail-section--sources detail-section--wide">
            <h3>資料來源與查核</h3>
            <ul><li v-for="source in restaurant.sources" :key="`${source.label}-${source.url}`"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}<ExternalLink :size="12" /></a><span>查核 {{ source.checkedAt }}</span></li></ul>
          </section>
        </div>

        <footer class="detail-footer">
          <button type="button" :class="{ active: favorite }" :aria-pressed="favorite" @click="$emit('toggle-favorite', restaurant.id)"><Heart :size="18" :fill="favorite ? 'currentColor' : 'none'" />{{ favorite ? '已收藏' : '收藏餐廳' }}</button>
          <button type="button" :class="{ active: wishlisted }" :aria-pressed="wishlisted" @click="$emit('toggle-wishlist', restaurant.id)"><Bookmark :size="18" :fill="wishlisted ? 'currentColor' : 'none'" />{{ wishlisted ? '已加入想去' : '加入想去清單' }}</button>
        </footer>
      </article>
    </div>
  </Teleport>
</template>
