import { Link, Outlet, useOutletContext } from 'react-router-dom'
import PageTitle from '../PageTitle'
import { useAuthStore } from '../../store/authStore'
import { hasMemberProfile } from '../../utils/memberAccess'

/**
 * Guarda das rotas da área de membro que precisam de perfil de membro.
 * Com perfil mostra a rota pedida e passa-lhe o contexto do layout da área de membro;
 * sem perfil (admin técnico) explica que a conta não tem perfil.
 * @returns {JSX.Element}
 */
export default function MemberProfileRequired() {
  const user = useAuthStore((state) => state.user)
  const outletContext = useOutletContext()

  if (hasMemberProfile(user)) {
    return <Outlet context={outletContext} />
  }

  return (
    <PageTitle title="Sem perfil de membro">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-[#0d1f35]">
          Esta conta de administração não tem perfil de membro.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pode alterar a palavra-passe e as preferências de email em Informações de conta.
        </p>
        <Link
          to="/perfil/conta"
          className="mt-6 inline-flex w-fit items-center rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193451] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
        >
          Ir para Informações de conta
        </Link>
      </section>
    </PageTitle>
  )
}
