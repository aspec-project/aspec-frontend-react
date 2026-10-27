import { useId } from 'react'
import { EVENT_SERIES_TEXTS, formatSeriesSessionLine, getSeriesSummary } from '../../../utils/adminEventSeries'

/**
 * Pré-visualização das sessões que uma série vai criar: título com o número de sessões, resumo da frequência
 * e das datas e a lista das sessões com o prazo de inscrição de cada uma. A caixa da lista recebe o foco
 * para se poder fazer scroll com o teclado.
 *
 * @param {{
 *   dates: string[],
 *   frequency: string,
 *   deadlineDaysBefore: string,
 * }} props Datas das sessões (AAAA-MM-DD), frequência e número de dias do prazo escrito pelo admin.
 * @returns {JSX.Element}
 */
export default function EventSeriesPreview({ dates, frequency, deadlineDaysBefore }) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <h3 id={titleId} className="text-sm font-semibold text-[#0d1f35]">Sessões a criar ({dates.length})</h3>
      <p className="mt-1 text-xs text-gray-600">{getSeriesSummary(frequency, dates)}</p>
      <div
        tabIndex={0}
        role="group"
        aria-label={EVENT_SERIES_TEXTS.sessionsList}
        className="mt-3 max-h-48 overflow-y-auto rounded-md bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
      >
        <ol className="divide-y divide-gray-100 text-sm text-gray-700">
          {dates.map((date) => (
            <li key={date} className="px-3 py-2">{formatSeriesSessionLine(date, deadlineDaysBefore)}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
