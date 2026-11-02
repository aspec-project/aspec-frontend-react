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
  needsLocationConfirmation,
} from '../utils/adminEventForm'
import { getSeriesSessions } from '../utils/adminEventSeries'

const IDLE_GEOCODE = { status: 'idle', result: null, message: '', query: null, confirmed: false }

/**
 * Estado e envio do formulário de evento do backoffice: valores, campos em falta, erros do browser e do
 * servidor, verificação opcional da morada no mapa e criação ou edição do evento.
 * Sem `event` cria um evento novo; com `event` (item da lista) edita-o: começa com os dados dele e a
 * localização guardada, só deixa guardar com alterações, pede sempre confirmação antes do pedido (onde o
 * admin pode escrever uma justificação para os inscritos) e chama `onStale` quando o evento já decorreu
 * (409) ou já não existe (404). Na criação de uma série (`isRecurring`), o envio abre primeiro a confirmação
 * "Criar série de eventos?" e qualquer erro do pedido fecha-a; `seriesSessions` tem as sessões calculadas a
 * partir da 1.ª data, da última e da frequência (para a pré-visualização e a confirmação). Quando a
 * verificação da morada encontra um local aproximado, só deixa guardar depois de o admin o confirmar
 * (`confirmLocation`); a confirmação é só da interface e não segue no pedido.
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
 *   setRepetition: (isRecurring: boolean) => void,
 *   seriesSessions: {dates: string[], tooMany: boolean},
 *   missingFields: string[],
 *   errors: Record<string, string>,
 *   formError: string,
 *   submitting: boolean,
 *   canSubmit: boolean,
 *   footerMessage: string,
 *   submit: (justification?: string) => Promise<void>,
 *   requestSubmit: () => void,
 *   confirmSubmit: (justification: string) => Promise<void>,
 *   cancelConfirm: () => void,
 *   confirming: boolean,
 *   confirmError: string,
 *   initialValues: typeof EMPTY_EVENT_FORM,
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: object|null, message: string, query: object|null, confirmed?: boolean},
 *   verifyAddress: () => Promise<void>,
 *   confirmLocation: () => void,
 *   focusField: {name: string, key: number}|null,
 *   isEditing: boolean,
 *   hasChanges: boolean,
 *   registrationsCount: number|null,
 * }}
 */
export default function useEventForm({ onSuccess, onStale, event = null }) {
  const isEditing = Boolean(event)
  const [initialValues] = useState(() => (event ? eventToFormValues(event) : EMPTY_EVENT_FORM))
  const [values, setValues] = useState(initialValues)
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [geocode, setGeocode] = useState(() => (event ? getSavedGeocode(event) : IDLE_GEOCODE))
  const [focusField, setFocusField] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const submittingRef = useRef(false)
  const geocodeControllerRef = useRef(null)

  useEffect(() => () => geocodeControllerRef.current?.abort(), [])

  const registrationsCount = Number.isInteger(event?.registrations_count) && event.registrations_count >= 0
    ? event.registrations_count
    : null
  const missingFields = getMissingEventFields(values)
  const browserErrors = getEventFormErrors(values, undefined, isEditing ? { initialValues, registrationsCount } : undefined)
  const hasBrowserErrors = Object.keys(browserErrors).length > 0
  const seriesSessions = getSeriesSessions(values.eventDate, values.seriesEndsOn, values.frequency)
  const hasChanges = !isEditing || getChangedEventFields(initialValues, values).length > 0
  const needsConfirmation = needsLocationConfirmation(values, geocode)
  const canSubmit = missingFields.length === 0 && !hasBrowserErrors && hasChanges && !needsConfirmation && !submitting
  const footerMessage = missingFields.length > 0
    ? formatMissingFields(missingFields)
    : !hasChanges
      ? EVENT_EDIT_TEXTS.noChanges
      : needsConfirmation ? EVENT_FORM_MESSAGES.confirmLocation : ''

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
   * Muda o formato sem apagar o que já foi escrito (o payload escolhe os campos pelo formato).
   *
   * @param {boolean} isOnline true para online, false para presencial.
   */
  const setFormat = (isOnline) => {
    setValues((current) => ({ ...current, isOnline }))
  }

  /**
   * Muda a repetição (pontual ou recorrente) sem apagar o que já foi escrito: voltar a pontual recupera a
   * data limite de inscrição escolhida antes (o payload escolhe os campos pela repetição).
   *
   * @param {boolean} isRecurring true para recorrente, false para pontual.
   */
  const setRepetition = (isRecurring) => {
    setValues((current) => ({ ...current, isRecurring }))
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
   * Cria ou atualiza o evento (um só pedido de cada vez). Em erro, o formulário fica com os valores. Na
   * criação, qualquer erro fecha a confirmação da série (quando está aberta). Na edição (com a confirmação aberta): um 422 só da justificação, um 403/429/5xx ou uma falha de rede deixam
   * a confirmação aberta com a mensagem; um 422 de outros campos ou um 404 da morada fecham-na e assinalam os
   * campos; um 409 ou um 404 do evento chamam `onStale`.
   *
   * @param {string} [justification] Justificação para os inscritos (só na edição).
   * @returns {Promise<void>}
   */
  const submit = async (justification = '') => {
    if (submittingRef.current || !canSubmit) return

    submittingRef.current = true
    setSubmitting(true)
    setFormError('')
    setConfirmError('')
    setServerErrors({})

    try {
      const response = isEditing
        ? await updateAdminEvent(event.id, buildEventUpdatePayload(values, geocode, justification))
        : await createAdminEvent(buildEventPayload(values, geocode))
      onSuccess(response.message)
    } catch (err) {
      if (axios.isCancel(err)) return

      if (!isEditing) {
        setConfirming(false)
      }

      const { status, message, fieldErrors } = normalizeError(err)

      if (status === 422) {
        const { fieldErrors: mapped, unmatched } = mapEventServerErrors(fieldErrors)
        const { justification: justificationError, ...eventErrors } = mapped

        if (justificationError && Object.keys(eventErrors).length === 0 && unmatched.length === 0) {
          setConfirmError(justificationError)
          return
        }

        setConfirming(false)
        setServerErrors(eventErrors)
        /* Os erros já associados a um campo aparecem junto desse campo. */
        setFormError(
          unmatched.length > 0
            ? unmatched.join(' ')
            : Object.keys(eventErrors).length === 0 && !justificationError
              ? message
              : justificationError ?? '',
        )
        focusFirstInvalid(eventErrors)
      } else if (isEditing && status === 409) {
        onStale?.(message)
      } else if (isEditing && status === 404 && message !== EVENT_EDIT_TEXTS.addressNotFound) {
        onStale?.(EVENT_EDIT_TEXTS.notFound)
      } else if (status === 404) {
        setConfirming(false)
        setServerErrors({ address: message })
        focusFirstInvalid({ address: message })
      } else if (isEditing) {
        setConfirmError(message)
      } else {
        setFormError(message)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  /**
   * Envio do formulário: na criação de um pontual faz logo o pedido; na criação de uma série abre a
   * confirmação da série; na edição abre a confirmação das alterações.
   */
  const requestSubmit = () => {
    if (submittingRef.current || !canSubmit) return

    if (!isEditing && !values.isRecurring) {
      submit('')
      return
    }

    setConfirmError('')
    setConfirming(true)
  }

  /**
   * Confirma o envio: na edição guarda o evento com a justificação escrita na confirmação; na criação de uma
   * série cria-a.
   *
   * @param {string} justification Texto escrito (vazio quando não há inscritos ou na criação).
   * @returns {Promise<void>}
   */
  const confirmSubmit = (justification) => submit(justification)

  /**
   * Fecha a confirmação e volta ao formulário, exceto durante o pedido.
   */
  const cancelConfirm = () => {
    if (submittingRef.current) return

    setConfirming(false)
    setConfirmError('')
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
      setGeocode({ status: 'found', result, message: '', query, confirmed: false })
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

  /**
   * Confirma (ou desfaz a confirmação de) um local aproximado encontrado na verificação da morada.
   */
  const confirmLocation = () => {
    setGeocode((current) => (
      current.status === 'found' && current.result?.approximate === true
        ? { ...current, confirmed: !current.confirmed }
        : current
    ))
  }

  return {
    values,
    setField,
    setFormat,
    setRepetition,
    seriesSessions,
    missingFields,
    errors: { ...browserErrors, ...serverErrors },
    formError,
    submitting,
    canSubmit,
    footerMessage,
    submit,
    requestSubmit,
    confirmSubmit,
    cancelConfirm,
    confirming,
    confirmError,
    initialValues,
    geocode,
    verifyAddress,
    confirmLocation,
    focusField,
    isEditing,
    hasChanges,
    registrationsCount,
  }
}
