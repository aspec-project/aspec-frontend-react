import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { EVENT_FORM_MESSAGES } from '../../utils/adminEventForm'
import { SEGMENT_MAX, joinTime, splitTime, stepSegment, typeDigit, typeText } from '../../utils/timeSegments'

const SEGMENT_NAMES = { hours: 'horas', minutes: 'minutos' }

const SEPARATORS = [':', '.', ',']

/**
 * Campo de hora de 24 h com duas caixas, horas e minutos, separadas por ":". Escrever dígitos preenche as
 * horas e salta para os minutos (ex.: "1","9" → 19; "9" → 09; "2","5" → 05); ↑/↓ somam ou subtraem 1 com
 * volta; ←/→ e Tab mudam de caixa; Backspace/Delete limpam a caixa (Backspace nos minutos vazios volta às
 * horas); outras teclas de um carácter são ignoradas. Texto colado ou de teclados de telemóvel segue as
 * mesmas regras. Quem chama só recebe uma hora `HH:MM` completa ou ''. Ao sair do campo com só uma caixa
 * preenchida aparece o erro de hora incompleta, que desaparece na próxima mudança.
 *
 * @param {{
 *   id: string,
 *   name?: string,
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   invalid?: boolean,
 *   describedBy?: string,
 *   required?: boolean,
 *   disabled?: boolean,
 * }} props value é `HH:MM` ou ''; label dá nome às caixas ("<label>, horas" / "<label>, minutos").
 * @returns {JSX.Element}
 */
export default function TimeInput({ id, name, label, value, onChange, invalid = false, describedBy, required = false, disabled = false }) {
  const [segments, setSegments] = useState(() => splitTime(value))
  const [syncedValue, setSyncedValue] = useState(value)
  const [incomplete, setIncomplete] = useState(false)
  const pendingRef = useRef(false)
  const hoursRef = useRef(null)
  const minutesRef = useRef(null)
  const frameRef = useRef(null)
  const refs = { hours: hoursRef, minutes: minutesRef }
  const errorId = `${id}-format-error`
  const describedIds = [describedBy, incomplete && errorId].filter(Boolean).join(' ') || undefined
  const isInvalid = invalid || incomplete

  // Valor mudado por fora (ex.: dados da edição): só substitui as caixas se estas não formarem já esse valor.
  if (value !== syncedValue) {
    setSyncedValue(value)

    if (joinTime(segments) !== value) {
      setSegments(splitTime(value))
      setIncomplete(false)
    }
  }

  // O valor da caixa com foco muda a cada tecla e o browser perderia a seleção.
  useEffect(() => {
    const active = document.activeElement

    if (active === hoursRef.current || active === minutesRef.current) {
      active.select()
    }
  }, [segments])

  /**
   * Guarda as caixas, apaga o erro de incompleto, envia a hora formada e, se indicado, foca outra caixa.
   *
   * @param {{hours: string, minutes: string}} nextSegments Novas caixas.
   * @param {'hours'|'minutes'} [focusTarget] Caixa a focar.
   */
  const update = (nextSegments, focusTarget) => {
    setSegments(nextSegments)
    setIncomplete(false)
    onChange(joinTime(nextSegments))

    if (focusTarget) {
      refs[focusTarget].current?.focus()
    }
  }

  /**
   * Trata as teclas de uma caixa (dígitos, separador, setas, Backspace/Delete) e bloqueia os outros
   * caracteres. Tab, Escape, Enter e atalhos com Ctrl/Meta/Alt seguem o comportamento normal.
   *
   * @param {'hours'|'minutes'} segment Caixa.
   * @param {import('react').KeyboardEvent<HTMLInputElement>} event
   */
  const handleKeyDown = (segment, event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const { key } = event
    const current = segments[segment]

    if (/^\d$/.test(key)) {
      event.preventDefault()
      const result = typeDigit(current, segment, pendingRef.current, key)

      pendingRef.current = result.pending
      update({ ...segments, [segment]: result.value }, result.advance ? 'minutes' : undefined)
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault()
      pendingRef.current = false
      update({ ...segments, [segment]: stepSegment(current, segment, key === 'ArrowUp' ? 1 : -1) })
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault()

      if (key === 'ArrowRight' && segment === 'hours') minutesRef.current?.focus()
      if (key === 'ArrowLeft' && segment === 'minutes') hoursRef.current?.focus()
    } else if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      pendingRef.current = false

      if (current !== '') {
        update({ ...segments, [segment]: '' })
      } else if (key === 'Backspace' && segment === 'minutes') {
        hoursRef.current?.focus()
      }
    } else if (SEPARATORS.includes(key)) {
      event.preventDefault()

      if (segment === 'hours' && current !== '') minutesRef.current?.focus()
    } else if (key.length === 1) {
      event.preventDefault()
    }
  }

  /**
   * Plano B para teclados de telemóvel e para colar: aplica os dígitos do texto novo com as mesmas regras.
   * Texto vazio limpa a caixa; texto sem dígitos é ignorado.
   *
   * @param {'hours'|'minutes'} segment Caixa.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleChange = (segment, event) => {
    const text = event.target.value

    if (text === '') {
      pendingRef.current = false
      update({ ...segments, [segment]: '' })

      return
    }

    if (!/\d/.test(text)) return

    const result = typeText(segments, segment, pendingRef.current, text)

    pendingRef.current = result.pending
    update(result.segments, result.segment !== segment ? result.segment : undefined)
  }

  /**
   * Ao sair do campo inteiro, assinala a hora incompleta (só uma caixa preenchida).
   *
   * @param {import('react').FocusEvent<HTMLDivElement>} event
   */
  const handleBlur = (event) => {
    if (frameRef.current?.contains(event.relatedTarget)) return

    pendingRef.current = false
    setIncomplete((segments.hours === '') !== (segments.minutes === ''))
  }

  /**
   * Carregar na moldura fora das caixas foca as horas.
   *
   * @param {import('react').MouseEvent<HTMLDivElement>} event
   */
  const handleFrameMouseDown = (event) => {
    if (disabled || event.target !== event.currentTarget) return

    event.preventDefault()
    hoursRef.current?.focus()
  }

  /**
   * Seleciona o texto todo da caixa e recomeça a escrita nela.
   *
   * @param {import('react').SyntheticEvent<HTMLInputElement>} event
   */
  const handleFocus = (event) => {
    pendingRef.current = false
    event.target.select()
  }

  /**
   * Propriedades de uma caixa.
   *
   * @param {'hours'|'minutes'} segment Caixa.
   * @returns {object}
   */
  const boxProps = (segment) => {
    const boxValue = segments[segment]

    return {
      ref: refs[segment],
      type: 'text',
      role: 'spinbutton',
      inputMode: 'numeric',
      autoComplete: 'off',
      spellCheck: false,
      maxLength: 2,
      placeholder: '--',
      value: boxValue,
      onChange: (event) => handleChange(segment, event),
      onKeyDown: (event) => handleKeyDown(segment, event),
      onFocus: handleFocus,
      onClick: (event) => event.target.select(),
      disabled,
      'aria-label': `${label}, ${SEGMENT_NAMES[segment]}`,
      'aria-valuemin': 0,
      'aria-valuemax': SEGMENT_MAX[segment],
      'aria-valuenow': boxValue === '' ? undefined : Number(boxValue),
      'aria-valuetext': boxValue === '' ? 'Sem valor' : boxValue,
      'aria-invalid': isInvalid ? 'true' : undefined,
      'aria-required': required ? 'true' : undefined,
      'aria-describedby': describedIds,
      className: 'w-[2.5ch] bg-transparent p-0 text-center text-sm tabular-nums text-gray-800 placeholder:text-gray-400 selection:bg-[#315a79] selection:text-white focus:rounded focus:bg-[#e3ebf2] focus:outline-none disabled:cursor-not-allowed',
    }
  }

  return (
    <div>
      <div
        ref={frameRef}
        onBlur={handleBlur}
        onMouseDown={handleFrameMouseDown}
        className={`relative flex h-11 w-full items-center gap-0.5 rounded-lg border px-3 pr-9 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#315a79] ${disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-text bg-white'} ${isInvalid ? 'border-red-400' : 'border-gray-200'}`}
      >
        <input id={id} name={name} {...boxProps('hours')} />
        <span aria-hidden="true" className="pointer-events-none text-gray-400">:</span>
        <input id={`${id}-minutes`} {...boxProps('minutes')} />
        <Clock size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7043]" />
      </div>
      {incomplete && <p id={errorId} className="mt-1 text-sm text-red-700">{EVENT_FORM_MESSAGES.timeIncomplete}</p>}
    </div>
  )
}
