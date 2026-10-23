import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { createAdminEvent, geocodeAddress, updateAdminEvent } from '../services/adminEvents'
import {
  EMPTY_EVENT_FORM,
  EVENT_EDIT_TEXTS,
  EVENT_FIELD_ORDER,
  EVENT_FORM_MESSAGES,
  buildEventPayload,
  buildEventUpdatePayload,
  eventToFormValues,
  formatMissingFields,
  getChangedEventFields,
  getEventFormErrors,
  getMissingEventFields,
  getSavedGeocode,
  mapEventServerErrors,
} from '../utils/adminEventForm'

const IDLE_GEOCODE = { status: 'idle', result: null, message: '', query: null }

/**
 * Estado e envio do formulário de evento do backoffice: valores, campos em falta, erros do browser e do
 * servidor, verificação opcional da morada no mapa e criação ou edição do evento.
 * Sem `event` cria um evento novo; com `event` (item da lista) edita-o: começa com os dados dele e a
 * localização guardada, só deixa guardar com alterações, aceita uma justificação para os inscritos e
 * chama `onStale` quando o evento já decorreu (409) ou já não existe (404).
 *
 * @param {{
 *   onSuccess: (message: string) => void,
 *   onStale?: (message: string) => void,
 *   event?: object|null,
 * }} options onSuccess recebe a mensagem da API depois de guardar; onStale a mensagem a mostrar na página.
 * @returns {{
 *   values: typeof EMPTY_EVENT_FORM,
 *   setField: (name: string, value: string) => void,
 *   setFormat: (isOnline: boolean) => void,
 *   missingFields: string[],
 *   errors: Record<string, string>,
 *   formError: string,
 *   submitting: boolean,
 *   canSubmit: boolean,
 *   footerMessage: string,
 *   submit: () => Promise<void>,
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: object|null, message: string, query: object|null},
 *   verifyAddress: () => Promise<void>,
 *   focusField: {name: string, key: number}|null,
 *   isEditing: boolean,
 *   hasChanges: boolean,
 *   justification: string,
 *   setJustification: (value: string) => void,
 *   registrationsCount: number|null,
 * }}
 */
export default function useEventForm({ onSuccess, onStale, event = null }) {
  const isEditing = Boolean(event)
  const [initialValues] = useState(() => (event ? eventToFormValues(event) : EMPTY_EVENT_FORM))
  const [values, setValues] = useState(initialValues)
  const [justification, setJustificationValue] = useState('')
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [geocode, setGeocode] = useState(() => (event ? getSavedGeocode(event) : IDLE_GEOCODE))
  const [focusField, setFocusField] = useState(null)
  const submittingRef = useRef(false)
  const geocodeControllerRef = useRef(null)

  useEffect(() => () => geocodeControllerRef.current?.abort(), [])

  const registrationsCount = Number.isInteger(event?.registrations_count) && event.registrations_count >= 0
    ? event.registrations_count
    : null
  const missingFields = getMissingEventFields(values)
  const browserErrors = getEventFormErrors(values, undefined, isEditing ? { initialValues, registrationsCount } : undefined)
  const hasBrowserErrors = Object.keys(browserErrors).length > 0
  const hasChanges = !isEditing || getChangedEventFields(initialValues, values).length > 0
  const canSubmit = missingFields.length === 0 && !hasBrowserErrors && hasChanges && !submitting
  const footerMessage = missingFields.length > 0
    ? formatMissingFields(missingFields)
    : hasBrowserErrors ? EVENT_FORM_MESSAGES.fixErrors : !hasChanges ? EVENT_EDIT_TEXTS.noChanges : ''

  /**
   * Descarta a verificação da morada e cancela o pedido pendente.
   */
  const resetGeocode = () => {
    geocodeControllerRef.current?.abort()
    geocodeControllerRef.current = null
    setGeocode(IDLE_GEOCODE)
  }

  /**
   * Apaga o erro do servidor de um campo.
   *
   * @param {string} name Nome do campo.
   */
  const clearServerError = (name) => {
    setServerErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  /**
   * Muda um campo e apaga o erro do servidor desse campo e a mensagem geral. Mudar a morada ou a delegação
   * descarta a verificação (as coordenadas deixam de corresponder ao que está escrito).
   *
   * @param {string} name Nome do campo (chave de EMPTY_EVENT_FORM).
   * @param {string} value Novo valor.
   */
  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    clearServerError(name)
    setFormError('')

    if (name === 'address' || name === 'locationId') {
      resetGeocode()
    }
  }

  /**
   * Muda a justificação enviada aos inscritos e apaga o erro do servidor dela e a mensagem geral.
   *
   * @param {string} value Novo texto.
   */
  const setJustification = (value) => {
    setJustificationValue(value)
    clearServerError('justification')
    setFormError('')
  }

  /**
   * Muda o formato sem apagar o que já foi escrito (o payload escolhe os campos pelo formato).
   *
   * @param {boolean} isOnline true para online, false para presencial.
   */
  const setFormat = (isOnline) => {
    setValues((current) => ({ ...current, isOnline }))
  }

  /**
   * Pede ao modal que foque o primeiro campo com erro, pela ordem do formulário.
   *
   * @param {Record<string, string>} fieldErrors Erros por campo.
   */
  const focusFirstInvalid = (fieldErrors) => {
    const name = EVENT_FIELD_ORDER.find((field) => field in fieldErrors)

    if (name) {
      setFocusField((current) => ({ name, key: (current?.key ?? 0) + 1 }))
    }
  }

  /**
   * Cria ou atualiza o evento (um só pedido de cada vez). Em erro, o formulário fica com os valores e mostra
   * as mensagens da API junto aos campos ou na mensagem geral; na edição, um 409 ou um 404 do evento
   * chamam `onStale`.
   *
   * @returns {Promise<void>}
   */
  const submit = async () => {
    if (submittingRef.current || !canSubmit) return

    submittingRef.current = true
    setSubmitting(true)
    setFormError('')
    setServerErrors({})

    try {
      const response = isEditing
        ? await updateAdminEvent(event.id, buildEventUpdatePayload(values, geocode, justification))
        : await createAdminEvent(buildEventPayload(values, geocode))
      onSuccess(response.message)
    } catch (err) {
      if (axios.isCancel(err)) return

      const { status, message, fieldErrors } = normalizeError(err)

      if (status === 422) {
        const mapped = mapEventServerErrors(fieldErrors)
        setServerErrors(mapped.fieldErrors)
        setFormError([message, ...mapped.unmatched].join(' '))
        focusFirstInvalid(mapped.fieldErrors)
      } else if (isEditing && status === 409) {
        onStale?.(message)
      } else if (isEditing && status === 404 && message !== EVENT_EDIT_TEXTS.addressNotFound) {
        onStale?.(EVENT_EDIT_TEXTS.notFound)
      } else if (status === 404) {
        setServerErrors({ address: message })
        focusFirstInvalid({ address: message })
      } else {
        setFormError(message)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  /**
   * Localiza a morada escrita (com a delegação, quando escolhida) e guarda os dados usados no pedido, para as
   * coordenadas só seguirem enquanto a morada e a delegação não mudarem.
   *
   * @returns {Promise<void>}
   */
  const verifyAddress = async () => {
    const address = values.address.trim()

    if (address === '' || geocode.status === 'loading') return

    geocodeControllerRef.current?.abort()
    const controller = new AbortController()
    geocodeControllerRef.current = controller
    const query = { address, locationId: values.locationId }
    setGeocode({ ...IDLE_GEOCODE, status: 'loading' })

    try {
      const result = await geocodeAddress(address, values.locationId, controller.signal)
      if (controller.signal.aborted) return
      setGeocode({ status: 'found', result, message: '', query })
    } catch (err) {
      if (controller.signal.aborted || axios.isCancel(err)) return
      const { message, fieldErrors } = normalizeError(err)
      setGeocode({ ...IDLE_GEOCODE, status: 'error', message: fieldErrors.address ?? message })
    } finally {
      if (geocodeControllerRef.current === controller) {
        geocodeControllerRef.current = null
      }
    }
  }

  return {
    values,
    setField,
    setFormat,
    missingFields,
    errors: { ...browserErrors, ...serverErrors },
    formError,
    submitting,
    canSubmit,
    footerMessage,
    submit,
    geocode,
    verifyAddress,
    focusField,
    isEditing,
    hasChanges,
    justification,
    setJustification,
    registrationsCount,
  }
}
