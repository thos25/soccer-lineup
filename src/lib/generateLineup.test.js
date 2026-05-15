import { describe, it, expect } from 'vitest'
import { generateLineup } from './generateLineup.js'

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }))
}

function makePlayersWithSep(n, separateIndexes = []) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    separate: separateIndexes.includes(i),
  }))
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
      const { plan } = generateLineup(players, makeRng(r))
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
      const { plan } = generateLineup(players, makeRng(r))
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
      const { plan } = generateLineup(players, makeRng(r))
      const goalies = [0, 2, 4, 6].map((i) => plan.windows[i].goalkeeper)
      expect(new Set(goalies).size, `run ${r}`).toBe(4)
    }
  })
})

describe('generateLineup — no consecutive bench', () => {
  it.each([8, 9, 10, 11, 12])('N=%i: no player benched at consecutive windows (20 runs)', (n) => {
    const players = makePlayers(n)
    for (let r = 0; r < 20; r++) {
      const { plan } = generateLineup(players, makeRng(r))
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
      const { plan } = generateLineup(players, makeRng(r))
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
      const { plan } = generateLineup(players, makeRng(r))
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

describe('generateLineup — separation constraint', () => {
  it('k=2 flagged: no two flagged players share a pair row in any window (20 runs)', () => {
    const players = makePlayersWithSep(8, [0, 1])
    for (let r = 0; r < 20; r++) {
      const { plan, separationViolations } = generateLineup(players, makeRng(r))
      expect(separationViolations).toHaveLength(0)
      plan.windows.forEach((w) => {
        const sepCount = (ids) =>
          ids.filter((id) => players.find((p) => p.id === id)?.separate === true).length
        expect(sepCount(w.defenders)).toBeLessThanOrEqual(1)
        expect(sepCount(w.midfielders)).toBeLessThanOrEqual(1)
        expect(sepCount(w.forwards)).toBeLessThanOrEqual(1)
      })
    }
  })

  it('k=3 flagged (boundary): no violations in 20 runs', () => {
    const players = makePlayersWithSep(9, [0, 1, 2])
    for (let r = 0; r < 20; r++) {
      const { separationViolations } = generateLineup(players, makeRng(r))
      expect(separationViolations).toHaveLength(0)
    }
  })

  it('k=4 flagged with N=7: violations must occur', () => {
    const players = makePlayersWithSep(7, [0, 1, 2, 3])
    const { separationViolations } = generateLineup(players)
    expect(separationViolations.length).toBeGreaterThan(0)
  })

  it('no separate fields: identical contract to v1 (no violations, plan shape valid)', () => {
    const players = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }))
    const { plan, separationViolations } = generateLineup(players)
    expect(separationViolations).toHaveLength(0)
    expect(plan.windows).toHaveLength(8)
  })

  it('returns { plan, separationViolations } shape', () => {
    const { plan, separationViolations } = generateLineup(makePlayers(7))
    expect(plan).toHaveProperty('windows')
    expect(plan).toHaveProperty('id')
    expect(Array.isArray(separationViolations)).toBe(true)
  })
})
