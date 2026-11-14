'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { callApi } from '@/lib/apiClient'

type Side = 'admin' | 'partner'
type ChatMessage = { id: string; sender: Side; body: string; created_at: string }

export type ChatLabels = {
  placeholder: string
  send: string
  empty: string
  loadError: string
  sendError: string
  otherName: string
}

const POLL_MS = 5000
const MAX_LENGTH = 2000

// Conversation between the admin and one partner. `me` is the side of the current user;
// the conversation is refreshed every few seconds while the chat is open.
export default function ChatBox({
  me,
  endpoint,
  labels,
  locale = 'de-DE',
  onLoaded,
}: {
  me: Side
  endpoint: string
  labels: ChatLabels
  locale?: string
  // Called when the conversation (and thereby the read state on the server) changed, e.g. to refresh badges.
  onLoaded?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | null>(null)
  const loadedCountRef = useRef<number | null>(null)
  const onLoadedRef = useRef(onLoaded)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  const load = useCallback(async () => {
    const res = await callApi<{ messages: ChatMessage[] }>(me, endpoint)
    if (res.ok && res.data) {
      const list = res.data.messages ?? []
      setMessages(list)
      setError('')
      if (loadedCountRef.current !== list.length) {
        loadedCountRef.current = list.length
        onLoadedRef.current?.()
      }
    } else if (res.status !== 401) {
      setError(res.data?.error ?? labels.loadError)
    }
    setLoading(false)
  }, [me, endpoint, labels.loadError])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  // Scroll to the newest message only when a new one arrives (not on every poll).
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null
    if (lastId !== lastIdRef.current) {
      lastIdRef.current = lastId
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    }
  }, [messages])

  async function send(e?: FormEvent) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    const res = await callApi<{ message: ChatMessage }>(me, endpoint, 'POST', { body })
    setSending(false)
    if (!res.ok || !res.data?.message) {
      setError(res.data?.error ?? labels.sendError)
      return
    }
    const message = res.data.message
    setMessages((prev) => [...prev, message])
    setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-[60vh] max-h-[520px] min-h-[320px] flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto rounded-xl bg-[#F5F5F0] p-3">
        {loading ? (
          <p className="pt-8 text-center text-sm text-primary/60">…</p>
        ) : messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-primary/60">{labels.empty}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === me
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine ? 'rounded-ee-sm bg-primary text-card' : 'rounded-es-sm bg-[#FFFFFF] text-primary'
                  }`}
                >
                  {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-70">{labels.otherName}</p>}
                  <p className="whitespace-pre-wrap break-words" dir="auto">
                    {m.body}
                  </p>
                  <p className={`mt-1 text-end text-[10px] ${mine ? 'text-card/70' : 'text-primary/50'}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          maxLength={MAX_LENGTH}
          rows={2}
          dir="auto"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-primary/15 bg-[#FFFFFF] px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label={labels.send}
          title={labels.send}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-card hover:bg-primary-hover disabled:opacity-50"
        >
          <Send className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  )
}
