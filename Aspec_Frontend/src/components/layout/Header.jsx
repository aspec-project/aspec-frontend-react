import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut, Settings } from "lucide-react";

export default function Header({ userRole = null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { label: "Sobre a ASPEC", to: "/" },
    { label: "Eventos", to: "/eventos" },
    { label: "Diretório", to: "/membros" },
  ];

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
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "text-primary bg-primary/15 font-medium"
                      : "text-white/85 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Área de Autenticação */}
          <div className="hidden md:flex items-center gap-2">
            {userRole === null && (
              <Link
                to="/login"
                className="px-4 py-2 text-sm rounded-md transition-colors text-white/85 hover:text-primary hover:bg-primary/15"
              >
                Entrar
              </Link>
            )}

            {userRole === "member" && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-white cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-slate-950">
                    JS
                  </div>
                  <span className="text-sm">João Silva</span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card text-foreground rounded-lg shadow-xl border border-border py-1 z-50">
                    <button
                      onClick={() => { navigate("/dashboard"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                    >
                      <User size={14} /> O meu perfil
                    </button>
                    <button
                      onClick={() => { navigate("/perfil/editar"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 cursor-pointer"
                    >
                      <Settings size={14} /> Editar perfil
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => { navigate("/"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <LogOut size={14} /> Terminar sessão
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
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block w-full text-left px-3 py-2 rounded text-sm text-white/85 hover:text-white hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10 my-2" />
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
          </div>
        </div>
      )}
    </nav>
  );
}