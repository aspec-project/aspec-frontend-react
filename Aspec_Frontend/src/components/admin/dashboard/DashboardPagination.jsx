import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DASHBOARD_TEXTS } from '../../../utils/adminDashboard'

const buttonClass = 'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#0d1f35] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

/**
 * Paginação compacta das candidaturas pendentes do painel: "‹ Página X de Y ›", alinhada à direita, por baixo
 * da lista. Não aparece quando só há uma página. Os botões ficam desativados nos limites e com `disabled`.
 *
 * @param {{
 *   currentPage: number,
 *   lastPage: number,
 *   onChange: (page: number) => void,
 *   disabled: boolean,
 * }} props onChange recebe a página para onde ir; disabled desativa os dois botões durante um pedido.
 * @returns {JSX.Element|null}
 */
export default function DashboardPagination({ currentPage, lastPage, onChange, disabled }) {
  if (lastPage <= 1) return null

  return (
    <nav aria-label={DASHBOARD_TEXTS.paginationLabel} className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={disabled || currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        className={buttonClass}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span className="text-sm text-gray-600">{`Página ${currentPage} de ${lastPage}`}</span>
      <button
        type="button"
        aria-label="Página seguinte"
        disabled={disabled || currentPage >= lastPage}
        onClick={() => onChange(currentPage + 1)}
        className={buttonClass}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}
