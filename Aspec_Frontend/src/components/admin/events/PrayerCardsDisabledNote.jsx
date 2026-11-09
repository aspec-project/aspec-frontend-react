import { PRAYER_CARDS_TEXTS } from '../../../utils/adminPrayerCards'

/**
 * Nota tracejada da página do evento quando o evento não tem os cartões de oração ativos.
 *
 * @returns {JSX.Element}
 */
export default function PrayerCardsDisabledNote() {
  return (
    <p className="flex items-start gap-3 rounded-xl border border-dashed border-[#d9c79f] bg-[#f5f3ee] px-6 py-5 text-gray-600">
      <span aria-hidden="true" className="text-lg leading-6 text-[#8a7043]">†</span>
      <span>{PRAYER_CARDS_TEXTS.disabledNote}</span>
    </p>
  )
}
