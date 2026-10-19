import { NavLink } from 'react-router-dom'

/*
 * Cada item representa uma secção com conteúdo próprio na área de membro.
 *
 * A rota /perfil redireciona para /perfil/montra, por isso o menu apresenta
 * apenas as páginas reais que o membro pode gerir.
 */
const sidebarItems = [
  {
    label: 'Informação da montra',
    to: '/perfil/montra',
  },
  {
    label: 'Contactos e redes',
    to: '/perfil/contactos',
  },
  {
    label: 'Portefólio',
    to: '/perfil/portefolio',
  },
]

/*
 * Layout visual reutilizado pelas páginas da área reservada do membro.
 *
 * O conteúdo de cada secção é recebido através de children. O menu usa
 * NavLink para navegar entre rotas e para assinalar automaticamente a
 * secção ativa, sem manter estado manual no componente.
 */
export default function MemberDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f5f4] px-8 py-10">
      <div className="mx-auto flex max-w-7xl gap-8">
        <aside className="w-72 shrink-0 rounded-2xl bg-[#0d1f35] p-6 text-white shadow-lg">
          <div className="border-b border-white/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7043]">
              Área reservada
            </p>

            <h1 className="mt-2 text-xl font-bold">Área do membro</h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Configuração da montra digital e portefólio.
            </p>
          </div>

          {/* Navegação entre as secções disponíveis da área de membro. */}
          <nav className="mt-6 space-y-2" aria-label="Secções da área de membro">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'block rounded-lg px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-[#8a7043] text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Área reservada ao conteúdo específico da rota atual. */}
        <main className="min-h-[620px] flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-black shadow-sm">
          {children}
        </main>
      </div>
    </div>
  )
}