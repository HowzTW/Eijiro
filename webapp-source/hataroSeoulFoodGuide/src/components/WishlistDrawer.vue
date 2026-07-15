<script setup>
import { Bookmark, MapPin, Trash2, X } from 'lucide-vue-next'

defineProps({
  open: Boolean,
  groups: { type: Array, required: true },
  count: { type: Number, required: true },
})

defineEmits(['close', 'open-restaurant', 'remove', 'clear'])
</script>

<template>
  <Teleport to="body">
    <button v-if="open" class="drawer-backdrop" type="button" aria-label="關閉想去清單" @click="$emit('close')"></button>
    <aside v-if="open" class="wishlist-drawer" role="dialog" aria-modal="true" aria-labelledby="wishlist-title" @keydown.esc="$emit('close')">
      <header>
        <div><small>MY SEOUL TABLE</small><h2 id="wishlist-title">想去清單 <span>{{ count }}</span></h2></div>
        <button class="icon-button" type="button" aria-label="關閉想去清單" @click="$emit('close')"><X /></button>
      </header>

      <div v-if="count === 0" class="wishlist-empty">
        <Bookmark :size="34" />
        <h3>旅程還有空位</h3>
        <p>從餐廳卡片加入想去的店，這裡會依行政區自動整理。</p>
      </div>

      <div v-else class="wishlist-groups">
        <section v-for="group in groups" :key="group.district">
          <h3><MapPin :size="15" />{{ group.district }}<span>{{ group.items.length }}</span></h3>
          <article v-for="restaurant in group.items" :key="restaurant.id">
            <button class="wishlist-item__main" type="button" @click="$emit('open-restaurant', restaurant)">
              <strong>{{ restaurant.name.zhTw }}</strong><span lang="ko">{{ restaurant.name.ko }}</span>
              <small>{{ restaurant.restaurant.neighborhood?.zhTw || restaurant.restaurant.district.zhTw }} · {{ restaurant.restaurant.cuisine[0] }}</small>
            </button>
            <button class="wishlist-item__remove" type="button" :aria-label="`從想去清單移除 ${restaurant.name.zhTw}`" @click="$emit('remove', restaurant.id)"><Trash2 :size="17" /></button>
          </article>
        </section>
      </div>

      <footer v-if="count"><button type="button" @click="$emit('clear')"><Trash2 :size="16" />清空想去清單</button></footer>
    </aside>
  </Teleport>
</template>
