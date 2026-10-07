import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut, Settings } from "lucide-react";
import { useAuthStore } from '../../store/authStore'

export default function Header() {
  /*
   * Obtém o utilizador autenticado diretamente da store global.
   * Assim, o Header não depende de props passadas pelos layouts.
   */
  const user = useAuthStore((state) => state.user)

  /*
   * A store concentra o pedido ao backend e a limpeza da sessão local.
   */
  const logout = useAuthStore((state) => state.logout)

  /*
   * A API devolve o perfil como member_profile. Mantemos também
   * memberProfile como alternativa para compatibilidade futura.
   */
  const displayName =
    user?.member_profile?.name ??
    user?.memberProfile?.name ??
    user?.email ??
    'Utilizador'

  /*
   * Cria as iniciais a partir do nome real para o avatar.
   * Exemplo: "João Silva" passa a "JS".
   */
  const userInitials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join('')

  /*
   * Normaliza o nome do papel devolvido pela API para podermos
   * decidir que opções do Header mostrar a cada utilizador.
   */
  const roleName = user?.role?.name?.toLowerCase() ?? ''
  const isMember = roleName === 'member'
  const isAdmin = roleName === 'admin'
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate();
  const location = useLocation();

  // Função para fazer scroll suave até ao bloco "Quem Somos / Sobre a ASPEC"
  const handleSobreClick = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      const sobreElement = document.getElementById("sobre");
      if (sobreElement) {
        sobreElement.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const sobreElement = document.getElementById("sobre");
        if (sobreElement) {
          sobreElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
    setMobileOpen(false);
  };

  /*
   * Termina a sessão no backend, limpa a store e impede voltar
   * a uma rota privada através do histórico do browser.
   */
  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    await logout()

    setUserMenuOpen(false)
    setMobileOpen(false)
    navigate("/", { replace: true })
  }

  return (
    <nav className="bg-[#0d1f35] sticky top-0 z-50 shadow-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo ASPEC */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <img
              src="/images/log-branco.png"
              alt="ASPEC"
              className="h-6 w-auto"/>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#sobre"
              onClick={handleSobreClick}
              className="px-4 py-2 rounded-md text-sm transition-colors text-white/85 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Sobre a ASPEC
            </a>

            <NavLink
              to="/eventos"
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "text-primary bg-primary/15 font-medium"
                    : "text-white/85 hover:text-white hover:bg-white/5"
                }`
              }
            >
              Eventos
            </NavLink>

            <NavLink
              to="/membros"
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "text-primary bg-primary/15 font-medium"
                    : "text-white/85 hover:text-white hover:bg-white/5"
                }`
              }
            >
              Diretório
            </NavLink>
          </div>

          {/* Área de Autenticação */}
          <div className="hidden md:flex items-center gap-2">
            {!user && (
              <Link
                to="/login"
                className="px-4 py-2 text-sm rounded-md transition-colors text-white/85 hover:text-primary hover:bg-primary/15"
              >
                Entrar
              </Link>
            )}

            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-white cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-slate-950">
                    {userInitials}
                  </div>
                  <span className="text-sm">{displayName}</span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card text-foreground rounded-lg shadow-xl border border-border py-1 z-50">
                    {isMember && (
                      <>
                        <button
                          onClick={() => {
                            navigate('/dashboard')
                            setUserMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                        >
                          <User size={14} /> O meu perfil
                        </button>

                        <button
                          onClick={() => {
                            navigate('/perfil/editar')
                            setUserMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                        >
                          <Settings size={14} /> Editar perfil
                        </button>
                      </>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          navigate('/admin')
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                      >
                        <Settings size={14} /> Administração
                      </button>
                    )}
                    <hr className="my-1 border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut size={14} />
                      {isLoggingOut ? 'A terminar sessão...' : 'Terminar sessão'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-white cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a1826] border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            <a
              href="#sobre"
              onClick={handleSobreClick}
              className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
            >
              Sobre a ASPEC
            </a>
            <Link
              to="/eventos"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
            >
              Eventos
            </Link>
            <Link
              to="/membros"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
            >
              Diretório
            </Link>
            <hr className="border-white/10 my-2" />
            {/*
            * As opções de autenticação só aparecem quando não existe
            * um utilizador autenticado na store.
            */}
            {!user && (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
                >
                  Entrar
                </Link>

                <Link
                  to="/registo"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left px-3 py-2 rounded text-sm font-medium text-primary hover:bg-primary/10"
                >
                  Candidatar-me
                </Link>
              </>
            )}

            {/*
            * Qualquer utilizador autenticado pode terminar sessão.
            * Os atalhos restantes são mostrados conforme o respetivo papel.
            */}
            {user && (
              <>
                {isMember && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
                    >
                      O meu perfil
                    </Link>

                    <Link
                      to="/perfil/editar"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-left px-3 py-2 rounded text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      Editar perfil
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-left px-3 py-2 rounded text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    Administração
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-destructive hover:bg-destructive/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={14} />
                  {isLoggingOut ? 'A terminar sessão...' : 'Terminar sessão'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
