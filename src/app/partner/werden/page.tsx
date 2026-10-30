'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import AddressAutocomplete, { type AddressPick } from '@/components/AddressAutocomplete'
import PasswordInput from '@/components/PasswordInput'

const SERVICES = ['Wohnungsreinigung', 'Büroreinigung', 'Fensterreinigung', 'Grundreinigung']
const LEGAL_FORMS = ['Einzelunternehmen', 'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'Sonstige']
const EMPLOYEE_COUNTS = ['1', '2–5', '6–10', '11–50', 'Über 50']
const LANGUAGES = ['Deutsch', 'Englisch', 'Türkisch', 'Arabisch', 'Russisch', 'Polnisch', 'Rumänisch', 'Italienisch']
const AVAILABILITY = ['Vollzeit', 'Teilzeit', 'Nur Wochenende', 'Nach Absprache']
const STEPS = ['Persönlich', 'Unternehmen', 'Abschluss']

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30 sm:py-2 sm:text-sm'

type Form = {
  firstName: string
  lastName: string
  email: string
  phone: string
  addressText: string
  street: string
  city: string
  postcode: string
  companyName: string
  legalForm: string
  employeeCount: string
  hasLiabilityInsurance: boolean | null
  hasTradeLicense: boolean | null
  experienceYears: string
  services: string[]
  logoName: string
  licenseName: string
  description: string
  website: string
  languages: string[]
  availability: string
  password: string
  passwordConfirm: string
  termsAccepted: boolean
}

type Errors = Partial<Record<keyof Form, string>>

const EMPTY: Form = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressText: '',
  street: '',
  city: '',
  postcode: '',
  companyName: '',
  legalForm: '',
  employeeCount: '',
  hasLiabilityInsurance: null,
  hasTradeLicense: null,
  experienceYears: '',
  services: [],
  logoName: '',
  licenseName: '',
  description: '',
  website: '',
  languages: [],
  availability: '',
  password: '',
  passwordConfirm: '',
  termsAccepted: false,
}

const REQUIRED_MSG = 'Dieses Feld ist erforderlich.'

function validateStep(step: number, f: Form): Errors {
  const e: Errors = {}
  if (step === 1) {
    if (!f.firstName.trim()) e.firstName = REQUIRED_MSG
    if (!f.lastName.trim()) e.lastName = REQUIRED_MSG
    if (!f.email.trim()) e.email = REQUIRED_MSG
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Bitte eine gültige E-Mail eingeben.'
    if (!f.phone.trim()) e.phone = REQUIRED_MSG
    if (!f.street.trim()) e.addressText = 'Bitte Adresse eingeben oder aus den Vorschlägen wählen.'
    if (!/^\d{5}$/.test(f.postcode.trim())) e.postcode = 'Bitte eine gültige PLZ (5 Ziffern) eingeben.'
  }
  if (step === 2) {
    if (!f.companyName.trim()) e.companyName = REQUIRED_MSG
    if (!f.legalForm) e.legalForm = REQUIRED_MSG
    if (!f.employeeCount) e.employeeCount = REQUIRED_MSG
    if (f.hasLiabilityInsurance === null) e.hasLiabilityInsurance = 'Bitte auswählen.'
    if (f.hasTradeLicense === null) e.hasTradeLicense = 'Bitte auswählen.'
  }
  if (step === 3) {
    if (f.password.length < 8) e.password = 'Mindestens 8 Zeichen.'
    if (f.passwordConfirm !== f.password) e.passwordConfirm = 'Die Passwörter stimmen nicht überein.'
    if (!f.termsAccepted) e.termsAccepted = 'Bitte akzeptieren Sie die AGB.'
  }
  return e
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800">
        {label}
        {required && ' *'}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-2">
      {[
        { v: true, label: 'Ja' },
        { v: false, label: 'Nein' },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-lg border py-3 text-sm font-medium transition-colors duration-200 ${
            value === o.v
              ? 'border-[#0F60C6] bg-[#0F60C6] text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-[#0F60C6]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm transition-colors hover:border-[#0F60C6]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#0F60C6]" />
      {label}
    </label>
  )
}

function FileInput({ fileName, accept, onFile, label }: { fileName: string; accept: string; onFile: (name: string) => void; label: string }) {
  return (
    <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 transition-colors hover:border-[#0F60C6]">
      <Upload size={18} className="shrink-0" />
      <span className="truncate">{fileName || label}</span>
      <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0]?.name ?? '')} />
    </label>
  )
}

function Progress({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <li key={label} className={`flex items-center ${n < STEPS.length ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                  done
                    ? 'bg-green-500 text-white'
                    : active
                      ? 'bg-[#0F60C6] text-white ring-4 ring-[#0F60C6]/20'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? <Check size={18} /> : n}
              </span>
              <span className={`text-xs ${active ? 'font-semibold text-[#0F60C6]' : done ? 'text-green-600' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <span className={`mx-2 mb-5 h-1 flex-1 rounded transition-colors duration-300 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function PartnerRegisterPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleIn(key: 'services' | 'languages', item: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(item) ? f[key].filter((x) => x !== item) : [...f[key], item],
    }))
  }

  function handleAddressText(text: string) {
    setForm((f) => ({ ...f, addressText: text, street: text }))
  }

  function applyAddress(pick: AddressPick) {
    setForm((f) => ({
      ...f,
      street: pick.street || f.street,
      city: pick.city || f.city,
      postcode: pick.postcode || f.postcode,
    }))
  }

  function goNext() {
    const e = validateStep(step, form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setStep((s) => Math.min(s + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const v = validateStep(3, form)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setSubmitting(true)
    setServerError('')
    const res = await fetch('/api/partner/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        street: form.street,
        city: form.city,
        postcode: form.postcode,
        companyName: form.companyName,
        legalForm: form.legalForm,
        employeeCount: form.employeeCount,
        hasLiabilityInsurance: form.hasLiabilityInsurance,
        hasTradeLicense: form.hasTradeLicense,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        services: form.services,
        description: form.description,
        website: form.website,
        languages: form.languages,
        availability: form.availability,
        password: form.password,
        termsAccepted: form.termsAccepted,
      }),
    })
    setSubmitting(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setServerError(data.error ?? 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.')
      return
    }
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Vielen Dank, {form.firstName}!</h1>
          <p className="mt-3 text-lg font-semibold text-green-700">Wir prüfen Ihre Angaben in 24 Stunden.</p>
          <p className="mt-2 text-gray-600">Sie erhalten eine Bestätigung an {form.email}, sobald Ihr Profil freigeschaltet ist.</p>
          <Link
            href="/partner/login"
            className="mt-8 inline-block w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 sm:w-auto sm:px-8"
          >
            Zum Partner-Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <h1 className="mb-2 text-3xl font-bold text-[#0F60C6]">Partner werden</h1>
      <p className="mb-8 text-gray-600">In 3 Schritten zu Ihrem Partner-Profil und neuen Aufträgen.</p>

      <Progress current={step} />

      <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        {step === 1 && (
          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Ihre persönlichen Daten</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Vorname" required error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Nachname" required error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
              </Field>
              <Field label="E-Mail" required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Telefon" required error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
              </Field>
            </div>

            <Field label="Straße, Stadt" required error={errors.addressText}>
              <AddressAutocomplete
                value={form.addressText}
                onChange={handleAddressText}
                onSelect={applyAddress}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">Mindestens 2 Buchstaben eingeben und einen Vorschlag wählen.</p>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="PLZ" required error={errors.postcode}>
                <input
                  inputMode="numeric"
                  maxLength={5}
                  value={form.postcode}
                  onChange={(e) => set('postcode', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Stadt">
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Ihr Unternehmen</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Firmenname" required error={errors.companyName}>
                <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Rechtsform" required error={errors.legalForm}>
                <select value={form.legalForm} onChange={(e) => set('legalForm', e.target.value)} className={inputClass}>
                  <option value="">Bitte wählen</option>
                  {LEGAL_FORMS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mitarbeiterzahl" required error={errors.employeeCount}>
                <select value={form.employeeCount} onChange={(e) => set('employeeCount', e.target.value)} className={inputClass}>
                  <option value="">Bitte wählen</option>
                  {EMPLOYEE_COUNTS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Berufserfahrung in Jahren (optional)">
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={form.experienceYears}
                  onChange={(e) => set('experienceYears', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Haftpflichtversicherung vorhanden?" required error={errors.hasLiabilityInsurance}>
                <YesNo value={form.hasLiabilityInsurance} onChange={(v) => set('hasLiabilityInsurance', v)} />
              </Field>
              <Field label="Gewerbeanmeldung vorhanden?" required error={errors.hasTradeLicense}>
                <YesNo value={form.hasTradeLicense} onChange={(v) => set('hasTradeLicense', v)} />
              </Field>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-800">Reinigungsarten (optional)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <Checkbox key={s} label={s} checked={form.services.includes(s)} onChange={() => toggleIn('services', s)} />
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Logo (optional)">
                <FileInput fileName={form.logoName} accept="image/*" label="Datei auswählen" onFile={(n) => set('logoName', n)} />
              </Field>
              <Field label="Gewerbenachweis (optional)">
                <FileInput fileName={form.licenseName} accept=".pdf,image/*" label="Datei auswählen" onFile={(n) => set('licenseName', n)} />
              </Field>
            </div>

            <Field label="Beschreibung (optional)">
              <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputClass} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Website (optional)">
                <input type="url" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Verfügbarkeit (optional)">
                <select value={form.availability} onChange={(e) => set('availability', e.target.value)} className={inputClass}>
                  <option value="">Bitte wählen</option>
                  {AVAILABILITY.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-800">Sprachen (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = form.languages.includes(l)
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleIn('languages', l)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ${
                        on ? 'border-[#0F60C6] bg-[#0F60C6] text-white' : 'border-gray-300 text-gray-700 hover:border-[#0F60C6]'
                      }`}
                    >
                      {l}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Zugang und Abschluss</h2>
            <Field label="Passwort" required error={errors.password}>
              <PasswordInput
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Passwort bestätigen" required error={errors.passwordConfirm}>
              <PasswordInput
                autoComplete="new-password"
                value={form.passwordConfirm}
                onChange={(e) => set('passwordConfirm', e.target.value)}
                className={inputClass}
              />
            </Field>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => set('termsAccepted', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#0F60C6]"
                />
                <span>Ich akzeptiere die AGB und die Datenschutzerklärung. *</span>
              </label>
              {errors.termsAccepted && <p className="mt-1 text-xs text-red-600">{errors.termsAccepted}</p>}
            </div>

            {serverError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</p>}
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
              Zurück
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center justify-center gap-1 rounded-lg bg-[#0F60C6] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Weiter
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#0F60C6] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Wird gesendet…' : 'Registrierung abschließen'}
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
