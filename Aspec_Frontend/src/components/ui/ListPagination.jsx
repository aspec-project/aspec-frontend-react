import Pagination from './Pagination'

/**
 * Paginação numerada com a escolha de resultados por página, para as listas públicas.
 * Não desenha nada quando todos os resultados cabem na opção mais pequena.
 *
 * @param {{currentPage: number, lastPage: number, total: number, perPage: number, perPageOptions: number[], onPageChange: (page: number) => void, onPerPageChange: (perPage: number) => void, disabled?: boolean, label: string}} props
 * @returns {JSX.Element|null}
 */
export default function ListPagination({ currentPage, lastPage, total, perPage, perPageOptions, onPageChange, onPerPageChange, disabled = false, label }) {
  const canChangePerPage = total > perPageOptions[0]

  if (lastPage <= 1 && !canChangePerPage) return null

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <Pagination currentPage={currentPage} lastPage={lastPage} onChange={onPageChange} disabled={disabled} label={label} />
      {canChangePerPage && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Resultados por página
          <select
            value={perPage}
            disabled={disabled}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-semibold text-[#0D1F35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {perPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      )}
    </div>
  )
}
