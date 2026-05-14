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

function replaceOne(arr, from, to) {
  return arr.map((id) => (id === from ? to : id))
}

function swapInWindow(w, idA, idB) {
  const posA = findPosition(w, idA)
  const posB = findPosition(w, idB)
  if (!posA || !posB) return w

  const win = {
    ...w,
    defenders: [...w.defenders],
    midfielders: [...w.midfielders],
    forwards: [...w.forwards],
    bench: [...w.bench],
  }

  const setPos = (pos, from, to) => {
    if (pos === 'goalkeeper') win.goalkeeper = to
    else if (pos === 'defenders') win.defenders = replaceOne(win.defenders, from, to)
    else if (pos === 'midfielders') win.midfielders = replaceOne(win.midfielders, from, to)
    else if (pos === 'forwards') win.forwards = replaceOne(win.forwards, from, to)
    else if (pos === 'bench') win.bench = replaceOne(win.bench, from, to)
  }

  // Place B where A was, and A where B was
  setPos(posA, idA, idB)
  setPos(posB, idB, idA)

  return win
}

export function useGame(players) {
  const [presentIds, setPresentIds] = useState(new Set())
  const [plan, setPlan] = useState(null)

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
    setPlan(generateLineup(presentPlayers))
  }

  const clearPlan = () => setPlan(null)

  /**
   * Swap two players in a specific window.
   * When swapping the goalkeeper at a quarter-start (even) window,
   * the swap is also applied to the mid-quarter window of that quarter.
   */
  const swapPlayers = (windowIndex, playerIdA, playerIdB) => {
    setPlan((prev) => {
      if (!prev) return prev

      // Check original window to identify GK involvement before mutation
      const origWin = prev.windows[windowIndex]
      const posA = findPosition(origWin, playerIdA)
      const posB = findPosition(origWin, playerIdB)
      const gkSwapAtQuarterStart =
        windowIndex % 2 === 0 && (posA === 'goalkeeper' || posB === 'goalkeeper')

      const windows = prev.windows.map((w) => ({ ...w }))
      windows[windowIndex] = swapInWindow(windows[windowIndex], playerIdA, playerIdB)

      // Propagate GK change to the mid-quarter window of this quarter
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

  return { presentIds: validPresentIds, togglePresent, plan, generatePlan, swapPlayers, clearPlan }
}
