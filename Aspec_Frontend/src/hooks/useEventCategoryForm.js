import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { createEventCategory, updateEventCategory } from '../services/adminEventCategories'
import { isHexColor } from '../utils/color'
import { EVENT_CATEGORY_TEXTS, getDefaultCategoryColor, getUsedColors, validateEventCategory } from '../utils/eventCategories'

/**
 * Estado e submissão do diálogo de criar/editar um tipo de evento. A cor é sempre uma das da paleta: um tipo novo
 * começa na primeira livre e um tipo existente na sua. A validação no browser repete as regras e frases do backend
 * (UX); os erros do nome só aparecem depois de sair do campo e os da cor aparecem logo.
 *
 * @param {{
 *   category: object|null,
 *   categories: object[],
 *   palette: {color: string, name: string}[],
 *   onSuccess: (message: string) => void,
 *   onStale: (message: string) => void,
 * }} options category é null ao criar; onStale é chamado na edição quando o tipo já não existe (404).
 * @returns {{
 *   name: string,
 *   setName: (value: string) => void,
 *   touch: (field: 'name') => void,
 *   color: string,
 *   setColor: (color: string) => void,
 *   usedColors: {id: string, name: string, color: string}[],
 *   errors: {name?: string, color?: string},
 *   formError: string,
 *   submitting: boolean,
 *   changed: boolean,
 *   canSubmit: boolean,
 *   submit: () => Promise<void>,
 *   focusField: {name: 'name'|'color', key: number}|null,
 * }}
 */
export default function useEventCategoryForm({ category, categories, palette, onSuccess, onStale }) {
  const isEditing = Boolean(category)
  const exceptId = category?.id
  const [color, setColorValue] = useState(() => (isEditing && isHexColor(category.color)
    ? category.color.toUpperCase()
    : getDefaultCategoryColor(categories, palette)))
  const [name, setNameValue] = useState(category?.name ?? '')
  const [touched, setTouched] = useState({ name: false })
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusField, setFocusField] = useState(null)
  const submittingRef = useRef(false)

  const usedColors = getUsedColors(categories, exceptId)
  const clientErrors = validateEventCategory({ name, color }, categories, exceptId, palette)

  const errors = {}
  const nameError = (touched.name && clientErrors.name) || serverErrors.name
  const colorError = clientErrors.color || serverErrors.color
  if (nameError) errors.name = nameError
  if (colorError) errors.color = colorError

  const changed = !isEditing
    || name.trim() !== (category.name ?? '').trim()
    || color !== (typeof category.color === 'string' ? category.color.toUpperCase() : '')

  const canSubmit = Object.keys(clientErrors).length === 0 && changed && !submitting

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
   * Aplica a cor escolhida na paleta.
   *
   * @param {string} next Cor #RRGGBB.
   */
  const setColor = (next) => {
    setColorValue(next)
    clearServerError('color')
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
    setColor,
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
