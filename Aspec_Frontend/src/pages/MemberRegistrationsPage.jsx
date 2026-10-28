import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  TicketCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { normalizeError } from '../services/api'
import {
  changeEventRegistration,
  getMyEventRegistrations,
  getRegistrationErrorMessage,
} from '../services/eventRegistrations'
import { isSessionCurrent } from '../services/sessionContext'
import useSessionRequest from '../hooks/useSessionRequest'

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

function formatDeadline(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'long',
    timeStyle: 'short',
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

function EventRegistrationCard({
  registration,
  isCancelling,
  onCancel,
}) {
  const event = registration.event
  const cancellationAvailable = canCancelRegistration(event)
  const deadline = formatDeadline(event.registration_deadline)
  const eventLocation = event.is_online
    ? 'Evento online'
    : [event.venue_name, event.address, event.location?.name]
        .filter(Boolean)
        .join(' · ')

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {event.category?.name && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[#806537]">
                {event.category.name}
              </span>
            )}

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
              Inscrito
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-[#0d1f35]">
            {event.name}
          </h2>

          {event.description?.trim() && (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
              {event.description}
            </p>
          )}
        </div>

        <Link
          to={`/eventos/${encodeURIComponent(event.id)}`}
          className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#0d1f35] transition hover:bg-slate-100"
        >
          Ver evento
        </Link>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
          <CalendarDays
            size={18}
            className="mt-0.5 shrink-0 text-[#9b7b45]"
            aria-hidden="true"
          />
          <div>
            <dt className="text-slate-500">Data</dt>
            <dd className="mt-1 font-semibold text-[#0d1f35]">
              {formatEventDate(event.event_date)}
            </dd>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
          <Clock3
            size={18}
            className="mt-0.5 shrink-0 text-[#9b7b45]"
            aria-hidden="true"
          />
          <div>
            <dt className="text-slate-500">Horário</dt>
            <dd className="mt-1 font-semibold text-[#0d1f35]">
              {event.event_start_time}
              {event.event_end_time ? ` — ${event.event_end_time}` : ''}
            </dd>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl bg-slate-50 p-4 sm:col-span-2">
          <MapPin
            size={18}
            className="mt-0.5 shrink-0 text-[#9b7b45]"
            aria-hidden="true"
          />
          <div>
            <dt className="text-slate-500">Local</dt>
            <dd className="mt-1 font-semibold text-[#0d1f35]">
              {eventLocation || 'Local por definir'}
            </dd>
          </div>
        </div>

        {event.registrations_count !== null &&
          event.registrations_count !== undefined &&
          event.max_attendees && (
            <div className="flex gap-3 rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <Users
                size={18}
                className="mt-0.5 shrink-0 text-[#9b7b45]"
                aria-hidden="true"
              />
              <div>
                <dt className="text-slate-500">Participantes</dt>
                <dd className="mt-1 font-semibold text-[#0d1f35]">
                  {event.registrations_count} de {event.max_attendees}
                </dd>
              </div>
            </div>
          )}
      </dl>

      {event.online_url && (
        <a
          href={event.online_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0d1f35] underline decoration-[#9b7b45] decoration-2 underline-offset-4"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Entrar no evento online
        </a>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          {cancellationAvailable && deadline
            ? `Pode cancelar a inscrição até ${deadline}.`
            : 'O prazo para cancelar esta inscrição terminou.'}
        </p>

        {cancellationAvailable && (
          <button
            type="button"
            onClick={() => onCancel(registration)}
            disabled={isCancelling}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle size={17} aria-hidden="true" />
            {isCancelling ? 'A cancelar...' : 'Cancelar inscrição'}
          </button>
        )}
      </div>
    </article>
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
  const [referenceTime, setReferenceTime] = useState(0)

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

  async function handleCancel(registration) {
    const event = registration.event

    if (
      !window.confirm(
        `Pretende cancelar a inscrição no evento “${event.name}”?`,
      )
    ) {
      return
    }

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
      setReloadKey((currentKey) => currentKey + 1)
    } catch (error) {
      if (!isSessionCurrent(context)) {
        return
      }

      setStatus({
        type: 'error',
        message: getRegistrationErrorMessage(error),
      })
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <TicketCheck
            size={24}
            className="mt-1 text-[#9b7b45]"
            aria-hidden="true"
          />

          <div>
        <h1 className="text-2xl font-semibold text-[#0d1f35]">
              As Minhas Inscrições
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulte os eventos em que está inscrito e faça a gestão das
              inscrições enquanto o prazo de cancelamento estiver disponível.
            </p>
          </div>
        </div>
      </section>

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
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
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
        <>
          {upcomingRegistrations.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#0d1f35]">
                Próximos eventos
              </h2>
              <div className="mt-4 space-y-4">
                {upcomingRegistrations.map((registration) => (
                  <EventRegistrationCard
                    key={registration.id}
                    registration={registration}
                    isCancelling={
                      cancellingRegistrationId === registration.id
                    }
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}

          {pastRegistrations.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#0d1f35]">
                Eventos anteriores
              </h2>
              <div className="mt-4 space-y-4">
                {pastRegistrations.map((registration) => (
                  <EventRegistrationCard
                    key={registration.id}
                    registration={registration}
                    isCancelling={false}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
