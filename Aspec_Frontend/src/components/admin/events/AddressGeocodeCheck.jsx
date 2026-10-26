import { MapPin } from 'lucide-react'
import { EVENT_EDIT_TEXTS, EVENT_FORM_MESSAGES, GEOCODE_ATTRIBUTION } from '../../../utils/adminEventForm'

/**
 * Botão opcional "Verificar no mapa" e o resultado da verificação da morada. A morada encontrada vem do
 * OpenStreetMap (editável por qualquer pessoa) e por isso só é mostrada como texto. Na edição, o estado
 * `saved` indica que se mantém a localização guardada do evento. Quando o local é aproximado
 * (`approximate === true`), mostra um aviso para o admin confirmar ou corrigir a morada.
 *
 * @param {{
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: {display_name?: string, attribution?: string, approximate?: boolean}|null, message: string},
 *   canVerify: boolean,
 *   onVerify: () => void,
 *   disabled?: boolean,
 *   idleHint?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function AddressGeocodeCheck({ geocode, canVerify, onVerify, disabled = false, idleHint = EVENT_FORM_MESSAGES.geocodeHint }) {
  return (
    <div className="mt-2 flex flex-wrap items-start gap-3">
      <button
        type="button"
        onClick={onVerify}
        disabled={!canVerify || disabled}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#0d1f35] hover:border-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MapPin size={16} aria-hidden="true" />
        Verificar no mapa
      </button>

      <div role="status" className="min-w-0 flex-1 text-xs">
        {geocode.status === 'loading' && <p className="text-gray-600">A verificar a morada...</p>}
        {geocode.status === 'found' && (
          <>
            {geocode.result?.approximate === true ? (
              <>
                <p className="text-amber-800">{`${EVENT_FORM_MESSAGES.geocodeApproximatePrefix} ${geocode.result.display_name ?? ''}`}</p>
                <p className="text-amber-800">{EVENT_FORM_MESSAGES.geocodeApproximateHint}</p>
              </>
            ) : (
              <p className="text-emerald-800">{`Morada encontrada: ${geocode.result?.display_name ?? ''}`}</p>
            )}
            <p className="mt-0.5 text-gray-500">{geocode.result?.attribution || GEOCODE_ATTRIBUTION}</p>
          </>
        )}
        {geocode.status === 'error' && <p className="text-red-700">{geocode.message}</p>}
        {geocode.status === 'saved' && <p className="text-gray-600">{EVENT_EDIT_TEXTS.geocodeSaved}</p>}
        {geocode.status === 'idle' && <p className="text-gray-500">{idleHint}</p>}
      </div>
    </div>
  )
}
