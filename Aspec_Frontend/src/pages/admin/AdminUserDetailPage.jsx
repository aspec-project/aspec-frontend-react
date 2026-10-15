import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import UserDetail from '../../components/admin/users/UserDetail'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import useAdminUser from '../../hooks/useAdminUser'
import useAdminUserActions from '../../hooks/useAdminUserActions'
import { useAuthStore } from '../../store/authStore'
import { getActionConfirmation, getAvailableActions } from '../../utils/adminUsers'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página de detalhe de um membro no backoffice (/admin/utilizadores/:id): conta, perfil, horário,
 * redes sociais e portefólio, com as mesmas ações da lista. Depois de uma ação o detalhe é pedido
 * de novo. A lógica vive nos hooks useAdminUser (detalhe) e useAdminUserActions (ações).
 *
 * @returns {JSX.Element}
 */
export default function AdminUserDetailPage() {
  const { id } = useParams()
  const { user, loading, error, notFound, retry, refresh } = useAdminUser(id)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const actions = useAdminUserActions({ onChanged: refresh })
  const confirmation = actions.confirming
    ? getActionConfirmation(actions.confirming.action, actions.confirming.user)
    : null

  return (
    <div className="space-y-6">
      <Link
        to="/admin/utilizadores"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0d1f35] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar à lista de utilizadores
      </Link>

      {actions.feedback && (
        <FeedbackBanner type={actions.feedback.type} message={actions.feedback.message} onClose={actions.dismissFeedback} />
      )}

      {notFound ? (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0d1f35]">Utilizador não encontrado.</h2>
          <p className="mt-2 text-sm text-gray-600">O utilizador pedido não existe ou foi apagado.</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
        </div>
      ) : !user ? (
        <p role="status" className="py-12 text-center text-gray-600">A carregar membro...</p>
      ) : (
        <UserDetail
          user={user}
          actions={getAvailableActions(user, currentUserId)}
          actionsDisabled={loading || actions.pending}
          busy={loading}
          onAction={actions.requestAction}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmation)}
        {...confirmation}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </div>
  )
}
