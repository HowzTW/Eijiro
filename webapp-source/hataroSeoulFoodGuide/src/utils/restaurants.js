export const statusLabels = {
  open: '營業中',
  'temporarily-closed': '暫停營業',
  closed: '已歇業',
  upcoming: '即將開幕',
  unknown: '狀態待確認',
}

export const teamLabels = {
  'white-spoon': '白湯匙',
  'black-spoon': '黑湯匙',
}

export const sortOptions = [
  { value: 'score', label: '推薦分數' },
  { value: 'price-asc', label: '價格：低至高' },
  { value: 'price-desc', label: '價格：高至低' },
  { value: 'booking', label: '訂位難度' },
  { value: 'name', label: '餐廳名稱' },
]

export function formatKrw(value) {
  if (value == null) return '尚待確認'
  return `約 ₩${new Intl.NumberFormat('zh-TW').format(value)}`
}

export function getSearchText(item) {
  return [
    ...Object.values(item.name || {}),
    item.chef?.nameZhTw,
    item.chef?.nameKo,
    item.chef?.nameEn,
    ...Object.values(item.chef?.showNickname || {}),
    item.restaurant?.district?.zhTw,
    item.restaurant?.neighborhood?.zhTw,
    ...(item.restaurant?.cuisine || []),
    ...(item.tags || []),
  ].filter(Boolean).join(' ').toLocaleLowerCase('zh-TW')
}

export function filterRestaurants(restaurants, filters, favorites) {
  const keyword = filters.search.trim().toLocaleLowerCase('zh-TW')

  return restaurants.filter((item) => {
    if (!filters.showHistorical && item.restaurant.status !== 'open') return false
    if (filters.favoritesOnly && !favorites.has(item.id)) return false
    if (keyword && !getSearchText(item).includes(keyword)) return false
    if (filters.season && item.chef.season !== Number(filters.season)) return false
    if (filters.team && item.chef.team !== filters.team) return false
    if (filters.district && item.restaurant.district.zhTw !== filters.district) return false
    if (filters.cuisine && !item.restaurant.cuisine.includes(filters.cuisine)) return false
    if (filters.priceLevel && item.pricing.priceLevel !== Number(filters.priceLevel)) return false
    if (filters.tier && item.recommendation.priorityTier !== filters.tier) return false
    if (filters.soloFriendly && item.features.soloFriendly !== true) return false
    if (filters.fineDining && item.features.fineDining !== true) return false
    if (filters.alcohol && item.features.alcoholPairing !== true && item.features.traditionalLiquor !== true) return false
    return true
  })
}

export function sortRestaurants(restaurants, sortBy) {
  return [...restaurants].sort((left, right) => {
    if (sortBy === 'price-asc') return (left.pricing.averagePerPersonKrw ?? Infinity) - (right.pricing.averagePerPersonKrw ?? Infinity)
    if (sortBy === 'price-desc') return (right.pricing.averagePerPersonKrw ?? -1) - (left.pricing.averagePerPersonKrw ?? -1)
    if (sortBy === 'booking') return right.booking.bookingDifficulty - left.booking.bookingDifficulty
    if (sortBy === 'name') return left.name.zhTw.localeCompare(right.name.zhTw, 'zh-TW')
    return right.recommendation.hataroScore - left.recommendation.hataroScore
      || left.recommendation.priorityTier.localeCompare(right.recommendation.priorityTier)
  })
}
