import RatingStars from '../../members/RatingStars'
import { DASHBOARD_TEXTS, getBusinessName } from '../../../utils/adminDashboard'

/**
 * Lista das avaliações recentes do painel, pela ordem da API: negócio avaliado (com o badge "Sinalizado"
 * nas avaliações sinalizadas), "por <negócio do autor>" e as estrelas da nota.
 *
 * @param {{reviews: {
 *   id: string,
 *   rating: number,
 *   status: string,
 *   reviewed: {business_name: string|null}|null,
 *   reviewer: {business_name: string|null}|null,
 * }[]}} props
 * @returns {JSX.Element}
 */
export default function RecentReviewsList({ reviews }) {
  return (
    <ul className="divide-y divide-gray-100">
      {reviews.map((review) => (
        <li key={review.id} className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-medium text-[#0d1f35]">{getBusinessName(review.reviewed?.business_name)}</p>
              {review.status === 'Flagged' && (
                <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{DASHBOARD_TEXTS.flagged}</span>
              )}
            </div>
            <p className="truncate text-sm text-gray-500">por {getBusinessName(review.reviewer?.business_name)}</p>
          </div>
          <span role="img" aria-label={`${review.rating} de 5 estrelas`} className="shrink-0">
            <RatingStars rating={review.rating} size={14} />
          </span>
        </li>
      ))}
    </ul>
  )
}
