import { Check, MapPinOff, TriangleAlert } from 'lucide-react'
import { EVENT_EDIT_TEXTS, EVENT_FORM_MESSAGES, GEOCODE_ATTRIBUTION } from '../../../utils/adminEventForm'
import { buildMapEmbedUrl, getEmbedKey, getLocationMapView } from '../../../utils/googleMapsEmbed'

const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'

/**
 * Pré-visualização do local do evento no mapa da Google (Maps Embed API) com o resultado da verificação da
 * morada. Antes de pesquisar (ou quando o resultado não tem `place_id`, como os do Nominatim) o mapa mostra a
 * zona da delegação, com o aviso "A mostrar a zona de …"; com um `place_id` válido mostra o local. Sem chave
 * mostra uma caixa cinzenta no lugar do mapa. Quando o local é aproximado aparece a caixa âmbar com o botão
 * "Confirmar localização" (interruptor com `aria-pressed`, para não perder o foco). Por baixo do cartão, a
 * linha de estado mostra o local encontrado (só como texto), a atribuição, o erro ou a dica.
 *
 * @param {{
 *   geocode: {status: 'idle'|'saved'|'loading'|'found'|'error', result: {display_name?: string, attribution?: string, approximate?: boolean, place_id?: string|null}|null, message: string, confirmed?: boolean},
 *   zoneName: string,
 *   onConfirmLocation: () => void,
 *   disabled?: boolean,
 *   idleHint?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventMapPreview({ geocode, zoneName, onConfirmLocation, disabled = false, idleHint = EVENT_FORM_MESSAGES.geocodeHint }) {
  const { query, zone } = getLocationMapView(geocode, zoneName)
  const mapUrl = buildMapEmbedUrl(getEmbedKey(), query)
  const isApproximate = geocode.status === 'found' && geocode.result?.approximate === true
  const confirmed = isApproximate && Boolean(geocode.confirmed)

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="relative h-64 bg-gray-100">
          {mapUrl ? (
            <iframe
              title={EVENT_FORM_MESSAGES.mapTitle}
              src={mapUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox={SANDBOX}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <MapPinOff size={24} aria-hidden="true" />
              <p>{EVENT_FORM_MESSAGES.mapUnavailable}</p>
            </div>
          )}

          {mapUrl && zone && (
            <p className="pointer-events-none absolute top-3 left-3 rounded-lg bg-white px-3 py-1.5 text-sm text-gray-800 shadow-md">
              {EVENT_FORM_MESSAGES.mapZone(zone)}
            </p>
          )}
        </div>

        {isApproximate && (
          <div className="flex flex-wrap items-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-3">
            <TriangleAlert size={18} aria-hidden="true" className="shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-amber-900">{EVENT_FORM_MESSAGES.approximateTitle}</p>
              <p className="text-amber-800">{EVENT_FORM_MESSAGES.approximateHint}</p>
              <p aria-live="polite" className="font-semibold text-emerald-800">
                {confirmed ? EVENT_FORM_MESSAGES.locationConfirmed : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onConfirmLocation}
              disabled={disabled}
              aria-pressed={confirmed}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50 ${
                confirmed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500'
                  : 'border-amber-300 bg-white text-amber-900 hover:border-amber-500'
              }`}
            >
              {confirmed && <Check size={16} aria-hidden="true" />}
              {EVENT_FORM_MESSAGES.confirmLocationButton}
            </button>
          </div>
        )}
      </div>

      <div role="status" className="mt-2 text-xs">
        {geocode.status === 'loading' && <p className="text-gray-600">A verificar a morada...</p>}
        {geocode.status === 'found' && (
          <>
            {isApproximate ? (
              <p className="text-amber-800">{`${EVENT_FORM_MESSAGES.geocodeApproximatePrefix} ${geocode.result.display_name ?? ''}`}</p>
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
