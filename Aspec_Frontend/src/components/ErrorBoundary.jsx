import { Component } from 'react'
import { useLocation } from 'react-router-dom'

/*
 * Apanha erros inesperados ao desenhar os componentes, para o ecrã não ficar em branco.
 * Volta ao estado normal quando resetKey muda (ex.: o utilizador navega para outra página).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erro inesperado na interface.', error, info?.componentStack)
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section
        role="alert"
        aria-labelledby="error-boundary-title"
        className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center sm:py-24"
      >
        <h1 id="error-boundary-title" className="text-3xl font-bold sm:text-4xl">
          Ocorreu um erro inesperado
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Não foi possível mostrar esta página. Tente novamente ou volte ao início.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Voltar ao início
          </a>
        </div>
      </section>
    )
  }
}

/*
 * Versão para envolver a aplicação dentro do router: muda de página, sai do ecrã de erro.
 */
export function RouteErrorBoundary({ children }) {
  const location = useLocation()

  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
}
