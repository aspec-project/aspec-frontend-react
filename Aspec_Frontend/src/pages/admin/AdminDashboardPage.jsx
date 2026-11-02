import { useEffect, useRef } from 'react'
import DashboardPagination from '../../components/admin/dashboard/DashboardPagination'
import DashboardPanel from '../../components/admin/dashboard/DashboardPanel'
import DashboardStatCard from '../../components/admin/dashboard/DashboardStatCard'
import PendingApplicationsList from '../../components/admin/dashboard/PendingApplicationsList'
import RecentReviewsList from '../../components/admin/dashboard/RecentReviewsList'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import ReasonDialog from '../../components/ui/ReasonDialog'
import useAdminDashboard from '../../hooks/useAdminDashboard'
import useAdminUserActions from '../../hooks/useAdminUserActions'
import useDashboardApplications from '../../hooks/useDashboardApplications'
import { DASHBOARD_TEXTS, getDashboardStatCards } from '../../utils/adminDashboard'
import { REASON_ACTIONS, getActionConfirmation } from '../../utils/adminUsers'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página do painel do backoffice (/admin): 6 cartões de totais em 3 + 3 (membros ativos, candidaturas
 * pendentes, eventos deste mês, avaliações para moderar, quotas em atraso e inscrições desta semana), todos
 * ligações para a lista respetiva exceto as inscrições; as candidaturas pendentes paginadas de 3 em 3 (a página
 * 1 vem do painel, as outras do hook useDashboardApplications) e as 3 avaliações mais recentes com ligação para
 * a moderação, com as linhas dos dois cartões alinhadas. O título (h1) e a data são do AdminLayout.
 * Cada candidatura pode ser aprovada ou recusada na própria linha, com os mesmos diálogos e o mesmo hook
 * (useAdminUserActions) da lista de utilizadores: o resultado aparece numa mensagem no topo da página e o
 * painel e a página visível voltam a ser carregados. Depois disso, o foco vai para a linha que ficou na mesma
 * posição da página que ficou visível.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboardPage() {
  const { data, loading, error, retry } = useAdminDashboard()
  const applications = useDashboardApplications(data)
  const headingRef = useRef(null)
  const retryRef = useRef(null)
  const applicationsRetryRef = useRef(null)
  const applicationsRef = useRef(null)
  const actedIndexRef = useRef(null)
  const focusIndexRef = useRef(null)

  /**
   * Depois de uma ação que mudou (ou pode ter mudado) as candidaturas, guarda a posição da linha para o foco
   * e volta a carregar o painel e a página visível das candidaturas (se não for a 1).
   */
  const handleChanged = () => {
    focusIndexRef.current = actedIndexRef.current
    retry()
    applications.reload()
  }

  const actions = useAdminUserActions({ onChanged: handleChanged })

  /**
   * Abre a confirmação de aprovar ou recusar uma candidatura e guarda a posição da linha.
   *
   * @param {'approve'|'reject'} action Ação escolhida.
   * @param {object} application Candidatura da linha.
   * @param {number} index Posição da linha na lista.
   */
  const handleAction = (action, application, index) => {
    actedIndexRef.current = index
    actions.requestAction(action, application)
  }

  /**
   * Depois de o painel e a página das candidaturas recarregarem por causa de uma ação, põe o foco num sítio
   * previsível se ele tiver caído no body: "Tentar novamente" do painel se o painel falhou, "Tentar novamente"
   * do cartão se a página falhou, senão o botão de aprovar da linha na mesma posição (ou da última) da página
   * visível, senão o título do cartão das candidaturas.
   */
  useEffect(() => {
    const index = focusIndexRef.current
    if (index === null || loading || applications.loading) return
    focusIndexRef.current = null

    const active = document.activeElement
    if (active && active !== document.body) return

    if (error) {
      retryRef.current?.focus()
      return
    }

    if (applications.error) {
      applicationsRetryRef.current?.focus()
      return
    }

    const buttons = applicationsRef.current?.querySelectorAll('[data-action="approve"]') ?? []
    const target = buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : headingRef.current
    target?.focus()
  }, [data, error, loading, applications.items, applications.error, applications.loading])

  const confirmation = actions.confirming
    ? getActionConfirmation(actions.confirming.action, actions.confirming.user)
    : null
  const withReason = REASON_ACTIONS.includes(actions.confirming?.action)
  const applicationsBusy = loading || applications.loading || actions.pending

  return (
    <div className="space-y-6">
      {actions.feedback && (
        <FeedbackBanner type={actions.feedback.type} message={actions.feedback.message} onClose={actions.dismissFeedback} />
      )}

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button ref={retryRef} type="button" onClick={retry} className={`${buttonClass} mt-4`}>{DASHBOARD_TEXTS.retry}</button>
        </div>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-gray-600">{DASHBOARD_TEXTS.loading}</p>
      ) : (
        <div aria-busy={loading} className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <section aria-labelledby="dashboard-summary">
            <h2 id="dashboard-summary" className="sr-only">Resumo</h2>
            <ul aria-label="Resumo" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              headingRef={headingRef}
            >
              <div ref={applicationsRef} aria-busy={applications.loading}>
                {applications.error ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{applications.error}</p>
                    <button ref={applicationsRetryRef} type="button" onClick={applications.reload} className={`${buttonClass} mt-3`}>
                      {DASHBOARD_TEXTS.retry}
                    </button>
                  </div>
                ) : applications.items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-600">{DASHBOARD_TEXTS.noApplications}</p>
                ) : (
                  <PendingApplicationsList
                    applications={applications.items}
                    onAction={handleAction}
                    actionsDisabled={applicationsBusy}
                  />
                )}
              </div>
              <DashboardPagination
                currentPage={applications.page}
                lastPage={applications.lastPage}
                onChange={applications.goToPage}
                disabled={applicationsBusy}
              />
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
      )}

      <ConfirmDialog
        open={Boolean(confirmation) && !withReason}
        {...(withReason ? null : confirmation)}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
      <ReasonDialog
        open={withReason}
        {...(withReason ? confirmation : null)}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </div>
  )
}
