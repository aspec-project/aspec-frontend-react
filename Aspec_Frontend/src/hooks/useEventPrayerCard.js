import { useCallback, useEffect, useRef, useState } from 'react'
import { isCancel } from 'axios'
import useSessionRequest from './useSessionRequest'
import { getOwnPrayerCard, saveOwnPrayerCard } from '../services/prayerCards'
import { getMemberProfile } from '../services/memberProfile'
import { normalizeError } from '../services/api'

export function prayerCardError(error) {
  const status = error?.response?.status
  if (status === 403) return 'Não tem permissão para preencher o cartão. Confirme a sua inscrição e o perfil de membro.'
  if (status === 404) return 'O cartão de oração já não está disponível neste evento.'
  if (status === 409) return 'O prazo de preenchimento mudou. Consulte o estado atualizado do cartão.'
  if (status === 422) return 'Verifique os campos assinalados.'
  if ([419, 429].includes(status)) return normalizeError({ response: { status } }).message
  return 'Não foi possível carregar ou guardar o cartão de oração. Tente novamente.'
}

export default function useEventPrayerCard(eventId) {
  const getContext = useSessionRequest()
  const [result, setResult] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const sequence = useRef(0)
  const busy = useRef(false)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    const context = getContext()
    if (!context) return
    const controller = new AbortController()
    const request = ++sequence.current
    const current = () => !controller.signal.aborted && !context.signal.aborted && sequence.current === request
    queueMicrotask(() => {
      if (current()) { setLoading(true); setLoadError('') }
    })
    getOwnPrayerCard(eventId, controller.signal, context).then((data) => {
      if (current()) setResult(data)
    }).catch((error) => {
      if (current() && !isCancel(error)) {
        setLoadError(prayerCardError(error))
        if ([403, 404].includes(error.response?.status)) setResult(null)
      }
    }).finally(() => { if (current()) setLoading(false) })
    getMemberProfile({ ...context, signal: AbortSignal.any([controller.signal, context.signal]) }).then((data) => {
      if (current()) { setProfile(data); setProfileError('') }
    }).catch((error) => {
      if (current() && !isCancel(error)) setProfileError('Não foi possível carregar os dados do perfil. Tente novamente.')
    })
    return () => controller.abort()
  }, [eventId, getContext, attempt])

  useEffect(() => {
    const refresh = () => { if (!busy.current) retry() }
    window.addEventListener('focus', refresh)
    const boundary = result?.window?.status === 'not_open' ? result.window.opens_at : result?.window?.status === 'open' ? result.window.closes_at : null
    const remaining = boundary ? Date.parse(boundary) - Date.now() + 1000 : NaN
    const timer = Number.isFinite(remaining) && remaining > 0 ? setTimeout(refresh, Math.min(remaining, 2147483647)) : undefined
    return () => { window.removeEventListener('focus', refresh); clearTimeout(timer) }
  }, [result, retry])

  async function save(payload) {
    const context = getContext()
    if (busy.current || !context) return { success: false, cancelled: true }
    busy.current = true
    sequence.current += 1
    setSaving(true)
    setLoading(false)
    try {
      const data = await saveOwnPrayerCard(eventId, payload, undefined, context)
      if (context.signal.aborted) return { success: false, cancelled: true }
      setResult(data)
      setLoadError('')
      return { success: true }
    } catch (error) {
      if (isCancel(error) || context.signal.aborted) return { success: false, cancelled: true }
      if ([403, 404].includes(error.response?.status)) setResult(null)
      if ([403, 404, 409].includes(error.response?.status)) retry()
      const fields = normalizeError(error).fieldErrors
      return { success: false, message: prayerCardError(error), fields }
    } finally {
      busy.current = false
      if (!context.signal.aborted) setSaving(false)
    }
  }

  return { result, profile, profileError, loadError, loading, saving, retry, save }
}
