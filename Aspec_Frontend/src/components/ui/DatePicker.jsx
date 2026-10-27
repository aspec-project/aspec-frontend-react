import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  WEEKDAY_HEADERS,
  addDays,
  addMonths,
  endOfWeek,
  formatDayLabel,
  formatMonthTitle,
  getMonthGrid,
  hasAllowedDay,
  isWithinRange,
  parseIsoDate,
  startOfWeek,
  toIsoDate,
  todayIso,
} from '../../utils/calendar'
import { formatShortDate } from '../../utils/dateFormat'

const navButtonClass = 'flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]'

const navEnabledClass = 'text-gray-600 hover:bg-gray-100'

const navDisabledClass = 'text-gray-300 cursor-not-allowed hover:bg-transparent'

const WEEKEND_SHORT = ['SÁB', 'DOM']

const footerButtonClass = 'rounded-md px-2 py-1 text-sm font-semibold text-[#0d1f35] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent'

/**
 * Mês e dia focado quando o calendário abre: o do valor; sem valor, hoje se estiver dentro dos limites;
 * senão o mês do mínimo (ou do máximo) com o primeiro dia permitido desse mês.
 *
 * @param {string} value Data escolhida (AAAA-MM-DD ou '').
 * @param {string} [min] Data mínima.
 * @param {string} [max] Data máxima.
 * @returns {string} Data AAAA-MM-DD a focar.
 */
function getInitialFocus(value, min, max) {
  if (parseIsoDate(value)) return value

  const today = todayIso()

  if (isWithinRange(today, min, max)) return today

  const anchor = parseIsoDate(min) ? min : parseIsoDate(max) ? max : today
  const { year, month } = parseIsoDate(anchor)
  const firstAllowed = getMonthGrid(year, month).flat().find((iso) => iso && isWithinRange(iso, min, max))

  return firstAllowed ?? toIsoDate(year, month, 1)
}

/**
 * Campo de data com calendário em popover (padrão WAI-ARIA "date picker dialog"): meses com setas, semana de
 * segunda a domingo, hoje marcado, "Hoje" e "Limpar data", teclado com setas/PageUp/PageDown/Home/End, Escape
 * fecha sem mudar e o foco volta ao botão. Dias fora dos limites riscados; setas desativadas quando o mês ao lado
 * não tem dias permitidos. Só devolve datas AAAA-MM-DD ou ''.
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   min?: string,
 *   max?: string,
 *   placeholder?: string,
 *   invalid?: boolean,
 *   describedBy?: string,
 * }} props
 * @param {import('react').Ref<HTMLButtonElement>} [ref] Permite pôr o foco no botão (ex.: depois de limpar os filtros).
 * @returns {JSX.Element}
 */
export default function DatePicker({ id, label, value, onChange, min, max, placeholder = '', invalid = false, describedBy, ref }) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState('')
  const containerRef = useRef(null)
  const openerRef = useRef(null)
  const popoverRef = useRef(null)
  const focusDayRef = useRef(false)
  const labelId = `${id}-label`
  const valueId = `${id}-value`
  const shortValue = formatShortDate(value)
  const today = todayIso()
  const view = parseIsoDate(focused)
  const dialogLabel = `Escolher ${label.charAt(0).toLowerCase()}${label.slice(1)}`
  const previousMonth = view ? parseIsoDate(addMonths(focused, -1)) : null
  const nextMonth = view ? parseIsoDate(addMonths(focused, 1)) : null
  const previousDisabled = previousMonth !== null && !hasAllowedDay(previousMonth.year, previousMonth.month, min, max)
  const nextDisabled = nextMonth !== null && !hasAllowedDay(nextMonth.year, nextMonth.month, min, max)

  useImperativeHandle(ref, () => openerRef.current, [])

  useEffect(() => {
    if (!open) return undefined

    /**
     * Fecha o calendário sem mudar quando se carrega fora do componente.
     *
     * @param {PointerEvent} event
     */
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open && focusDayRef.current) {
      focusDayRef.current = false
      popoverRef.current?.querySelector(`[data-date="${focused}"]`)?.focus()
    }
  }, [open, focused])

  /**
   * Abre o calendário no mês certo, com o foco no dia certo.
   */
  const openPicker = () => {
    focusDayRef.current = true
    setFocused(getInitialFocus(value, min, max))
    setOpen(true)
  }

  /**
   * Fecha o calendário e devolve o foco ao botão.
   */
  const closeAndFocus = () => {
    setOpen(false)
    openerRef.current?.focus()
  }

  /**
   * Escolhe uma data (ou '' para limpar) e fecha. Datas fora dos limites não se escolhem.
   *
   * @param {string} iso
   */
  const select = (iso) => {
    if (iso !== '' && !isWithinRange(iso, min, max)) return
    onChange(iso)
    closeAndFocus()
  }

  /**
   * Muda o mês mostrado, mantendo o dia focado dentro desse mês (sem lhe dar o foco).
   *
   * @param {number} months
   */
  const changeMonth = (months) => {
    setFocused((current) => addMonths(current, months))
  }

  /**
   * Teclado na grelha: ←/→ ±1 dia, ↑/↓ ±7, Home/End início/fim da semana, PageUp/PageDown mês anterior/seguinte.
   *
   * @param {import('react').KeyboardEvent} event
   */
  const handleGridKeyDown = (event) => {
    const moves = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => startOfWeek(focused),
      End: () => endOfWeek(focused),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    }
    const move = moves[event.key]

    if (!move) return

    event.preventDefault()
    focusDayRef.current = true
    setFocused(move())
  }

  /**
   * Escape fecha sem mudar (sem chegar aos elementos à volta) e Tab/Shift+Tab mantêm o foco no calendário.
   *
   * @param {import('react').KeyboardEvent} event
   */
  const handlePopoverKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeAndFocus()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(popoverRef.current.querySelectorAll('button:not(:disabled)')).filter((element) => element.tabIndex >= 0)

    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <span id={labelId} className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      <button
        ref={openerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${invalid ? 'border-red-400' : 'border-gray-200'}`}
      >
        <span id={valueId} className={shortValue ? 'text-gray-800' : 'text-gray-400'}>{shortValue || placeholder}</span>
        <CalendarDays size={16} aria-hidden="true" className="ml-auto shrink-0 text-[#8a7043]" />
      </button>

      {open && view && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          onKeyDown={handlePopoverKeyDown}
          className="absolute left-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mês anterior"
              aria-disabled={previousDisabled ? 'true' : undefined}
              onClick={() => !previousDisabled && changeMonth(-1)}
              className={`${navButtonClass} ${previousDisabled ? navDisabledClass : navEnabledClass}`}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-[#0d1f35]">{formatMonthTitle(view.year, view.month)}</p>
            <button
              type="button"
              aria-label="Mês seguinte"
              aria-disabled={nextDisabled ? 'true' : undefined}
              onClick={() => !nextDisabled && changeMonth(1)}
              className={`${navButtonClass} ${nextDisabled ? navDisabledClass : navEnabledClass}`}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <table role="grid" onKeyDown={handleGridKeyDown} className="mt-3 w-full table-fixed border-collapse text-center text-sm">
            <thead>
              <tr>
                {WEEKDAY_HEADERS.map((weekday) => (
                  <th key={weekday.short} scope="col" className={`pb-2 text-[11px] font-semibold ${WEEKEND_SHORT.includes(weekday.short) ? 'text-[#8a7043]' : 'text-gray-400'}`}>
                    <abbr title={weekday.long} className="no-underline">{weekday.short}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getMonthGrid(view.year, view.month).map((week) => (
                <tr key={week.find(Boolean)}>
                  {week.map((iso, index) => {
                    if (!iso) return <td key={`empty-${index}`} />

                    const isSelected = iso === value
                    const isToday = iso === today
                    const isDisabled = !isWithinRange(iso, min, max)

                    return (
                      <td key={iso} aria-selected={isSelected ? 'true' : undefined} className="p-0.5">
                        <button
                          type="button"
                          data-date={iso}
                          tabIndex={iso === focused ? 0 : -1}
                          aria-label={formatDayLabel(iso)}
                          aria-current={isToday ? 'date' : undefined}
                          aria-disabled={isDisabled ? 'true' : undefined}
                          onClick={() => select(iso)}
                          className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#315a79] ${isSelected ? 'bg-[#0d1f35] font-semibold text-white' : isDisabled ? 'cursor-not-allowed text-gray-300 line-through' : 'font-medium text-[#0d1f35] hover:bg-[#f5f3ee] focus:bg-[#f5f3ee]'}`}
                        >
                          {parseIsoDate(iso).day}
                          {isToday && (
                            <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#8a7043]'}`} />
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <div className="flex gap-1">
              <button type="button" disabled={!isWithinRange(today, min, max)} onClick={() => select(today)} className={footerButtonClass}>
                Hoje
              </button>
              {value && (
                <button type="button" onClick={() => select('')} className={footerButtonClass}>
                  Limpar data
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">Use as setas do teclado</p>
          </div>
        </div>
      )}
    </div>
  )
}
