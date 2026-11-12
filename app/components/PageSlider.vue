<script setup lang="ts">
import { useEventListener, usePointerSwipe } from '@vueuse/core'
import { createWheelGesture, lockGestureAxis, normalizeWheelDelta, swipePage, type GestureAxis } from '~/utils/page-gestures'

const props = defineProps<{
  pageCount: number
  activeIndex: number
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:activeIndex': [index: number] }>()

const dragOffset = ref(0)
const dragging = ref(false)
const settling = ref(false)
let settleTimer: ReturnType<typeof setTimeout> | undefined
const slider = ref<HTMLElement>()
let pointerId: number | undefined
let axis: GestureAxis = 'pending'
let suppressClick = false
const wheelGesture = createWheelGesture()

function beginSettle() {
  settling.value = true
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => { settling.value = false }, 360)
}

watch(() => props.activeIndex, beginSettle)

onBeforeUnmount(() => clearTimeout(settleTimer))

function isVisible(index: number) {
  if (index === props.activeIndex) return true
  if (dragging.value) return Math.abs(index - props.activeIndex) <= 1
  if (settling.value) return true
  return false
}

function excludedTarget(target: EventTarget | null, pointer: boolean) {
  if (!(target instanceof Element)) return true
  const selector = 'input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]'
  if (target.closest(pointer ? `${selector}, a, button` : selector)) return true
  for (let node: Element | null = target; node && node !== slider.value; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return true
  }
  return false
}

function cancelPointer() {
  const wasDragging = dragging.value
  pointerId = undefined
  axis = 'pending'
  dragging.value = false
  dragOffset.value = 0
  if (wasDragging) beginSettle()
}

// Register before VueUse: excluded controls must not acquire pointer capture.
useEventListener(slider, 'pointerdown', (event) => {
  suppressClick = false
  if (!event.isPrimary) {
    cancelPointer()
    event.stopImmediatePropagation()
  } else if (props.disabled || props.pageCount < 2 || event.button !== 0 || excludedTarget(event.target, true)) {
    event.stopImmediatePropagation()
  }
})

const swipe = usePointerSwipe(slider, {
  threshold: 8,
  onSwipeStart(event) {
    pointerId = event.pointerId
    suppressClick = false
    axis = 'pending'
    wheelGesture.reset()
  },
  onSwipe(event) {
    if (props.disabled || event.pointerId !== pointerId) return
    axis = lockGestureAxis(axis, swipe.distanceX.value, swipe.distanceY.value)
    if (axis !== 'horizontal') return
    dragging.value = true
    suppressClick = true
    const offset = -swipe.distanceX.value
    const atEdge = (props.activeIndex === 0 && offset > 0)
      || (props.activeIndex === props.pageCount - 1 && offset < 0)
    dragOffset.value = atEdge ? offset * 0.35 : offset
  },
  onSwipeEnd(event) {
    if (event.pointerId !== pointerId) return
    const next = swipePage(props.activeIndex, props.pageCount, swipe.distanceX.value,
      Math.min(80, (slider.value?.clientWidth ?? 0) * 0.18),
      event.type !== 'pointerup' || axis !== 'horizontal' || Boolean(props.disabled))
    cancelPointer()
    if (next !== props.activeIndex) emit('update:activeIndex', next)
  }
})

// VueUse defaults to pan-y; retain native pinch zoom as well.
onMounted(() => slider.value?.style.setProperty('touch-action', 'pan-y pinch-zoom'))

useEventListener(slider, ['pointerup', 'pointercancel', 'lostpointercapture'], (event) => {
  if (event.pointerId === pointerId) cancelPointer()
})
// Prevent a completed drag from activating a clickable ancestor.
useEventListener(slider, 'click', (event) => {
  if (suppressClick) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }
}, { capture: true })

useEventListener(slider, 'wheel', (event) => {
  if (props.disabled || props.pageCount < 2 || pointerId !== undefined
    || event.ctrlKey || event.metaKey || excludedTarget(event.target, false)) {
    wheelGesture.reset()
    return
  }
  const width = slider.value?.clientWidth ?? 0
  const height = slider.value?.clientHeight ?? 0
  const lineSize = Number.parseFloat(getComputedStyle(slider.value!).lineHeight) || 16
  const result = wheelGesture.push(
    normalizeWheelDelta(event.deltaX, event.deltaMode, width, lineSize),
    normalizeWheelDelta(event.deltaY, event.deltaMode, height, lineSize), performance.now())
  if (!result.handled) return
  event.preventDefault()
  if (result.direction) {
    const next = swipePage(props.activeIndex, props.pageCount, result.direction, 1)
    if (next !== props.activeIndex) emit('update:activeIndex', next)
  }
}, { passive: false })

watch(() => props.disabled, () => {
  cancelPointer()
  wheelGesture.reset()
})

const trackStyle = computed(() => ({
  transform: `translate3d(calc(${-props.activeIndex * 100}% + ${dragOffset.value}px), 0, 0)`,
  transition: dragging.value ? 'none' : undefined
}))
</script>

<template>
  <div ref="slider" class="page-slider">
    <div class="page-slider__track" :class="{ 'page-slider__track--dragging': dragging }" :style="trackStyle">
      <slot :is-visible="isVisible" />
    </div>
  </div>
</template>
