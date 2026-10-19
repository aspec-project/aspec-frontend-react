import { useState } from 'react'
import { NavLink, Outlet, matchPath, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

/**
 * Separadores da área de administração. O mesmo array desenha os separadores e escolhe o título do herói.
 */
const ADMIN_TABS = [
  { to: '/admin', label: 'Dashboard', title: 'Área de Administração', end: true },
  { to: '/admin/utilizadores', label: 'Utilizadores', title: 'Gestão de Utilizadores' },
  { to: '/admin/eventos', label: 'Eventos', title: 'Gestão de Eventos' },
  { to: '/admin/moderacao', label: 'Moderação', title: 'Moderação de Conteúdos' },
]

/**
 * Títulos do herói para páginas dentro de um separador (o separador continua ativo).
 */
const ADMIN_PAGE_TITLES = [
  { path: '/admin/utilizadores/:id', title: 'Detalhe do membro' },
]

const todayFormatter = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Layout de todas as páginas /admin: Header, herói escuro com o título da secção, separadores
 * Dashboard · Utilizadores · Eventos · Moderação, conteúdo em fundo cinzento e Footer.
 *
 * @returns {JSX.Element}
 */
export default function AdminLayout() {
  const { pathname } = useLocation()
  const [today] = useState(() => todayFormatter.format(new Date()))
  const currentTab = ADMIN_TABS.find((tab) => matchPath({ path: tab.to, end: tab.end ?? false }, pathname))
  const isDashboard = currentTab?.to === '/admin'
  const pageTitle = ADMIN_PAGE_TITLES.find((page) => matchPath({ path: page.path, end: true }, pathname))?.title
  const title = pageTitle ?? currentTab?.title ?? 'Área de Administração'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {isDashboard ? (
            <>
              <h1 className="text-2xl font-semibold text-[#8a7043]">Área de Administração</h1>
              <p className="mt-2 text-gray-300">{today}</p>
            </>
          ) : (
            <>
              <p className="uppercase tracking-wider text-[#8a7043] text-sm font-semibold">Área de Administração</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
            </>
          )}
        </div>
      </section>

      <nav aria-label="Secções da administração" className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 px-6">
          {ADMIN_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end ?? false}
              className={({ isActive }) => `whitespace-nowrap px-5 py-4 text-sm ${isActive ? 'border-b-2 border-[#0d1f35] text-[#0d1f35] font-semibold' : 'text-slate-500 hover:text-[#0d1f35]'}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 bg-[#f5f5f4]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
