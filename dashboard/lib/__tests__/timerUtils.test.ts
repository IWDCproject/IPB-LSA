import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcCurrentSecs, formatSecs } from '../timerUtils'

describe('timerUtils', () => {
  describe('calcCurrentSecs', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns snapshot when timer is not running', () => {
      const live = { timerSecs: 100, timerRunning: false, timerLastStarted: null }
      expect(calcCurrentSecs(live as any, 'stopwatch')).toBe(100)
    })

    it('calculates elapsed time for stopwatch', () => {
      const now = new Date('2026-05-15T00:00:10Z')
      vi.setSystemTime(now)
      
      const startTime = '2026-05-15T00:00:00Z' // 10 seconds ago
      const live = { 
        timerSecs: 100, 
        timerRunning: true, 
        timerLastStarted: startTime 
      }
      
      // 100 (snapshot) + 10 (elapsed) = 110
      expect(calcCurrentSecs(live as any, 'stopwatch')).toBe(110)
    })

    it('calculates remaining time for countdown', () => {
      const now = new Date('2026-05-15T00:00:10Z')
      vi.setSystemTime(now)
      
      const startTime = '2026-05-15T00:00:00Z' // 10 seconds ago
      const live = { 
        timerSecs: 100, 
        timerRunning: true, 
        timerLastStarted: startTime 
      }
      
      // 100 (snapshot) - 10 (elapsed) = 90
      expect(calcCurrentSecs(live as any, 'countdown')).toBe(90)
    })

    it('never returns negative time for countdown', () => {
      const now = new Date('2026-05-15T00:02:00Z')
      vi.setSystemTime(now)
      
      const startTime = '2026-05-15T00:00:00Z' // 120 seconds ago
      const live = { 
        timerSecs: 100, 
        timerRunning: true, 
        timerLastStarted: startTime 
      }
      
      expect(calcCurrentSecs(live as any, 'countdown')).toBe(0)
    })
  })

  describe('formatSecs', () => {
    it('formats MM:SS correctly', () => {
      expect(formatSecs(65)).toBe('01:05')
    })

    it('formats HH:MM:SS correctly', () => {
      expect(formatSecs(3665)).toBe('01:01:05')
    })

    it('formats DD:HH:MM:SS correctly', () => {
      expect(formatSecs(90065)).toBe('1:01:01:05')
    })
  })
})
