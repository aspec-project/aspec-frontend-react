/**
 * Layout visual da área de membro.
 *
 * Nesta fase, o componente é apenas desktop e não contém lógica
 * de autenticação, permissões, mudança de papel ou navegação entre rotas.
 *
 * O conteúdo real é recebido através da prop children. Assim, nas
 * próximas subtarefas, podemos reutilizar o mesmo layout para apresentar
 * o formulário, o upload do logótipo e a galeria de portefólio.
 */

const sidebarItems = [
  { label: "Visão geral", isActive: true },
  { label: "Informação da montra", isActive: false },
  { label: "Portefólio", isActive: false },
];

export default function MemberDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f5f4] px-8 py-10">
      <div className="mx-auto flex max-w-7xl gap-8">
        {/* Sidebar visual da área de membro, exclusiva para desktop. */}
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

          {/* Itens estáticos: serão ligados a rotas apenas se uma tarefa futura o pedir. */}
          <nav className="mt-6 space-y-2" aria-label="Secções da área de membro">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={[
                  "rounded-lg px-4 py-3 text-sm font-medium",
                  item.isActive
                    ? "bg-[#8a7043] text-white"
                    : "text-slate-300",
                ].join(" ")}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Área onde as próximas subtarefas colocam o respetivo conteúdo. */}
        <main className="min-h-[620px] flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-black shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}