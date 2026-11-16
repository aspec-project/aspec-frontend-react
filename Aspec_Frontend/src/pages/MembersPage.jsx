import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { getMembers } from '../services/members'
import { getLocations, getSectors } from '../services/referenceLists'
import { normalizeError } from '../services/api'
import MemberCard from '../components/members/MemberCard'
import ListPagination from '../components/ui/ListPagination'
import MemberFilters, { directoryButtonClass } from '../components/members/MemberFilters'
import { useAuthStore } from '../store/authStore'
import useSearchParamsUpdater from '../hooks/useSearchParamsUpdater'
import { parseAllowedValue, parsePositiveInteger, updateSearchParams } from '../utils/queryParams'

const initialFilters = { search: '', sector_id: '', location_id: '', min_rating: '', page: 1, per_page: 12 }
const PER_PAGE_OPTIONS = [12, 24, 48]
const MIN_RATING_OPTIONS = ['3', '4', '4.5']
const emptyReferences = { sectors: [], locations: [], ready: false }
const directoryErrorMessage = 'Não foi possível carregar o diretório. Tente novamente.'

/**
 * Lê e valida os filtros do diretório no endereço. Um setor ou distrito que não exista nas listas carregadas
 * é ignorado; enquanto as listas não chegam, fica guardado e o pedido espera (`waiting`).
 *
 * @param {URLSearchParams} searchParams Parâmetros do endereço.
 * @param {{sectors: object[], locations: object[], ready: boolean}} references Listas de setores e distritos.
 * @param {boolean} referencesFailed As listas falharam: os IDs do endereço são ignorados.
 * @returns {typeof initialFilters & {draftSearch: string, waiting: boolean}}
 */
function readDirectoryQuery(searchParams, references, referencesFailed) {
  const search = searchParams.get('search') ?? ''
  let waiting = false
  const readReference = (name, list) => {
    const value = searchParams.get(name) ?? ''
    if (value === '') return ''
    if (references.ready) return list.some((item) => item.id === value) ? value : ''
    if (referencesFailed) return ''
    waiting = true
    return value
  }
  const filters = {
    search,
    draftSearch: searchParams.has('draft_search') ? searchParams.get('draft_search') ?? '' : search,
    sector_id: readReference('sector_id', references.sectors),
    location_id: readReference('location_id', references.locations),
    min_rating: parseAllowedValue(searchParams.get('min_rating'), MIN_RATING_OPTIONS, initialFilters.min_rating),
    page: parsePositiveInteger(searchParams.get('page'), initialFilters.page),
    per_page: parseAllowedValue(searchParams.get('per_page'), PER_PAGE_OPTIONS, initialFilters.per_page),
  }
  return { ...filters, waiting }
}

/**
 * Converte os filtros em parâmetros do endereço, só com os valores diferentes do padrão.
 *
 * @param {typeof initialFilters & {draftSearch: string}} query Filtros do diretório.
 * @returns {URLSearchParams}
 */
function directorySearchParams(query) {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.draftSearch !== query.search) params.set('draft_search', query.draftSearch)
  if (query.sector_id) params.set('sector_id', query.sector_id)
  if (query.location_id) params.set('location_id', query.location_id)
  if (query.min_rating) params.set('min_rating', query.min_rating)
  if (query.page !== initialFilters.page) params.set('page', String(query.page))
  if (query.per_page !== initialFilters.per_page) params.set('per_page', String(query.per_page))
  return params
}

export default function MembersPage() {
  const user = useAuthStore((state) => state.user)
  const sessionStatus = useAuthStore((state) => state.status)
  const showVisitorNotice = !user && ['idle', 'error'].includes(sessionStatus)
  const [searchParams, setSearchParams] = useSearchParams()
  const changeSearchParams = useSearchParamsUpdater()
  const [references, setReferences] = useState(emptyReferences)
  const referenceSnapshot = useRef(emptyReferences)
  const [referenceError, setReferenceError] = useState('')
  const [referenceRetry, setReferenceRetry] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [outcome, setOutcome] = useState({ key: '', error: '', fieldErrors: {} })
  const query = readDirectoryQuery(searchParams, references, Boolean(referenceError))
  const { draftSearch, waiting } = query
  const filters = { search: query.search, sector_id: query.sector_id, location_id: query.location_id, min_rating: query.min_rating, page: query.page, per_page: query.per_page }
  const requestKey = JSON.stringify([filters, retry])
  /* Um resultado pertence ao pedido que o originou; até chegar, a página está a carregar. */
  const loading = waiting || outcome.key !== requestKey
  const error = loading ? '' : outcome.error
  const fieldErrors = loading ? {} : outcome.fieldErrors

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getSectors(controller.signal), getLocations(controller.signal)])
      .then(([sectors, locations]) => {
        if (!controller.signal.aborted) {
          const lists = { sectors, locations, ready: true }
          referenceSnapshot.current = lists
          setReferences(lists)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setReferenceError('Os filtros de setor e distrito estão temporariamente indisponíveis.')
      })
    return () => controller.abort()
  }, [referenceRetry])

  useEffect(() => {
    if (waiting) return undefined
    const controller = new AbortController()
    const [requestFilters] = JSON.parse(requestKey)
    /*
     * As referências validam apenas IDs selecionados. A sua chegada não
     * repete a pesquisa pública que já está em curso.
     */
    getMembers(requestFilters, referenceSnapshot.current, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        /* Uma página acima da última vem vazia: o endereço passa para a última e repete o pedido. */
        if (data.items.length === 0 && data.pagination.current_page > data.pagination.last_page) {
          changeSearchParams((current) => updateSearchParams(current, { page: data.pagination.last_page }, { page: initialFilters.page }), { replace: true })
          return
        }
        setResult(data)
        setOutcome({ key: requestKey, error: '', fieldErrors: {} })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (isAxiosError(err)) {
          const normalized = normalizeError(err)
          const friendlyMessages = {
            419: 'A sessão expirou. Atualize a página e tente novamente.',
            429: 'Demasiados pedidos. Tente novamente mais tarde.',
          }
          setOutcome({
            key: requestKey,
            error: normalized.status === 422
              ? 'Verifique os filtros de pesquisa e tente novamente.'
              : friendlyMessages[normalized.status] ?? directoryErrorMessage,
            fieldErrors: normalized.fieldErrors,
          })
        } else setOutcome({ key: requestKey, error: directoryErrorMessage, fieldErrors: {} })
      })
    return () => controller.abort()
  }, [requestKey, waiting, changeSearchParams])

  /**
   * Aplica mudanças aos filtros guardados no endereço, partindo do endereço atual.
   *
   * @param {object} changes Mudanças a aplicar (mesmos nomes de readDirectoryQuery).
   * @param {{replace?: boolean}} [options] Opções da navegação.
   */
  const updateQuery = (changes, options) => {
    setSearchParams((currentParams) => {
      const currentQuery = readDirectoryQuery(currentParams, referenceSnapshot.current, Boolean(referenceError))
      return directorySearchParams({ ...currentQuery, ...changes })
    }, options)
  }
  /**
   * Aplica as mudanças e, se o pedido resultante for igual ao atual, repete-o (ex.: "Limpar filtros" já sem
   * filtros). Só repete nesse caso porque a navegação e o contador são renderizados em momentos diferentes.
   *
   * @param {object} changes Mudanças a aplicar.
   * @param {{replace?: boolean}} [options] Opções da navegação.
   */
  const submitQuery = (changes, options) => {
    const next = { ...filters, ...changes }
    updateQuery(changes, options)
    if (Object.keys(filters).every((key) => next[key] === filters[key])) setRetry((value) => value + 1)
  }
  const changeFilter = (key, value) => {
    updateQuery({ [key]: value, page: 1 })
  }
  const onSearch = (event) => {
    event.preventDefault()
    if (!loading) {
      const search = draftSearch.trim()
      submitQuery({ search, draftSearch: search, page: 1 })
    }
  }
  const changeSearch = (value) => {
    if (value === '') submitQuery({ search: '', draftSearch: '', page: 1 }, { replace: true })
    else updateQuery({ draftSearch: value }, { replace: true })
  }
  const clearFilters = () => {
    submitQuery({ ...initialFilters, draftSearch: '' })
  }

  return (
    <div className="bg-gray-50 text-gray-800">
      <section className="bg-[#0d1f35] py-14">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Diretório ASPEC</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Diretório de Confiança</h1>
          <p className="mt-4 text-white/75">Encontre profissionais e negócios cristãos verificados em todo Portugal</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <MemberFilters filters={filters} draftSearch={draftSearch} changeSearch={changeSearch} changeFilter={changeFilter} onSearch={onSearch} clearFilters={clearFilters} references={references} loading={loading} fieldErrors={fieldErrors} />
        {showVisitorNotice && (
          <aside aria-label="Acesso aos contactos dos membros" className="flex items-start gap-3 rounded-xl border border-[#8a7043]/40 bg-[#8a7043]/10 p-4 text-sm leading-relaxed text-[#0d1f35] sm:items-center">
            <Lock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8a7043] sm:mt-0" />
            <p>Os contactos diretos e canais privados dos membros estão disponíveis apenas para membros autenticados. <Link to="/login" className="rounded font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Entrar</Link> ou <Link to="/registo" className="rounded font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">candidatar-me a membro</Link>.</p>
          </aside>
        )}
        {referenceError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{referenceError} <button type="button" onClick={() => { setReferenceError(''); setReferenceRetry((value) => value + 1) }} className="ml-2 rounded font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-4">Tentar carregar filtros novamente</button></div>}
        <section aria-label="Resultados do diretório" aria-busy={loading}>
          {loading ? <p role="status" className="py-12 text-center text-gray-600">A carregar membros...</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"><p>{error}</p><button type="button" className={`${directoryButtonClass} mt-4`} onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div> : result && <>
            <p role="status" className="mb-5 text-sm text-gray-600">{result.pagination.total} {result.pagination.total === 1 ? 'membro encontrado' : 'membros encontrados'}</p>
            {result.items.length === 0 ? <p className="py-12 text-center text-gray-600">Não foram encontrados membros para esta pesquisa.</p> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{result.items.map((member) => <MemberCard key={member.id} member={member} />)}</div>}
          </>}
          {result && !error && <ListPagination
              currentPage={result.pagination.current_page}
              lastPage={result.pagination.last_page}
              total={result.pagination.total}
              perPage={filters.per_page}
              perPageOptions={PER_PAGE_OPTIONS}
              disabled={loading}
              onPageChange={(page) => updateQuery({ page })}
              onPerPageChange={(value) => updateQuery({ per_page: value, page: 1 })}
              label="Paginação do diretório"
            />}
        </section>
      </div>
    </div>
  )
}
