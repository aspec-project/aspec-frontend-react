import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  MessageSquareText,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

const reviewScopes = [
  { id: 'received', label: 'Feitas ao meu perfil' },
  { id: 'given', label: 'Feitas por mim' },
]

const reviewFilters = [
  { id: 'all', label: 'Todas', icon: MessageSquareText },
  { id: 'visible', label: 'Visíveis', icon: Eye },
  { id: 'flagged', label: 'Sinalizadas', icon: Flag },
  { id: 'hidden', label: 'Ocultas', icon: EyeOff },
]

/*
 * Ainda não há endpoint de avaliações. A estrutura abaixo mantém a página
 * pronta para receber a lista, os totais e a média sem inventar dados.
 */
const unavailableReviewData = {
  averageRating: null,
  total: null,
  counts: {
    all: null,
    visible: null,
    flagged: null,
    hidden: null,
  },
  reviews: [],
  currentPage: 1,
  lastPage: 1,
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

function EmptyReviews({ scope }) {
  const isReceived = scope === 'received'

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#9b7b45]">
        <MessageSquareText size={23} aria-hidden="true" />
      </span>

      <h2 className="mt-5 text-xl font-bold text-[#0d1f35]">
        {isReceived
          ? 'Ainda não existem avaliações para mostrar'
          : 'Ainda não fez avaliações'}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {isReceived
          ? 'As avaliações feitas ao seu perfil serão apresentadas aqui.'
          : 'As avaliações que fizer a outros membros serão apresentadas aqui.'}
      </p>
    </section>
  )
}

function Pagination({ currentPage, lastPage }) {
  return (
    <nav
      className="mt-7 flex items-center justify-center gap-2"
      aria-label="Paginação das avaliações"
    >
      <button
        type="button"
        disabled
        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Anterior
      </button>

      <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-[#0d1f35] px-3 text-sm font-semibold text-white">
        {currentPage}
      </span>

      <button
        type="button"
        disabled={currentPage >= lastPage}
        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"
      >
        Seguinte
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}

/*
 * A página replica a hierarquia do Figma e deixa a fonte dos dados isolada.
 * Quando existir GET /api/me/reviews, este objeto temporário será substituído
 * por dados carregados da API, mantendo os mesmos estados visuais.
 */
export default function MemberReviewsPage() {
  const { profile } = useOutletContext()
  const [scope, setScope] = useState('received')
  const [filter, setFilter] = useState('all')

  const reviewData = useMemo(
    () => ({
      ...unavailableReviewData,
      averageRating: getProfileAverageRating(profile),
    }),
    [profile],
  )

  const isReceived = scope === 'received'
  const heading = isReceived
    ? 'Avaliações ao meu perfil'
    : 'Avaliações feitas por mim'
  const visibleFilters = isReceived ? reviewFilters : reviewFilters.slice(0, 2)

  return (
    <section aria-labelledby="member-reviews-title">
      <h1 id="member-reviews-title" className="sr-only">
        {heading}
      </h1>

      <div
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#eeece7] p-1"
        role="tablist"
        aria-label="Tipo de avaliações"
      >
        {reviewScopes.map((reviewScope) => {
          const isActive = scope === reviewScope.id

          return (
            <button
              key={reviewScope.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setScope(reviewScope.id)
                setFilter('all')
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-[#0d1f35] shadow-sm'
                  : 'text-slate-500 hover:text-[#0d1f35]'
              }`}
            >
              {reviewScope.label}
              <CountBadge
                value={reviewScope.id === 'received' ? reviewData.total : null}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex sm:items-center sm:gap-8 sm:p-8">
        <div className="flex shrink-0 flex-col items-center border-b border-slate-100 pb-6 sm:min-w-32 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-8">
          <strong className="text-4xl font-bold text-[#0d1f35]">
            {reviewData.averageRating?.toFixed(1) ?? '—'}
          </strong>
          <div className="mt-2">
            <RatingStars rating={reviewData.averageRating} />
          </div>
          <span className="mt-2 text-center text-xs font-medium text-slate-500">
            Classificação média pública
          </span>
        </div>

        <div className="mt-6 sm:mt-0">
          <p className="text-sm leading-7 text-slate-600">
            {isReceived
              ? 'Aqui poderá consultar todas as avaliações feitas ao seu perfil. Apenas as avaliações visíveis contarão para a média pública.'
              : 'Aqui poderá consultar as avaliações que deixou a outros membros da plataforma.'}
          </p>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar avaliações"
      >
        {visibleFilters.map((reviewFilter) => {
          const Icon = reviewFilter.icon
          const isActive = filter === reviewFilter.id

          return (
            <button
              key={reviewFilter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(reviewFilter.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'border-[#0d1f35] bg-[#0d1f35] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#9b7b45] hover:text-[#0d1f35]'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {reviewFilter.label}
              <span
                className={
                  isActive
                    ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-xs'
                    : 'rounded-full bg-slate-100 px-1.5 py-0.5 text-xs'
                }
              >
                {reviewData.counts[reviewFilter.id] ?? '—'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6" role="tabpanel">
        {reviewData.reviews.length === 0 ? <EmptyReviews scope={scope} /> : null}
      </div>

      <Pagination
        currentPage={reviewData.currentPage}
        lastPage={reviewData.lastPage}
      />

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <ShieldCheck size={17} className="text-[#9b7b45]" aria-hidden="true" />
        As avaliações são moderadas pela administração ASPEC.
      </p>
    </section>
  )
}
