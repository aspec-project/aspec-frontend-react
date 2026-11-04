import { Link } from 'react-router-dom'

/* Marca centrada das páginas públicas de estado/ativação da conta. */
export default function PublicAccountBrand() {
  return (
    <header className="bg-[#f8f7f2] px-6 pb-5 pt-14 sm:pb-6 sm:pt-16">
      <div className="mx-auto flex max-w-5xl justify-center">
        <Link to="/" aria-label="Voltar à página inicial" className="block rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1f35]">
          <img
            src="/images/aspec-logo-sf.png"
            alt="ASPEC — Associação de Profissionais e Empresários Cristãos"
            className="h-auto w-full max-w-[40rem] object-contain brightness-0"
          />
        </Link>
      </div>
    </header>
  )
}
