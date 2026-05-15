import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = () =>
  Boolean(cfg.apiKey && cfg.databaseURL && cfg.projectId)

let _app, _db

export const getDb = () => {
  if (!isFirebaseConfigured()) return null
  if (!_app) {
    _app = initializeApp(cfg)
    const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (recaptchaKey) {
      try {
        initializeAppCheck(_app, {
          provider: new ReCaptchaV3Provider(recaptchaKey),
          isTokenAutoRefreshEnabled: true,
        })
      } catch (e) {
        console.warn('[Firebase] App Check init failed:', e.message)
      }
    } else {
      console.warn('[Firebase] VITE_RECAPTCHA_SITE_KEY not set — App Check disabled.')
    }
  }
  if (!_db) _db = getDatabase(_app)
  return _db
}
