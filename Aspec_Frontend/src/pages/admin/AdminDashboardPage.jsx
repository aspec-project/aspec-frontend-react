import { useEffect, useRef } from 'react'
import DashboardPanel from '../../components/admin/dashboard/DashboardPanel'
import DashboardStatCard from '../../components/admin/dashboard/DashboardStatCard'
import PendingApplicationsList from '../../components/admin/dashboard/PendingApplicationsList'
import RecentReviewsList from '../../components/admin/dashboard/RecentReviewsList'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import ReasonDialog from '../../components/ui/ReasonDialog'
import useAdminDashboard from '../../hooks/useAdminDashboard'
import useAdminUserActions from '../../hooks/useAdminUserActions'
import { DASHBOARD_TEXTS, getDashboardStatCards } from '../../utils/adminDashboard'
import { REASON_ACTIONS, getActionConfirmation } from '../../utils/adminUsers'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página do painel do backoffice (/admin): 4 cartões de totais (membros ativos, candidaturas pendentes,
 * eventos deste mês e avaliações para moderar), as 3 candidaturas pendentes mais recentes com ligação para a
 * lista já filtrada e as 3 avaliações mais recentes com ligação para a moderação. Tudo vem de um só pedido;
 * a lógica vive no hook useAdminDashboard. O título (h1) e a data são do AdminLayout.
 * Cada candidatura pode ser aprovada ou recusada na própria linha, com os mesmos diálogos e o mesmo hook
 * (useAdminUserActions) da lista de utilizadores: o resultado aparece numa mensagem no topo da página e o
 * painel volta a ser carregado. Depois disso, o foco vai para a linha que ficou na mesma posição.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboardPage() {
  const { data, loading, error, retry } = useAdminDashboard()
  const headingRef = useRef(null)
  const retryRef = useRef(null)
  const applicationsRef = useRef(null)
  const actedIndexRef = useRef(null)
  const focusIndexRef = useRef(null)

  /**
   * Depois de uma ação que mudou (ou pode ter mudado) as candidaturas, guarda a posição da linha para o foco
   * e volta a carregar o painel.
   */
  const handleChanged = () => {
    focusIndexRef.current = actedIndexRef.current
    retry()
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
   * Depois de o painel recarregar por causa de uma ação, põe o foco num sítio previsível se ele tiver caído no
   * body: "Tentar novamente" se o recarregamento falhou, senão o botão de aprovar da linha na mesma posição
   * (ou da última), senão o título do cartão das candidaturas.
   */
  useEffect(() => {
    const index = focusIndexRef.current
    if (index === null || loading) return
    focusIndexRef.current = null

    const active = document.activeElement
    if (active && active !== document.body) return

    if (error) {
      retryRef.current?.focus()
      return
    }

    const buttons = applicationsRef.current?.querySelectorAll('[data-action="approve"]') ?? []
    const target = buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : headingRef.current
    target?.focus()
  }, [data, error, loading])

  const confirmation = actions.confirming
    ? getActionConfirmation(actions.confirming.action, actions.confirming.user)
    : null
  const withReason = REASON_ACTIONS.includes(actions.confirming?.action)

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
              headingRef={headingRef}
            >
              <div ref={applicationsRef}>
                {data.pending_applications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-600">{DASHBOARD_TEXTS.noApplications}</p>
                ) : (
                  <PendingApplicationsList
                    applications={data.pending_applications}
                    onAction={handleAction}
                    actionsDisabled={loading || actions.pending}
                  />
                )}
              </div>
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
