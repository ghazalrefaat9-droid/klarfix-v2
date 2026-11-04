'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'
import { useLang } from '@/components/LanguageProvider'

const inputClass =
  'w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

type Props = {
  accountType: 'partner' | 'admin'
  loginHref: string
}

function ResetForm({ accountType, loginHref }: Props) {
  const params = useSearchParams()
  const { t } = useLang()
  const linkEmail = params.get('email') ?? ''
  const linkCode = params.get('code') ?? ''
  const fromLink = !!linkEmail && /^\d{6}$/.test(linkCode)

  const [step, setStep] = useState<'email' | 'code' | 'done'>(fromLink ? 'code' : 'email')
  const [email, setEmail] = useState(linkEmail)
  const [code, setCode] = useState(fromLink ? linkCode : '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const networkError = () =>
    t(
      'Netzwerkfehler. Bitte versuchen Sie es erneut.',
      'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
      'Network error. Please try again.',
    )

  // Server messages are German only, so translated messages are chosen by status code.
  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setCodeSent(false)
    const res = await fetch('/api/password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType, email }),
    }).catch(() => null)
    setLoading(false)

    if (!res) {
      setError(networkError())
      return
    }
    if (!res.ok) {
      setError(
        res.status === 400
          ? t('Bitte eine gültige E-Mail-Adresse eingeben.', 'يرجى إدخال بريد إلكتروني صالح.', 'Please enter a valid email address.')
          : res.status === 429
            ? t(
                'Bitte warten Sie eine Minute, bevor Sie einen neuen Code anfordern.',
                'يرجى الانتظار دقيقة قبل طلب رمز جديد.',
                'Please wait a minute before requesting a new code.',
              )
            : t(
                'Der Code konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.',
                'تعذّر إرسال الرمز. يرجى المحاولة لاحقاً.',
                'The code could not be sent. Please try again later.',
              ),
      )
      return
    }
    setCodeSent(true)
    setStep('code')
  }

  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('Die Passwörter stimmen nicht überein.', 'كلمتا المرور غير متطابقتين.', 'The passwords do not match.'))
      return
    }
    if (newPassword.length < 8) {
      setError(
        t(
          'Das neue Passwort muss mindestens 8 Zeichen lang sein.',
          'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
          'The new password must be at least 8 characters.',
        ),
      )
      return
    }
    setLoading(true)
    const res = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType, email, code, newPassword }),
    }).catch(() => null)
    setLoading(false)

    if (!res) {
      setError(networkError())
      return
    }
    if (!res.ok) {
      setError(
        res.status === 400
          ? t(
              'Der Code ist falsch oder abgelaufen. Bitte prüfen Sie ihn oder fordern Sie einen neuen an.',
              'الرمز غير صحيح أو منتهي الصلاحية. يرجى التحقق منه أو طلب رمز جديد.',
              'The code is wrong or expired. Please check it or request a new one.',
            )
          : res.status === 429
            ? t(
                'Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an.',
                'محاولات خاطئة كثيرة. يرجى طلب رمز جديد.',
                'Too many failed attempts. Please request a new code.',
              )
            : t(
                'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.',
                'تعذّر تغيير كلمة المرور. يرجى المحاولة مرة أخرى.',
                'The password could not be changed. Please try again.',
              ),
      )
      return
    }
    setStep('done')
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold text-primary">
        {t('Passwort zurücksetzen', 'إعادة تعيين كلمة المرور', 'Reset password')}
      </h1>

      {step === 'email' && (
        <form onSubmit={requestCode} className="space-y-5 rounded-xl bg-card p-6 shadow-sm">
          <p className="text-sm text-primary/80">
            {t(
              'Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen 6-stelligen Code.',
              'أدخل بريدك الإلكتروني وسنرسل لك رمزاً مكوناً من 6 أرقام.',
              'Enter your email address. We will send you a 6-digit code.',
            )}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('E-Mail', 'البريد الإلكتروني', 'Email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-card hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? t('Sende Code…', 'جارٍ إرسال الرمز…', 'Sending code…') : t('Code senden', 'إرسال الرمز', 'Send code')}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={resetPassword} className="space-y-5 rounded-xl bg-card p-6 shadow-sm">
          {codeSent && (
            <p className="rounded-lg bg-primary/5 p-3 text-sm text-primary">
              {t(
                'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Bestätigungscode gesendet. Bitte prüfen Sie Ihren Posteingang.',
                'إذا كان هناك حساب بهذا البريد الإلكتروني، فقد أرسلنا رمز تأكيد. يرجى التحقق من بريدك الوارد.',
                'If an account with this email exists, we have sent a confirmation code. Please check your inbox.',
              )}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('Bestätigungscode (6 Ziffern)', 'رمز التأكيد (6 أرقام)', 'Confirmation code (6 digits)')}
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('Neues Passwort (mind. 8 Zeichen)', 'كلمة المرور الجديدة (8 أحرف على الأقل)', 'New password (min. 8 characters)')}
            </label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('Neues Passwort bestätigen', 'تأكيد كلمة المرور الجديدة', 'Confirm new password')}
            </label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-card hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? t('Speichere…', 'جارٍ الحفظ…', 'Saving…') : t('Passwort speichern', 'حفظ كلمة المرور', 'Save password')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError('')
            }}
            className="w-full text-sm text-primary/70 hover:underline"
          >
            {t('Keinen Code erhalten? Erneut anfordern', 'لم يصلك الرمز؟ اطلبه مرة أخرى', "Didn't get a code? Request again")}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-5 rounded-xl bg-card p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-primary">
            {t('Ihr Passwort wurde geändert.', 'تم تغيير كلمة المرور الخاصة بك.', 'Your password has been changed.')}
          </p>
          <Link
            href={loginHref}
            className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-card hover:bg-primary-hover"
          >
            {t('Zum Login', 'إلى تسجيل الدخول', 'Go to login')}
          </Link>
        </div>
      )}
    </main>
  )
}

export default function PasswordResetForm(props: Props) {
  return (
    <Suspense fallback={null}>
      <ResetForm {...props} />
    </Suspense>
  )
}
