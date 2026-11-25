import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Documents change under someone's eyes: an approver signs, and the requester's
// history should say so without a refresh. One Supabase Realtime channel on the
// submissions table serves every page that shows documents; the database only
// sends a person the rows they may read (RLS), and each page just loads its
// list again — the event is the signal, not the data.
//
// Needs the table in the supabase_realtime publication
// (supabase/2026-11-25-realtime-submissions.sql). Without it no event arrives,
// and the list still catches up whenever the tab comes back to the front.

type Listener = (id: string | null) => void
const listeners = new Set<Listener>()
let channel: RealtimeChannel | null = null

function connect() {
  // Tests and the demo build run on a stand-in client with no realtime.
  if (channel || typeof supabase.channel !== 'function' || import.meta.env.MODE === 'test') return
  channel = supabase
    .channel('submissions-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
      const row = (payload.new && 'id' in payload.new ? payload.new : payload.old) as { id?: string } | undefined
      listeners.forEach(fn => fn(row?.id ?? null))
    })
    .subscribe()
}
function disconnect() {
  if (!channel || listeners.size > 0) return
  supabase.removeChannel(channel)
  channel = null
}

/** Call `reload` when a document changes (or, with `onlyId`, when that one does),
 *  and when the tab comes back to the front. Bursts — a send to three people is
 *  three writes — are folded into one reload. */
export function useLiveSubmissions(reload: () => void, onlyId?: string): void {
  const latest = useRef(reload)
  latest.current = reload

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const soon = () => { clearTimeout(timer); timer = setTimeout(() => latest.current(), 400) }
    const listener: Listener = id => { if (!onlyId || !id || id === onlyId) soon() }
    const whenVisible = () => { if (document.visibilityState === 'visible') soon() }

    listeners.add(listener)
    connect()
    document.addEventListener('visibilitychange', whenVisible)
    window.addEventListener('focus', whenVisible)
    return () => {
      clearTimeout(timer)
      listeners.delete(listener)
      document.removeEventListener('visibilitychange', whenVisible)
      window.removeEventListener('focus', whenVisible)
      disconnect()
    }
  }, [onlyId])
}
