import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import logoImg from "../../public/images/log-branco.png";

export function LoginPage({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7f2" }}>
      {/* Painel Esquerdo — Visual */}
      <div
        className="w-1/2 flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1f35 0%, #060f1a 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1515169067868-5387ec356754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10">
          <button type="button" onClick={() => navigate("/")} className="cursor-pointer">
            <img src={logoImg} alt="ASPEC" className="h-10 w-70 object-contain" />
          </button>
        </div>
        <div className="relative z-10">
          <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: "#8a7043" }} />
          <h2 className="text-white mb-4" style={{ fontSize: "1.75rem" }}>
            Bem-vindo de volta à comunidade ASPEC
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
            Aceda ao seu perfil profissional, gira as suas inscrições em eventos e conecte-se com a rede de confiança cristã em Portugal.
          </p>
        </div>
        <div className="relative z-10 flex gap-6">
          {[
            { num: "320+", label: "Membros" },
            { num: "18", label: "Delegações" },
            { num: "120+", label: "Eventos/Ano" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-bold" style={{ color: "#8a7043" }}>{s.num}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel Direito — Formulário */}
      <div className="w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0d1f35" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="o-teu@email.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors"
                style={{ borderColor: "#d4d8e3", backgroundColor: "white" }}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium" style={{ color: "#0d1f35" }}>Password</label>
                <button type="button" className="text-xs cursor-pointer" style={{ color: "#8a7043" }}>
                  Esqueci-me da password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "#d4d8e3", backgroundColor: "white" }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLogin?.("member")}
              className="w-full py-3 rounded-xl font-medium cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0d1f35", color: "white" }}
            >
              <LogIn size={16} /> Entrar
            </button>

            <p className="text-sm text-gray-500 mb-8">
              Não é membro?{" "}
              <button
                type="button"
                onClick={() => navigate("/registo")}
                className="cursor-pointer font-medium"
                style={{ color: "#8a7043" }}
              >
                Candidate-se aqui
              </button>
            </p>

            {/* Demo quick access */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3 text-center">Acesso rápido para demonstração:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onLogin?.("member")}
                  className="py-2 px-3 rounded-lg text-xs cursor-pointer border font-medium flex items-center justify-center gap-1"
                  style={{ borderColor: "#0d1f35", color: "#0d1f35" }}
                >
                  <ArrowRight size={12} /> Entrar como Membro
                </button>
                <button
                  type="button"
                  onClick={() => onLogin?.("admin")}
                  className="py-2 px-3 rounded-lg text-xs cursor-pointer border font-medium flex items-center justify-center gap-1"
                  style={{ borderColor: "#8a7043", color: "#6b5427", backgroundColor: "#f5f2e8" }}
                >
                  <ArrowRight size={12} /> Entrar como Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}