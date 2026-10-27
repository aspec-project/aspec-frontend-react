import { useEffect, useState } from 'react'
import { getMemberReviews } from '../../services/members'
import { useAuthStore } from '../../store/authStore'
import RatingStars from './RatingStars'

const buttonClass = 'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#0d1f35] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4'

export default function MemberReviews({ memberId, allowReview = false }) {
  const user = useAuthStore((state) => state.user)
  const sessionStatus = useAuthStore((state) => state.status)
  const isActiveViewer = sessionStatus === 'authenticated' && ['Member', 'Admin'].includes(user?.role?.name) && user?.account_status?.name === 'Active'
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [context, setContext] = useState({ memberId, user, sessionStatus })
  const contextChanged = context.memberId !== memberId || context.user !== user || context.sessionStatus !== sessionStatus

  if (contextChanged) {
    setContext({ memberId, user, sessionStatus })
    setPage(1)
    setResult(null)
  }

  useEffect(() => {
    const controller = new AbortController()
    const snapshot = { memberId, user, sessionStatus, page, retry }
    getMemberReviews(memberId, page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ ...snapshot, status: 'success', data })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ ...snapshot, status: error?.response?.status === 404 ? 'empty' : 'error' })
      })
    return () => controller.abort()
  }, [memberId, user, sessionStatus, page, retry])

  const current = !contextChanged && result?.memberId === memberId && result.user === user &&
    result.sessionStatus === sessionStatus && result.page === page && result.retry === retry ? result : null
  const data = current?.status === 'success' ? current.data : null
  const sameContext = result?.memberId === memberId && result.user === user && result.sessionStatus === sessionStatus
  const pagination = data?.pagination ?? (!current && sameContext ? result.data?.pagination : null)
  let content
  if (!current) {
    content = <p role="status" className="mt-4 text-sm text-gray-600">A carregar avaliações...</p>
  } else if (current.status === 'error') {
    content = (
      <div role="alert" className="mt-4 text-sm text-gray-600">
        <p>Não foi possível carregar as avaliações. Tente novamente.</p>
        <button type="button" className={`${buttonClass} mt-4`} onClick={() => setRetry((value) => value + 1)}>Tentar carregar avaliações novamente</button>
      </div>
    )
  } else if (current.status === 'empty' || data.items.length === 0) {
    content = <p className="mt-4 text-sm text-gray-600">Ainda não existem avaliações.</p>
  } else {
    content = (
      <ul className="mt-6 divide-y divide-gray-100">
        {data.items.map((review) => (
          <li key={review.id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a7043]/15 font-medium text-[#8a7043]">
                {review.reviewer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-PT')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-medium text-[#0d1f35]">{review.reviewer.name}</p>
                  <time className="text-xs text-gray-500" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('pt-PT')}</time>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm" aria-label={`${review.rating} de 5 estrelas`}><RatingStars rating={review.rating} size={13} /><span>{review.rating} / 5</span></p>
                {review.comment?.trim() && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{review.comment}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" aria-busy={!current}>
      <h2 className="text-lg font-medium leading-normal text-[#0d1f35]">Avaliações</h2>
      {!allowReview && !isActiveViewer && data?.items.length > 0 && <p className="mt-3 text-sm leading-relaxed text-gray-600">Para avaliar este membro, é necessário ser membro ASPEC.</p>}
      {content}
      {pagination && pagination.last_page > 1 && (
        <nav aria-label="Paginação das avaliações" className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className={buttonClass} disabled={!current || page <= 1} onClick={() => setPage((value) => value - 1)}>Avaliações anteriores</button>
          <span className="text-sm text-gray-600">Página {page} de {pagination.last_page}</span>
          <button type="button" className={buttonClass} disabled={!current || page >= pagination.last_page} onClick={() => setPage((value) => value + 1)}>Avaliações seguintes</button>
        </nav>
      )}
    </section>
  )
}
