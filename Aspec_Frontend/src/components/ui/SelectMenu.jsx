import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

/**
 * Lista de escolha com aspeto próprio (padrão WAI-ARIA "select-only combobox"): o foco fica sempre no botão,
 * as setas mudam a opção realçada, Enter/Espaço escolhem, Escape e Tab fecham sem mudar, e o clique fora fecha.
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   value: string,
 *   options: {value: string, label: string}[],
 *   onChange: (value: string) => void,
 *   disabled?: boolean,
 *   name?: string,
 *   labelId?: string,
 *   placeholder?: string,
 *   invalid?: boolean,
 *   describedBy?: string,
 *   required?: boolean,
 *   variant?: 'default' | 'public-filter',
 * }} props A primeira opção pode ter value '' (ex.: "Todos os tipos"). Num formulário: `name` vai para o
 * botão; com `labelId` a label é de fora (não desenha a sua) e liga-se ao botão por `aria-labelledby`, e a lista chama-se "Opções de {label}"; `placeholder`
 * aparece a cinzento quando o valor não está nas opções (não é uma opção da lista); `invalid`,
 * `describedBy` e `required` dão `aria-invalid`, `aria-describedby` e `aria-required`.
 * @returns {JSX.Element}
 */
export default function SelectMenu({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  name,
  labelId,
  placeholder,
  invalid = false,
  describedBy,
  required = false,
  variant = 'default',
}) {
  const publicFilter = variant === 'public-filter'
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [menuPlacement, setMenuPlacement] = useState({ above: false, maxHeight: 288 })
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const typeaheadRef = useRef({ text: '', timestamp: 0 })
  const ownLabelId = `${id}-label`
  const labelledBy = labelId ?? ownLabelId
  const listboxId = `${id}-listbox`
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selected = options.find((option) => option.value === value) ?? (placeholder === undefined ? options[0] : null)

  useEffect(() => {
    if (!open) return undefined

    /**
     * Fecha a lista quando se carrega fora do componente.
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
    if (open) listRef.current?.children[highlighted]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, highlighted])

  useEffect(() => {
    if (!open || !publicFilter) return undefined

    /*
     * Mantém o menu dentro da janela e abre-o acima quando falta espaço abaixo,
     * tal como o posicionamento do dropdown na referência do Figma.
     */
    const updatePlacement = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = Math.max(0, window.innerHeight - rect.bottom - 14)
      const above = Math.max(0, rect.top - 14)
      const wantedHeight = Math.min(288, listRef.current?.scrollHeight ?? 288)
      const useAbove = below < wantedHeight && above > below
      setMenuPlacement({ above: useAbove, maxHeight: Math.min(288, useAbove ? above : below) })
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, publicFilter])

  /**
   * Abre a lista com a opção escolhida realçada.
   */
  const openMenu = () => {
    typeaheadRef.current = { text: '', timestamp: 0 }
    setHighlighted(selectedIndex)
    setOpen(true)
  }

  /**
   * Escolhe uma opção, fecha a lista e mantém o foco no botão. Escolher a opção atual não chama onChange.
   *
   * @param {number} index Posição da opção.
   */
  const choose = (index) => {
    const option = options[index]
    setOpen(false)
    buttonRef.current?.focus()
    if (option && option.value !== value) onChange(option.value)
  }

  /**
   * Teclado do botão: fechado, ↓/↑/Enter/Espaço abrem; aberto, ↓/↑/Home/End mudam o realce, Enter/Espaço
   * escolhem, Escape fecha (sem chegar aos elementos à volta) e Tab fecha.
   *
   * @param {import('react').KeyboardEvent<HTMLButtonElement>} event
   */
  const handleKeyDown = (event) => {
    if (publicFilter && event.key.length === 1 && (event.key !== ' ' || (typeaheadRef.current.text && Date.now() - typeaheadRef.current.timestamp < 700)) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT')
      const timestamp = Date.now()
      const previous = typeaheadRef.current
      const text = `${timestamp - previous.timestamp < 700 ? previous.text : ''}${normalize(event.key)}`
      typeaheadRef.current = { text, timestamp }

      /*
       * Repetir uma letra percorre os nomes com essa inicial; escrever um prefixo
       * continua a procura a partir da opção atual, sem confirmar o menu aberto.
       */
      const repeated = [...text].every((character) => character === text[0])
      const prefix = repeated ? text[0] : text
      const current = open ? highlighted : selectedIndex
      const start = repeated ? current + 1 : current
      for (let offset = 0; offset < options.length; offset += 1) {
        const index = (start + offset) % options.length
        if (!normalize(options[index].label).startsWith(prefix)) continue
        if (open) setHighlighted(index)
        else choose(index)
        break
      }
      return
    }

    if (publicFilter) typeaheadRef.current = { text: '', timestamp: 0 }
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlighted((current) => Math.min(options.length - 1, current + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlighted((current) => Math.max(0, current - 1))
        break
      case 'Home':
        event.preventDefault()
        setHighlighted(0)
        break
      case 'End':
        event.preventDefault()
        setHighlighted(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(highlighted)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!labelId && <label id={ownLabelId} htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">{label}</label>}
      <button
        ref={buttonRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelledBy}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required ? 'true' : undefined}
        aria-activedescendant={open ? `${id}-option-${highlighted}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (event.key === ' ') event.preventDefault()
        }}
        className={publicFilter
          ? `flex w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-4 py-2.5 text-left text-sm font-medium text-[#0d1f35] outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-[#f5f3ee] disabled:opacity-60 ${invalid ? 'border-red-400' : 'border-[#d4d8e3]'}`
          : `flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-100 ${invalid ? 'border-red-400' : 'border-gray-200'}`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={publicFilter ? 15 : 16} aria-hidden="true" className={`shrink-0 ${publicFilter ? 'text-primary duration-200' : 'text-gray-400'} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId ? undefined : ownLabelId}
        aria-label={labelId ? `Opções de ${label}` : undefined}
        hidden={!open}
        style={publicFilter ? { maxHeight: menuPlacement.maxHeight, ...(menuPlacement.above ? { bottom: 'calc(100% + 6px)', marginTop: 0 } : {}) } : undefined}
        onMouseDown={(event) => event.preventDefault()}
        className={publicFilter
          ? "absolute left-0 right-0 z-[200] mt-1.5 min-w-full overflow-y-auto break-words rounded-xl border border-[#e4dfd3] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(13,31,53,0.25)]"
          : "absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value

          return (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => choose(index)}
              onMouseEnter={() => setHighlighted(index)}
              className={publicFilter
                ? `relative flex cursor-pointer items-center rounded-lg py-2 pl-3 pr-8 text-sm text-[#0d1f35] ${index === highlighted ? 'bg-[#f5f3ee]' : ''} ${isSelected ? 'font-medium' : ''}`
                : `flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${index === highlighted ? 'bg-[#f5f3ee]' : ''} ${isSelected ? 'font-semibold text-[#0d1f35]' : 'text-gray-700'}`}
            >
              <span className={publicFilter ? "min-w-0 break-words" : undefined}>{option.label}</span>
              {isSelected && <Check size={publicFilter ? 14 : 16} aria-hidden="true" className={publicFilter ? "absolute right-3 text-primary" : "shrink-0 text-[#8a7043]"} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
