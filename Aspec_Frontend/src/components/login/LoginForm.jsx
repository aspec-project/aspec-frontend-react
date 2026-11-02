import React from "react";
import { Link } from "react-router-dom";
import { Ban, Eye, EyeOff, LogIn, AlertCircle, Clock3, MailCheck, Send } from "lucide-react";

const accountNotices = {
  pending: {
    title: 'A sua candidatura ainda está em análise',
    message: 'Ainda não foi aprovada por um administrador, por isso não pode entrar. Receberá um email assim que houver uma decisão.',
    className: 'border-[#e6d5a5] bg-[#f8f4e8] text-[#725a25]',
    Icon: Clock3,
  },
  activation: {
    title: 'A sua conta foi aprovada, mas ainda não está ativa',
    message: 'Falta ativar a conta através do link que enviámos por email. Não o encontra? Pode pedir um novo.',
    actionLabel: 'Reenviar email de ativação',
    className: 'border-[#b7d1f5] bg-[#eaf3ff] text-[#204e87]',
    Icon: MailCheck,
  },
  expired: {
    title: 'A sua subscrição expirou',
    message: 'Para voltar a aceder à área de membro, reative a subscrição. Enviamos-lhe um email com o link de reativação.',
    actionLabel: 'Enviar email de reativação',
    className: 'border-[#f3c479] bg-[#fff1dc] text-[#925200]',
    Icon: Clock3,
  },
  blocked: {
    title: 'A sua conta está bloqueada',
    message: 'O acesso à área de membro foi suspenso por um administrador e não é possível entrar. Os motivos foram enviados para o email da sua conta. Se tem dúvidas, contacte a ASPEC através do email geral@aspec.pt.',
    className: 'border-[#f6b7bd] bg-[#fee9eb] text-[#b91c1c]',
    Icon: Ban,
  },
}

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

  const notice = accountNotices[accountNotice]
  const NoticeIcon = notice?.Icon ?? AlertCircle

  return (
    <div className="w-full max-w-md">
      <form className="space-y-5" onSubmit={onSubmit}>
        {formError && (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-5 text-sm ${
              notice?.className ?? 'border-red-200 bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            <NoticeIcon className="mt-0.5 shrink-0" size={22} />
            <div>
              <p className="font-semibold text-base">{notice?.title ?? 'Não foi possível iniciar sessão'}</p>
              <p className="mt-1.5 leading-6">{notice?.message ?? formError}</p>

              {canRequestActivationLink && (
                <Link
                  to="/ativacao/novo-link"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0d1f35] px-5 py-3 font-semibold text-white transition hover:bg-[#193451]"
                >
                  <Send size={17} aria-hidden="true" />
                  {notice?.actionLabel ?? 'Pedir novo link de ativação'}
                </Link>
              )}
            </div>
          </div>
        )}

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
