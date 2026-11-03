import { AlertTriangle } from 'lucide-react'
import { getFlaggedBannerText } from '../../../utils/adminReviews'

/**
 * Faixa vermelha com o número de avaliações sinalizadas, que estão ocultas ao público até decisão do admin.
 * É texto estático (não é um alerta), para não ser anunciada a cada recarga. Não desenha nada com 0.
 *
 * @param {{count: number}} props Número de avaliações sinalizadas.
 * @returns {JSX.Element|null}
 */
export default function FlaggedReviewsBanner({ count }) {
  const text = getFlaggedBannerText(count)

  if (!text) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
      <AlertTriangle size={18} aria-hidden="true" className="shrink-0" />
      <p><strong className="font-semibold">{text.strong}</strong>{text.rest}</p>
    </div>
  )
}
