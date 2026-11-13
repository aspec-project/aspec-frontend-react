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
  { to: '/admin/tipos-evento', label: 'Tipos de evento', title: 'Tipos de Evento' },
  { to: '/admin/moderacao', label: 'Moderação', title: 'Moderação de Conteúdos' },
]

/**
 * Rotas "página inteira": sem herói nem separadores; a própria página desenha a sua banda e o contentor.
 */
const FULL_PAGE_ROUTES = ['/admin/utilizadores/:id', '/admin/eventos/:id']

const todayFormatter = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Layout de todas as páginas /admin: Header, herói escuro com o título da secção, separadores
 * Dashboard · Utilizadores · Eventos · Tipos de evento · Moderação, conteúdo em fundo cinzento e Footer.
 * Nas rotas "página inteira" (detalhe de um membro e página de um evento) desenha só Header, conteúdo e Footer.
 *
 * @returns {JSX.Element}
 */
export default function AdminLayout() {
  const { pathname } = useLocation()
  const [today] = useState(() => todayFormatter.format(new Date()))
  const currentTab = ADMIN_TABS.find((tab) => matchPath({ path: tab.to, end: tab.end ?? false }, pathname))
  const isDashboard = currentTab?.to === '/admin'
  const title = currentTab?.title ?? 'Área de Administração'
  const isFullPage = FULL_PAGE_ROUTES.some((path) => matchPath({ path, end: true }, pathname))

  if (isFullPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-[#f5f5f4]">
          <Outlet />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          {isDashboard ? (
            <>
              <h1 className="text-2xl font-semibold text-[#c9b87a]">Área de Administração</h1>
              <p className="mt-2 text-gray-300">{today}</p>
            </>
          ) : (
            <>
              <p className="uppercase tracking-wider text-[#c9b87a] text-sm font-semibold">Área de Administração</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
            </>
          )}
        </div>
      </section>

      <nav aria-label="Secções da administração" className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-2 sm:flex sm:gap-2 sm:px-6 sm:py-0">
          {ADMIN_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end ?? false}
              className={({ isActive }) => `min-w-0 rounded-lg px-3 py-2.5 text-center text-xs leading-4 sm:rounded-none sm:px-5 sm:py-4 sm:text-sm ${isActive ? 'bg-slate-100 font-semibold text-[#0d1f35] sm:border-b-2 sm:border-[#0d1f35] sm:bg-transparent' : 'text-slate-500 hover:bg-slate-50 hover:text-[#0d1f35] sm:hover:bg-transparent'}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 bg-[#f5f5f4]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
