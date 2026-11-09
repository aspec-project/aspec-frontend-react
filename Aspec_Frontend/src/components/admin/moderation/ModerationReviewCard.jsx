import { Eye, EyeOff, Flag } from 'lucide-react'
import RatingStars from '../../members/RatingStars'
import { formatShortDate } from '../../../utils/dateFormat'
import {
  getBusinessLabel,
  getRatingLabel,
  getReviewActionLabel,
  getReviewActions,
  getReviewBadge,
  getReviewNote,
} from '../../../utils/adminReviews'
import { getReviewReasonLabel, getReviewReportSourceLabel, UNKNOWN_REVIEW_REASON_LABEL } from '../../../utils/reviewReports'

const ACTION_BUTTONS = {
  hide: { label: 'Ocultar', icon: EyeOff, className: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  show: { label: 'Mostrar', icon: Eye, className: 'bg-gray-100 text-[#0d1f35] hover:bg-gray-200' },
  unflag: { label: 'Retirar sinalização', icon: Flag, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
}

const BADGE_CLASSES = {
  danger: 'bg-red-50 text-red-600',
  muted: 'bg-gray-100 text-gray-500',
}

const NOTE_CLASSES = {
  danger: 'bg-red-50 text-red-700',
  muted: 'bg-[#f3f1ec] text-gray-600',
}

/**
 * Cartão de uma avaliação na moderação: inicial e negócio do autor, "avaliou", negócio avaliado, estrelas,
 * badge do estado, comentário entre aspas (acinzentado quando oculto ou sinalizado), nota de estado, data e
 * botões das ações do estado. Os sinalizados têm a borda esquerda vermelha e, quando há reports por resolver,
 * uma secção com a origem, o motivo e o comentário de cada um (sem dizer quem reportou). O comentário e a
 * justificação são mostrados como texto simples.
 *
 * @param {{
 *   review: {
 *     id: string,
 *     rating: number,
 *     comment: string|null,
 *     status: string,
 *     hidden_reason: string|null,
 *     reviewer: {business_name: string|null},
 *     reviewed: {business_name: string|null},
 *     flagging_sources: string[],
 *     reports?: {id: string, source: string, reason: string, comment: string|null, created_at: string}[],
 *     created_at: string,
 *   },
 *   actionsDisabled?: boolean,
 *   onAction: (action: 'hide'|'show'|'unflag', review: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function ModerationReviewCard({ review, actionsDisabled = false, onAction }) {
  const reviewer = getBusinessLabel(review.reviewer)
  const badge = getReviewBadge(review.status)
  const note = getReviewNote(review)
  const flagged = review.status === 'Flagged'
  const muted = review.status !== 'Visible'
  const reports = flagged ? review.reports ?? [] : []

  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${flagged ? 'border-red-200 border-l-4 border-l-red-500' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d1f35] text-xs font-semibold text-white">
            {reviewer.charAt(0).toUpperCase()}
          </span>
          <span className="font-semibold text-[#0d1f35]">{reviewer}</span>
          <span className="text-xs text-gray-400">avaliou</span>
          <span className="font-semibold text-[#0d1f35]">{getBusinessLabel(review.reviewed)}</span>
          <span role="img" aria-label={getRatingLabel(review.rating)} className="inline-flex">
            <RatingStars rating={review.rating} size={14} />
          </span>
          {badge && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[badge.tone]}`}>
              {badge.tone === 'danger' && <Flag size={12} aria-hidden="true" />}
              {badge.label}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {getReviewActions(review.status).map((action) => {
            const { label, icon: Icon, className } = ACTION_BUTTONS[action]

            return (
              <button
                key={action}
                type="button"
                aria-label={getReviewActionLabel(action, review)}
                disabled={actionsDisabled}
                onClick={() => onAction(action, review)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {review.comment !== null && (
        <p className={`mt-3 break-words text-sm ${muted ? 'text-gray-400' : 'text-gray-700'}`}>{`"${review.comment}"`}</p>
      )}

      {note && (
        <p className={`mt-3 whitespace-pre-line break-words rounded-lg px-4 py-2 text-xs ${NOTE_CLASSES[note.tone]}`}>
          {note.lead && <strong className="font-semibold">{note.lead}</strong>}
          {note.lead && ' '}
          {note.text}
        </p>
      )}

      {reports.length > 0 && (
        <section className="mt-3 rounded-lg border border-red-100 px-4 py-3">
          <h3 className="text-xs font-semibold text-[#0d1f35]">Sinalizações</h3>
          <ul className="mt-2 space-y-2">
            {reports.map((report) => (
              <li key={report.id} className="text-xs text-gray-700">
                <p>
                  <strong className="font-semibold">{getReviewReportSourceLabel(report.source)}</strong>
                  {': '}
                  {getReviewReasonLabel(report.reason, UNKNOWN_REVIEW_REASON_LABEL)}
                </p>
                {report.comment && <p className="mt-0.5 whitespace-pre-line break-words text-gray-600">{report.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-3 text-xs text-gray-400">{formatShortDate(review.created_at)}</p>
    </article>
  )
}
