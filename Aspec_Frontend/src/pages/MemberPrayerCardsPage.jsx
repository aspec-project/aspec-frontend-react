import { useEffect, useState } from 'react'
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  HeartHandshake,
  Mail,
  Phone,
  RotateCcw,
  Users,
  X,
} from 'lucide-react'
import { normalizeError } from '../services/api'
import useSessionRequest from '../hooks/useSessionRequest'
import { isSessionCurrent } from '../services/sessionContext'
import { getReceivedPrayerCards } from '../services/prayerCards'

const PER_PAGE = 5

function formatDateOnly(value, options) {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'UTC',
    ...options,
  }).format(date)
}

function formatEventDate(value) {
  return formatDateOnly(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value, options) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    ...options,
  }).format(date)
}

function formatPrayerUntil(value) {
  const date = formatDateTime(value, {
    day: '2-digit',
    month: '2-digit',
  })

  return date ? 'Semana de oração até ' + date : null
}

function getCacheKey(period, page) {
  return period + ':' + page
}

function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, Math.min(currentPage - 2, lastPage - 4))
  const end = Math.min(lastPage, start + 4)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/*
 * Mantém a paginação e os resultados de cada período. Ao voltar a uma página
 * já lida, a lista é apresentada de imediato sem repetir o pedido à API.
 */
function useReceivedPrayerCards(period) {
  const getRequestContext = useSessionRequest()
  const [page, setPage] = useState(1)
  const [cachedPages, setCachedPages] = useState({})
  const [errors, setErrors] = useState({})
  const [retryNonce, setRetryNonce] = useState(0)

  const cacheKey = getCacheKey(period, page)
  const requestKey = cacheKey + ':' + retryNonce
  const result = cachedPages[cacheKey] ?? null
  const loadError = errors[requestKey] ?? ''

  useEffect(() => {
    if (result) return undefined

    const context = getRequestContext()

    if (!context) return undefined

    const controller = new AbortController()
    let isMounted = true

    async function loadCards() {
      try {
        const data = await getReceivedPrayerCards(
          period,
          page,
          PER_PAGE,
          controller.signal,
          context,
        )

        if (isMounted && isSessionCurrent(context)) {
          setCachedPages((currentPages) => ({
            ...currentPages,
            [cacheKey]: data,
          }))
        }
      } catch (error) {
        if (
          isMounted &&
          isSessionCurrent(context) &&
          error.code !== 'ERR_CANCELED'
        ) {
          const normalisedError = normalizeError(error)

          setErrors((currentErrors) => ({
            ...currentErrors,
            [requestKey]:
              normalisedError.message ??
              'Não foi possível carregar os cartões de oração.',
          }))
        }
      }
    }

    void loadCards()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [cacheKey, getRequestContext, page, period, requestKey, result])

  function retry() {
    setCachedPages((currentPages) => {
      const { [cacheKey]: _discardedPage, ...remainingPages } = currentPages

      return remainingPages
    })
    setRetryNonce((nonce) => nonce + 1)
  }

  function changePage(nextPage) {
    if (
      !result ||
      nextPage < 1 ||
      nextPage > result.pagination.last_page ||
      nextPage === page
    ) {
      return
    }

    setPage(nextPage)
  }

  return {
    result,
    loadError,
    isLoading: result === null && !loadError,
    retry,
    changePage,
  }
}

function PrayerRequest({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-4 py-5 first:pt-1 last:pb-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6ecd7] text-[#9b7b45]">
        <Icon size={19} aria-hidden="true" />
      </div>
      <div>
        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#806537]">
          {label}
        </dt>
        <dd className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-900">
          {value?.trim() || '—'}
        </dd>
      </div>
    </div>
  )
}

function PrayerCardDialog({ card, onClose }) {
  const [showBack, setShowBack] = useState(false)
  const authorName = card.author?.name?.trim() || 'Membro ASPEC'
  const eventDate = formatDateOnly(card.event?.event_date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const prayUntil = formatPrayerUntil(card.pray_until)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relative w-full max-w-2xl rounded-2xl border-[3px] border-[#a98b4d] bg-[#fff8eb] p-6 text-slate-950 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prayer-card-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={() => setShowBack((isBack) => !isBack)}
            title={
              showBack
                ? 'Mostrar a frente do cartão'
                : 'Mostrar os pedidos de oração'
            }
            aria-label={
              showBack
                ? 'Mostrar a frente do cartão'
                : 'Mostrar os pedidos de oração'
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e1d3ae] bg-[#fffaf0] text-[#806537] transition hover:bg-[#f7eedc]"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cartão de oração"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-800 transition hover:bg-[#f7eedc]"
          >
            <X size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {showBack ? (
          <div className="py-4 pr-12 sm:py-6 sm:pr-16">
            <h2 id="prayer-card-dialog-title" className="sr-only">
              Pedidos de oração de {authorName}
            </h2>
            <dl className="divide-y divide-[#e4d8bd]">
              <PrayerRequest
                icon={Users}
                label="Pedido pessoal"
                value={card.personal_request}
              />
              <PrayerRequest
                icon={Briefcase}
                label="Pedido de emprego"
                value={card.work_request}
              />
              <PrayerRequest
                icon={HeartHandshake}
                label="Pedido de salvação"
                value={card.salvation_request}
              />
            </dl>
          </div>
        ) : (
          <div className="pr-12 sm:pr-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#806537]">
              ✝ Cartão de oração
            </p>
            <h2
              id="prayer-card-dialog-title"
              className="mt-2 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl"
            >
              {card.event?.name || 'Evento ASPEC'}
            </h2>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
              {eventDate && (
                <p className="inline-flex items-center gap-2">
                  <CalendarDays
                    size={16}
                    className="text-[#9b7b45]"
                    aria-hidden="true"
                  />
                  {eventDate}
                </p>
              )}
              {prayUntil && (
                <span className="rounded-full border border-[#decfa9] bg-[#faf1db] px-3 py-1.5 text-xs font-semibold text-[#806537]">
                  {prayUntil}
                </span>
              )}
            </div>

            <section className="mt-5 rounded-xl bg-white/75 p-4">
              <div className="flex gap-3">
                <BookOpen
                  size={22}
                  className="mt-0.5 shrink-0 text-[#9b7b45]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#806537]">
                    Versículo da semana
                  </h3>
                  <p className="mt-2 text-sm italic leading-6 text-slate-800">
                    {card.prayer_verse?.trim() || '—'}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#806537]">
                Escrito por
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {authorName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {card.author?.email && (
                  <a
                    href={'mailto:' + card.author.email}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#ded5bf] bg-[#fffaf0] px-3 py-2 text-sm text-slate-800 transition hover:bg-[#f7eedc]"
                  >
                    <Mail
                      size={16}
                      className="text-[#9b7b45]"
                      aria-hidden="true"
                    />
                    {card.author.email}
                  </a>
                )}
                {card.author?.phone && (
                  <a
                    href={'tel:' + card.author.phone.replace(/[^+\d]/g, '')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#ded5bf] bg-[#fffaf0] px-3 py-2 text-sm text-slate-800 transition hover:bg-[#f7eedc]"
                  >
                    <Phone
                      size={16}
                      className="text-[#9b7b45]"
                      aria-hidden="true"
                    />
                    {card.author.phone}
                  </a>
                )}
                {!card.author?.email && !card.author?.phone && (
                  <p className="text-sm text-slate-600">
                    Contactos não disponíveis.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

function Pagination({ pagination, onChange }) {
  if (pagination.last_page <= 1) return null

  const firstItem = (pagination.current_page - 1) * pagination.per_page + 1
  const lastItem = Math.min(
    firstItem + pagination.per_page - 1,
    pagination.total,
  )

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
      <p className="text-sm text-slate-500">
        {firstItem} – {lastItem} de {pagination.total} cartões
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1}
          aria-label="Página anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0d1f35] transition hover:bg-[#f5f3ee] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        {getPageNumbers(pagination.current_page, pagination.last_page).map(
          (page) => (
            <button
              key={page}
              type="button"
              onClick={() => onChange(page)}
              aria-current={page === pagination.current_page ? 'page' : undefined}
              className={
                page === pagination.current_page
                  ? 'h-8 w-8 rounded-lg bg-[#0d1f35] text-xs font-semibold text-white transition'
                  : 'h-8 w-8 rounded-lg text-xs font-semibold text-[#0d1f35] transition hover:bg-[#f5f3ee]'
              }
            >
              {page}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.last_page}
          aria-label="Página seguinte"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0d1f35] transition hover:bg-[#f5f3ee] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </footer>
  )
}

function PrayerCardsSection({ title, description, state, onSelectCard }) {
  const cards = state.result?.items ?? []
  const count = state.result?.pagination?.total

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-[#0d1f35]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {typeof count === 'number' && (
          <span className="rounded-full bg-[#f6f0df] px-3 py-1 text-sm font-semibold text-[#806537]">
            {count}
          </span>
        )}
      </header>

      {state.isLoading ? (
        <p className="px-5 py-6 text-sm text-slate-600 sm:px-6">
          A carregar cartões...
        </p>
      ) : state.loadError ? (
        <div className="px-5 py-6 sm:px-6" role="alert">
          <p className="text-sm text-red-800">{state.loadError}</p>
          <button
            type="button"
            onClick={state.retry}
            className="mt-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50"
          >
            Tentar novamente
          </button>
        </div>
      ) : cards.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500 sm:px-6">
          Ainda não existem cartões neste período.
        </p>
      ) : (
        <>
          <ul>
            {cards.map((card) => {
              const authorName = card.author?.name?.trim() || 'Membro ASPEC'
              const eventName = card.event?.name || 'Evento ASPEC'
              const eventDate = formatEventDate(card.event?.event_date)

              return (
                <li key={card.id} className="border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => onSelectCard(card)}
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#fbfaf7] sm:px-6"
                    aria-label={'Ver cartão de ' + authorName + ', ' + eventName}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#0d1f35]">
                        {eventName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {[eventDate, authorName].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#9b7b45] transition group-hover:bg-[#f5eddb]">
                      <Eye size={18} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Pagination
            pagination={state.result.pagination}
            onChange={state.changePage}
          />
        </>
      )}
    </section>
  )
}

/*
 * Organização idêntica ao protótipo: duas listas permanentes e um cartão
 * interativo que alterna entre a frente (evento, versículo e contactos) e o
 * verso (três pedidos de oração em linhas).
 */
export default function MemberPrayerCardsPage() {
  const currentCards = useReceivedPrayerCards('current')
  const previousCards = useReceivedPrayerCards('previous')
  const [selectedCard, setSelectedCard] = useState(null)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#0d1f35]">
          Os meus cartões de oração
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Estes são os cartões pelos quais ficou responsável. Cada cartão
          pertence a outro participante, por quem é convidado a orar durante
          uma semana.
        </p>
      </header>

      <PrayerCardsSection
        title="Esta Semana"
        description="Cartões recebidos nos últimos 7 dias, por quem está a orar neste momento."
        state={currentCards}
        onSelectCard={setSelectedCard}
      />
      <PrayerCardsSection
        title="Anteriores"
        description="Cartões de semanas passadas."
        state={previousCards}
        onSelectCard={setSelectedCard}
      />

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Heart size={14} aria-hidden="true" />
        Os cartões ficam disponíveis durante 6 meses a contar da data do evento.
      </p>

      {selectedCard && (
        <PrayerCardDialog
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
