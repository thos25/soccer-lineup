/**
 * Generate a full 8-window rotation plan for a 7v7 soccer game.
 *
 * Rules enforced:
 *  - Goalie locks for the full quarter (same GK at windowIndex w and w+1 for even w)
 *  - All 4 quarter goalies are distinct when N >= 8
 *  - No player benched in consecutive windows (force-promotion)
 *  - Roughly equal windowsPlayed across all present players
 *  - Separation constraint: players with separate===true avoid sharing DEF/MID/FWD pairs
 *
 * @param {Array<{id: string, name: string, separate?: boolean}>} presentPlayers
 * @param {() => number} rng - Random number source (default Math.random; pass seeded fn for tests)
 * @returns {{ plan: LineupPlan, separationViolations: number[] }}
 *   separationViolations: windowIndexes where the separation constraint could not be satisfied
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

  const windowsPlayed = {}
  presentPlayers.forEach((p) => { windowsPlayed[p.id] = 0 })

  const goaliesByQuarter = {}
  const usedAsGk = new Set()

  const windows = []
  const separationViolations = []
  let previouslyBenched = []

  for (let w = 0; w < 8; w++) {
    const quarterIdx = Math.floor(w / 2)
    const quarter = quarterIdx + 1
    const half = w % 2 === 0 ? 'start' : 'mid'

    if (w % 2 === 0) {
      const candidates = shuffle(presentPlayers.filter((p) => !usedAsGk.has(p.id)))
      candidates.sort((a, b) => windowsPlayed[a.id] - windowsPlayed[b.id])
      goaliesByQuarter[quarterIdx] = candidates[0].id
      usedAsGk.add(candidates[0].id)
    }

    const goalie = goaliesByQuarter[quarterIdx]
    const nonGoalie = presentPlayers.filter((p) => p.id !== goalie)

    const forcedPlayIds = previouslyBenched.filter((id) => id !== goalie)
    const remaining = nonGoalie
      .filter((p) => !forcedPlayIds.includes(p.id))
      .sort((a, b) => windowsPlayed[a.id] - windowsPlayed[b.id])

    const combined = [
      ...forcedPlayIds.map((id) => presentPlayers.find((p) => p.id === id)),
      ...remaining,
    ]

    const outfieldPlayers = combined.slice(0, 6)
    const benchPlayers = combined.slice(6)

    const shuffledOutfield = shuffle(outfieldPlayers)

    // Separation-aware position assignment.
    // Proof of correctness for k ≤ 3: 3 pairs exist; placing one flagged player at each
    // pair-first-slot (indices 0,2,4) guarantees no pair contains two flagged players.
    const flagged   = shuffledOutfield.filter((p) => p.separate === true)
    const unflagged = shuffledOutfield.filter((p) => p.separate !== true)

    let arranged
    if (flagged.length <= 3) {
      const slots = new Array(6).fill(null)
      flagged.forEach((p, i) => { slots[i * 2] = p })
      unflagged.forEach((p) => {
        const idx = slots.findIndex((s) => s === null)
        if (idx !== -1) slots[idx] = p
      })
      arranged = slots
    } else {
      separationViolations.push(w)
      arranged = shuffledOutfield
    }

    const defenders   = [arranged[0].id, arranged[1].id]
    const midfielders = [arranged[2].id, arranged[3].id]
    const forwards    = [arranged[4].id, arranged[5].id]
    const bench       = benchPlayers.map((p) => p.id)

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
