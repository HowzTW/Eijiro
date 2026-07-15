<script setup>
import { RotateCcw, X } from 'lucide-vue-next'

defineProps({
  filters: { type: Object, required: true },
  options: { type: Object, required: true },
  mobileOpen: Boolean,
})

defineEmits(['change', 'reset', 'close'])
</script>

<template>
  <button v-if="mobileOpen" class="filter-backdrop" type="button" aria-label="關閉篩選條件" @click="$emit('close')"></button>
  <aside class="filter-panel" :class="{ 'filter-panel--open': mobileOpen }" aria-label="餐廳篩選條件">
    <div class="filter-panel__heading">
      <div><small>REFINE YOUR TRIP</small><h2>篩選餐廳</h2></div>
      <button class="filter-panel__close" type="button" aria-label="關閉篩選條件" @click="$emit('close')"><X /></button>
    </div>

    <label class="field-label">季別
      <select :value="filters.season" @change="$emit('change', 'season', $event.target.value)">
        <option value="">全部季別</option><option value="1">第一季</option><option value="2">第二季</option>
      </select>
    </label>
    <label class="field-label">廚師陣營
      <select :value="filters.team" @change="$emit('change', 'team', $event.target.value)">
        <option value="">黑、白湯匙皆顯示</option><option value="black-spoon">黑湯匙</option><option value="white-spoon">白湯匙</option>
      </select>
    </label>
    <label class="field-label">行政區
      <select :value="filters.district" @change="$emit('change', 'district', $event.target.value)">
        <option value="">全部行政區</option><option v-for="item in options.districts" :key="item" :value="item">{{ item }}</option>
      </select>
    </label>
    <label class="field-label">料理類型
      <select :value="filters.cuisine" @change="$emit('change', 'cuisine', $event.target.value)">
        <option value="">全部料理</option><option v-for="item in options.cuisines" :key="item" :value="item">{{ item }}</option>
      </select>
    </label>

    <div class="filter-row">
      <label class="field-label">價格
        <select :value="filters.priceLevel" @change="$emit('change', 'priceLevel', $event.target.value)">
          <option value="">全部</option><option v-for="level in 5" :key="level" :value="level">{{ '₩'.repeat(level) }}</option>
        </select>
      </label>
      <label class="field-label">推薦級別
        <select :value="filters.tier" @change="$emit('change', 'tier', $event.target.value)">
          <option value="">全部</option><option v-for="tier in ['S','A','B','C']" :key="tier" :value="tier">{{ tier }} 級</option>
        </select>
      </label>
    </div>

    <fieldset class="toggle-list">
      <legend>用餐偏好</legend>
      <label><input type="checkbox" :checked="filters.soloFriendly" @change="$emit('change', 'soloFriendly', $event.target.checked)" /><span>適合一人用餐</span></label>
      <label><input type="checkbox" :checked="filters.fineDining" @change="$emit('change', 'fineDining', $event.target.checked)" /><span>Fine Dining</span></label>
      <label><input type="checkbox" :checked="filters.alcohol" @change="$emit('change', 'alcohol', $event.target.checked)" /><span>酒類／傳統酒搭配</span></label>
      <label><input type="checkbox" :checked="filters.showHistorical" @change="$emit('change', 'showHistorical', $event.target.checked)" /><span>顯示歷史名店</span></label>
      <label><input type="checkbox" :checked="filters.favoritesOnly" @change="$emit('change', 'favoritesOnly', $event.target.checked)" /><span>只顯示收藏</span></label>
    </fieldset>

    <button class="reset-button" type="button" @click="$emit('reset')"><RotateCcw :size="16" />清除所有篩選</button>
  </aside>
</template>
