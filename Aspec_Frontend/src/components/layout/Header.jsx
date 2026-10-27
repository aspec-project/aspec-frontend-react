import { useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Pencil,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuthStore } from '../../store/authStore'
import MemberAvatar from '../member/MemberAvatar'

export default function Header() {
  /*
   * Obtém o utilizador autenticado diretamente da store global.
   * Assim, o Header não depende de props passadas pelos layouts.
   */
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const logoutError = useAuthStore((state) => state.logoutError)


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
  const memberLogoUrl =
    user?.member_profile?.logo_url ??
    user?.memberProfile?.logo_url ??
    ''

  /*
   * Normaliza o nome do papel devolvido pela API para podermos
   * decidir que opções do Header mostrar a cada utilizador.
   */
  const roleName = user?.role?.name?.toLowerCase() ?? ''
  const isMember = roleName === 'member'
  const isAdmin = roleName === 'admin'
  /* O diretório identifica cada empresa pelo ID do perfil, não pelo da conta. */
  const memberProfileId = user?.member_profile?.id ?? user?.memberProfile?.id ?? ''
  const publicProfilePath = memberProfileId
    ? `/membros/${encodeURIComponent(memberProfileId)}`
    : '/membros'
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mobileButtonRef = useRef(null);
  const accountButtonRef = useRef(null);
  const navigate = useNavigate();

  const closeMenus = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const result = await logout();
      if (!result.success) return;
      closeMenus();
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key !== "Escape") return;

    if (mobileOpen) {
      setMobileOpen(false);
      mobileButtonRef.current?.focus();
      event.preventDefault();
    } else if (userMenuOpen) {
      setUserMenuOpen(false);
      accountButtonRef.current?.focus();
      event.preventDefault();
    }
  };

  return (
    <nav onKeyDown={handleMenuKeyDown} className="bg-[#0d1f35] sticky top-0 z-50 shadow-lg border-b border-white/10">
      {logoutError && (
        <div role="alert" className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 text-sm text-white">
          <p>{logoutError}</p>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="rounded underline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60">
            Tentar terminar sessão novamente
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo ASPEC */}
          <Link to="/" onClick={closeMenus} className="flex items-center gap-2 cursor-pointer">
            <img
              src="/images/log-branco.png"
              alt="ASPEC"
              className="h-6 w-auto"/>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              to="/#sobre"
              onClick={closeMenus}
              className="px-4 py-2 rounded-md text-sm transition-colors text-white/85 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Sobre a ASPEC
            </Link>

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
          <div className="hidden lg:flex items-center gap-2">
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
                  ref={accountButtonRef}
                  type="button"
                  aria-label={`Opções de conta de ${displayName}`}
                  aria-expanded={userMenuOpen}
                  aria-controls="public-account-menu"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <MemberAvatar
                    logoUrl={memberLogoUrl}
                    name={displayName}
                    className="h-7 w-7 text-xs"
                  />
                  <span className="max-w-40 truncate text-sm">{displayName}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>

                {userMenuOpen && (
                  <div id="public-account-menu" className="absolute right-0 top-full mt-1 w-48 bg-card text-foreground rounded-lg shadow-xl border border-border py-1 z-50">
                  {isMember && (
                    <>
                      {/* A vista pública é separada da área privada de edição. */}
                      <button
                        onClick={() => {
                          navigate(publicProfilePath)
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                      >
                        <User size={14} /> O meu perfil
                      </button>
                      <button
                        onClick={() => {
                          navigate('/perfil')
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                      >
                        <Pencil size={14} /> Editar perfil
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
            ref={mobileButtonRef}
            type="button"
            aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            className="lg:hidden p-2 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="public-mobile-menu" className="lg:hidden bg-[#0a1826] border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/#sobre"
              onClick={closeMenus}
              className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
            >
              Sobre a ASPEC
            </Link>
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
                    {/* O perfil público e a área privada têm destinos distintos. */}
                    <Link
                      to={publicProfilePath}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-left px-3 py-2 rounded text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      O meu perfil
                    </Link>
                    <Link
                      to="/perfil"
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
