import { Clock3, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

/* Confirmação apresentada depois de uma candidatura submetida com sucesso. */
export default function PendingAccountPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-6 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-[#9b7b45]">
          <Clock3 size={31} aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-[#0d1f35]">
          Candidatura pendente
        </h1>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Recebemos a sua candidatura. A conta será revista por um administrador
          e receberá um email quando estiver pronta para ativação.
        </p>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Enquanto a conta estiver pendente, ainda não poderá iniciar sessão.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451]"
        >
          <LogIn size={17} aria-hidden="true" />
          Voltar ao início de sessão
        </Link>
      </section>
    </main>
  )
}
