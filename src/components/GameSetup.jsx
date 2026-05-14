import { useState } from 'react'

export default function GameSetup({
  players,
  presentIds,
  onToggle,
  onGenerate,
  hasPlan,
  onClearPlan,
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const presentCount = presentIds.size
  const canGenerate = presentCount >= 7

  const handleGenerateClick = () => {
    if (hasPlan) {
      setShowConfirm(true)
    } else {
      onGenerate()
    }
  }

  const confirmRegenerate = () => {
    setShowConfirm(false)
    onClearPlan()
    onGenerate()
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Game Day</h1>

      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-5 ${
          canGenerate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
        }`}
      >
        {presentCount} of {players.length} present
        {!canGenerate && players.length > 0 && ' (need at least 7)'}
      </div>

      {players.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">
          Add players to your roster first.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => onToggle(player.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors min-h-[44px] ${
                  presentIds.has(player.id)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {player.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={!canGenerate}
            title={canGenerate ? undefined : 'Need at least 7 players present'}
            className={`w-full py-3 rounded-xl text-base font-semibold transition-colors ${
              canGenerate
                ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {hasPlan ? 'Regenerate Lineup' : 'Generate Lineup'}
          </button>
        </>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">Regenerate Lineup?</h2>
            <p className="text-gray-500 text-sm mb-5">
              This will clear your current lineup and any edits you made.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegenerate}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
