import { useId } from 'react'
import { Check, X } from 'lucide-react'
import { EVENT_CATEGORY_TEXTS, getUsedColorLabel } from '../../../utils/eventCategories'

/**
 * Seletor de cor de um tipo de evento: grelha com as cores da paleta (botões de opção nativos, por isso as setas
 * funcionam com o teclado). As cores usadas por outros tipos ficam desativadas e a do próprio tipo continua
 * disponível. O erro fica junto à grelha.
 *
 * @param {{
 *   palette: {color: string, name: string}[],
 *   value: string,
 *   usedColors: {id: string, name: string, color: string}[],
 *   onChange: (color: string) => void,
 *   error?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function CategoryColorPicker({ palette, value, usedColors, onChange, error }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const selected = palette.find((option) => option.color === value)

  return (
    <fieldset className="min-w-0" aria-describedby={hintId}>
      <legend className="mb-2 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.colorLabel}</legend>

      <div className="grid grid-cols-5 gap-2">
        {palette.map((option) => {
          const usedBy = usedColors.find((used) => used.color === option.color)
          const isSelected = option.color === value
          const label = usedBy ? getUsedColorLabel(option.name, usedBy.name) : option.name

          return (
            <label key={option.color} title={label} className={`relative block ${usedBy ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="color"
                value={option.color}
                checked={isSelected}
                disabled={Boolean(usedBy)}
                aria-label={label}
                aria-describedby={error ? errorId : undefined}
                onChange={() => onChange(option.color)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-10 items-center justify-center rounded-lg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#315a79] ${isSelected ? 'ring-2 ring-[#0d1f35] ring-offset-2' : ''}`}
                style={{ backgroundColor: option.color }}
              >
                {isSelected && <Check size={18} strokeWidth={3} color="#FFFFFF" />}
                {usedBy && <X size={16} strokeWidth={3} color="#FFFFFF" />}
              </span>
            </label>
          )
        })}
      </div>

      {selected && (
        <p className="mt-3 text-sm text-gray-700">
          {EVENT_CATEGORY_TEXTS.selectedColorLabel} <span className="font-medium">{selected.name}</span>
        </p>
      )}
      <p id={hintId} className="mt-2 text-xs text-gray-500">{EVENT_CATEGORY_TEXTS.usedColorsHint}</p>
      {error && <p id={errorId} className="mt-1 text-sm text-red-700">{error}</p>}
    </fieldset>
  )
}
