/**
 * Generate a full 8-window rotation plan for a 7v7 soccer game.
 *
 * Rules enforced:
 *  - Goalie locks for the full quarter (same GK at windowIndex w and w+1 for even w)
 *  - All 4 quarter goalies are distinct when N >= 8
 *  - No player benched in consecutive windows (force-promotion)
 *  - Roughly equal windowsPlayed across all present players
 *
 * @param {Array<{id: string, name: string}>} presentPlayers - Players present for this game (length >= 7)
 * @param {() => number} rng - Random number source (default Math.random; pass seeded fn for tests)
 * @returns {LineupPlan}
 */
export function generateLineup(presentPlayers, rng = Math.random) {
  const N = presentPlayers.length
  if (N < 7) throw new Error('Need at least 7 players')

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Per-player state
  const windowsPlayed = {}
  presentPlayers.forEach((p) => { windowsPlayed[p.id] = 0 })

  // Goalie rotation: assigned dynamically at each quarter start.
  // The lowest-played not-yet-GK player becomes GK, ensuring GK duties go to
  // players who are behind in play time rather than randomly ahead.
  const goaliesByQuarter = {}
  const usedAsGk = new Set()

  const windows = []
  let previouslyBenched = [] // player IDs benched at window w-1

  for (let w = 0; w < 8; w++) {
    const quarterIdx = Math.floor(w / 2) // 0-indexed quarter (0–3)
    const quarter = quarterIdx + 1        // 1-indexed for display
    const half = w % 2 === 0 ? 'start' : 'mid'

    // At quarter start, select GK: shuffle candidates first for random tiebreaking,
    // then stable-sort by windowsPlayed ASC to pick the most-behind player.
    if (w % 2 === 0) {
      const candidates = shuffle(presentPlayers.filter((p) => !usedAsGk.has(p.id)))
      candidates.sort((a, b) => windowsPlayed[a.id] - windowsPlayed[b.id])
      goaliesByQuarter[quarterIdx] = candidates[0].id
      usedAsGk.add(candidates[0].id)
    }

    const goalie = goaliesByQuarter[quarterIdx]

    const nonGoalie = presentPlayers.filter((p) => p.id !== goalie)

    // Consecutive-bench constraint: players benched last window must play this window
    // (unless they are this quarter's goalie, in which case they play as GK instead)
    const forcedPlayIds = previouslyBenched.filter((id) => id !== goalie)
    const remaining = nonGoalie
      .filter((p) => !forcedPlayIds.includes(p.id))
      .sort((a, b) => windowsPlayed[a.id] - windowsPlayed[b.id]) // stable sort (ES2019+)

    const combined = [
      ...forcedPlayIds.map((id) => presentPlayers.find((p) => p.id === id)),
      ...remaining,
    ]

    const outfieldPlayers = combined.slice(0, 6)
    const benchPlayers = combined.slice(6)

    // Shuffle outfield for position assignment
    const shuffledOutfield = shuffle(outfieldPlayers)
    const defenders = [shuffledOutfield[0].id, shuffledOutfield[1].id]
    const midfielders = [shuffledOutfield[2].id, shuffledOutfield[3].id]
    const forwards = [shuffledOutfield[4].id, shuffledOutfield[5].id]
    const bench = benchPlayers.map((p) => p.id)

    // Increment play counts
    windowsPlayed[goalie]++
    outfieldPlayers.forEach((p) => { windowsPlayed[p.id]++ })

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
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    generatedAt: new Date().toISOString(),
    presentPlayerIds: presentPlayers.map((p) => p.id),
    windows,
  }
}
