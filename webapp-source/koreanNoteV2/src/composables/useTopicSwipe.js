export function useTopicSwipe(onPrevious, onNext) {
  let startX = 0
  let startY = 0
  let tracking = false

  function isInteractive(target) {
    return target instanceof Element && Boolean(target.closest('button, a, input, select, textarea, [data-no-swipe]'))
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1 || isInteractive(event.target)) return
    startX = event.touches[0].clientX
    startY = event.touches[0].clientY
    tracking = true
  }

  function onTouchEnd(event) {
    if (!tracking || event.changedTouches.length !== 1) return
    tracking = false
    const deltaX = event.changedTouches[0].clientX - startX
    const deltaY = event.changedTouches[0].clientY - startY

    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return
    if (deltaX > 0) onPrevious()
    else onNext()
  }

  function onTouchCancel() {
    tracking = false
  }

  return { onTouchStart, onTouchEnd, onTouchCancel }
}
