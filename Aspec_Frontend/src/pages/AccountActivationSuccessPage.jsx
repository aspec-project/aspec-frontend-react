import { CheckCircle2, Mail, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

function AccountActivationSuccessPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-5 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={38} />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-[#0d1f35]">
          Pagamento concluído
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          A sua conta vai ficar ativa dentro de momentos. Verifique o seu email
          e, quando a ativação estiver concluída, pode iniciar sessão.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Mail size={17} />
          <span>Guarde o email de confirmação para referência.</span>
        </div>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <LogIn size={18} />
          Iniciar sessão
        </Link>
      </div>
    </section>
  )
}

export default AccountActivationSuccessPage