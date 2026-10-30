'use client'

import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-16`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        className="absolute inset-y-0 right-0 mr-1 my-1 rounded-md px-3 text-xs font-medium text-[#0F60C6] hover:bg-blue-50"
      >
        {visible ? 'Verbergen' : 'Anzeigen'}
      </button>
    </div>
  )
}
