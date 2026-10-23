import { useId } from 'react'
import { Mail } from 'lucide-react'
import EventField from './EventField'
import { EVENT_EDIT_TEXTS, EVENT_FORM_LIMITS, getEditNotice } from '../../../utils/adminEventForm'

const controlClass = 'w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:bg-gray-100'

/**
 * Aviso de que os inscritos vão receber um email com a alteração e campo opcional "Justificação da
 * alteração", que segue nesse email (não é guardada nem conta como alteração do evento).
 *
 * @param {{
 *   registrationsCount: number,
 *   value: string,
 *   error?: string,
 *   onChange: (value: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventUpdateJustification({ registrationsCount, value, error, onChange }) {
  const id = `${useId()}-justification`
  const counter = `${value.length}/${EVENT_FORM_LIMITS.justification} caracteres`
  const describedBy = [`${id}-hint`, `${id}-counter`, error && `${id}-error`].filter(Boolean).join(' ')

  return (
    <div className="mt-5 space-y-3 border-t border-gray-200 pt-5">
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Mail size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        {getEditNotice(registrationsCount)}
      </p>
      <EventField
        id={id}
        label={EVENT_EDIT_TEXTS.justificationLabel}
        required={false}
        hint={EVENT_EDIT_TEXTS.justificationHint}
        counter={counter}
        error={error}
      >
        <textarea
          id={id}
          name="justification"
          rows={3}
          maxLength={EVENT_FORM_LIMITS.justification}
          value={value}
          onChange={(changeEvent) => onChange(changeEvent.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={controlClass}
        />
      </EventField>
    </div>
  )
}
