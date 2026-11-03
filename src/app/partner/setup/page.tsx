'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, FileUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useLang } from '@/components/LanguageProvider'
import PasswordInput from '@/components/PasswordInput'
import {
  checkDocument,
  DOCUMENT_RULES,
  DOCUMENTS_BUCKET,
  fileExtension,
  MIN_PASSWORD_LENGTH,
  type DocumentKind,
} from '@/lib/partnerDocuments'

const inputClass =
  'mt-1 w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type Info = { fullName: string; email: string; folder: string }

function SetupForm() {
  const token = useSearchParams().get('token') ?? ''
  const { t } = useLang()

  const [info, setInfo] = useState<Info | null>(null)
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [files, setFiles] = useState<Record<DocumentKind, File | null>>({ gewerbe: null, haftpflicht: null, logo: null })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const invalidLink = t(
    'Dieser Link ist ungültig oder wurde bereits verwendet.',
    'هذا الرابط غير صالح أو تم استخدامه مسبقاً.',
    'This link is invalid or has already been used.',
  )

  useEffect(() => {
    if (!token) return
    fetch(`/api/partner/setup?token=${encodeURIComponent(token)}`)
      .then(async (res) => (res.ok ? setInfo((await res.json()) as Info) : setLinkError('invalid')))
      .catch(() => setLinkError('invalid'))
  }, [token])

  const documents: { kind: DocumentKind; label: string; hint: string }[] = [
    {
      kind: 'gewerbe',
      label: t('Gewerbenachweis *', 'إثبات تسجيل النشاط التجاري *', 'Business registration *'),
      hint: t('PDF oder JPG, max. 5 MB', 'PDF أو JPG، بحد أقصى 5 ميغابايت', 'PDF or JPG, max. 5 MB'),
    },
    {
      kind: 'haftpflicht',
      label: t('Haftpflichtversicherung *', 'تأمين المسؤولية *', 'Liability insurance *'),
      hint: t('PDF oder JPG, max. 5 MB', 'PDF أو JPG، بحد أقصى 5 ميغابايت', 'PDF or JPG, max. 5 MB'),
    },
    {
      kind: 'logo',
      label: t('Logo (optional)', 'الشعار (اختياري)', 'Logo (optional)'),
      hint: t('JPG, PNG oder WebP, max. 5 MB', 'JPG أو PNG أو WebP، بحد أقصى 5 ميغابايت', 'JPG, PNG or WebP, max. 5 MB'),
    },
  ]

  function pickFile(kind: DocumentKind, file: File | null) {
    setError('')
    const problem = file ? checkDocument(file, kind) : null
    if (problem === 'type') {
      setError(
        kind === 'logo'
          ? t('Logo: nur JPG, PNG oder WebP.', 'الشعار: JPG أو PNG أو WebP فقط.', 'Logo: JPG, PNG or WebP only.')
          : t('Bitte nur PDF oder JPG hochladen.', 'يرجى رفع ملف PDF أو JPG فقط.', 'Please upload PDF or JPG only.'),
      )
    } else if (problem === 'size') {
      setError(t('Die Datei ist zu groß (max. 5 MB).', 'الملف كبير جداً (الحد الأقصى 5 ميغابايت).', 'The file is too large (max. 5 MB).'))
    }
    setFiles((prev) => ({ ...prev, [kind]: problem ? null : file }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!info) return
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('Das Passwort muss mindestens 8 Zeichen lang sein.', 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.', 'The password must be at least 8 characters.'))
      return
    }
    if (!files.gewerbe || !files.haftpflicht) {
      setError(
        t(
          'Bitte Gewerbenachweis und Haftpflichtversicherung hochladen.',
          'يرجى رفع إثبات النشاط التجاري وتأمين المسؤولية.',
          'Please upload your business registration and liability insurance.',
        ),
      )
      return
    }

    setSaving(true)
    const paths: Partial<Record<DocumentKind, string>> = {}
    for (const kind of ['gewerbe', 'haftpflicht', 'logo'] as DocumentKind[]) {
      const file = files[kind]
      if (!file) continue
      const path = `${info.folder}/${kind}-${crypto.randomUUID()}.${fileExtension(file.type)}`
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) {
        setSaving(false)
        setError(t('Upload fehlgeschlagen. Bitte erneut versuchen.', 'فشل الرفع. يرجى المحاولة مرة أخرى.', 'Upload failed. Please try again.'))
        return
      }
      paths[kind] = path
    }

    const res = await fetch('/api/partner/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, files: paths }),
    }).catch(() => null)
    const data = (await res?.json().catch(() => null)) as { error?: string } | null
    setSaving(false)

    if (!res?.ok) {
      setError(data?.error ?? t('Speichern fehlgeschlagen.', 'فشل الحفظ.', 'Saving failed.'))
      return
    }
    setDone(true)
  }

  if (!token || linkError) {
    return <p className="mt-8 rounded-2xl bg-card p-6 text-center text-primary shadow-sm">{invalidLink}</p>
  }
  if (!info) {
    return <p className="mt-8 text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</p>
  }
  if (done) {
    return (
      <div className="mt-8 rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-primary/10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-4 text-xl font-bold text-primary">
          {t('Konto eingerichtet!', 'تم إعداد الحساب!', 'Account set up!')}
        </h2>
        <p className="mt-2 text-sm text-primary/75">
          {t(
            'Wir prüfen Ihre Dokumente und schalten Ihr Profil frei. Sie können sich schon jetzt anmelden.',
            'سنراجع مستنداتك ونفعّل ملفك. يمكنك تسجيل الدخول الآن.',
            'We will review your documents and activate your profile. You can log in now.',
          )}
        </p>
        <Link
          href="/partner/login"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-card hover:bg-primary-hover"
        >
          {t('Zum Login', 'تسجيل الدخول', 'Go to login')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-primary/10 sm:p-8">
      <div className="rounded-lg bg-background p-3 text-sm text-primary">
        <span className="font-semibold">{info.fullName}</span> · {info.email}
      </div>

      <label className="block text-sm font-medium">
        {t('Passwort *', 'كلمة المرور *', 'Password *')}
        <PasswordInput
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-primary/60">
          {t('Mindestens 8 Zeichen', '8 أحرف على الأقل', 'At least 8 characters')}
        </span>
      </label>

      {documents.map((doc) => {
        const file = files[doc.kind]
        return (
          <div key={doc.kind}>
            <span className="block text-sm font-medium">{doc.label}</span>
            <label
              className={`mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-sm ${
                file ? 'border-primary bg-primary/5' : 'border-primary/30 hover:bg-primary/5'
              }`}
            >
              {file ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <FileUp className="h-5 w-5 shrink-0 text-primary/60" />}
              <span className="min-w-0 flex-1 truncate">
                {file ? file.name : t('Datei auswählen', 'اختر ملفاً', 'Choose file')}
              </span>
              <span className="shrink-0 text-xs text-primary/60">{doc.hint}</span>
              <input
                type="file"
                accept={DOCUMENT_RULES[doc.kind].accept}
                onChange={(e) => pickFile(doc.kind, e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>
        )
      })}

      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
      >
        {saving ? t('Wird hochgeladen…', 'جارٍ الرفع…', 'Uploading…') : t('Konto einrichten', 'إعداد الحساب', 'Set up account')}
      </button>
    </form>
  )
}

export default function PartnerSetupPage() {
  const { t } = useLang()
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-primary">{t('Partnerkonto einrichten', 'إعداد حساب الشريك', 'Set up partner account')}</h1>
      <p className="mt-2 text-sm text-primary/75">
        {t(
          'Nur noch 3 Schritte: Passwort, Gewerbenachweis und Haftpflichtversicherung.',
          '3 خطوات فقط: كلمة المرور، إثبات النشاط التجاري وتأمين المسؤولية.',
          'Just 3 steps: password, business registration and liability insurance.',
        )}
      </p>
      <Suspense fallback={null}>
        <SetupForm />
      </Suspense>
    </main>
  )
}
