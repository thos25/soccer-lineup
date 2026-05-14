import { useLocalStorage } from './useLocalStorage.js'

const ROSTER_KEY = 'soccer-roster'
const DEFAULT_ROSTER = { version: 1, players: [] }

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function isValidPlayer(p) {
  return (
    p &&
    typeof p === 'object' &&
    typeof p.id === 'string' && p.id.length > 0 && p.id.length < 200 &&
    typeof p.name === 'string' && p.name.length < 100
  )
}

function migrate(stored) {
  if (!stored || typeof stored !== 'object') return DEFAULT_ROSTER
  const raw = Array.isArray(stored.players) ? stored.players.filter(isValidPlayer) : []
  // De-duplicate IDs defensively
  const seen = new Set()
  const players = raw.filter((p) => !seen.has(p.id) && seen.add(p.id))
  return { version: 1, players }
}

export function useRoster() {
  const [raw, setRaw, storageAvailable] = useLocalStorage(ROSTER_KEY, DEFAULT_ROSTER)
  const { players } = migrate(raw)

  const save = (newPlayers) => setRaw({ version: 1, players: newPlayers })

  const addPlayer = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    save([...players, { id: generateId(), name: trimmed }])
  }

  const removePlayer = (id) => save(players.filter((p) => p.id !== id))

  const renamePlayer = (id, newName) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    save(players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)))
  }

  return { players, addPlayer, removePlayer, renamePlayer, storageAvailable }
}
