import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPageItems } from '../../utils/pagination'

const baseButtonClass = 'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Paginação numerada (‹ 1 2 … 10 ›). Não desenha nada quando há só uma página.
 *
 * @param {{currentPage: number, lastPage: number, onChange: (page: number) => void, disabled?: boolean, label: string}} props
 * @returns {JSX.Element|null}
 */
export default function Pagination({ currentPage, lastPage, onChange, disabled = false, label }) {
  if (lastPage <= 1) return null

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={disabled || currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        className={`${baseButtonClass} text-[#0d1f35] hover:bg-gray-100`}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      {getPageItems(currentPage, lastPage).map((item, index) => {
        if (item === 'gap') {
          return <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-sm text-gray-400">…</span>
        }

        const current = item === currentPage

        return (
          <button
            key={item}
            type="button"
            aria-label={`Página ${item}`}
            aria-current={current ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChange(item)}
            className={`${baseButtonClass} ${current ? 'bg-[#0d1f35] text-white' : 'text-[#0d1f35] hover:bg-gray-100'}`}
          >
            {item}
          </button>
        )
      })}

      <button
        type="button"
        aria-label="Página seguinte"
        disabled={disabled || currentPage >= lastPage}
        onClick={() => onChange(currentPage + 1)}
        className={`${baseButtonClass} text-[#0d1f35] hover:bg-gray-100`}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  )
}
