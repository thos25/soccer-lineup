import { useState, useEffect, useRef } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { getDb } from '../lib/firebase.js'

const TEAM_NAME_KEY = 'activeTeamName'

const SESSION_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useTeam(players, onRemoteUpdate) {
  const [teamName, setTeamName] = useState(
    () => localStorage.getItem(TEAM_NAME_KEY) || ''
  )
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [offline, setOffline] = useState(false)

  const cbRef = useRef(onRemoteUpdate)
  useEffect(() => { cbRef.current = onRemoteUpdate }, [onRemoteUpdate])

  useEffect(() => {
    const db = getDb()
    if (!db || !teamName) return

    const teamRef = ref(db, `teams/${teamName}`)
    const unsub = onValue(
      teamRef,
      (snapshot) => {
        setOffline(false)
        const data = snapshot.val()

        if (data === null) {
          setConnected(true)
          set(teamRef, { players, updatedAt: new Date().toISOString(), clientId: SESSION_ID })
          return
        }

        if (data.clientId === SESSION_ID) {
          setConnected(true)
          return
        }

        if (Array.isArray(data.players)) {
          cbRef.current(data.players)
        }
        setConnected(true)
      },
      () => {
        setOffline(true)
        setConnected(false)
      }
    )
    return () => unsub()
  }, [teamName]) // eslint-disable-line react-hooks/exhaustive-deps

  const pushTimer = useRef(null)
  useEffect(() => {
    const db = getDb()
    if (!db || !teamName || !connected) return
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      const teamRef = ref(db, `teams/${teamName}`)
      setSyncing(true)
      set(teamRef, { players, updatedAt: new Date().toISOString(), clientId: SESSION_ID })
        .finally(() => setSyncing(false))
    }, 300)
    return () => clearTimeout(pushTimer.current)
  }, [players, teamName, connected])

  const TEAM_NAME_RE = /^[A-Za-z0-9 _-]{4,40}$/
  const connect = (name) => {
    const trimmed = name.trim()
    if (!trimmed || !TEAM_NAME_RE.test(trimmed)) return
    localStorage.setItem(TEAM_NAME_KEY, trimmed)
    setTeamName(trimmed)
    setConnected(false)
  }

  const disconnect = () => {
    localStorage.removeItem(TEAM_NAME_KEY)
    setTeamName('')
    setConnected(false)
    setOffline(false)
  }

  return { teamName, connected, syncing, offline, connect, disconnect }
}
