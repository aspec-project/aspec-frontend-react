import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center sm:py-24"
    >
      <h1 id="not-found-title" className="mt-6 text-3xl font-bold sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
        A página que procura não existe ou já não está disponível.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Voltar ao início
      </Link>
    </section>
  )
}
