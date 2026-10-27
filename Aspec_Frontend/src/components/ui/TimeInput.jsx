import { useState } from 'react'
import { Clock } from 'lucide-react'
import { EVENT_FORM_MESSAGES, parseTime } from '../../utils/adminEventForm'

/**
 * Campo de hora com o aspeto do botão do SelectMenu: aceita qualquer hora de 00:00 a 23:59 escrita no
 * teclado (H:MM, HH:MM, HMM ou HHMM). O que se escreve fica num rascunho local (só dígitos e ":") e quem
 * chama só recebe uma hora `HH:MM` válida ou ''. Ao sair do campo, uma hora válida aparece no formato
 * HH:MM e uma inválida mostra o erro de formato, que desaparece ao voltar a escrever.
 *
 * @param {{
 *   id: string,
 *   name?: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   invalid?: boolean,
 *   describedBy?: string,
 *   required?: boolean,
 *   disabled?: boolean,
 * }} props value é `HH:MM` ou ''.
 * @returns {JSX.Element}
 */
export default function TimeInput({ id, name, value, onChange, invalid = false, describedBy, required = false, disabled = false }) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const [formatError, setFormatError] = useState(false)
  const errorId = `${id}-format-error`
  const describedIds = [describedBy, formatError && errorId].filter(Boolean).join(' ')

  // Valor mudado por fora (ex.: dados da edição): só substitui o rascunho se este não corresponder já ao valor.
  if (value !== syncedValue) {
    setSyncedValue(value)

    if ((parseTime(draft) ?? '') !== value) {
      setDraft(value)
      setFormatError(false)
    }
  }

  /**
   * Guarda o rascunho só com dígitos e ":" e envia a hora válida (ou '').
   *
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleChange = (event) => {
    const text = event.target.value.replace(/[^\d:]/g, '')

    setDraft(text)
    setFormatError(false)
    onChange(parseTime(text) ?? '')
  }

  /**
   * Ao sair do campo, escreve a hora no formato HH:MM ou assinala o erro de formato.
   */
  const handleBlur = () => {
    const time = parseTime(draft)

    if (time) {
      setDraft(time)
    } else if (draft !== '') {
      setFormatError(true)
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="hh:mm"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          aria-invalid={invalid || formatError ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          aria-describedby={describedIds || undefined}
          className={`flex h-11 w-full rounded-lg border bg-white px-3 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-100 ${invalid || formatError ? 'border-red-400' : 'border-gray-200'}`}
        />
        <Clock size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7043]" />
      </div>
      {formatError && <p id={errorId} className="mt-1 text-sm text-red-700">{EVENT_FORM_MESSAGES.timeFormat}</p>}
    </div>
  )
}
