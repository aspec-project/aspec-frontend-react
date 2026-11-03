import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import FlaggedReviewsBanner from '../../components/admin/moderation/FlaggedReviewsBanner'
import ModerationReviewList from '../../components/admin/moderation/ModerationReviewList'
import ReviewFilterTabs from '../../components/admin/moderation/ReviewFilterTabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import Pagination from '../../components/ui/Pagination'
import ReasonDialog from '../../components/ui/ReasonDialog'
import useAdminReviews from '../../hooks/useAdminReviews'
import useReviewModeration from '../../hooks/useReviewModeration'
import { formatReviewsTotal, getEmptyReviewsText, getReviewDialog } from '../../utils/adminReviews'

const buttonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Página Moderação de Conteúdos do backoffice: faixa com o número de avaliações sinalizadas, chips de estado
 * com contagens, lista de cartões com as ações de cada estado (ocultar com justificação opcional, mostrar e
 * retirar a sinalização) e paginação numerada. O filtro fica no URL (`?estado=flagged|visible|hidden`, sem
 * parâmetro em "Todas"); um valor desconhecido abre em "Todas".
 * Depois de uma ação (ou de um 409/404), a lista e as contagens são recarregadas e o foco vai para o primeiro
 * botão da avaliação tratada; se ela saiu da lista, para a avaliação que ficou no mesmo lugar (ou a última);
 * se a lista ficou vazia, para o título "Avaliações".
 * A lógica vive nos hooks useAdminReviews (lista) e useReviewModeration (ações).
 *
 * @returns {JSX.Element}
 */
export default function AdminModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filter, data, loading, error, selectFilter, goToPage, retry, refresh } = useAdminReviews({
    initialFilter: searchParams.get('estado'),
  })
  const headingRef = useRef(null)
  const listRef = useRef(null)
  const focusTargetRef = useRef(null)

  /**
   * Guarda a avaliação tratada (id e lugar na lista) para o foco depois de recarregar e recarrega a lista.
   *
   * @param {{id: string}} review Avaliação tratada.
   */
  const reloadAfterAction = (review) => {
    const index = data?.items.findIndex((item) => item.id === review.id) ?? -1
    focusTargetRef.current = { id: review.id, index: Math.max(0, index) }
    refresh()
  }

  const actions = useReviewModeration({ onChanged: reloadAfterAction, onStale: reloadAfterAction })

  useEffect(() => {
    const target = focusTargetRef.current

    if (!target || loading) return

    focusTargetRef.current = null

    if (error || !data) return

    const cards = Array.from(listRef.current?.querySelectorAll('li[data-review-id]') ?? [])

    if (cards.length === 0) {
      headingRef.current?.focus()
      return
    }

    const card = cards.find((item) => item.dataset.reviewId === target.id)
      ?? cards[Math.min(target.index, cards.length - 1)]

    card.querySelector('button')?.focus()
  }, [data, loading, error])

  /**
   * Muda de chip e guarda-o no URL (sem parâmetro para "Todas"), substituindo a entrada do histórico.
   *
   * @param {string} key Key do chip escolhido.
   */
  const handleSelectFilter = (key) => {
    selectFilter(key)
    setSearchParams(key === 'all' ? {} : { estado: key }, { replace: true })
  }

  const pagination = data?.pagination
  const confirmingAction = actions.confirming?.action
  const dialog = confirmingAction ? getReviewDialog(confirmingAction) : null
  const hiding = confirmingAction === 'hide'

  return (
    <div className="space-y-6">
      {actions.feedback && (
        <FeedbackBanner type={actions.feedback.type} message={actions.feedback.message} onClose={actions.dismissFeedback} />
      )}

      <FlaggedReviewsBanner count={data?.counts.flagged ?? 0} />

      <ReviewFilterTabs activeFilter={filter} counts={data?.counts} onSelect={handleSelectFilter} />

      <h2 ref={headingRef} tabIndex={-1} className="sr-only">Avaliações</h2>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
        </div>
      ) : !data ? (
        loading && <p role="status" className="py-12 text-center text-gray-600">A carregar avaliações...</p>
      ) : (
        <>
          {data.items.length === 0 ? (
            <p className="rounded-xl bg-white py-12 text-center text-gray-600 shadow-sm">{getEmptyReviewsText(filter)}</p>
          ) : (
            <ModerationReviewList
              reviews={data.items}
              actionsDisabled={loading || actions.pending}
              onAction={actions.requestAction}
              listRef={listRef}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p role="status" className="text-sm text-gray-500">{formatReviewsTotal(pagination.total)}</p>
            <Pagination
              currentPage={pagination.current_page}
              lastPage={pagination.last_page}
              onChange={goToPage}
              disabled={loading}
              label="Paginação de avaliações"
            />
          </div>
        </>
      )}

      <ReasonDialog
        open={hiding}
        {...(hiding ? dialog : null)}
        error={actions.error}
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
      <ConfirmDialog
        open={Boolean(dialog) && !hiding}
        {...(hiding ? null : dialog)}
        showClose
        pending={actions.pending}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </div>
  )
}
