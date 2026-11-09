import Pagination from '../../ui/Pagination'
import { DASHBOARD_TEXTS } from '../../../utils/adminDashboard'

/**
 * Paginação das candidaturas pendentes do painel: a paginação numerada comum, alinhada à direita, por baixo da
 * lista. Não aparece quando só há uma página.
 *
 * @param {{
 *   currentPage: number,
 *   lastPage: number,
 *   onChange: (page: number) => void,
 *   disabled: boolean,
 * }} props onChange recebe a página para onde ir; disabled desativa os botões durante um pedido.
 * @returns {JSX.Element|null}
 */
export default function DashboardPagination({ currentPage, lastPage, onChange, disabled }) {
  if (lastPage <= 1) return null

  return (
    <div className="mt-4 flex justify-end">
      <Pagination currentPage={currentPage} lastPage={lastPage} onChange={onChange} disabled={disabled} label={DASHBOARD_TEXTS.paginationLabel} />
    </div>
  )
}
