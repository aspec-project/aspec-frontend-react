import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  Send,
} from 'lucide-react'
import { resendAccountActivationLink } from '../services/accountActivation'

function RequestActivationLinkPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)

    try {
      await resendAccountActivationLink(email.trim())
    } catch {
      /*
       * A resposta é sempre neutra, inclusive em erro de validação,
       * limite de pedidos ou falha de rede. Isto impede confirmar se
       * determinado email corresponde a uma conta da plataforma.
       */
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-[#f8f7f2] px-5 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={38} />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-[#0d1f35]">
              Pedido recebido
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Se a conta existir e aguardar ativação, enviámos um novo link
              para o seu email.
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Voltar ao início de sessão
            </Link>
          </div>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-[#8a7043]/15 text-[#8a7043]">
              <Mail size={25} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#0d1f35]">
              Pedir novo link de ativação
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Introduza o email associado à sua conta. Se estiver elegível,
              receberá um novo link de ativação ou reativação.
            </p>

            <form className="mt-7" onSubmit={handleSubmit} noValidate>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="activation-email"
              >
                Email
                <input
                  id="activation-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? 'A enviar…' : 'Enviar novo link'}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-5 block text-center text-sm font-medium text-[#8a7043] hover:underline"
            >
              Voltar ao início de sessão
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

export default RequestActivationLinkPage