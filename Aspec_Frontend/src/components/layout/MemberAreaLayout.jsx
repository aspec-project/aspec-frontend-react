import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { normalizeError } from '../../services/api'
import { isSessionCurrent } from '../../services/sessionContext'
import useSessionRequest from '../../hooks/useSessionRequest'
import { getMemberProfile } from '../../services/memberProfile'
import MemberAvatar from '../member/MemberAvatar'

/*
 * As abas correspondem às áreas apresentadas no Figma.
 *
 * Cada uma tem uma rota própria, para que o utilizador possa navegar,
 * atualizar a página e partilhar o endereço sem perder o separador atual.
 */
const memberTabs = [
  { label: 'Perfil', to: '/perfil', end: true },
  { label: 'Portefólio', to: '/perfil/portefolio' },
  { label: 'Inscrições', to: '/perfil/inscricoes' },
  { label: 'Avaliações', to: '/perfil/avaliacoes' },
  { label: 'Informações de conta', to: '/perfil/conta' },
  { label: 'Subscrição', to: '/perfil/subscricao' },
]

/*
 * Traduz o estado técnico da conta para o texto apresentado ao membro.
 */
function formatAccountStatus(statusName) {
  const statusLabels = {
    Active: 'Membro ativo',
    Approved: 'Membro aprovado',
    Pending: 'Conta pendente',
    Inactive: 'Conta inativa',
  }

  return statusLabels[statusName] ?? statusName ?? 'Membro'
}

/*
 * Layout comum da área privada do membro.
 *
 * Além das abas, carrega o perfil uma vez e disponibiliza-o às páginas
 * internas através do Outlet. Assim, Perfil, Portefólio e Subscrição
 * apresentam sempre o mesmo resumo no topo, como no Figma.
 */
export default function MemberAreaLayout() {
  const user = useAuthStore((state) => state.user)
  const getRequestContext = useSessionRequest()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  /*
   * Carrega o perfil necessário para o resumo comum a toda a área do membro.
   */
  useEffect(() => {
    const context = getRequestContext()

    if (!context) {
      return undefined
    }

    let isMounted = true

    async function loadProfile() {
      try {
        const memberProfile = await getMemberProfile(context)

        if (isMounted && isSessionCurrent(context)) {
          setProfile(memberProfile)
        }
      } catch (error) {
        if (isMounted && isSessionCurrent(context)) {
          const normalisedError = normalizeError(error)

          setLoadError(
            normalisedError.message ??
              'Não foi possível carregar os dados do perfil.',
          )
        }
      } finally {
        if (isMounted && isSessionCurrent(context)) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [getRequestContext])

  /*
   * As páginas de edição usam esta função depois de guardar, para que o
   * cabeçalho comum reflita logo o novo nome, setor ou localização.
   */
  async function reloadProfile() {
    const context = getRequestContext()

    if (!context) {
      return null
    }

    const memberProfile = await getMemberProfile(context)

    if (isSessionCurrent(context)) {
      setProfile(memberProfile)
    }

    return memberProfile
  }

  const displayName =
    profile?.business_name ??
    profile?.name ??
    user?.member_profile?.business_name ??
    user?.member_profile?.name ??
    user?.email ??
    'O meu perfil'

  const sectorName = profile?.sector?.name
  const accountStatus = formatAccountStatus(user?.account_status?.name)
  /* A rota pública recebe o identificador do perfil de membro, não o da conta. */
  const publicProfilePath = profile?.id
    ? `/membros/${encodeURIComponent(profile.id)}`
    : '/membros'

  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <MemberAvatar
                logoUrl={profile?.logo_url}
                name={displayName}
                className="h-14 w-14 text-lg"
              />

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-[#0d1f35]">
                  {displayName}
                </h1>

                <p className="mt-1 text-sm text-slate-600">
                  {accountStatus}
                  {sectorName && ` · ${sectorName}`}
                </p>
              </div>
            </div>

            <Link
              to={publicProfilePath}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d1f35] transition hover:border-[#0d1f35] hover:bg-slate-50"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Ver perfil público
            </Link>
          </div>
        </div>

        {/* A navegação mantém-se horizontal em ecrãs pequenos, sem esconder abas. */}
        <nav
          className="overflow-x-auto border-t border-slate-100"
          aria-label="Secções do perfil"
        >
          <div className="mx-auto flex min-w-max max-w-7xl px-4 sm:px-6 lg:px-8">
            {memberTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  [
                    'border-b-2 px-5 py-4 text-sm font-semibold transition',
                    isActive
                      ? 'border-[#0d1f35] text-[#0d1f35]'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-[#0d1f35]',
                  ].join(' ')
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-slate-600">A carregar o perfil...</p>
          </section>
        ) : loadError ? (
          <section
            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-900"
            role="alert"
          >
            <h2 className="text-xl font-bold">
              Não foi possível carregar o perfil
            </h2>

            <p className="mt-2 text-sm">{loadError}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193451]"
            >
              Tentar novamente
            </button>
          </section>
        ) : (
          <Outlet context={{ profile, reloadProfile }} />
        )}
      </div>
    </div>
  )
}
