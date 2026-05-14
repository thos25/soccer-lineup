const POSITION_LABEL = {
  goalkeeper: 'GK',
  defenders: 'DEF',
  midfielders: 'MID',
  forwards: 'FWD',
  bench: 'BENCH',
}

export default function SwapPicker({ target, allPlayers, getName, onSwap, onClose }) {
  const others = allPlayers.filter((p) => p.id !== target.id)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-h-[65vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Swap{' '}
              <span className="text-green-700">{target.name}</span>{' '}
              <span className="text-gray-400 text-sm font-normal">
                ({POSITION_LABEL[target.position]})
              </span>
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Select a player to swap with</p>
        </div>

        <ul className="py-2">
          {others.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onSwap(p.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-green-50 active:bg-green-100 min-h-[44px]"
              >
                <span className="font-medium text-gray-800">{getName(p.id)}</span>
                <span className="text-xs text-gray-400 ml-2">{POSITION_LABEL[p.position]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
