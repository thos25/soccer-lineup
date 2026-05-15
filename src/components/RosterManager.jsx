import { useState } from 'react'

function TeamConnectForm({ onConnect }) {
  const [name, setName] = useState('')
  const canConnect = name.trim().length >= 4

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Enter a team name to sync your roster with other coaches.
        Anyone who knows this name can edit the roster — use something unique.
        Offline edits will be overwritten by other coaches when you reconnect.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canConnect && onConnect(name)}
          placeholder="e.g. U10 Lions 2025"
          minLength={4}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => onConnect(name)}
          disabled={!canConnect}
          className="bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]"
        >
          Connect
        </button>
      </div>
    </div>
  )
}

export default function RosterManager({
  players,
  onAdd,
  onRemove,
  onRename,
  onToggleSeparate,
  teamName,
  connected,
  syncing,
  offline,
  onConnect,
  onDisconnect,
  firebaseConfigured,
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName)
      setNewName('')
    }
  }

  const startEdit = (player) => {
    setEditingId(player.id)
    setEditValue(player.name)
  }

  const commitEdit = () => {
    if (editValue.trim()) onRename(editingId, editValue)
    setEditingId(null)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Roster</h1>

      {/* Team Sync Panel */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Team Sync</h2>
        {!firebaseConfigured ? (
          <p className="text-xs text-gray-400">
            Cloud sync unavailable — configure Firebase env vars to enable.
          </p>
        ) : connected ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              {syncing ? '⟳ Syncing…' : `✓ ${teamName}`}
            </span>
            {offline && (
              <span className="text-xs text-amber-600">Offline — using local copy</span>
            )}
            <button
              onClick={onDisconnect}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 underline"
            >
              Switch team
            </button>
          </div>
        ) : (
          <TeamConnectForm onConnect={onConnect} />
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Player name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-w-[44px] min-h-[44px] hover:bg-green-700"
        >
          Add
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">
          No players yet — add your first player above.
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100"
            >
              {editingId === player.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={commitEdit}
                  className="flex-1 border border-green-400 rounded px-2 py-1 text-sm focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => startEdit(player)}
                  className="flex-1 text-left text-gray-800 hover:text-green-700 min-h-[44px] flex items-center"
                >
                  {player.name}
                </button>
              )}
              <button
                onClick={() => onToggleSeparate(player.id)}
                title={player.separate
                  ? 'Remove keep-apart flag'
                  : 'Flag: keep apart from other flagged players in lineup'}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                  player.separate
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-300 hover:text-orange-400'
                }`}
              >
                ⚡
              </button>
              <button
                onClick={() => onRemove(player.id)}
                aria-label={`Remove ${player.name}`}
                className="text-gray-300 hover:text-red-500 w-8 h-8 flex items-center justify-center text-xl leading-none rounded"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
