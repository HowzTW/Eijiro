<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown, Bookmark, Heart, MapPin, Search, SlidersHorizontal, Sparkles, UtensilsCrossed } from 'lucide-vue-next'
import EmptyState from './components/EmptyState.vue'
import FilterPanel from './components/FilterPanel.vue'
import LoadingState from './components/LoadingState.vue'
import RestaurantCard from './components/RestaurantCard.vue'
import RestaurantDetail from './components/RestaurantDetail.vue'
import WishlistDrawer from './components/WishlistDrawer.vue'
import { useStoredSet } from './composables/useStoredSet'
import { loadRestaurantData } from './services/restaurantData'
import { filterRestaurants, sortOptions, sortRestaurants } from './utils/restaurants'

const defaultFilters = {
  search: '', season: '', team: '', district: '', cuisine: '', priceLevel: '', tier: '',
  soloFriendly: false, fineDining: false, alcohol: false, showHistorical: false, favoritesOnly: false,
}

const data = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const filters = reactive({ ...defaultFilters })
const sortBy = ref('score')
const filterOpen = ref(false)
const wishlistOpen = ref(false)
const selectedRestaurant = ref(null)
const { values: favorites, toggle: toggleFavorite } = useStoredSet('hataro:favorites:v1')
const { values: wishlist, toggle: toggleWishlist, remove: removeWishlist, clear: clearWishlist } = useStoredSet('hataro:wishlist:v1')

const restaurants = computed(() => data.value?.restaurants || [])
const metadata = computed(() => data.value?.metadata || {})
const openRestaurants = computed(() => restaurants.value.filter((item) => item.restaurant.status === 'open'))
const seasonOneCount = computed(() => openRestaurants.value.filter((item) => item.chef.season === 1).length)
const seasonTwoCount = computed(() => openRestaurants.value.filter((item) => item.chef.season === 2).length)
const filterOptions = computed(() => ({
  districts: [...new Set(restaurants.value.map((item) => item.restaurant.district.zhTw))].sort((a, b) => a.localeCompare(b, 'zh-TW')),
  cuisines: [...new Set(restaurants.value.flatMap((item) => item.restaurant.cuisine))].sort((a, b) => a.localeCompare(b, 'zh-TW')),
}))
const filteredRestaurants = computed(() => sortRestaurants(filterRestaurants(restaurants.value, filters, favorites.value), sortBy.value))
const featuredRestaurants = computed(() => sortRestaurants(openRestaurants.value.filter((item) => item.recommendation.priorityTier === 'S'), 'score').slice(0, 4))
const activeFilterCount = computed(() => Object.entries(filters).filter(([key, value]) => key !== 'search' && key !== 'showHistorical' && Boolean(value)).length)
const wishlistRestaurants = computed(() => restaurants.value.filter((item) => wishlist.value.has(item.id)))
const wishlistGroups = computed(() => {
  const groups = new Map()
  wishlistRestaurants.value.forEach((item) => {
    const district = item.restaurant.district.zhTw
    if (!groups.has(district)) groups.set(district, [])
    groups.get(district).push(item)
  })
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-TW')).map(([district, items]) => ({ district, items }))
})

async function fetchData() {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await loadRestaurantData()
    syncRestaurantFromUrl()
  } catch (error) {
    errorMessage.value = error?.message || '餐廳資料目前無法載入。'
  } finally {
    loading.value = false
  }
}

function changeFilter(key, value) {
  filters[key] = value
}

function resetFilters() {
  Object.assign(filters, defaultFilters)
  sortBy.value = 'score'
  filterOpen.value = false
}

function openRestaurant(restaurant, { replace = false } = {}) {
  selectedRestaurant.value = restaurant
  wishlistOpen.value = false
  const url = new URL(window.location.href)
  url.searchParams.set('restaurant', restaurant.id)
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
}

function closeRestaurant({ fromPopState = false } = {}) {
  selectedRestaurant.value = null
  if (!fromPopState) {
    const url = new URL(window.location.href)
    url.searchParams.delete('restaurant')
    window.history.pushState({}, '', url)
  }
}

function syncRestaurantFromUrl() {
  const id = new URL(window.location.href).searchParams.get('restaurant')
  selectedRestaurant.value = id ? restaurants.value.find((item) => item.id === id) || null : null
}

function handlePopState() {
  syncRestaurantFromUrl()
}

function scrollToExplorer() {
  document.querySelector('#restaurant-explorer')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function confirmClearWishlist() {
  if (window.confirm('確定要清空整份想去清單嗎？')) clearWishlist()
}

watch([selectedRestaurant, wishlistOpen, filterOpen], ([detail, drawer, mobileFilter]) => {
  document.body.classList.toggle('no-scroll', Boolean(detail || drawer || mobileFilter))
})

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  fetchData()
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState)
  document.body.classList.remove('no-scroll')
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="哈太郎首爾美食指南首頁">
        <span class="brand__mark" aria-hidden="true">하</span>
        <span><strong>Hatarō</strong><small>SEOUL FOOD PILGRIMAGE</small></span>
      </a>
      <nav aria-label="主要導覽">
        <button type="button" @click="scrollToExplorer">探索餐廳</button>
        <button type="button" :aria-label="`開啟想去清單，目前 ${wishlist.size} 間`" @click="wishlistOpen = true"><Bookmark :size="18" />想去清單<span class="nav-count">{{ wishlist.size }}</span></button>
      </nav>
    </header>

    <main>
      <section class="home-hero">
        <div class="home-hero__stamp" aria-hidden="true"><span>서울</span><small>SEOUL</small></div>
        <div class="home-hero__copy">
          <p class="eyebrow">CULINARY CLASS WARS · SEOUL GUIDE</p>
          <h1>哈太郎首爾<br /><em>美食朝聖指南</em></h1>
          <p class="home-hero__subtitle">《黑白大廚篇》</p>
          <p class="home-hero__intro">從精緻餐桌到一碗暖湯，整理節目主廚在首爾留下的味道。依你的預算、地區與旅程節奏，找到真正值得排進行程的一席。</p>
          <button class="hero-button" type="button" @click="scrollToExplorer">開始探索 <ArrowDown :size="17" /></button>
        </div>
        <div class="home-hero__visual" aria-hidden="true">
          <span class="route-line"></span>
          <div class="guide-card guide-card--one"><small>01</small><strong>SEOUL</strong><span>37.5665° N</span></div>
          <div class="guide-card guide-card--two"><UtensilsCrossed /><strong>黑白大廚</strong><span>兩季餐桌筆記</span></div>
          <div class="hero-seal"><span>맛</span><small>選店手帖</small></div>
        </div>
      </section>

      <section v-if="!loading && !errorMessage" class="guide-stats" aria-label="指南摘要">
        <article><strong>{{ openRestaurants.length }}</strong><span>間目前營業</span><small>SEOUL TABLES</small></article>
        <article><strong>{{ seasonOneCount }}</strong><span>第一季餐廳</span><small>SEASON 01</small></article>
        <article><strong>{{ seasonTwoCount }}</strong><span>第二季餐廳</span><small>SEASON 02</small></article>
        <article><strong>{{ featuredRestaurants.length }}</strong><span>本冊精選</span><small>EDITOR'S PICKS</small></article>
      </section>

      <LoadingState v-if="loading" />

      <section v-else-if="errorMessage" class="error-state" role="alert">
        <span>!</span><h2>指南暫時翻不開</h2><p>{{ errorMessage }}</p><button class="primary-button" type="button" @click="fetchData">重新載入</button>
      </section>

      <template v-else>
        <section class="featured-section">
          <div class="section-heading">
            <div><p class="eyebrow">HATARO'S SHORTLIST</p><h2>值得專程前往的四席</h2></div>
            <p>從料理完整度、首爾獨特性與旅程價值中選出。</p>
          </div>
          <div class="featured-grid">
            <button v-for="(restaurant, index) in featuredRestaurants" :key="restaurant.id" type="button" @click="openRestaurant(restaurant)">
              <span class="featured-grid__number">0{{ index + 1 }}</span>
              <span class="featured-grid__tier">{{ restaurant.recommendation.priorityTier }}</span>
              <strong>{{ restaurant.name.zhTw }}</strong>
              <span lang="ko">{{ restaurant.name.ko }}</span>
              <small><MapPin :size="13" />{{ restaurant.restaurant.district.zhTw }} · {{ restaurant.restaurant.cuisine[0] }}</small>
            </button>
          </div>
        </section>

        <section id="restaurant-explorer" class="explorer-section">
          <div class="section-heading section-heading--explorer">
            <div><p class="eyebrow">PLAN YOUR SEOUL TABLE</p><h2>探索餐廳</h2></div>
            <p>預設隱藏已歇業餐廳。價格與訂位資訊請以店家即時公告為準。</p>
          </div>

          <div class="explorer-toolbar">
            <label class="search-field"><Search :size="20" /><span class="sr-only">搜尋餐廳</span><input v-model="filters.search" type="search" placeholder="搜尋餐廳、主廚或節目稱號" /></label>
            <button class="mobile-filter-button" type="button" @click="filterOpen = true"><SlidersHorizontal :size="18" />篩選條件<span v-if="activeFilterCount">{{ activeFilterCount }}</span></button>
            <label class="sort-field"><span>排序</span><select v-model="sortBy"><option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          </div>

          <div class="explorer-layout">
            <FilterPanel :filters="filters" :options="filterOptions" :mobile-open="filterOpen" @change="changeFilter" @reset="resetFilters" @close="filterOpen = false" />
            <div class="results-column">
              <div class="results-summary" aria-live="polite"><p>找到 <strong>{{ filteredRestaurants.length }}</strong> 間餐廳</p><span v-if="activeFilterCount">已套用 {{ activeFilterCount }} 項條件</span></div>
              <div v-if="filteredRestaurants.length" class="restaurant-grid">
                <RestaurantCard
                  v-for="restaurant in filteredRestaurants"
                  :key="restaurant.id"
                  :restaurant="restaurant"
                  :favorite="favorites.has(restaurant.id)"
                  :wishlisted="wishlist.has(restaurant.id)"
                  @open="openRestaurant"
                  @toggle-favorite="toggleFavorite"
                  @toggle-wishlist="toggleWishlist"
                />
              </div>
              <EmptyState v-else @reset="resetFilters" />
            </div>
          </div>
        </section>
      </template>
    </main>

    <footer class="site-footer">
      <div class="brand"><span class="brand__mark" aria-hidden="true">하</span><span><strong>Hatarō</strong><small>SEOUL FOOD PILGRIMAGE</small></span></div>
      <p>資料版本 {{ metadata.version || '—' }} · 查核日期 {{ metadata.lastUpdated || '—' }}<br />營業、價格及訂位狀況可能變動，出發前請再次確認。</p>
    </footer>

    <button class="wishlist-fab" type="button" :aria-label="`開啟想去清單，目前 ${wishlist.size} 間`" @click="wishlistOpen = true"><Bookmark :size="20" :fill="wishlist.size ? 'currentColor' : 'none'" /><span>想去清單</span><strong>{{ wishlist.size }}</strong></button>

    <RestaurantDetail
      v-if="selectedRestaurant"
      :restaurant="selectedRestaurant"
      :favorite="favorites.has(selectedRestaurant.id)"
      :wishlisted="wishlist.has(selectedRestaurant.id)"
      @close="closeRestaurant"
      @toggle-favorite="toggleFavorite"
      @toggle-wishlist="toggleWishlist"
    />
    <WishlistDrawer
      :open="wishlistOpen"
      :groups="wishlistGroups"
      :count="wishlist.size"
      @close="wishlistOpen = false"
      @open-restaurant="openRestaurant"
      @remove="removeWishlist"
      @clear="confirmClearWishlist"
    />
  </div>
</template>
