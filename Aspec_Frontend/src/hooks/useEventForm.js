import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { createAdminEvent, geocodeAddress } from '../services/adminEvents'
import {
  EMPTY_EVENT_FORM,
  EVENT_FIELD_ORDER,
  EVENT_FORM_MESSAGES,
  buildEventPayload,
  formatMissingFields,
  getEventFormErrors,
  getMissingEventFields,
  mapEventServerErrors,
} from '../utils/adminEventForm'

const IDLE_GEOCODE = { status: 'idle', result: null, message: '', query: null }

/**
 * Estado e envio do formulário de evento do backoffice: valores, campos em falta, erros do browser e do
 * servidor, verificação opcional da morada no mapa e criação do evento.
 *
 * @param {{onSuccess: (message: string) => void}} options onSuccess recebe a mensagem da API depois de criar.
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
 *   geocode: {status: 'idle'|'loading'|'found'|'error', result: object|null, message: string, query: object|null},
 *   verifyAddress: () => Promise<void>,
 *   focusField: {name: string, key: number}|null,
 * }}
 */
export default function useEventForm({ onSuccess }) {
  const [values, setValues] = useState(EMPTY_EVENT_FORM)
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [geocode, setGeocode] = useState(IDLE_GEOCODE)
  const [focusField, setFocusField] = useState(null)
  const submittingRef = useRef(false)
  const geocodeControllerRef = useRef(null)

  useEffect(() => () => geocodeControllerRef.current?.abort(), [])

  const missingFields = getMissingEventFields(values)
  const browserErrors = getEventFormErrors(values)
  const hasBrowserErrors = Object.keys(browserErrors).length > 0
  const canSubmit = missingFields.length === 0 && !hasBrowserErrors && !submitting
  const footerMessage = missingFields.length > 0
    ? formatMissingFields(missingFields)
    : hasBrowserErrors ? EVENT_FORM_MESSAGES.fixErrors : ''

  /**
   * Descarta a verificação da morada e cancela o pedido pendente.
   */
  const resetGeocode = () => {
    geocodeControllerRef.current?.abort()
    geocodeControllerRef.current = null
    setGeocode(IDLE_GEOCODE)
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
    setServerErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setFormError('')

    if (name === 'address' || name === 'locationId') {
      resetGeocode()
    }
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
   * Cria o evento (um só pedido de cada vez). Em erro, o formulário fica com os valores e mostra as mensagens
   * da API junto aos campos ou na mensagem geral.
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
      const response = await createAdminEvent(buildEventPayload(values, geocode))
      onSuccess(response.message)
    } catch (err) {
      if (axios.isCancel(err)) return

      const { status, message, fieldErrors } = normalizeError(err)

      if (status === 422) {
        const mapped = mapEventServerErrors(fieldErrors)
        setServerErrors(mapped.fieldErrors)
        setFormError([message, ...mapped.unmatched].join(' '))
        focusFirstInvalid(mapped.fieldErrors)
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
  }
}
