import type { CalendarEvent, CalendarInfo } from '../../../shared/calendar'
import { OverloadError } from './client'

const STALE_MAX_AGE_MS = 10 * 60_000
const ERROR_BACKOFF_MS = 10_000
const DEFAULT_MAX_ENTRIES = 256
const DEFAULT_MAX_PARALLEL = 4
const DEFAULT_MAX_QUEUE = 8
const DEFAULT_UPSTREAM_PER_MINUTE = 120
const DEFAULT_MAX_IDENTITIES = 1000

export interface CachedEvents {
  events: CalendarEvent[]
  fetchedAt: number
}

export interface CalendarCacheOptions {
  ttlMs: number
  now?: () => number
  maxEntries?: number
  maxParallel?: number
  maxQueue?: number
  upstreamPerMinute?: number
}

interface CacheRecord {
  events: CalendarEvent[]
  fetchedAt: number
  expiresAt: number
  staleUntil: number
}

export class CalendarCache {
  private readonly records = new Map<string, CacheRecord>()
  private readonly pending = new Map<string, Promise<unknown>>()
  private readonly errors = new Map<string, number>()
  private readonly upstreamHits: number[] = []
  private active = 0
  private readonly queue: Array<() => void> = []
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly maxEntries: number
  private readonly maxParallel: number
  private readonly maxQueue: number
  private readonly upstreamPerMinute: number

  constructor(options: CalendarCacheOptions) {
    this.ttlMs = options.ttlMs
    this.now = options.now ?? (() => Date.now())
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.maxParallel = options.maxParallel ?? DEFAULT_MAX_PARALLEL
    this.maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE
    this.upstreamPerMinute = options.upstreamPerMinute ?? DEFAULT_UPSTREAM_PER_MINUTE
  }

  key(generation: string, calendarId: string, start: string, end: string): string {
    return `${generation}::${calendarId}::${start}::${end}`
  }

  getFresh(key: string): CachedEvents | undefined {
    const record = this.records.get(key)
    if (!record) return undefined
    if (record.expiresAt > this.now()) {
      this.touch(key)
      return { events: record.events, fetchedAt: record.fetchedAt }
    }
    return undefined
  }

  getStale(key: string): CachedEvents | undefined {
    const record = this.records.get(key)
    if (!record) return undefined
    if (record.staleUntil > this.now()) {
      this.touch(key)
      return { events: record.events, fetchedAt: record.fetchedAt }
    }
    this.records.delete(key)
    return undefined
  }

  hasRecentError(key: string): boolean {
    const retryAt = this.errors.get(key)
    return retryAt !== undefined && retryAt > this.now()
  }

  markError(key: string): void {
    this.errors.set(key, this.now() + ERROR_BACKOFF_MS)
  }

  set(key: string, events: CalendarEvent[], fetchedAt: number): void {
    this.records.set(key, {
      events,
      fetchedAt,
      expiresAt: fetchedAt + this.ttlMs,
      staleUntil: fetchedAt + STALE_MAX_AGE_MS
    })
    this.errors.delete(key)
    this.touch(key)
    this.trim()
  }

  singleflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key)
    if (existing) return existing as Promise<T>
    const promise = factory().finally(() => this.pending.delete(key))
    this.pending.set(key, promise)
    return promise
  }

  async runLimited<T>(factory: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxParallel) {
      if (this.queue.length >= this.maxQueue) throw new OverloadError()
      await new Promise<void>(resolve => this.queue.push(resolve))
    }
    this.active++
    try {
      return await factory()
    } finally {
      this.active--
      const next = this.queue.shift()
      next?.()
    }
  }

  allowUpstream(): boolean {
    const cutoff = this.now() - 60_000
    this.trimUpstream(cutoff)
    if (this.upstreamHits.length >= this.upstreamPerMinute) return false
    this.upstreamHits.push(this.now())
    return true
  }

  private trimUpstream(cutoff: number): void {
    for (let i = this.upstreamHits.length - 1; i >= 0; i--) {
      if (this.upstreamHits[i]! <= cutoff) this.upstreamHits.splice(i, 1)
    }
  }

  private touch(key: string): void {
    const record = this.records.get(key)
    if (!record) return
    this.records.delete(key)
    this.records.set(key, record)
  }

  private trim(): void {
    while (this.records.size > this.maxEntries) {
      const oldest = this.records.keys().next().value
      if (oldest === undefined) break
      this.records.delete(oldest)
    }
  }
}

export class DiscoveryCache {
  private generation: string | undefined
  private calendars: CalendarInfo[] | undefined
  private expiresAt = 0
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(ttlMs: number, now: () => number = () => Date.now()) {
    this.ttlMs = ttlMs
    this.now = now
  }

  get(generation: string): CalendarInfo[] | undefined {
    if (this.calendars && this.generation === generation && this.expiresAt > this.now()) return this.calendars
    return undefined
  }

  set(generation: string, calendars: CalendarInfo[]): void {
    this.generation = generation
    this.calendars = calendars
    this.expiresAt = this.now() + this.ttlMs
  }
}

export class IdentityRateLimiter {
  private readonly hits = new Map<string, number[]>()
  private readonly max: number
  private readonly windowMs: number
  private readonly now: () => number
  private readonly maxIdentities: number

  constructor(max: number, windowMs: number, now: () => number = () => Date.now(), maxIdentities = DEFAULT_MAX_IDENTITIES) {
    this.max = max
    this.windowMs = windowMs
    this.now = now
    this.maxIdentities = maxIdentities
  }

  allow(identity: string): boolean {
    const cutoff = this.now() - this.windowMs
    const current = (this.hits.get(identity) ?? []).filter(timestamp => timestamp > cutoff)
    if (current.length >= this.max) {
      this.hits.set(identity, current)
      return false
    }
    current.push(this.now())
    this.hits.set(identity, current)
    this.prune(cutoff)
    return true
  }

  private prune(cutoff: number): void {
    if (this.hits.size <= this.maxIdentities) return
    for (const [identity, list] of this.hits) {
      if (list.every(timestamp => timestamp <= cutoff)) this.hits.delete(identity)
    }
  }
}
