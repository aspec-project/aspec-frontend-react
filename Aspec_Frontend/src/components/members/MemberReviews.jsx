import { useEffect, useId, useRef, useState } from 'react'
import { Flag, MessageSquare, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteMemberReview, getMemberReviewPage, isMemberProfileId, saveMemberReview } from '../../services/members'
import { getMemberProfile } from '../../services/memberProfile'
import { getSessionContext, isSessionCurrent } from '../../services/sessionContext'
import { useAuthStore } from '../../store/authStore'
import { canActAsMember, canReportReviews } from '../../utils/memberAccess'
import Pagination from '../ui/Pagination'
import SelectMenu from '../ui/SelectMenu'
import RatingStars from './RatingStars'
import ReportReviewDialog from './ReportReviewDialog'

const focusClass = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]'
const buttonClass = `rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${focusClass}`
const sortOptions = [
  { value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigas' },
  { value: 'highest', label: 'Melhor classificação' }, { value: 'lowest', label: 'Pior classificação' },
]
const ratingOptions = [{ value: '', label: 'Todas as estrelas' }, ...[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} ${value === 1 ? 'estrela' : 'estrelas'}` }))]

function mutationError(error) {
  return ({
    401: 'A sessão terminou. Entre novamente para avaliar.',
    403: 'Não tem permissão para avaliar este membro.',
    404: 'O membro ou a avaliação já não está disponível.',
    409: 'A avaliação foi alterada. Atualize as avaliações antes de tentar novamente.',
    419: 'A sessão expirou. Atualize a página e tente novamente.',
    422: 'Verifique os campos da avaliação.',
    429: 'Demasiados pedidos. Tente novamente mais tarde.',
  })[error.response?.status] ?? 'Não foi possível concluir o pedido. Os seus dados foram preservados. Tente novamente.'
}

function ReviewCard({ review, mine = false, onEdit, editable, onReport }) {
  const name = review.reviewer.business_name
  const date = new Date(review.created_at)
  const month = new Intl.DateTimeFormat('pt-PT', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '')
  return (
    <li className={mine ? 'rounded-[14px] border border-[#c9b87a] bg-[#f5f2e8] p-4' : 'border-b border-gray-50 py-[18px] last:border-b-0'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${mine ? 'bg-[#8a7043]' : 'bg-[#0d1f35]'}`}>{name.trim().charAt(0).toLocaleUpperCase('pt-PT')}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">{name}</p>
              {mine && <span className="rounded-full bg-[#8a7043] px-2 py-0.5 text-[10px] font-semibold text-white">A minha avaliação</span>}
            </div>
            <time className="block text-xs text-gray-500" dateTime={review.created_at}>{month.charAt(0).toLocaleUpperCase('pt-PT') + month.slice(1)} {date.getUTCFullYear()}</time>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="pt-0.5" role="img" aria-label={`${review.rating} de 5 estrelas`}><RatingStars rating={review.rating} size={12} /></span>
          {!mine && review.is_mine === false && onReport && <button type="button" onClick={() => onReport(review)} aria-label={`Sinalizar avaliação de ${name}`} className={`rounded p-2 text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:bg-red-50 focus-visible:text-red-600 ${focusClass}`}><Flag size={13} aria-hidden="true" /></button>}
        </div>
      </div>
      {review.comment?.trim() && <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{review.comment}</p>}
      {mine && editable && <button type="button" className={`mt-2 rounded text-xs text-[#755b30] underline ${focusClass}`} onClick={onEdit}>Editar</button>}
    </li>
  )
}

function RatingDistribution({ distribution, total }) {
  const maximum = Math.max(...distribution.map((item) => item.count), 1)

  return (
    <section
      className="mt-5 rounded-xl border border-[#e8eef5] bg-[#f8f9fa] p-4"
      aria-label="Distribuição das avaliações por estrelas"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#0d1f35]">Distribuição por estrelas</h3>
        <span className="text-xs text-slate-500">
          {total} {total === 1 ? 'avaliação' : 'avaliações'}
        </span>
      </div>

      <ol className="mt-3 space-y-2">
        {[...distribution].reverse().map(({ rating, count }) => (
          <li key={rating} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-3 text-right font-semibold text-[#0d1f35]">{rating}</span>
            <Star size={13} className="shrink-0 fill-[#9b7b45] text-[#9b7b45]" aria-hidden="true" />
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#9b7b45] transition-[width]"
                style={{ width: `${(count / maximum) * 100}%` }}
              />
            </div>
            <span className="w-5 text-right tabular-nums">{count}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/*
 * A mudança de contexto remonta o cartão para descartar imediatamente
 * comentários e formulários da identidade ou do perfil anteriores.
 */
export default function MemberReviews(props) {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const generation = useAuthStore((state) => state.sessionGeneration)
  const sessionChanging = useAuthStore((state) => state.sessionChanging)
  const [scope, setScope] = useState({ memberId: props.memberId, user, status, generation, revision: 0 })
  if (scope.memberId !== props.memberId || scope.user !== user || scope.status !== status || scope.generation !== generation) {
    setScope({ memberId: props.memberId, user, status, generation, revision: scope.revision + 1 })
    return null
  }
  const active = status === 'authenticated' && !sessionChanging && ['Member', 'Admin'].includes(user?.role?.name) && user?.account_status?.name === 'Active'
  if (!active) return null
  return <ReviewPanel key={scope.revision} {...props} user={user} generation={generation} />
}

/**
 * Cartão de avaliações do perfil público: resumo, lista, formulário da própria avaliação e aviso de moderação.
 * @param {{ memberId: string, allowReview?: boolean, user: object, generation: number, onSummaryChange?: Function }} props Perfil avaliado, sessão atual e callback do resumo.
 * @returns {JSX.Element} Secção "Avaliações".
 */
function ReviewPanel({ memberId, allowReview = false, user, generation, onSummaryChange }) {
  const formId = useId()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [ratingFilter, setRatingFilter] = useState('')
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [ownProfile, setOwnProfile] = useState(null)
  const [profileError, setProfileError] = useState(false)
  const [profileRetry, setProfileRetry] = useState(0)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [requestStatus, setRequestStatus] = useState(null)
  const [notice, setNotice] = useState('')
  const [awaitingModeration, setAwaitingModeration] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reportedReview, setReportedReview] = useState(null)
  const mutation = useRef(null)
  const summaryCallback = useRef(onSummaryChange)
  useEffect(() => { summaryCallback.current = onSummaryChange }, [onSummaryChange])
  const permittedRole = allowReview && canActAsMember(user)
  const canWrite = permittedRole && ownProfile !== null && ownProfile.id !== memberId
  const current = result?.page === page && result.sort === sort && result.ratingFilter === ratingFilter && result.retry === retry ? result : null
  const data = current?.status === 'success' ? current.data : null
  const mine = data?.mine ?? result?.data?.mine ?? null

  useEffect(() => {
    if (!permittedRole) return undefined
    const controller = new AbortController()
    const context = getSessionContext()
    getMemberProfile({ ...context, signal: AbortSignal.any([context.signal, controller.signal]) })
      .then((profile) => {
        if (controller.signal.aborted || !isSessionCurrent(context)) return
        if (!isMemberProfileId(profile?.id)) throw new Error('Perfil indisponível.')
        setOwnProfile(profile)
        setProfileError(false)
      })
      .catch(() => { if (!controller.signal.aborted && isSessionCurrent(context)) setProfileError(true) })
    return () => controller.abort()
  }, [permittedRole, profileRetry])

  useEffect(() => {
    const controller = new AbortController()
    const snapshot = { page, sort, ratingFilter, retry }
    getMemberReviewPage(memberId, page, controller.signal, { sort, rating: ratingFilter === '' ? '' : Number(ratingFilter) })
      .then((response) => {
        if (controller.signal.aborted) return
        if (response.pagination.current_page !== page) setPage(response.pagination.current_page)
        setResult({ ...snapshot, page: response.pagination.current_page, status: 'success', data: response })
        summaryCallback.current?.({ average_rating: response.average_rating, reviews_count: response.reviews_count })
      })
      .catch(() => { if (!controller.signal.aborted) setResult((previous) => ({ ...snapshot, status: 'error', data: previous?.data })) })
    return () => controller.abort()
  }, [memberId, page, sort, ratingFilter, retry])
  useEffect(() => () => mutation.current?.abort(), [])

  function openForm() {
    setRating(mine?.rating ?? 0)
    setComment(mine?.comment ?? '')
    setErrors({})
    setError('')
    setRequestStatus(null)
    setNotice('')
    setAwaitingModeration(false)
    setConfirmDelete(false)
    setEditing(true)
  }

  async function submit(remove = false) {
    if (mutation.current || !canWrite || !data) return
    const fields = {}
    if (!remove) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) fields.rating = 'Selecione entre 1 e 5 estrelas.'
      if (!comment.trim()) fields.comment = 'Escreva um comentário.'
      else if (comment.trim().length > 2000) fields.comment = 'O comentário não pode exceder 2000 caracteres.'
    }
    setErrors(fields)
    setError('')
    setRequestStatus(null)
    if (Object.keys(fields).length) return
    const controller = new AbortController()
    const session = getSessionContext()
    mutation.current = controller
    setBusy(true)
    setNotice('')
    setAwaitingModeration(false)
    const stillCurrent = () => !controller.signal.aborted && isSessionCurrent(session) && useAuthStore.getState().user === user && useAuthStore.getState().sessionGeneration === generation && useAuthStore.getState().status === 'authenticated'
    try {
      if (remove) await deleteMemberReview(memberId, controller.signal)
      const saved = remove ? null : await saveMemberReview(memberId, { rating, comment: comment.trim() }, controller.signal)
      if (!stillCurrent()) return
      setEditing(false)
      setConfirmDelete(false)
      const flagged = saved?.status === 'Flagged'
      setAwaitingModeration(flagged)
      setNotice(flagged ? '' : remove ? 'Avaliação removida. A atualizar avaliações…' : 'Avaliação guardada. A atualizar avaliações…')
      /* O POST não substitui a leitura da média e contagem reais. */
      summaryCallback.current?.(null)
      setResult(null)
      setRetry((value) => value + 1)
    } catch (requestError) {
      if (!stillCurrent()) return
      const validation = requestError.response?.status === 422 ? requestError.response?.data?.errors : null
      const fieldErrors = {}
      for (const field of ['rating', 'comment']) {
        const message = validation?.[field]
        if (typeof message === 'string') fieldErrors[field] = message
        else if (Array.isArray(message) && typeof message[0] === 'string') fieldErrors[field] = message[0]
      }
      setErrors(fieldErrors)
      setRequestStatus(requestError.response?.status ?? null)
      setError(mutationError(requestError))
    } finally {
      if (mutation.current === controller) mutation.current = null
      if (stillCurrent()) setBusy(false)
    }
  }

  function changeFilter(setter, value) { setReportedReview(null); setter(value); setPage(1) }
  function changePage(value) { setReportedReview(null); setPage(value) }
  function reviewReported({ message }) {
    setReportedReview(null)
    setAwaitingModeration(false)
    setNotice(message || 'Avaliação sinalizada para moderação.')
    summaryCallback.current?.(null)
    setResult(null)
    setRetry((value) => value + 1)
  }
  const pagination = data?.pagination ?? (!current ? result?.data?.pagination : null)
  return (
    <section className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 text-[#0d1f35] shadow-sm sm:p-6" aria-label="Avaliações">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium leading-normal">Avaliações</h2>
        {canWrite && data && <button type="button" disabled={busy} className={`${buttonClass} flex items-center gap-2 bg-[#e9edf3] px-3 py-2 text-xs`} onClick={openForm}><MessageSquare size={13} aria-hidden="true" />{mine ? 'Editar a minha avaliação' : 'Avaliar'}</button>}
      </div>
      {profileError && <div role="alert" className="mt-4 text-sm"><p>Não foi possível confirmar o seu perfil. A avaliação está indisponível.</p><button type="button" className={`mt-2 rounded underline ${focusClass}`} onClick={() => { setProfileError(false); setProfileRetry((value) => value + 1) }}>Tentar confirmar perfil novamente</button></div>}
      {editing && canWrite && <form className="mt-5 rounded-[14px] border border-[#e8eef5] bg-[#f8f9fa] p-4" noValidate onSubmit={(event) => { event.preventDefault(); submit() }}>
        <h3 className="text-sm font-medium">{mine ? 'Editar a sua avaliação' : 'Escrever uma avaliação'}</h3>
        <fieldset className="mt-3" disabled={busy} aria-describedby={errors.rating ? `${formId}-rating-error` : undefined} aria-invalid={!!errors.rating}>
          <legend className="sr-only">Classificação obrigatória</legend>
          <div className="flex gap-1 text-[#8a7043]">{[1, 2, 3, 4, 5].map((value) => <label key={value} className="relative cursor-pointer rounded focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#315a79]"><input className="peer sr-only" type="radio" name={`${formId}-rating`} value={value} checked={rating === value} required onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`} aria-invalid={!!errors.rating} aria-describedby={errors.rating ? `${formId}-rating-error` : undefined} /><Star size={24} fill={rating >= value ? 'currentColor' : 'none'} aria-hidden="true" /></label>)}</div>
        </fieldset>
        {errors.rating && <p id={`${formId}-rating-error`} className="mt-1 text-xs text-red-700">{errors.rating}</p>}
        <label htmlFor={`${formId}-comment`} className="sr-only">Comentário obrigatório</label>
        <textarea id={`${formId}-comment`} name="comment" rows={3} maxLength={2000} required disabled={busy} value={comment} onChange={(event) => setComment(event.target.value)} aria-invalid={!!errors.comment} aria-describedby={errors.comment ? `${formId}-comment-counter ${formId}-comment-error` : `${formId}-comment-counter`} className={`mt-3 block w-full resize-y rounded-xl border bg-transparent px-3 py-2 text-sm leading-relaxed disabled:opacity-60 ${errors.comment ? 'border-red-400' : 'border-gray-200'} ${focusClass}`} />
        <p id={`${formId}-comment-counter`} className={`mt-1 text-right text-xs ${comment.length >= 2000 ? 'text-amber-800' : 'text-gray-500'}`}>{comment.length}/2000</p>
        {errors.comment && <p id={`${formId}-comment-error`} className="mt-1 text-xs text-red-700">{errors.comment}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {requestStatus === 409 && <button type="button" className={`mt-2 rounded text-sm underline ${focusClass}`} disabled={busy || !current} onClick={() => setRetry((value) => value + 1)}>Atualizar avaliações</button>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !data} className={`${buttonClass} bg-[#0d1f35] font-semibold text-white`}>{busy ? 'A guardar…' : mine ? 'Guardar alterações' : 'Publicar avaliação'}</button>
          <button type="button" disabled={busy} className={`${buttonClass} bg-gray-100 text-gray-600`} onClick={() => { setEditing(false); setConfirmDelete(false); setError('') }}>Cancelar</button>
          {mine && <button type="button" disabled={busy} className={`${buttonClass} ml-auto flex items-center gap-1 px-2 text-red-600`} onClick={() => setConfirmDelete(true)}><Trash2 size={14} aria-hidden="true" />Remover avaliação</button>}
        </div>
        {confirmDelete && <div className="mt-4 rounded-lg border border-red-200 p-3 text-sm"><p>Pretende remover a sua avaliação?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy || !data} className={`${buttonClass} bg-red-700 text-white`} onClick={() => submit(true)}>Confirmar remoção</button><button type="button" disabled={busy} className={buttonClass} onClick={() => setConfirmDelete(false)}>Manter avaliação</button></div></div>}
      </form>}
      {notice && <p role="status" className="mt-4 text-sm text-gray-600">{data ? notice.replace(' A atualizar avaliações…', '') : notice}</p>}
      {awaitingModeration && (
        <div role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>A sua avaliação ficou a aguardar moderação e só fica visível depois de aprovada.</p>
          <Link to="/perfil/avaliacoes?separador=written" className={`mt-1 inline-block rounded font-medium underline ${focusClass}`}>As minhas avaliações</Link>
        </div>
      )}
      {data && <RatingDistribution distribution={data.rating_distribution} total={data.reviews_count} />}
      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 [&_button[role=combobox]]:px-2.5 [&_button[role=combobox]]:py-1.5 [&_button[role=combobox]]:text-xs">
        <span id={`${formId}-sort-label`} className="sr-only">Ordenar avaliações</span>
        <SelectMenu id={`${formId}-sort`} label="Ordenar avaliações" labelId={`${formId}-sort-label`} value={sort} options={sortOptions} onChange={(value) => changeFilter(setSort, value)} variant="public-filter" disabled={busy} />
        <span id={`${formId}-filter-label`} className="sr-only">Filtrar por estrelas</span>
        <SelectMenu id={`${formId}-filter`} label="Filtrar por estrelas" labelId={`${formId}-filter-label`} value={ratingFilter} options={ratingOptions} onChange={(value) => changeFilter(setRatingFilter, value)} variant="public-filter" disabled={busy} />
      </div>
      {!current && <p role="status" className="mt-5 text-sm text-gray-600">A carregar avaliações...</p>}
      {current?.status === 'error' && <div role="alert" className="mt-5 text-sm text-gray-600"><p>Não foi possível carregar as avaliações. {(notice || awaitingModeration) ? 'A alteração foi concluída, mas a lista e o resumo ainda não foram atualizados.' : 'Tente novamente.'}</p><button type="button" className={`${buttonClass} mt-3 border border-gray-300`} onClick={() => setRetry((value) => value + 1)}>Tentar carregar avaliações novamente</button></div>}
      {mine && <ul className="mt-5"><ReviewCard review={mine} mine editable={canWrite && !busy && !!data} onEdit={openForm} /></ul>}
      {data && (data.items.length > 0 ? <ul className={mine ? '' : 'mt-1'}>{data.items.map((review) => <ReviewCard key={review.id} review={review} onReport={canReportReviews(user) ? setReportedReview : undefined} />)}</ul> : <p className="mt-5 text-sm text-gray-600">{ratingFilter ? 'Não existem outras avaliações com esta classificação.' : mine ? 'Ainda não existem outras avaliações.' : 'Ainda não existem avaliações.'}</p>)}
        {pagination && pagination.total > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">{(page - 1) * 5 + 1}–{Math.min(page * 5, pagination.total)} de {pagination.total} outras avaliações</p>
          <Pagination currentPage={page} lastPage={pagination.last_page} onChange={changePage} disabled={busy || !current} label="Paginação das avaliações" />
        </div>}
      {reportedReview && <ReportReviewDialog review={reportedReview} onClose={() => setReportedReview(null)} onReported={reviewReported} />}
    </section>
  )
}
