import LineupWindow from './LineupWindow.jsx'

export default function LineupPlan({ plan, players, onSwap }) {
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

  const handlePrint = () => window.print()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 no-print">
        <h1 className="text-xl font-bold text-gray-800">Lineup</h1>
        <button
          onClick={handlePrint}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Print
        </button>
      </div>

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
                  getName={getName}
                  onSwap={onSwap}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
