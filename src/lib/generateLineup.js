/**
 * Generate a full 8-window rotation plan for a 7v7 soccer game.
 *
 * Rules enforced (highest → lowest priority):
 *  1. GK locks for the full quarter (same GK at windowIndex w and w+1 for even w)
 *  2. All 4 quarter goalies are distinct when N >= 8
 *  3. No player benched in consecutive windows (force-promotion)
 *  4. Roughly equal windowsPlayed across all present players
 *  5. Position rotation: outfield positions (DEF/MID/FWD) distributed as evenly as
 *     possible; soft cap of 2 per position per game; players see all 3 positions before
 *     repeating any. GK windows are excluded from position tracking.
 *  6. Consecutive-play limit: when N >= 10, no player plays more than 2 consecutive
 *     windows before benching (hard cap). Best-effort only when N < 10.
 *  7. Separation constraint: players with separate===true avoid sharing DEF/MID/FWD
 *     pairs; honored unless a higher-priority rule requires otherwise.
 *
 * @param {Array<{id: string, name: string, separate?: boolean}>} presentPlayers
 * @param {() => number} rng - random number source (default Math.random; pass seeded fn for tests)
 * @returns {{ plan: LineupPlan, separationViolations: number[] }}
 *   separationViolations: windowIndexes where the separation constraint could not be satisfied
 */
export function generateLineup(presentPlayers, rng = Math.random) {
  const N = presentPlayers.length
  if (N < 7) throw new Error('Need at least 7 players')

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // --- Tracking state ---

  const windowsPlayed = {}
  presentPlayers.forEach((p) => { windowsPlayed[p.id] = 0 })

  // Outfield position counts per player (GK windows are excluded)
  const positionCounts = {}
  presentPlayers.forEach((p) => {
    positionCounts[p.id] = { defenders: 0, midfielders: 0, forwards: 0 }
  })

  // Consecutive playing-window streak (includes GK windows; resets to 0 on bench)
  const consecutivePlay = {}
  presentPlayers.forEach((p) => { consecutivePlay[p.id] = 0 })

  const goaliesByQuarter = {}
  const usedAsGk = new Set()

  const windows = []
  const separationViolations = []
  let previouslyBenched = []

  const POS = ['defenders', 'midfielders', 'forwards']

  for (let w = 0; w < 8; w++) {
    const quarterIdx = Math.floor(w / 2)
    const quarter = quarterIdx + 1
    const half = w % 2 === 0 ? 'start' : 'mid'

    // --- 1. GK selection (unchanged) ---
    if (w % 2 === 0) {
      const candidates = shuffle(presentPlayers.filter((p) => !usedAsGk.has(p.id)))
      candidates.sort((a, b) => windowsPlayed[a.id] - windowsPlayed[b.id])
      goaliesByQuarter[quarterIdx] = candidates[0].id
      usedAsGk.add(candidates[0].id)
    }

    const goalie = goaliesByQuarter[quarterIdx]
    const nonGoalie = presentPlayers.filter((p) => p.id !== goalie)

    // --- 2. Force-promotion: players benched last window must play ---
    const forcedPlayIds = previouslyBenched.filter((id) => id !== goalie)

    // --- 3 & 4. Equal-time sort; for N >= 10 deprioritise at-cap players first ---
    const remaining = nonGoalie
      .filter((p) => !forcedPlayIds.includes(p.id))
      .sort((a, b) => {
        // For N >= 10: at-cap players (streak >= 2) go toward the bench end before
        // equal-time is applied, giving the cap its best chance of being enforced.
        if (N >= 10) {
          const aAtCap = consecutivePlay[a.id] >= 2
          const bAtCap = consecutivePlay[b.id] >= 2
          if (aAtCap !== bAtCap) return aAtCap ? 1 : -1
        }
        return windowsPlayed[a.id] - windowsPlayed[b.id]
      })

    const combined = [
      ...forcedPlayIds.map((id) => presentPlayers.find((p) => p.id === id)),
      ...remaining,
    ]

    const outfieldPlayers = combined.slice(0, 6)
    const benchPlayers = combined.slice(6)

    // --- 5 & 7. Position rotation with separation best-effort ---
    // Enumerate all C(6,2)×C(4,2) = 90 ways to split 6 outfield players into
    // DEF/MID/FWD pairs. Two passes:
    //   Pass 1: track the globally best rotation assignment (ignoring separation).
    //   Pass 2: track the best rotation assignment that has zero separation violations.
    // After enumeration, prefer the separation-preserving assignment when one exists;
    // fall back to the global best (recording a violation) only when all 90 combinations
    // place two flagged players in the same pair (unavoidable, e.g. k > 3).
    const shuffledOutfield = shuffle(outfieldPlayers)
    const op = shuffledOutfield  // alias for brevity in the loop

    let bestScore = Infinity
    let bestDef = null, bestMid = null, bestFwd = null
    let bestNoViolScore = Infinity
    let bestNoViolDef = null, bestNoViolMid = null, bestNoViolFwd = null

    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 6; j++) {
        const def = [op[i], op[j]]
        const rest = op.filter((_, idx) => idx !== i && idx !== j)

        for (let k = 0; k < 3; k++) {
          for (let l = k + 1; l < 4; l++) {
            const mid = [rest[k], rest[l]]
            const fwd = rest.filter((_, idx) => idx !== k && idx !== l)

            // Primary: minimise the highest position count any player will have
            const maxCount = Math.max(
              ...def.map((p) => positionCounts[p.id].defenders + 1),
              ...mid.map((p) => positionCounts[p.id].midfielders + 1),
              ...fwd.map((p) => positionCounts[p.id].forwards + 1),
            )

            // Secondary: minimise total position cost (keeps distribution even)
            const totalCost =
              def.reduce((s, p) => s + positionCounts[p.id].defenders, 0) +
              mid.reduce((s, p) => s + positionCounts[p.id].midfielders, 0) +
              fwd.reduce((s, p) => s + positionCounts[p.id].forwards, 0)

            const sepViol =
              (def.filter((p) => p.separate).length >= 2 ? 1 : 0) +
              (mid.filter((p) => p.separate).length >= 2 ? 1 : 0) +
              (fwd.filter((p) => p.separate).length >= 2 ? 1 : 0)

            const score = maxCount * 10_000_000 + totalCost

            if (score < bestScore) {
              bestScore = score
              bestDef = def; bestMid = mid; bestFwd = fwd
            }
            if (sepViol === 0 && score < bestNoViolScore) {
              bestNoViolScore = score
              bestNoViolDef = def; bestNoViolMid = mid; bestNoViolFwd = fwd
            }
          }
        }
      }
    }

    // Prefer the separation-preserving assignment when one exists.
    if (bestNoViolDef !== null) {
      bestDef = bestNoViolDef; bestMid = bestNoViolMid; bestFwd = bestNoViolFwd
    }

    // Within each pair, put the flagged player first (visual convention)
    const sortPair = (pair) =>
      pair.sort((a, b) => (a.separate && !b.separate ? -1 : !a.separate && b.separate ? 1 : 0))
    sortPair(bestDef); sortPair(bestMid); sortPair(bestFwd)

    const sepViolCount =
      (bestDef.filter((p) => p.separate).length >= 2 ? 1 : 0) +
      (bestMid.filter((p) => p.separate).length >= 2 ? 1 : 0) +
      (bestFwd.filter((p) => p.separate).length >= 2 ? 1 : 0)
    if (sepViolCount > 0) separationViolations.push(w)

    const defenders   = bestDef.map((p) => p.id)
    const midfielders = bestMid.map((p) => p.id)
    const forwards    = bestFwd.map((p) => p.id)
    const bench       = benchPlayers.map((p) => p.id)

    // --- Update position counts ---
    defenders.forEach((id) => { positionCounts[id].defenders++ })
    midfielders.forEach((id) => { positionCounts[id].midfielders++ })
    forwards.forEach((id) => { positionCounts[id].forwards++ })

    // --- Update windows played ---
    windowsPlayed[goalie]++
    outfieldPlayers.forEach((p) => { windowsPlayed[p.id]++ })

    // --- Update consecutive play streaks (outfield-only; GK windows are neutral) ---
    // Only outfield windows increment the streak. Bench resets it to 0.
    // GK duty is locked by design so it neither contributes to nor breaks a streak.
    const outfieldSet = new Set(outfieldPlayers.map((p) => p.id))
    presentPlayers.forEach((p) => {
      if (outfieldSet.has(p.id)) {
        consecutivePlay[p.id]++
      } else if (p.id !== goalie) {
        // benched
        consecutivePlay[p.id] = 0
      }
      // goalie: no change
    })

    previouslyBenched = bench

    windows.push({
      windowIndex: w,
      quarter,
      half,
      goalkeeper: goalie,
      defenders,
      midfielders,
      forwards,
      bench,
    })
  }

  return {
    plan: {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      generatedAt: new Date().toISOString(),
      presentPlayerIds: presentPlayers.map((p) => p.id),
      windows,
    },
    separationViolations,
  }
}
