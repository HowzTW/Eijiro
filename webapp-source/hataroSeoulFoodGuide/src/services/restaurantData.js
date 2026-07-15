export async function loadRestaurantData() {
  const module = await import('../../data-source/restaurants.json')
  const payload = module.default

  if (!payload?.metadata || !Array.isArray(payload?.restaurants)) {
    throw new Error('餐廳資料格式不正確')
  }

  const uniqueIds = new Set(payload.restaurants.map((restaurant) => restaurant.id))
  if (uniqueIds.size !== payload.restaurants.length) {
    throw new Error('餐廳資料包含重複 ID')
  }

  return payload
}
