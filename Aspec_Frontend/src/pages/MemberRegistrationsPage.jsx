import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ExternalLink,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { normalizeError } from '../services/api'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import {
  changeEventRegistration,
  getMyEventRegistrations,
  getRegistrationErrorMessage,
} from '../services/eventRegistrations'
import { isSessionCurrent } from '../services/sessionContext'
import useSessionRequest from '../hooks/useSessionRequest'

const REGISTRATIONS_PER_SECTION = 4

function formatEventDate(value) {
  if (!value) {
    return 'Data por definir'
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Lisbon',
  }).format(date)
}

function getEventStartTimestamp(event) {
  if (!event?.event_date) {
    return 0
  }

  const time = event.event_start_time ?? '00:00'
  const date = new Date(`${event.event_date}T${time}:00`)

  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function canCancelRegistration(event) {
  if (!event?.registration_deadline) {
    return false
  }

  const deadline = new Date(event.registration_deadline)

  return (
    !Number.isNaN(deadline.getTime()) &&
    deadline.getTime() >= Date.now() &&
    getEventStartTimestamp(event) >= Date.now()
  )
}

function EventRegistrationRow({
  registration,
  isCancelling,
  onCancel,
}) {
  const event = registration.event
  const cancellationAvailable = canCancelRegistration(event)

  return (
    <li className="flex min-h-24 items-center gap-4 px-5 py-4 sm:px-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-[#0d1f35]">
        <CalendarDays size={22} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-[#0d1f35] sm:text-lg">
          {event.name}
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">
          {formatEventDate(event.event_date)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          to={`/eventos/${encodeURIComponent(event.id)}`}
          aria-label={`Ver detalhes de ${event.name}`}
          title="Ver detalhes do evento"
          className="grid h-10 w-10 place-items-center rounded-lg text-[#0d1f35] transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
        >
          <ExternalLink size={20} aria-hidden="true" />
        </Link>
        {cancellationAvailable && (
          <button
            type="button"
            onClick={() => onCancel(registration)}
            disabled={isCancelling}
            aria-label={`Cancelar inscrição em ${event.name}`}
            title="Cancelar inscrição"
            className="grid h-10 w-10 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

/*
 * Lista as inscrições reais do membro autenticado. Não mostra dados
 * inventados enquanto o endpoint ainda está a carregar ou não devolve itens.
 */
export default function MemberRegistrationsPage() {
  const getRequestContext = useSessionRequest()
  const [registrations, setRegistrations] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [cancellingRegistrationId, setCancellingRegistrationId] = useState(null)
  const [registrationToCancel, setRegistrationToCancel] = useState(null)
  const [referenceTime, setReferenceTime] = useState(0)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [pastPage, setPastPage] = useState(1)

  useEffect(() => {
    const context = getRequestContext()

    if (!context) {
      return undefined
    }

    const controller = new AbortController()
    let isMounted = true

    async function loadRegistrations() {
      setLoadError(null)
      setRegistrations(null)

      try {
        const items = await getMyEventRegistrations(
          controller.signal,
          context,
        )

        if (isMounted && isSessionCurrent(context)) {
          setRegistrations(items)
          setReferenceTime(Date.now())
        }
      } catch (error) {
        if (isMounted && isSessionCurrent(context)) {
          const normalisedError = normalizeError(error)

          setLoadError(
            normalisedError.message ??
              'Não foi possível carregar as suas inscrições.',
          )
        }
      }
    }

    void loadRegistrations()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [getRequestContext, reloadKey])

  function requestCancellation(registration) {
    setStatus(null)
    setRegistrationToCancel(registration)
  }

  async function handleCancel() {
    const registration = registrationToCancel

    if (!registration) {
      return
    }

    const event = registration.event

    const context = getRequestContext()

    if (!context || cancellingRegistrationId) {
      return
    }

    setCancellingRegistrationId(registration.id)
    setStatus(null)

    try {
      await changeEventRegistration(
        event.id,
        'cancel',
        undefined,
        context,
      )

      if (!isSessionCurrent(context)) {
        return
      }

      setStatus({
        type: 'success',
        message: 'Inscrição cancelada com sucesso.',
      })
      setRegistrationToCancel(null)
      setUpcomingPage(1)
      setPastPage(1)
      setReloadKey((currentKey) => currentKey + 1)
    } catch (error) {
      if (!isSessionCurrent(context)) {
        return
      }

      setStatus({
        type: 'error',
        message: getRegistrationErrorMessage(error),
      })
      setRegistrationToCancel(null)
    } finally {
      if (isSessionCurrent(context)) {
        setCancellingRegistrationId(null)
      }
    }
  }

  const upcomingRegistrations = (registrations ?? []).filter(
    (registration) =>
      getEventStartTimestamp(registration.event) >= referenceTime,
  )
  const pastRegistrations = (registrations ?? []).filter(
    (registration) =>
      getEventStartTimestamp(registration.event) < referenceTime,
  )
  const visibleUpcomingRegistrations = upcomingRegistrations.slice(
    (upcomingPage - 1) * REGISTRATIONS_PER_SECTION,
    upcomingPage * REGISTRATIONS_PER_SECTION,
  )
  const visiblePastRegistrations = pastRegistrations.slice(
    (pastPage - 1) * REGISTRATIONS_PER_SECTION,
    pastPage * REGISTRATIONS_PER_SECTION,
  )
  const upcomingLastPage = Math.max(
    1,
    Math.ceil(upcomingRegistrations.length / REGISTRATIONS_PER_SECTION),
  )
  const pastLastPage = Math.max(
    1,
    Math.ceil(pastRegistrations.length / REGISTRATIONS_PER_SECTION),
  )

  function retryLoading() {
    setUpcomingPage(1)
    setPastPage(1)
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[#0d1f35]">
        As Minhas Inscrições em Eventos
      </h1>

      {status && (
        <p
          className={
            status.type === 'success'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800'
              : 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800'
          }
          role={status.type === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      )}

      {registrations === null && !loadError ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          A carregar as suas inscrições...
        </section>
      ) : loadError ? (
        <section
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
          role="alert"
        >
          <h2 className="text-xl font-bold">Não foi possível abrir as inscrições</h2>
          <p className="mt-3 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={retryLoading}
            className="mt-5 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </section>
      ) : registrations.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#0d1f35]">
            Ainda não tem inscrições
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Consulte a agenda para encontrar eventos e efetuar a sua primeira
            inscrição.
          </p>
          <Link
            to="/eventos"
            className="mt-6 inline-flex rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451]"
          >
            Ver agenda
          </Link>
        </section>
      ) : (
        <div className="space-y-8">
          {visibleUpcomingRegistrations.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[#0d1f35]">
                Próximos eventos
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                {visibleUpcomingRegistrations.map((registration) => (
                  <EventRegistrationRow
                    key={registration.id}
                    registration={registration}
                    isCancelling={
                      cancellingRegistrationId === registration.id
                    }
                    onCancel={requestCancellation}
                  />
                ))}
                </ul>
              </div>

              {upcomingLastPage > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {(upcomingPage - 1) * REGISTRATIONS_PER_SECTION + 1}–
                    {Math.min(
                      upcomingPage * REGISTRATIONS_PER_SECTION,
                      upcomingRegistrations.length,
                    )}{' '}
                    de {upcomingRegistrations.length} inscrições
                  </p>
                  <Pagination
                    currentPage={upcomingPage}
                    lastPage={upcomingLastPage}
                    onChange={setUpcomingPage}
                    label="Paginação dos próximos eventos"
                  />
                </div>
              )}
            </section>
          )}

          {visiblePastRegistrations.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[#0d1f35]">
                Eventos anteriores
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                {visiblePastRegistrations.map((registration) => (
                  <EventRegistrationRow
                    key={registration.id}
                    registration={registration}
                    isCancelling={false}
                    onCancel={requestCancellation}
                  />
                ))}
                </ul>
              </div>

              {pastLastPage > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {(pastPage - 1) * REGISTRATIONS_PER_SECTION + 1}–
                    {Math.min(
                      pastPage * REGISTRATIONS_PER_SECTION,
                      pastRegistrations.length,
                    )}{' '}
                    de {pastRegistrations.length} inscrições
                  </p>
                  <Pagination
                    currentPage={pastPage}
                    lastPage={pastLastPage}
                    onChange={setPastPage}
                    label="Paginação dos eventos anteriores"
                  />
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={registrationToCancel !== null}
        title="Cancelar inscrição?"
        description={
          registrationToCancel
            ? `Vai libertar o seu lugar em “${registrationToCancel.event.name}”. Poderá voltar a inscrever-se enquanto houver vagas.`
            : ''
        }
        cancelLabel="Manter inscrição"
        confirmLabel="Cancelar inscrição"
        tone="danger"
        pending={cancellingRegistrationId !== null}
        showClose
        size="lg"
        onCancel={() => setRegistrationToCancel(null)}
        onConfirm={() => void handleCancel()}
      />
    </div>
  )
}
