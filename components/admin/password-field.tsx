'use client'

import { useState } from 'react'

/**
 * Password field with a show/hide toggle.
 *
 * Typing a long password blind is the usual reason a sign-in fails, and the
 * message Supabase returns ("Invalid login credentials") cannot say which part
 * was wrong. Letting her reveal what she typed turns a dead end into a fix.
 */
export default function PasswordField() {
  const [visible, setVisible] = useState(false)

  return (
    <label>
      Password
      <span className="password-field">
        <input
          type={visible ? 'text' : 'password'}
          name="password"
          required
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
}
