export type GestureAxis = 'pending' | 'horizontal' | 'vertical'

export function lockGestureAxis(axis: GestureAxis, x: number, y: number): GestureAxis {
  if (axis !== 'pending' || Math.max(Math.abs(x), Math.abs(y)) < 8) return axis
  return Math.abs(x) > Math.abs(y) ? 'horizontal' : 'vertical'
}

// Positive distance means moving towards the next page (leftward pointer swipe).
export function swipePage(index: number, count: number, distance: number, threshold: number, cancelled = false) {
  if (cancelled || Math.abs(distance) < threshold) return index
  return Math.max(0, Math.min(count - 1, index + Math.sign(distance)))
}

export function normalizeWheelDelta(delta: number, mode: number, pageSize: number, lineSize = 16) {
  return delta * (mode === 1 ? lineSize : mode === 2 ? pageSize : 1)
}

export function createWheelGesture() {
  let lastTime = -Infinity
  let distance = 0
  let consumed = false
  let initialX = 0
  let initialY = 0
  let axis: GestureAxis = 'pending'
  return {
    reset() {
      lastTime = -Infinity
      distance = 0
      consumed = false
      initialX = 0
      initialY = 0
      axis = 'pending'
    },
    push(x: number, y: number, now: number) {
      if (now - lastTime >= 200) this.reset()
      lastTime = now
      initialX += x
      initialY += y
      const previousAxis = axis
      axis = lockGestureAxis(axis, initialX, initialY)
      if (axis !== 'horizontal') return { handled: false, direction: 0 }
      if (consumed) return { handled: true, direction: 0 }
      if (previousAxis === 'pending') distance = initialX - x
      if (Math.sign(x) !== Math.sign(distance)) distance = 0
      distance += x
      if (Math.abs(distance) < 80) return { handled: true, direction: 0 }
      consumed = true
      return { handled: true, direction: Math.sign(distance) }
    }
  }
}
