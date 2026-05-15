import { useState } from 'react'
import SwapPicker from './SwapPicker.jsx'

export default function LineupWindow({ window: win, players = [], getName, onSwap }) {
  const [swapTarget, setSwapTarget] = useState(null)

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))
  const isQuarterStart = win.windowIndex % 2 === 0

  const handleChipClick = (id, position) => {
    if (position === 'goalkeeper' && !isQuarterStart) return
    setSwapTarget({ id, position })
  }

  const handleSwap = (targetId) => {
    if (!swapTarget) return
    onSwap(win.windowIndex, swapTarget.id, targetId)
    setSwapTarget(null)
  }

  const swappablePlayers = [
    ...(isQuarterStart ? [{ id: win.goalkeeper, position: 'goalkeeper' }] : []),
    ...win.defenders.map((id) => ({ id, position: 'defenders' })),
    ...win.midfielders.map((id) => ({ id, position: 'midfielders' })),
    ...win.forwards.map((id) => ({ id, position: 'forwards' })),
    ...win.bench.map((id) => ({ id, position: 'bench' })),
  ]

  const rows = [
    { label: 'GK', ids: [win.goalkeeper], position: 'goalkeeper' },
    { label: 'DEF', ids: win.defenders, position: 'defenders' },
    { label: 'MID', ids: win.midfielders, position: 'midfielders' },
    { label: 'FWD', ids: win.forwards, position: 'forwards' },
    ...(win.bench.length > 0
      ? [{ label: 'BENCH', ids: win.bench, position: 'bench' }]
      : []),
  ]

  const renderChip = (id, position) => {
    const locked = position === 'goalkeeper' && !isQuarterStart
    const isSeparate = playerMap[id]?.separate === true
    return (
      <button
        key={id}
        onClick={() => handleChipClick(id, position)}
        disabled={locked}
        title={locked ? 'Goalie locked for this quarter' : `Swap ${getName(id)}`}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
          locked
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
            : 'bg-white text-gray-800 border-gray-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100 cursor-pointer'
        }`}
      >
        {getName(id)}
        {locked && <span aria-hidden="true">&#x1F512;</span>}
        {isSeparate && (
          <span className="text-orange-400" title="Keep-apart flagged" aria-hidden="true">⚡</span>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-2 shadow-sm">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {win.half === 'start' ? 'Start' : 'Mid'}
      </div>

      {rows.map((row) => (
        <div key={row.label} className="flex items-start gap-2 mb-1">
          <span className="text-xs text-gray-400 w-12 flex-shrink-0 pt-1">{row.label}</span>
          <div className="flex flex-wrap gap-1">
            {row.ids.map((id) => renderChip(id, row.position))}
          </div>
        </div>
      ))}

      {swapTarget && (
        <SwapPicker
          target={{ id: swapTarget.id, name: getName(swapTarget.id), position: swapTarget.position }}
          allPlayers={swappablePlayers}
          getName={getName}
          onSwap={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  )
}
