import { useState, useMemo } from 'react'
import { generateLineup } from '../lib/generateLineup.js'

function findPosition(win, id) {
  if (win.goalkeeper === id) return 'goalkeeper'
  if (win.defenders.includes(id)) return 'defenders'
  if (win.midfielders.includes(id)) return 'midfielders'
  if (win.forwards.includes(id)) return 'forwards'
  if (win.bench.includes(id)) return 'bench'
  return null
}

function swapInWindow(w, idA, idB) {
  if (!findPosition(w, idA) || !findPosition(w, idB)) return w
  // Atomic single-pass swap: replaces idA↔idB everywhere simultaneously,
  // which is correct whether the two players are in the same position or different ones.
  const s = (id) => (id === idA ? idB : id === idB ? idA : id)
  return {
    ...w,
    goalkeeper: s(w.goalkeeper),
    defenders: w.defenders.map(s),
    midfielders: w.midfielders.map(s),
    forwards: w.forwards.map(s),
    bench: w.bench.map(s),
  }
}

export function useGame(players) {
  const [presentIds, setPresentIds] = useState(new Set())
  const [plan, setPlan] = useState(null)
  const [separationViolations, setSeparationViolations] = useState([])

  // Reconcile: drop IDs that no longer exist in the roster
  const validPresentIds = useMemo(() => {
    const roster = new Set(players.map((p) => p.id))
    return new Set([...presentIds].filter((id) => roster.has(id)))
  }, [presentIds, players])

  const togglePresent = (id) => {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const generatePlan = () => {
    const presentPlayers = players.filter((p) => validPresentIds.has(p.id))
    if (presentPlayers.length < 7) return
    const { plan, separationViolations } = generateLineup(presentPlayers)
    setPlan(plan)
    setSeparationViolations(separationViolations)
  }

  const clearPlan = () => {
    setPlan(null)
    setSeparationViolations([])
  }

  /**
   * Swap two players in a specific window.
   * When swapping the goalkeeper at a quarter-start (even) window,
   * the swap is also applied to the mid-quarter window of that quarter.
   */
  const swapPlayers = (windowIndex, playerIdA, playerIdB) => {
    setPlan((prev) => {
      if (!prev) return prev

      const origWin = prev.windows[windowIndex]
      const posA = findPosition(origWin, playerIdA)
      const posB = findPosition(origWin, playerIdB)
      const gkSwapAtQuarterStart =
        windowIndex % 2 === 0 && (posA === 'goalkeeper' || posB === 'goalkeeper')

      const windows = prev.windows.map((w) => ({ ...w }))
      windows[windowIndex] = swapInWindow(windows[windowIndex], playerIdA, playerIdB)

      if (gkSwapAtQuarterStart) {
        windows[windowIndex + 1] = swapInWindow(
          windows[windowIndex + 1],
          playerIdA,
          playerIdB
        )
      }

      return { ...prev, windows }
    })
  }

  return {
    presentIds: validPresentIds,
    togglePresent,
    plan,
    separationViolations,
    generatePlan,
    swapPlayers,
    clearPlan,
  }
}
