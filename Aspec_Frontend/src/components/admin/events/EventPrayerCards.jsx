import { useId } from 'react'
import EventField from './EventField'
import Switch from '../../ui/Switch'
import { EVENT_FORM_LIMITS, PRAYER_CARD_TEXTS } from '../../../utils/adminEventForm'

const textareaClass = 'w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] aria-invalid:border-red-400 disabled:cursor-not-allowed disabled:bg-gray-100'

/**
 * Caixa dos cartões de oração no formulário de evento: cruz decorativa, título, texto explicativo e o
 * interruptor (nome dado pelo título, descrição pelo texto). Ligada, mostra o campo "Versículo da semana"
 * com hint, contador e erro. O erro do versículo aparece sempre na caixa: ligada, debaixo do campo;
 * desligada, debaixo do texto explicativo e na descrição do interruptor. Com `locked` (já há cartões
 * preenchidos), o interruptor e o versículo ficam desativados com uma nota; com `isRecurring`, uma frase
 * explica que todas as sessões da série ficam com os cartões e o versículo.
 *
 * @param {{
 *   values: {prayerCardsEnabled: boolean, prayerVerse: string},
 *   errors: Record<string, string>,
 *   onToggle: (enabled: boolean) => void,
 *   onVerseChange: (value: string) => void,
 *   locked?: boolean,
 *   isRecurring?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventPrayerCards({ values, errors, onToggle, onVerseChange, locked = false, isRecurring = false }) {
  const prefix = useId()
  const titleId = `${prefix}-title`
  const explanationId = `${prefix}-explanation`
  const lockedId = `${prefix}-locked`
  const boxErrorId = `${prefix}-box-error`
  const verseId = `${prefix}-prayerVerse`
  const enabled = Boolean(values.prayerCardsEnabled)
  const error = errors.prayerVerse
  const counter = `${values.prayerVerse.length}/${EVENT_FORM_LIMITS.prayerVerse} caracteres`
  const switchDescription = [explanationId, locked && lockedId, error && !enabled && boxErrorId].filter(Boolean).join(' ')
  const verseDescription = [`${verseId}-hint`, `${verseId}-counter`, error && `${verseId}-error`].filter(Boolean).join(' ')

  return (
    <div role="group" aria-labelledby={titleId} className="space-y-4 rounded-xl border border-[#e7e2d6] bg-[#f5f3ee] p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id={titleId} className="text-sm font-semibold text-[#0d1f35]">{PRAYER_CARD_TEXTS.title}</h3>
          <p id={explanationId} className="text-xs text-gray-600">{PRAYER_CARD_TEXTS.explanation}</p>
          {isRecurring && <p className="text-xs text-gray-600">{PRAYER_CARD_TEXTS.seriesHint}</p>}
          {locked && <p id={lockedId} className="text-xs font-medium text-[#8a7043]">{PRAYER_CARD_TEXTS.locked}</p>}
          {error && !enabled && <p id={boxErrorId} className="text-sm text-red-700">{error}</p>}
        </div>
        <Switch
          id={`${prefix}-prayerCardsEnabled`}
          name="prayerCardsEnabled"
          checked={enabled}
          onChange={onToggle}
          labelledBy={titleId}
          describedBy={switchDescription}
          disabled={locked}
        />
      </div>

      {enabled && (
        <EventField
          id={verseId}
          label={PRAYER_CARD_TEXTS.verseLabel}
          required
          hint={PRAYER_CARD_TEXTS.verseHint}
          counter={counter}
          error={error}
        >
          <textarea
            id={verseId}
            name="prayerVerse"
            rows={2}
            maxLength={EVENT_FORM_LIMITS.prayerVerse}
            placeholder={PRAYER_CARD_TEXTS.versePlaceholder}
            value={values.prayerVerse}
            onChange={(event) => onVerseChange(event.target.value)}
            disabled={locked}
            aria-required="true"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={verseDescription}
            className={textareaClass}
          />
        </EventField>
      )}
    </div>
  )
}
