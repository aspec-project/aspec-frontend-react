import { Download, Pencil, Trash2 } from 'lucide-react'
import { ATTENDEES_EXPORT_TEXTS, DELETE_EVENT_TEXTS, getRegistrationState } from '../../../utils/adminEvents'

const buttonBase = 'flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]'

/**
 * Botões de ícone da coluna "Ações" de um evento: exportar e, nos agendados, editar e apagar. O de exportar a
 * lista de presenças fica ativo apenas depois do prazo de inscrição (a mesma regra do badge "Encerradas" e do
 * backend); antes disso aparece desativado com a explicação. O de editar e o de apagar só aparecem nos agendados (um evento passado não se
 * edita nem se apaga).
 *
 * @param {{
 *   event: object,
 *   period: 'upcoming'|'past',
 *   disabled?: boolean,
 *   onExport: (event: object) => void,
 *   onEdit?: (event: object) => void,
 *   onDelete?: (event: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventActions({ event, period, disabled = false, onExport, onEdit, onDelete }) {
  const available = getRegistrationState(event.registration_deadline) === 'closed'

  return (
    <div className="flex items-center gap-2">
      {available ? (
        <button
          type="button"
          aria-label={`${ATTENDEES_EXPORT_TEXTS.buttonLabel} de ${event.name}`}
          title={ATTENDEES_EXPORT_TEXTS.buttonLabel}
          disabled={disabled}
          onClick={() => onExport(event)}
          className={`${buttonBase} bg-slate-100 text-[#0d1f35] hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Download size={16} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`${ATTENDEES_EXPORT_TEXTS.buttonLabel} de ${event.name} (disponível depois do prazo de inscrição)`}
          title={ATTENDEES_EXPORT_TEXTS.unavailableHint}
          disabled
          className={`${buttonBase} cursor-not-allowed bg-gray-50 text-gray-300`}
        >
          <Download size={16} aria-hidden="true" />
        </button>
      )}
      {period === 'upcoming' && onEdit && (
        <button
          type="button"
          aria-label={`Editar ${event.name}`}
          title="Editar evento"
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => onEdit(event)}
          className={`${buttonBase} bg-[#f5efe3] text-[#8a7043] hover:bg-[#ede3cf] disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      )}
      {period === 'upcoming' && onDelete && (
        <button
          type="button"
          aria-label={`Apagar ${event.name}`}
          title={DELETE_EVENT_TEXTS.buttonTitle}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => onDelete(event)}
          className={`${buttonBase} bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
