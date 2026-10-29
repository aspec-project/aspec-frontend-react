import { useId } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Cartão de lista do painel: título, ligação dourada à direita (ex.: "Ver todas →") e conteúdo por baixo.
 * A secção tem como nome acessível o título.
 *
 * @param {{
 *   title: string,
 *   linkTo: string,
 *   linkLabel: string,
 *   linkText: string,
 *   children: import('react').ReactNode,
 * }} props `linkLabel` é o nome acessível da ligação (começa pelo texto visível `linkText`).
 * @returns {JSX.Element}
 */
export default function DashboardPanel({ title, linkTo, linkLabel, linkText, children }) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-semibold text-[#0d1f35]">{title}</h2>
        <Link
          to={linkTo}
          aria-label={linkLabel}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#8a7043] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
        >
          {linkText}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  )
}
