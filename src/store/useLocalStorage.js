import { useState } from 'react'

function isAvailable() {
  try {
    localStorage.setItem('__sl_test__', '1')
    localStorage.removeItem('__sl_test__')
    return true
  } catch {
    return false
  }
}

/**
 * Like useState but backed by localStorage.
 * Falls back to in-memory state if localStorage is unavailable (iOS private mode, quota).
 * Returns [value, setter, storageAvailable].
 */
export function useLocalStorage(key, defaultValue) {
  const [available] = useState(isAvailable)

  const [value, setValue] = useState(() => {
    if (!available) return defaultValue
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setStoredValue = (newValue) => {
    setValue((prev) => {
      const next = typeof newValue === 'function' ? newValue(prev) : newValue
      if (available) {
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // QuotaExceededError — already updating in-memory state above
        }
      }
      return next
    })
  }

  return [value, setStoredValue, available]
}
