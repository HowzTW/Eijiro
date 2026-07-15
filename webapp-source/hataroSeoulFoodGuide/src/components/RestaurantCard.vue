<script setup>
import { Bookmark, Heart, MapPin, Sparkles } from 'lucide-vue-next'
import { formatKrw, statusLabels, teamLabels } from '../utils/restaurants'

defineProps({
  restaurant: { type: Object, required: true },
  favorite: Boolean,
  wishlisted: Boolean,
})

defineEmits(['open', 'toggle-favorite', 'toggle-wishlist'])
</script>

<template>
  <article class="restaurant-card" :class="{ 'restaurant-card--closed': restaurant.restaurant.status !== 'open' }">
    <div class="restaurant-card__topline">
      <div class="tag-row">
        <span class="pill">第 {{ restaurant.chef.season }} 季</span>
        <span class="pill" :class="`pill--${restaurant.chef.team}`">{{ teamLabels[restaurant.chef.team] }}</span>
        <span v-if="restaurant.restaurant.status !== 'open'" class="status-pill">{{ statusLabels[restaurant.restaurant.status] }}</span>
      </div>
      <button
        class="icon-button"
        :class="{ active: favorite }"
        type="button"
        :aria-label="favorite ? `取消收藏 ${restaurant.name.zhTw}` : `收藏 ${restaurant.name.zhTw}`"
        :aria-pressed="favorite"
        @click="$emit('toggle-favorite', restaurant.id)"
      ><Heart :size="19" :fill="favorite ? 'currentColor' : 'none'" /></button>
    </div>

    <button class="restaurant-card__main" type="button" @click="$emit('open', restaurant)">
      <span class="restaurant-card__names">
        <strong>{{ restaurant.name.zhTw }}</strong>
        <span lang="ko">{{ restaurant.name.ko }}</span>
      </span>
      <span class="restaurant-card__chef">
        主廚 {{ restaurant.chef.nameZhTw }}
        <template v-if="restaurant.chef.showNickname?.zhTw"> · {{ restaurant.chef.showNickname.zhTw }}</template>
      </span>
      <span class="restaurant-card__meta">
        <span><MapPin :size="15" />{{ restaurant.restaurant.district.zhTw }}</span>
        <span>{{ restaurant.restaurant.cuisine.slice(0, 2).join(' · ') }}</span>
      </span>
    </button>

    <div class="score-strip">
      <span class="tier" :class="`tier--${restaurant.recommendation.priorityTier.toLowerCase()}`">{{ restaurant.recommendation.priorityTier }}</span>
      <div><strong>{{ restaurant.recommendation.hataroScore }}</strong><small>/ 5 哈太郎推薦</small></div>
      <div class="price-level" :aria-label="`價格等級 ${restaurant.pricing.priceLevel} 級`">
        <span v-for="level in 5" :key="level" :class="{ active: level <= restaurant.pricing.priceLevel }">₩</span>
      </div>
    </div>

    <p class="restaurant-card__comment">「{{ restaurant.recommendation.eijiroComment }}」</p>

    <div class="restaurant-card__flags">
      <span v-if="restaurant.recommendation.worthDetour"><Sparkles :size="15" />值得專程前往</span>
      <span>{{ formatKrw(restaurant.pricing.averagePerPersonKrw) }}／人</span>
    </div>

    <div v-if="restaurant.recommendation.cautions.length" class="caution-preview">
      注意：{{ restaurant.recommendation.cautions.slice(0, 2).join('、') }}
    </div>

    <div class="restaurant-card__actions">
      <button class="text-button" type="button" @click="$emit('open', restaurant)">查看詳情</button>
      <button
        class="wishlist-button"
        :class="{ active: wishlisted }"
        type="button"
        :aria-pressed="wishlisted"
        @click="$emit('toggle-wishlist', restaurant.id)"
      ><Bookmark :size="17" :fill="wishlisted ? 'currentColor' : 'none'" />{{ wishlisted ? '已加入想去' : '加入想去' }}</button>
    </div>
  </article>
</template>
