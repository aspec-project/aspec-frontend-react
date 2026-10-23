import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AnonymizeUserDialog from '../../components/admin/users/AnonymizeUserDialog'
import UserDetail from '../../components/admin/users/UserDetail'
import UserDetailHeader from '../../components/admin/users/UserDetailHeader'
import UserRiskZone from '../../components/admin/users/UserRiskZone'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import useAdminUser from '../../hooks/useAdminUser'
import useAdminUserActions from '../../hooks/useAdminUserActions'
import { useAuthStore } from '../../store/authStore'
import { getActionConfirmation, getAvailableActions, getLockedActions } from '../../utils/adminUsers'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página de detalhe de um membro no backoffice (/admin/utilizadores/:id), sem o herói nem os
 * separadores do AdminLayout: banda escura com "Voltar aos utilizadores" e a identificação do
 * membro (nome como título), e os cartões do detalhe. Tem as mesmas ações da lista (incluindo
 * promover e despromover), o envio do email de ativação, reativação ou lembrete de pagamento e,
 * depois de uma ação, o detalhe é pedido de novo. No fim, a "Zona de risco · RGPD" permite
 * anonimizar o membro; depois do sucesso a página volta à lista com a mensagem da API (a conta
 * deixa de existir). A lógica vive nos hooks useAdminUser (detalhe) e useAdminUserActions (ações).
 *
 * @returns {JSX.Element}
 */
export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading, error, notFound, retry, refresh } = useAdminUser(id)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const actions = useAdminUserActions({
    onChanged: refresh,
    onRemoved: (message) => navigate('/admin/utilizadores', { replace: true, state: { feedback: { type: 'success', message } } }),
  })
  const anonymizing = actions.confirming?.action === 'anonymize'
  const confirmation = actions.confirming && !anonymizing
    ? getActionConfirmation(actions.confirming.action, actions.confirming.user, { adminsCount: user?.admins_count })
    : null
  const showUser = Boolean(user) && !notFound && !error

  return (
    <>
      <section className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)]">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <Link
            to="/admin/utilizadores"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar aos utilizadores
          </Link>

          {showUser ? (
            <UserDetailHeader
              user={user}
              actions={getAvailableActions(user, currentUserId)}
              locked={getLockedActions(user, currentUserId)}
              actionsDisabled={loading || actions.pending}
              onAction={actions.requestAction}
            />
          ) : (
            <h1 className="text-2xl font-semibold text-white">{notFound ? 'Utilizador não encontrado.' : 'Detalhe do membro'}</h1>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {actions.feedback && (
          <FeedbackBanner type={actions.feedback.type} message={actions.feedback.message} onClose={actions.dismissFeedback} />
        )}

        {notFound ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">O utilizador pedido não existe ou foi apagado.</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p>{error}</p>
            <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
          </div>
        ) : !user ? (
          <p role="status" className="py-12 text-center text-gray-600">A carregar membro...</p>
        ) : (
          <UserDetail user={user} busy={loading} />
        )}

        {showUser && (
          <UserRiskZone
            user={user}
            disabled={loading || actions.pending}
            onAnonymize={(target) => actions.requestAction('anonymize', target)}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        {...confirmation}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
      <AnonymizeUserDialog
        open={anonymizing}
        user={actions.confirming?.user ?? null}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </>
  )
}
