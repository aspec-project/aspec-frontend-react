import { Search } from 'lucide-react'
import UserStatusTabs from '../../components/admin/users/UserStatusTabs'
import UsersTable from '../../components/admin/users/UsersTable'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import useAdminUserActions from '../../hooks/useAdminUserActions'
import useAdminUsers from '../../hooks/useAdminUsers'
import { useAuthStore } from '../../store/authStore'
import { getActionConfirmation } from '../../utils/adminUsers'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página Gestão de Utilizadores do backoffice: separadores de estado com contagens, pesquisa,
 * "Mostrar admins", tabela com ações (aprovar, recusar, bloquear, desbloquear, promover e despromover)
 * e paginação.
 * Cada ação pede confirmação num diálogo e o resultado aparece numa mensagem com o texto da API.
 * A lógica vive nos hooks useAdminUsers (lista) e useAdminUserActions (ações).
 *
 * @returns {JSX.Element}
 */
export default function AdminUsersPage() {
  const {
    filters,
    searchInput,
    setSearchInput,
    selectTab,
    toggleIncludeAdmins,
    goToPage,
    retry,
    refresh,
    data,
    loading,
    error,
  } = useAdminUsers()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const actions = useAdminUserActions({ onChanged: refresh })

  const pagination = data?.pagination
  const confirmation = actions.confirming
    ? getActionConfirmation(actions.confirming.action, actions.confirming.user, { adminsCount: data?.admins_count })
    : null

  return (
    <div className="space-y-6">
      {actions.feedback && (
        <FeedbackBanner type={actions.feedback.type} message={actions.feedback.message} onClose={actions.dismissFeedback} />
      )}

      <UserStatusTabs activeTab={filters.tab} counts={data?.counts} onSelect={selectTab} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[240px] flex-1">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Pesquisar utilizadores"
            placeholder="Pesquisar utilizador, empresa ou email..."
            maxLength={255}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={filters.includeAdmins}
            onChange={toggleIncludeAdmins}
            className="h-4 w-4 accent-[#0d1f35]"
          />
          Mostrar admins
        </label>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
        </div>
      ) : !data ? (
        loading && <p role="status" className="py-12 text-center text-gray-600">A carregar utilizadores...</p>
      ) : (
        <>
          {data.items.length === 0 ? (
            <p className="rounded-xl bg-white py-12 text-center text-gray-600 shadow-sm">Não foram encontrados utilizadores.</p>
          ) : (
            <UsersTable
              users={data.items}
              busy={loading}
              currentUserId={currentUserId}
              onAction={actions.requestAction}
              actionsDisabled={loading || actions.pending}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p role="status" className="text-sm text-gray-500">
              {pagination.total} {pagination.total === 1 ? 'utilizador encontrado' : 'utilizadores encontrados'}
            </p>
            {pagination.last_page > 1 && (
              <nav aria-label="Paginação de utilizadores" className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={loading || pagination.current_page <= 1}
                  onClick={() => goToPage(pagination.current_page - 1)}
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700">Página {pagination.current_page} de {pagination.last_page}</span>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={loading || pagination.current_page >= pagination.last_page}
                  onClick={() => goToPage(pagination.current_page + 1)}
                >
                  Seguinte
                </button>
              </nav>
            )}
          </div>
        </>
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
