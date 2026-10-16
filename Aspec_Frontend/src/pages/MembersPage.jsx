import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { getMembers } from '../services/members'
import { getLocations, getSectors } from '../services/referenceLists'
import { normalizeError } from '../services/api'
import MemberCard from '../components/members/MemberCard'
import MemberFilters, { directoryButtonClass } from '../components/members/MemberFilters'

const initialFilters = { search: '', sector_id: '', location_id: '', min_rating: '', page: 1, per_page: 12 }
const emptyReferences = { sectors: [], locations: [], ready: false }
const directoryErrorMessage = 'Não foi possível carregar o diretório. Tente novamente.'

export default function MembersPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [draftSearch, setDraftSearch] = useState('')
  const [references, setReferences] = useState(emptyReferences)
  const referenceSnapshot = useRef(emptyReferences)
  const [referenceError, setReferenceError] = useState('')
  const [referenceRetry, setReferenceRetry] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

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
    const controller = new AbortController()
    /*
     * As referências validam apenas IDs selecionados. A sua chegada não
     * repete a pesquisa pública que já está em curso.
     */
    getMembers(filters, referenceSnapshot.current, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult(data) })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (isAxiosError(err)) {
          const normalized = normalizeError(err)
          const friendlyMessages = {
            419: 'A sessão expirou. Atualize a página e tente novamente.',
            429: 'Demasiados pedidos. Tente novamente mais tarde.',
          }
          setError(normalized.status === 422
            ? 'Verifique os filtros de pesquisa e tente novamente.'
            : friendlyMessages[normalized.status] ?? directoryErrorMessage)
          setFieldErrors(normalized.fieldErrors)
        } else setError(directoryErrorMessage)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, retry])

  const beginRequest = () => {
    setLoading(true)
    setError('')
    setFieldErrors({})
  }
  const changeFilter = (key, value) => {
    beginRequest()
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  }
  const onSearch = (event) => {
    event.preventDefault()
    if (!loading) {
      beginRequest()
      setFilters((current) => ({ ...current, search: draftSearch.trim(), page: 1 }))
    }
  }
  const changeSearch = (value) => {
    setDraftSearch(value)
    if (value === '') {
      beginRequest()
      setFilters((current) => ({ ...current, search: '', page: 1 }))
    }
  }
  const clearFilters = () => {
    setDraftSearch('')
    beginRequest()
    setFilters({ ...initialFilters })
  }

  return (
    <div className="bg-gray-50 text-gray-800">
      <section className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)] py-14">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Diretório ASPEC</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Diretório de Confiança</h1>
          <p className="mt-4 text-gray-300">Encontre profissionais e negócios cristãos verificados em todo Portugal</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <MemberFilters filters={filters} draftSearch={draftSearch} changeSearch={changeSearch} changeFilter={changeFilter} onSearch={onSearch} clearFilters={clearFilters} references={references} loading={loading} fieldErrors={fieldErrors} />
        {referenceError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{referenceError} <button type="button" onClick={() => { setReferenceError(''); setReferenceRetry((value) => value + 1) }} className="ml-2 rounded font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-4">Tentar carregar filtros novamente</button></div>}
        <section aria-label="Resultados do diretório" aria-busy={loading}>
          {loading ? <p role="status" className="py-12 text-center text-gray-600">A carregar membros...</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"><p>{error}</p><button type="button" className={`${directoryButtonClass} mt-4`} onClick={() => { beginRequest(); setRetry((value) => value + 1) }}>Tentar novamente</button></div> : result && <>
            <p role="status" className="mb-5 text-sm text-gray-600">{result.pagination.total} {result.pagination.total === 1 ? 'membro encontrado' : 'membros encontrados'}</p>
            {result.items.length === 0 ? <p className="py-12 text-center text-gray-600">Não foram encontrados membros para esta pesquisa.</p> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{result.items.map((member) => <MemberCard key={member.id} member={member} />)}</div>}
          </>}
          {result && !error && <nav aria-label="Paginação do diretório" className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button type="button" className={directoryButtonClass} disabled={loading || result.pagination.current_page <= 1} onClick={() => { beginRequest(); setFilters((current) => ({ ...current, page: current.page - 1 })) }}>Anterior</button>
              <span className="text-sm text-gray-700">Página {result.pagination.current_page} de {result.pagination.last_page}</span>
              <button type="button" className={directoryButtonClass} disabled={loading || result.pagination.current_page >= result.pagination.last_page} onClick={() => { beginRequest(); setFilters((current) => ({ ...current, page: current.page + 1 })) }}>Seguinte</button>
            </nav>}
        </section>
      </div>
    </div>
  )
}
