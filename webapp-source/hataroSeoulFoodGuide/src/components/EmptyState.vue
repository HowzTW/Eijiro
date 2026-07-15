<script setup>
import { SearchX } from 'lucide-vue-next'
defineEmits(['reset'])
</script>

<template>
  <div class="empty-state" role="status">
    <SearchX :size="34" />
    <h3>這次沒有找到合適的餐廳</h3>
    <p>試著放寬地區、價位或料理條件，首爾還有很多值得探索的選擇。</p>
    <button class="primary-button" type="button" @click="$emit('reset')">清除篩選</button>
  </div>
</template>
