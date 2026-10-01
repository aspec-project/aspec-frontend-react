import React from "react";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  togglePassword,
  submitting,
  formError,
  handleLogin,
  goToRegister
}) {
  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="w-full max-w-md">
      <form className="space-y-5" onSubmit={onSubmit}>
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

        {formError && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} />
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl font-medium cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#0d1f35", color: "white" }}
        >
          <LogIn size={16} /> {submitting ? "A entrar..." : "Entrar"}
        </button>

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
      </form>
    </div>
  );
}