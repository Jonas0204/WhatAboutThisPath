import { useState } from 'react'
import { isUnlocked, tryUnlock } from '../lib/passwordGate.js'

export default function PasswordGate({ children }) {
  // Disabled entirely in dev — this only guards the deployed site.
  const [unlocked, setUnlocked] = useState(() => import.meta.env.DEV || isUnlocked())
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (unlocked) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setChecking(true)
    setError(false)
    const ok = await tryUnlock(password)
    setChecking(false)
    if (ok) setUnlocked(true)
    else setError(true)
  }

  return (
    <div className="password-gate">
      <form className="password-gate__card" onSubmit={handleSubmit}>
        <h1 className="password-gate__title">Faroe Islands Hiking Tracks</h1>
        <p className="password-gate__hint">This site is password-protected.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="password-gate__input"
        />
        {error && <p className="password-gate__error">Incorrect password.</p>}
        <button type="submit" className="password-gate__submit" disabled={checking}>
          {checking ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
