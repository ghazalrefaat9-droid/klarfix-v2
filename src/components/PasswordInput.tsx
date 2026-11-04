'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const { t } = useLang()

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pe-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={
          visible
            ? t('Passwort verbergen', 'إخفاء كلمة المرور', 'Hide password')
            : t('Passwort anzeigen', 'إظهار كلمة المرور', 'Show password')
        }
        className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-primary/70 transition-colors duration-200 hover:text-primary-hover"
      >
        <span className="transition-transform duration-200 active:scale-90">
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </span>
      </button>
    </div>
  )
}
