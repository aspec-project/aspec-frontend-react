import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { createEventCategory, updateEventCategory } from '../services/adminEventCategories'
import { hexToHsv, hexToRgb, hsvToHex, hsvToRgb, isHexColor, normalizeHexColor, rgbToHex } from '../utils/color'
import { EVENT_CATEGORY_TEXTS, getDefaultCategoryColor, getUsedColors, validateEventCategory } from '../utils/eventCategories'

/**
 * Converte canais RGB nos textos dos três campos numéricos.
 *
 * @param {{r: number, g: number, b: number}} rgb Canais de 0 a 255.
 * @returns {{r: string, g: string, b: string}}
 */
function toRgbInputs({ r, g, b }) {
  return { r: String(r), g: String(g), b: String(b) }
}

/**
 * Indica se o texto de um campo RGB é um inteiro de 0 a 255.
 *
 * @param {string} text Texto do campo.
 * @returns {boolean}
 */
function isRgbText(text) {
  return /^\d{1,3}$/.test(text) && Number(text) <= 255
}

/**
 * Estado e submissão do diálogo de criar/editar um tipo de evento. O estado mestre da cor é HSV (a roda e a
 * Luminosidade mexem nele); o hexadecimal e o RGB derivam dele e, quando são escritos e válidos, atualizam-no
 * (num cinzento mantém-se a matiz anterior). A cor enviada é sempre a do HSV, e só quando coincide com o
 * hexadecimal escrito e o RGB é válido. A validação no browser repete as regras e frases do backend (UX); os
 * erros do nome só aparecem depois de sair do campo e os da cor aparecem logo.
 *
 * @param {{
 *   category: object|null,
 *   categories: object[],
 *   onSuccess: (message: string) => void,
 *   onStale: (message: string) => void,
 * }} options category é null ao criar; onStale é chamado na edição quando o tipo já não existe (404).
 * @returns {{
 *   name: string,
 *   setName: (value: string) => void,
 *   touch: (field: 'name') => void,
 *   color: string,
 *   hsv: {h: number, s: number, v: number},
 *   hexInput: string,
 *   rgbInputs: {r: string, g: string, b: string},
 *   setHsv: (hsv: {h: number, s: number, v: number}) => void,
 *   setHexInput: (text: string) => void,
 *   setRgbInput: (channel: 'r'|'g'|'b', text: string) => void,
 *   usedColors: {id: string, name: string, color: string}[],
 *   errors: {name?: string, color?: string, rgb?: string},
 *   formError: string,
 *   submitting: boolean,
 *   changed: boolean,
 *   canSubmit: boolean,
 *   submit: () => Promise<void>,
 *   focusField: {name: 'name'|'color', key: number}|null,
 * }}
 */
export default function useEventCategoryForm({ category, categories, onSuccess, onStale }) {
  const isEditing = Boolean(category)
  const exceptId = category?.id
  const [initialColor] = useState(() => (isEditing && isHexColor(category.color)
    ? category.color.toUpperCase()
    : getDefaultCategoryColor(categories)))
  const [name, setNameValue] = useState(category?.name ?? '')
  const [hsv, setHsvValue] = useState(() => hexToHsv(initialColor))
  const [hexInput, setHexText] = useState(initialColor)
  const [rgbInputs, setRgbInputs] = useState(() => toRgbInputs(hexToRgb(initialColor)))
  const [touched, setTouched] = useState({ name: false })
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusField, setFocusField] = useState(null)
  const submittingRef = useRef(false)

  const color = hsvToHex(hsv)
  const usedColors = getUsedColors(categories, exceptId)
  const clientErrors = validateEventCategory({ name, color: hexInput }, categories, exceptId)
  const rgbInvalid = !Object.values(rgbInputs).every(isRgbText)
  const colorMatchesInput = normalizeHexColor(hexInput) === color

  const errors = {}
  const nameError = (touched.name && clientErrors.name) || serverErrors.name
  const colorError = clientErrors.color || serverErrors.color
  if (nameError) errors.name = nameError
  if (colorError) errors.color = colorError
  if (rgbInvalid) errors.rgb = EVENT_CATEGORY_TEXTS.rgbError

  const changed = !isEditing
    || name.trim() !== (category.name ?? '').trim()
    || color !== (typeof category.color === 'string' ? category.color.toUpperCase() : '')

  const canSubmit = Object.keys(clientErrors).length === 0 && !rgbInvalid && colorMatchesInput && changed && !submitting

  /**
   * Remove o erro do servidor de um campo, quando o admin o volta a mexer.
   *
   * @param {'name'|'color'} field
   */
  const clearServerError = (field) => {
    setServerErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /**
   * Aplica uma cor HSV (roda e Luminosidade) e atualiza o hexadecimal e o RGB.
   *
   * @param {{h: number, s: number, v: number}} next
   */
  const setHsv = (next) => {
    setHsvValue(next)
    setHexText(hsvToHex(next))
    setRgbInputs(toRgbInputs(hsvToRgb(next)))
    clearServerError('color')
  }

  /**
   * Guarda o texto do hexadecimal e, se for válido, normaliza-o e atualiza o HSV e o RGB.
   *
   * @param {string} text
   */
  const setHexInput = (text) => {
    const normalized = normalizeHexColor(text)
    clearServerError('color')

    if (normalized === null) {
      setHexText(text)
      return
    }

    setHexText(normalized)
    setHsvValue(hexToHsv(normalized, hsv.h))
    setRgbInputs(toRgbInputs(hexToRgb(normalized)))
  }

  /**
   * Guarda o texto de um canal RGB e, quando os três são válidos, atualiza o hexadecimal e o HSV.
   *
   * @param {'r'|'g'|'b'} channel
   * @param {string} text
   */
  const setRgbInput = (channel, text) => {
    const next = { ...rgbInputs, [channel]: text }
    setRgbInputs(next)
    clearServerError('color')

    if (!Object.values(next).every(isRgbText)) return

    const hex = rgbToHex({ r: Number(next.r), g: Number(next.g), b: Number(next.b) })
    setHexText(hex)
    setHsvValue(hexToHsv(hex, hsv.h))
  }

  /**
   * Cria ou atualiza o tipo (um só pedido de cada vez). Num 422 mostra os erros junto aos campos e foca o
   * primeiro; na edição, um 404 chama `onStale`; nos outros erros mostra a mensagem dentro do diálogo.
   *
   * @returns {Promise<void>}
   */
  const submit = async () => {
    if (submittingRef.current || !canSubmit) return

    submittingRef.current = true
    setSubmitting(true)
    setFormError('')
    setServerErrors({})

    const payload = { name: name.trim(), color }

    try {
      const response = isEditing
        ? await updateEventCategory(category.id, payload)
        : await createEventCategory(payload)
      onSuccess(response.message)
    } catch (err) {
      if (axios.isCancel(err)) return

      const { status, message, fieldErrors } = normalizeError(err)

      if (status === 422 && (fieldErrors.name || fieldErrors.color)) {
        const next = {}
        if (fieldErrors.name) next.name = fieldErrors.name
        if (fieldErrors.color) next.color = fieldErrors.color
        setServerErrors(next)
        setFocusField((current) => ({ name: next.name ? 'name' : 'color', key: (current?.key ?? 0) + 1 }))
      } else if (isEditing && status === 404) {
        onStale(EVENT_CATEGORY_TEXTS.notFound)
      } else {
        setFormError(message)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return {
    name,
    setName: (value) => {
      setNameValue(value)
      clearServerError('name')
    },
    touch: (field) => setTouched((current) => ({ ...current, [field]: true })),
    color,
    hsv,
    hexInput,
    rgbInputs,
    setHsv,
    setHexInput,
    setRgbInput,
    usedColors,
    errors,
    formError,
    submitting,
    changed,
    canSubmit,
    submit,
    focusField,
  }
}
