<template>
  <div class="loading-grid" role="status" aria-live="polite" aria-label="正在載入韓語筆記">
    <div v-for="item in 6" :key="item" class="loading-card">
      <span></span><strong></strong><i></i><i></i>
    </div>
  </div>
</template>
