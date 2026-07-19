const STORAGE_KEY = 'faroe-hiking-unlock-hash'

// NOTE: this is a visitor-friendliness gate, not real security. The required
// hash ships inside the built JS bundle (like any client-side-only check must),
// so anyone who opens devtools and reads the source can find or brute-force it.
// It only deters casual/accidental visitors from a shared link — don't rely on
// it to protect anything sensitive.
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getRequiredHash() {
  return import.meta.env.VITE_SITE_PASSWORD_HASH || null
}

export function isUnlocked() {
  const required = getRequiredHash()
  if (!required) return true // gate not configured — don't lock anyone out
  return localStorage.getItem(STORAGE_KEY) === required
}

export async function tryUnlock(password) {
  const required = getRequiredHash()
  if (!required) return true

  const hash = await sha256Hex(password)
  if (hash !== required) return false

  localStorage.setItem(STORAGE_KEY, hash)
  return true
}
