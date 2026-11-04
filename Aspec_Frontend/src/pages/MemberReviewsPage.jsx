import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import useSessionRequest from '../hooks/useSessionRequest'
import { normalizeError } from '../services/api'
import { getMyReviews } from '../services/members'
import { isSessionCurrent } from '../services/sessionContext'

const reviewScopes = [
  { id: 'received', label: 'Feitas ao meu perfil', direction: 'received' },
  { id: 'written', label: 'Feitas por mim', direction: 'written' },
]

const reviewFilters = [
  { id: 'all', label: 'Todas', icon: MessageSquareText },
  { id: 'visible', label: 'Visíveis', icon: Eye },
  { id: 'flagged', label: 'Sinalizadas', icon: Flag },
  { id: 'hidden', label: 'Ocultas', icon: EyeOff },
]

const reviewStatus = {
  Visible: { label: 'Visível', className: 'bg-emerald-50 text-emerald-700' },
  Flagged: { label: 'Sinalizada', className: 'bg-amber-50 text-amber-800' },
  Hidden: { label: 'Oculta', className: 'bg-slate-100 text-slate-700' },
}

function getProfileAverageRating(profile) {
  const rating = Number(profile?.average_rating)

  return Number.isFinite(rating) && rating >= 0 && rating <= 5
    ? rating
    : null
}

function RatingStars({ rating }) {
  return (
    <div
      className="flex items-center justify-center gap-1"
      aria-label={
        rating === null ? 'Média ainda indisponível' : `${rating} em 5 estrelas`
      }
    >
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = rating !== null && index < Math.round(rating)

        return (
          <Star
            key={index}
            size={17}
            className={
              isFilled ? 'fill-[#9b7b45] text-[#9b7b45]' : 'text-slate-300'
            }
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}

function CountBadge({ value }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
      {value ?? '—'}
    </span>
  )
}

function formatReviewDate(value) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function ReviewCard({ review }) {
  const isReceived = review.direction === 'received'
  const counterpart = isReceived ? review.reviewer : review.reviewed
  const status = reviewStatus[review.status] ?? reviewStatus.Visible
  const title = isReceived ? 'Avaliação de' : 'Avaliação feita a'

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <h2 className="mt-1 break-words text-base font-semibold text-[#0d1f35]">
            {counterpart.business_name}
          </h2>
          <time
            className="mt-1 block text-xs text-slate-500"
            dateTime={review.created_at}
          >
            {formatReviewDate(review.created_at)}
          </time>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
          <RatingStars rating={review.rating} />
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {review.comment}
      </p>

      {review.status === 'Hidden' && review.hidden_reason && (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          <strong className="font-semibold text-slate-700">Motivo da ocultação:</strong>{' '}
          {review.hidden_reason}
        </p>
      )}
    </li>
  )
}

function EmptyReviews({ scope, filter }) {
  const isReceived = scope === 'received'
  const filtered = filter !== 'all'

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#9b7b45]">
        <MessageSquareText size={23} aria-hidden="true" />
      </span>

      <h2 className="mt-5 text-xl font-bold text-[#0d1f35]">
        {filtered
          ? 'Não existem avaliações com este estado'
          : isReceived
            ? 'Ainda não existem avaliações para mostrar'
            : 'Ainda não fez avaliações'}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {filtered
          ? 'Escolha outro filtro para consultar as restantes avaliações.'
          : isReceived
            ? 'As avaliações feitas ao seu perfil serão apresentadas aqui.'
            : 'As avaliações que fizer a outros membros da plataforma serão apresentadas aqui.'}
      </p>
    </section>
  )
}

function Pagination({ currentPage, lastPage, disabled, onPrevious, onNext, onPage }) {
  const pageNumbers = Array.from(
    { length: Math.min(lastPage, 5) },
    (_, index) => Math.max(1, Math.min(lastPage - 4, currentPage - 2)) + index,
  )

  return (
    <nav
      className="mt-7 flex items-center justify-center gap-2"
      aria-label="Paginação das avaliações"
    >
      <button
        type="button"
        disabled={disabled || currentPage <= 1}
        onClick={onPrevious}
        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Anterior
      </button>

      <div className="flex items-center gap-1" aria-label="Páginas disponíveis">
        {pageNumbers[0] > 1 && <span className="px-1 text-sm text-slate-400">…</span>}
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            disabled={disabled}
            aria-label={`Página ${pageNumber}`}
            aria-current={pageNumber === currentPage ? 'page' : undefined}
            onClick={() => onPage(pageNumber)}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
              pageNumber === currentPage
                ? 'bg-[#0d1f35] text-white'
                : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}
        {pageNumbers.at(-1) < lastPage && <span className="px-1 text-sm text-slate-400">…</span>}
      </div>

      <button
        type="button"
        disabled={disabled || currentPage >= lastPage}
        onClick={onNext}
        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        Seguinte
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}

/* Avaliações recebidas e feitas pelo membro autenticado. */
export default function MemberReviewsPage() {
  const { profile } = useOutletContext()
  const getRequestContext = useSessionRequest()
  const [scope, setScope] = useState('received')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)

  const activeScope = reviewScopes.find((reviewScope) => reviewScope.id === scope)
    ?? reviewScopes[0]
  const requestKey = `${activeScope.id}:${filter}:${page}:${retry}`
  const current = result?.key === requestKey ? result : null
  const data = current?.status === 'success' ? current.data : null
  const pagination = data?.pagination
  const averageRating = getProfileAverageRating(profile)
  const isReceived = activeScope.id === 'received'

  useEffect(() => {
    const context = getRequestContext()

    if (!context) {
      return undefined
    }

    const controller = new AbortController()
    const signal = AbortSignal.any([context.signal, controller.signal])

    getMyReviews({
      direction: activeScope.direction,
      status: filter,
      page,
      perPage: 5,
    }, signal)
      .then((response) => {
        if (!controller.signal.aborted && isSessionCurrent(context)) {
          setResult({ key: requestKey, status: 'success', data: response })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && isSessionCurrent(context)) {
          setResult({
            key: requestKey,
            status: 'error',
            message: normalizeError(error).message,
          })
        }
      })

    return () => controller.abort()
  }, [activeScope.direction, filter, getRequestContext, page, requestKey])

  function chooseScope(nextScope) {
    if (nextScope === scope) {
      return
    }

    setScope(nextScope)
    setFilter('all')
    setPage(1)
  }

  function chooseFilter(nextFilter) {
    if (nextFilter === filter) {
      return
    }

    setFilter(nextFilter)
    setPage(1)
  }

  const summaryValue = isReceived
    ? averageRating?.toFixed(1) ?? '—'
    : pagination?.total ?? '—'

  return (
    <section aria-labelledby="member-reviews-title">
      <h1 id="member-reviews-title" className="sr-only">
        {isReceived ? 'Avaliações ao meu perfil' : 'Avaliações feitas por mim'}
      </h1>

      <div
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#eeece7] p-1"
        role="tablist"
        aria-label="Tipo de avaliações"
      >
        {reviewScopes.map((reviewScope) => {
          const isActive = scope === reviewScope.id
          const count = isActive && filter === 'all' ? pagination?.total : null

          return (
            <button
              key={reviewScope.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => chooseScope(reviewScope.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-[#0d1f35] shadow-sm'
                  : 'text-slate-500 hover:text-[#0d1f35]'
              }`}
            >
              {reviewScope.label}
              <CountBadge value={count} />
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex sm:items-center sm:gap-8 sm:p-8">
        <div className="flex shrink-0 flex-col items-center border-b border-slate-100 pb-6 sm:min-w-32 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-8">
          <strong className="text-4xl font-bold text-[#0d1f35]">
            {summaryValue}
          </strong>
          {isReceived ? (
            <>
              <div className="mt-2">
                <RatingStars rating={averageRating} />
              </div>
              <span className="mt-2 text-center text-xs font-medium text-slate-500">
                Classificação média pública
              </span>
            </>
          ) : (
            <span className="mt-2 text-center text-xs font-medium text-slate-500">
              Avaliações encontradas
            </span>
          )}
        </div>

        <div className="mt-6 sm:mt-0">
          <p className="text-sm leading-7 text-slate-600">
            {isReceived
              ? 'Aqui poderá consultar todas as avaliações feitas ao seu perfil. Apenas as avaliações visíveis contam para a média pública.'
              : 'Aqui poderá consultar todas as avaliações que deixou a outros membros da plataforma.'}
          </p>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar avaliações por estado"
      >
        {reviewFilters.map((reviewFilter) => {
          const Icon = reviewFilter.icon
          const isActive = filter === reviewFilter.id

          return (
            <button
              key={reviewFilter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => chooseFilter(reviewFilter.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'border-[#0d1f35] bg-[#0d1f35] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#9b7b45] hover:text-[#0d1f35]'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {reviewFilter.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6" role="tabpanel">
        {!current && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm" role="status">
            A carregar avaliações…
          </section>
        )}

        {current?.status === 'error' && (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-red-900" role="alert">
            <h2 className="text-lg font-bold">Não foi possível carregar as avaliações</h2>
            <p className="mt-2 text-sm">{current.message}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193451]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Tentar novamente
            </button>
          </section>
        )}

        {data && (data.items.length > 0 ? (
          <ul className="space-y-4">
            {data.items.map((review) => <ReviewCard key={review.id} review={review} />)}
          </ul>
        ) : <EmptyReviews scope={scope} filter={filter} />)}
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          disabled={!data}
          onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          onNext={() => setPage((currentPage) => Math.min(pagination.last_page, currentPage + 1))}
          onPage={setPage}
        />
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <ShieldCheck size={17} className="text-[#9b7b45]" aria-hidden="true" />
        As avaliações são moderadas pela administração ASPEC.
      </p>
    </section>
  )
}
