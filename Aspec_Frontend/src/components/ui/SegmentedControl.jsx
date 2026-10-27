import { useId } from 'react'

/**
 * Controlo segmentado com uma label visível: um grupo de botões em que só um está ativo (`aria-pressed`).
 * Carregar no botão que já está ativo não chama onChange.
 *
 * @param {{
 *   label: string,
 *   options: {value: unknown, label: string, icon?: import('react').ComponentType<object>}[],
 *   value: unknown,
 *   onChange: (value: unknown) => void,
 *   disabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const labelId = useId()

  return (
    <div>
      <span id={labelId} className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      <div role="group" aria-labelledby={labelId} className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg bg-[#eceae4] p-1">
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
          const active = optionValue === value

          return (
            <button
              key={optionLabel}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                if (!active) onChange(optionValue)
              }}
              className={`flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'bg-white text-[#0d1f35] shadow-sm' : 'text-gray-500 hover:text-[#0d1f35]'}`}
            >
              {Icon && <Icon size={16} aria-hidden="true" />}
              {optionLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
