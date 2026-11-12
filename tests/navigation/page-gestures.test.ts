import { describe, expect, test } from 'bun:test'
import { createWheelGesture, lockGestureAxis, normalizeWheelDelta, swipePage } from '../../app/utils/page-gestures'

describe('page gestures', () => {
  test('locks direction once intent is clear', () => {
    expect(lockGestureAxis('pending', 5, 3)).toBe('pending')
    expect(lockGestureAxis('pending', 20, 10)).toBe('horizontal')
    const vertical = lockGestureAxis('pending', 5, 20)
    expect(vertical).toBe('vertical')
    expect(lockGestureAxis(vertical, 200, 25)).toBe('vertical')
  })

  test('pointer threshold, direction, cancellation and page boundaries', () => {
    expect(swipePage(1, 3, 79, 80)).toBe(1)
    expect(swipePage(1, 3, 80, 80)).toBe(2)
    expect(swipePage(1, 3, -80, 80)).toBe(0)
    expect(swipePage(1, 3, 150, 80, true)).toBe(1)
    expect(swipePage(0, 3, -150, 80)).toBe(0)
    expect(swipePage(2, 3, 150, 80)).toBe(2)
    expect(swipePage(0, 1, 150, 80)).toBe(0)
    expect(swipePage(0, 3, 58, 320 * .18)).toBe(1)
  })

  test('normalizes pixel, line and page wheel units', () => {
    expect(normalizeWheelDelta(4, 0, 1000)).toBe(4)
    expect(normalizeWheelDelta(-4, 1, 1000, 20)).toBe(-80)
    expect(normalizeWheelDelta(1, 2, 1000)).toBe(1000)
  })

  test('accumulates small trackpad deltas', () => {
    const gesture = createWheelGesture()
    for (let i = 0; i < 39; i++) expect(gesture.push(2, 0, i * 10).direction).toBe(0)
    expect(gesture.push(2, 0, 390).direction).toBe(1)
  })

  test('one switch per gesture including long momentum tails', () => {
    const gesture = createWheelGesture()
    expect(gesture.push(40, 1, 0).direction).toBe(0)
    expect(gesture.push(40, 1, 10).direction).toBe(1)
    for (let time = 100; time <= 1000; time += 100) {
      expect(gesture.push(100, 0, time)).toEqual({ handled: true, direction: 0 })
    }
    expect(gesture.push(-80, 0, 1200).direction).toBe(-1)
  })

  test('vertical scroll remains vertical even if it later drifts sideways', () => {
    const gesture = createWheelGesture()
    expect(gesture.push(0, 30, 0).handled).toBe(false)
    expect(gesture.push(100, 5, 30)).toEqual({ handled: false, direction: 0 })
    expect(gesture.push(80, 0, 230).direction).toBe(1)
  })

  test('reversal and explicit reset discard accumulated movement', () => {
    const gesture = createWheelGesture()
    gesture.push(60, 0, 0)
    expect(gesture.push(-60, 0, 20).direction).toBe(0)
    expect(gesture.push(-20, 0, 40).direction).toBe(-1)
    gesture.reset()
    expect(gesture.push(80, 0, 50).direction).toBe(1)
  })
})
