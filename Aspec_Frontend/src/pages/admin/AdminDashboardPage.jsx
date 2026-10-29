import DashboardPanel from '../../components/admin/dashboard/DashboardPanel'
import DashboardStatCard from '../../components/admin/dashboard/DashboardStatCard'
import PendingApplicationsList from '../../components/admin/dashboard/PendingApplicationsList'
import RecentReviewsList from '../../components/admin/dashboard/RecentReviewsList'
import useAdminDashboard from '../../hooks/useAdminDashboard'
import { DASHBOARD_TEXTS, getDashboardStatCards } from '../../utils/adminDashboard'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página do painel do backoffice (/admin): 4 cartões de totais (membros ativos, candidaturas pendentes,
 * eventos deste mês e avaliações para moderar), as 3 candidaturas pendentes mais recentes com ligação para a
 * lista já filtrada e as 3 avaliações mais recentes com ligação para a moderação. Tudo vem de um só pedido;
 * a lógica vive no hook useAdminDashboard. O título (h1) e a data são do AdminLayout.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboardPage() {
  const { data, loading, error, retry } = useAdminDashboard()

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p>{error}</p>
        <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>{DASHBOARD_TEXTS.retry}</button>
      </div>
    )
  }

  if (!data) {
    return <p role="status" className="py-12 text-center text-gray-600">{DASHBOARD_TEXTS.loading}</p>
  }

  return (
    <div aria-busy={loading} className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <section aria-labelledby="dashboard-summary">
        <h2 id="dashboard-summary" className="sr-only">Resumo</h2>
        <ul aria-label="Resumo" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {getDashboardStatCards(data.stats).map((card) => (
            <DashboardStatCard key={card.key} card={card} />
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="Candidaturas Pendentes"
          linkTo="/admin/utilizadores?estado=pending"
          linkLabel="Ver todas as candidaturas pendentes"
          linkText="Ver todas"
        >
          {data.pending_applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">{DASHBOARD_TEXTS.noApplications}</p>
          ) : (
            <PendingApplicationsList applications={data.pending_applications} />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Avaliações Recentes"
          linkTo="/admin/moderacao"
          linkLabel="Moderar avaliações"
          linkText="Moderar"
        >
          {data.recent_reviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">{DASHBOARD_TEXTS.noReviews}</p>
          ) : (
            <RecentReviewsList reviews={data.recent_reviews} />
          )}
        </DashboardPanel>
      </div>
    </div>
  )
}
