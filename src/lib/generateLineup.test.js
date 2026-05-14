import { describe, it, expect } from 'vitest'
import { generateLineup } from './generateLineup.js'

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }))
}

// Simple deterministic LCG for reproducible test runs
function makeRng(seed = 42) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return s / 0x100000000
  }
}

describe('generateLineup — structure', () => {
  it.each([7, 8, 9, 10, 11, 12])('N=%i produces 8 windows with correct position counts', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 5; r++) {
      const plan = generateLineup(players, makeRng(r))
      expect(plan.windows).toHaveLength(8)
      plan.windows.forEach((w) => {
        expect(typeof w.goalkeeper).toBe('string')
        expect(w.defenders).toHaveLength(2)
        expect(w.midfielders).toHaveLength(2)
        expect(w.forwards).toHaveLength(2)
        expect(w.bench).toHaveLength(n - 7)
      })
    }
  })
})

describe('generateLineup — goalie quarter lock', () => {
  it.each([7, 8, 9, 10, 11, 12])('N=%i: same goalie at both windows of each quarter', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 5; r++) {
      const plan = generateLineup(players, makeRng(r))
      ;[0, 2, 4, 6].forEach((w) => {
        expect(plan.windows[w].goalkeeper, `quarter start w=${w} run ${r}`).toBe(
          plan.windows[w + 1].goalkeeper
        )
      })
    }
  })

  it.each([7, 8, 9, 10, 11, 12])('N=%i: 4 distinct quarter goalies', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 5; r++) {
      const plan = generateLineup(players, makeRng(r))
      const goalies = [0, 2, 4, 6].map((i) => plan.windows[i].goalkeeper)
      expect(new Set(goalies).size, `run ${r}`).toBe(4)
    }
  })
})

describe('generateLineup — no consecutive bench', () => {
  it.each([8, 9, 10, 11, 12])('N=%i: no player benched at consecutive windows (20 runs)', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 20; r++) {
      const plan = generateLineup(players, makeRng(r))
      for (let w = 1; w < 8; w++) {
        const benchNow = new Set(plan.windows[w].bench)
        const benchPrev = new Set(plan.windows[w - 1].bench)
        for (const pid of benchNow) {
          expect(
            benchPrev.has(pid),
            `Player ${pid} benched at windows ${w - 1} and ${w} (N=${n}, run ${r})`
          ).toBe(false)
        }
      }
    }
  })
})

describe('generateLineup — fair play time', () => {
  it('N=7: every player plays all 8 windows', () => {
    const players = makePlayers(7)
    for (let r = 0; r < 10; r++) {
      const plan = generateLineup(players, makeRng(r))
      const counts = {}
      players.forEach((p) => { counts[p.id] = 0 })
      plan.windows.forEach((w) => {
        counts[w.goalkeeper]++
        w.defenders.forEach((id) => { counts[id]++ })
        w.midfielders.forEach((id) => { counts[id]++ })
        w.forwards.forEach((id) => { counts[id]++ })
      })
      Object.entries(counts).forEach(([id, c]) => {
        expect(c, `Player ${id} run ${r}`).toBe(8)
      })
    }
  })

  it.each([10, 11, 12])('N=%i: windowsPlayed range <= 1 (20 runs)', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 20; r++) {
      const plan = generateLineup(players, makeRng(r))
      const counts = {}
      players.forEach((p) => { counts[p.id] = 0 })
      plan.windows.forEach((w) => {
        counts[w.goalkeeper]++
        w.defenders.forEach((id) => { counts[id]++ })
        w.midfielders.forEach((id) => { counts[id]++ })
        w.forwards.forEach((id) => { counts[id]++ })
      })
      const vals = Object.values(counts)
      expect(
        Math.max(...vals) - Math.min(...vals),
        `N=${n} run ${r} counts: ${JSON.stringify(counts)}`
      ).toBeLessThanOrEqual(1)
    }
  })
})

describe('generateLineup — throws on too few players', () => {
  it('throws when fewer than 7 players', () => {
    expect(() => generateLineup(makePlayers(6))).toThrow('at least 7')
  })
})
