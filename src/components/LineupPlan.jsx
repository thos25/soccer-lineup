import LineupWindow from './LineupWindow.jsx'

function windowLabel(windowIndex) {
  const quarter = Math.floor(windowIndex / 2) + 1
  const half = windowIndex % 2 === 0 ? 'Start' : 'Mid'
  return `Q${quarter} ${half}`
}

function inField(w, id) {
  return w.goalkeeper === id || w.defenders.includes(id) ||
    w.midfielders.includes(id) || w.forwards.includes(id)
}

// Returns two arrays (length 8) of Sets — one for bench streaks (≥2 consecutive bench
// windows) and one for field streaks (≥3 consecutive field windows). Every window that
// is part of a qualifying run is included, so the first window of the run is highlighted
// too, not just subsequent ones.
function buildStreaks(plan) {
  const benchSets = Array.from({ length: 8 }, () => new Set())
  const fieldSets = Array.from({ length: 8 }, () => new Set())

  plan.presentPlayerIds.forEach((id) => {
    // Bench runs
    let runStart = null
    for (let W = 0; W <= 8; W++) {
      const onBench = W < 8 && plan.windows[W].bench.includes(id)
      if (onBench) {
        if (runStart === null) runStart = W
      } else {
        if (runStart !== null && W - runStart >= 2) {
          for (let i = runStart; i < W; i++) benchSets[i].add(id)
        }
        runStart = null
      }
    }

    // Field runs — GK windows break the streak (only DEF/MID/FWD count)
    runStart = null
    for (let W = 0; W <= 8; W++) {
      const w = plan.windows[W]
      const onField = W < 8 && (
        w.defenders.includes(id) || w.midfielders.includes(id) || w.forwards.includes(id)
      )
      if (onField) {
        if (runStart === null) runStart = W
      } else {
        if (runStart !== null && W - runStart >= 3) {
          for (let i = runStart; i < W; i++) fieldSets[i].add(id)
        }
        runStart = null
      }
    }
  })

  return { benchSets, fieldSets }
}

function buildStats(plan, players) {
  const presentSet = new Set(plan.presentPlayerIds)
  return players
    .filter((p) => presentSet.has(p.id))
    .map((p) => {
      const counts = { def: 0, mid: 0, fwd: 0, gk: 0, bench: 0 }
      plan.windows.forEach((w) => {
        if (w.goalkeeper === p.id) counts.gk++
        else if (w.defenders.includes(p.id)) counts.def++
        else if (w.midfielders.includes(p.id)) counts.mid++
        else if (w.forwards.includes(p.id)) counts.fwd++
        else counts.bench++
      })
      return { id: p.id, name: p.name, ...counts }
    })
}

function StatsTable({ stats }) {
  const cols = ['def', 'mid', 'fwd', 'gk', 'bench']
  const headers = ['DEF', 'MID', 'FWD', 'GK', 'BNC']

  return (
    <div className="md:sticky md:top-4 md:self-start shrink-0 md:w-64">
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
        Position Counts
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-2 py-2 font-semibold text-gray-500">Player</th>
              {headers.map((h) => (
                <th key={h} className="px-1 py-2 font-semibold text-gray-500 text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-1.5 text-gray-800 font-medium truncate">
                  {s.name}
                </td>
                {cols.map((col) => {
                  const outfield = col === 'def' || col === 'mid' || col === 'fwd'
                  const over = (outfield && (s[col] > 2 || s[col] === 0)) || (col === 'bench' && s[col] > 4)
                  return (
                    <td
                      key={col}
                      className={`px-1 py-1.5 text-center tabular-nums font-medium ${
                        over ? 'bg-red-100 text-red-700' : 'text-gray-700'
                      }`}
                    >
                      {s[col]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function LineupPlan({ plan, players, onSwap, separationViolations = [], onRegenerate }) {
  if (!plan) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400 text-sm py-10">
          No lineup yet — go to Game tab and tap Generate.
        </p>
      </div>
    )
  }

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))
  const getName = (id) => playerMap[id]?.name ?? id
  const stats = buildStats(plan, players)
  const { benchSets, fieldSets } = buildStreaks(plan)

  const handlePrint = () => window.print()

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 no-print">
        <h1 className="text-xl font-bold text-gray-800">Lineup</h1>
        <div className="flex gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 active:bg-green-800"
            >
              Regenerate
            </button>
          )}
          <button
            onClick={handlePrint}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      {separationViolations.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 no-print">
          ⚠ Couldn&apos;t fully honor &ldquo;keep apart&rdquo; for:{' '}
          <strong>{separationViolations.map(windowLabel).join(', ')}</strong>
          {' '}— too many flagged players for available pairs.
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="lineup-print-grid">
            {[1, 2, 3, 4].map((q) => (
              <div key={q} className="quarter-block mb-5">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
                  Quarter {q}
                </h2>
                {plan.windows
                  .filter((w) => w.quarter === q)
                  .map((w) => (
                    <LineupWindow
                      key={w.windowIndex}
                      window={w}
                      players={players}
                      getName={getName}
                      onSwap={onSwap}
                      consecutiveBench={benchSets[w.windowIndex]}
                      longFieldStreak={fieldSets[w.windowIndex]}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>

        <StatsTable stats={stats} />
      </div>
    </div>
  )
}
