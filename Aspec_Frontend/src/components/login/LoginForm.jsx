import React from "react";
import { Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  togglePassword,
  handleLogin,
  goToRegister
}) {
  return (
    <div className="w-full max-w-md">
      <div className="space-y-5">
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Email *
          </label>
          <input
            type="email"
            placeholder="o-teu@email.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
            style={{ borderColor: "#d4d8e3", backgroundColor: "white" }}
          />
        </div>
        
        {/* Input Password */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-gray-500 block">
              Password *
            </label>
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
              className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
              style={{ borderColor: "#d4d8e3", backgroundColor: "white" }}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
              onClick={togglePassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submissão Principal */}
        <button
          type="button"
          onClick={() => handleLogin("member")}
          className="w-full py-2.5 rounded-xl font-medium cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0d1f35", color: "white" }}
        >
          <LogIn size={16} /> Entrar
        </button>

        {/* Link Registo */}
        <p className="text-sm text-gray-500 mb-8">
          Não é membro?{" "}
          <button
            type="button"
            onClick={goToRegister}
            className="cursor-pointer font-medium"
            style={{ color: "#8a7043" }}
          >
            Candidate-se aqui
          </button>
        </p>

        {/* Acessos Rápidos de Demonstração */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-3 text-center">Acesso rápido para demonstração:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleLogin("member")}
              className="py-2 px-3 rounded-lg text-xs cursor-pointer border font-medium flex items-center justify-center gap-1 transition-colors hover:bg-gray-50"
              style={{ borderColor: "#0d1f35", color: "#0d1f35" }}
            >
              <ArrowRight size={12} /> Entrar como Membro
            </button>
            <button
              type="button"
              onClick={() => handleLogin("admin")}
              className="py-2 px-3 rounded-lg text-xs cursor-pointer border font-medium flex items-center justify-center gap-1 transition-colors hover:opacity-90"
              style={{ borderColor: "#8a7043", color: "#6b5427", backgroundColor: "#f5f2e8" }}
            >
              <ArrowRight size={12} /> Entrar como Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}