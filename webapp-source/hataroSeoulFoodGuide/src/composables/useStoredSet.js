import { ref, watch } from 'vue'

export function useStoredSet(key) {
  const values = ref(new Set())

  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    if (Array.isArray(saved)) values.value = new Set(saved)
  } catch {
    values.value = new Set()
  }

  watch(values, (next) => {
    try {
      localStorage.setItem(key, JSON.stringify([...next]))
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, { deep: true })

  function toggle(id) {
    const next = new Set(values.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    values.value = next
  }

  function remove(id) {
    const next = new Set(values.value)
    next.delete(id)
    values.value = next
  }

  function clear() {
    values.value = new Set()
  }

  return { values, toggle, remove, clear }
}
