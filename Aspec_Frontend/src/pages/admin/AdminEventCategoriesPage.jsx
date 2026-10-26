import { useState } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import EventCategoriesTable from '../../components/admin/eventCategories/EventCategoriesTable'
import EventCategoryDialog from '../../components/admin/eventCategories/EventCategoryDialog'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import useAdminEventCategories from '../../hooks/useAdminEventCategories'
import useEventCategoryDeletion from '../../hooks/useEventCategoryDeletion'
import { EVENT_CATEGORY_TEXTS, getDeleteCategoryDescription } from '../../utils/eventCategories'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página Tipos de Evento do backoffice: lista dos tipos com a cor e o número de eventos, criar e editar num
 * diálogo com seletor de cor próprio, e apagar com confirmação (só tipos sem eventos). Depois de gravar ou
 * apagar aparece a mensagem da API e a lista recarrega; enquanto recarrega, as ações ficam desativadas.
 * A lógica vive nos hooks useAdminEventCategories (lista), useEventCategoryForm (diálogo) e
 * useEventCategoryDeletion (apagar).
 *
 * @returns {JSX.Element}
 */
export default function AdminEventCategoriesPage() {
  const { categories, loading, error, retry } = useAdminEventCategories()
  const [editing, setEditing] = useState(null)
  const [feedback, setFeedback] = useState(null)

  /**
   * Mostra uma mensagem de erro e recarrega a lista (o tipo mudou ou já não existe).
   *
   * @param {string} message
   */
  const handleStale = (message) => {
    setFeedback({ type: 'error', message })
    retry()
  }

  const deletion = useEventCategoryDeletion({
    onSuccess: (message) => {
      setFeedback({ type: 'success', message })
      retry()
    },
    onStale: handleStale,
    onError: (message) => setFeedback({ type: 'error', message }),
  })

  const busy = loading || deletion.pending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0d1f35]">{EVENT_CATEGORY_TEXTS.pageTitle}</h2>
          <p className="mt-1 text-sm text-gray-600">{EVENT_CATEGORY_TEXTS.subtitle}</p>
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          disabled={busy || categories === null}
          onClick={() => setEditing({ category: null })}
          className={`${buttonClass} flex items-center gap-2`}
        >
          <Plus size={16} aria-hidden="true" />
          {EVENT_CATEGORY_TEXTS.newButton}
        </button>
      </div>

      {feedback && (
        <FeedbackBanner type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>{EVENT_CATEGORY_TEXTS.retry}</button>
        </div>
      ) : categories === null ? (
        loading && <p role="status" className="py-12 text-center text-gray-600">{EVENT_CATEGORY_TEXTS.loading}</p>
      ) : categories.length === 0 ? (
        <p className="rounded-xl bg-white py-12 text-center text-gray-600 shadow-sm">{EVENT_CATEGORY_TEXTS.empty}</p>
      ) : (
        <EventCategoriesTable
          categories={categories}
          busy={loading}
          onEdit={(category) => setEditing({ category })}
          onDelete={deletion.requestDelete}
          actionsDisabled={busy}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletion.deleting)}
        title={EVENT_CATEGORY_TEXTS.deleteTitle}
        icon={TriangleAlert}
        description={deletion.deleting ? getDeleteCategoryDescription(deletion.deleting.name) : ''}
        confirmLabel={EVENT_CATEGORY_TEXTS.deleteConfirm}
        cancelLabel={EVENT_CATEGORY_TEXTS.cancel}
        tone="danger"
        pending={deletion.pending}
        onConfirm={deletion.confirm}
        onCancel={deletion.cancel}
      />

      {editing && (
        <EventCategoryDialog
          key={editing.category?.id ?? 'new'}
          category={editing.category}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
          onSuccess={(message) => {
            setEditing(null)
            setFeedback({ type: 'success', message })
            retry()
          }}
          onStale={(message) => {
            setEditing(null)
            handleStale(message)
          }}
        />
      )}
    </div>
  )
}
