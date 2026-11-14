'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'
import { useLang } from '@/components/LanguageProvider'
import { WELCOME_FLAG } from '@/components/partner/WelcomeSplash'

const inputClass =
  'w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function PartnerLoginPage() {
  const router = useRouter()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/partner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).catch(() => null)
    setLoading(false)

    if (!res || !res.ok) {
      // Server messages are German only, so show a translated message based on the status code.
      const status = res?.status
      setError(
        status === 401
          ? t('E-Mail oder Passwort ist falsch.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'Email or password is incorrect.')
          : status === 403
            ? t(
                'Ihr Partnerkonto ist gesperrt. Bitte kontaktieren Sie uns.',
                'حساب الشريك الخاص بك محظور. يرجى التواصل معنا.',
                'Your partner account is blocked. Please contact us.',
              )
            : status === 400
              ? t('E-Mail und Passwort sind erforderlich.', 'البريد الإلكتروني وكلمة المرور مطلوبان.', 'Email and password are required.')
              : t(
                  'Fehler beim Login. Bitte versuchen Sie es erneut.',
                  'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                  'Login failed. Please try again.',
                ),
      )
      return
    }

    const partner = (await res.json()) as { id: string; company_name: string; email: string }
    localStorage.setItem('partner', JSON.stringify(partner))
    sessionStorage.setItem(WELCOME_FLAG, '1')
    router.push('/partner/dashboard')
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold text-primary">{t('Partner-Login', 'دخول الشركاء', 'Partner login')}</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-card p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('E-Mail', 'البريد الإلكتروني', 'Email')}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('Passwort', 'كلمة المرور', 'Password')}</label>
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-primary">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 font-semibold text-card hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t('Prüfe…', 'جارٍ التحقق…', 'Checking…') : t('Einloggen', 'تسجيل الدخول', 'Log in')}
        </button>
        <Link href="/partner/passwort-vergessen" className="block text-center text-sm text-primary hover:underline">
          {t('Passwort vergessen?', 'نسيت كلمة المرور؟', 'Forgot password?')}
        </Link>
      </form>
    </main>
  )
}
