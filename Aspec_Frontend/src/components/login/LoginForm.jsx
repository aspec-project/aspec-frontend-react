import React from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertCircle, Clock3, MailCheck } from "lucide-react";

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  togglePassword,
  submitting,
  formError,
  canRequestActivationLink,
  accountNotice,
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
            <Link
              to="/esqueci-password"
              className="text-xs cursor-pointer"
              style={{ color: '#8a7043' }}
            >
              Esqueci-me da password
            </Link>
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
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
              accountNotice === 'pending'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : accountNotice === 'activation'
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            {accountNotice === 'pending' ? <Clock3 className="mt-0.5 shrink-0" size={17} /> : accountNotice === 'activation' ? <MailCheck className="mt-0.5 shrink-0" size={17} /> : <AlertCircle className="mt-0.5 shrink-0" size={17} />}
            <div>
              <p className="font-semibold">{accountNotice === 'pending' ? 'Candidatura em análise' : accountNotice === 'activation' ? 'Ativação necessária' : 'Não foi possível iniciar sessão'}</p>
              <p className="mt-1 text-xs leading-5">{formError}</p>

              {canRequestActivationLink && (
                <Link
                  to="/ativacao/novo-link"
                  className="mt-1 block font-semibold text-[#8a7043] hover:underline"
                >
                  Pedir novo link de ativação
                </Link>
              )}
            </div>
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
