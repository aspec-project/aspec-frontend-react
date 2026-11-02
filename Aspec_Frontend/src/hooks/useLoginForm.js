import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const PENDING_ACCOUNT_MESSAGE = 'A sua conta está pendente de aprovação pelo administrador.'
const APPROVED_ACCOUNT_MESSAGE = 'A sua conta foi aprovada. Ative-a através do link enviado por email.'
const EXPIRED_SUBSCRIPTION_MESSAGES = [
  'A sua conta está inativa por falta de pagamento. Use o link de reativação enviado por email.',
  'A sua subscrição terminou. Use o link de reativação enviado por email para reativar a conta.',
]
/* Atualmente, esta é a resposta devolvida pelo backend para Inactive/blocked. */
const BLOCKED_ACCOUNT_MESSAGE = 'A sua conta não está ativa.'

function getAccountNotice(status, message) {
  if (status !== 403) return 'error'
  if (message === PENDING_ACCOUNT_MESSAGE) return 'pending'
  if (message === APPROVED_ACCOUNT_MESSAGE) return 'activation'
  if (EXPIRED_SUBSCRIPTION_MESSAGES.includes(message)) return 'expired'
  if (message === BLOCKED_ACCOUNT_MESSAGE) return 'blocked'
  return 'error'
}

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [canRequestActivationLink, setCanRequestActivationLink] = useState(false);
  const [accountNotice, setAccountNotice] = useState(null)

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const submitting = status === "loading";

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async () => {
    if (submitting) return;
    setFormError("");
    setCanRequestActivationLink(false);
    setAccountNotice(null)

    if (!email.trim() || !password) {
      setFormError("Preencha o email e a password.");
      return;
    }

    const result = await login(email.trim(), password);
    if (result.cancelled) return;
    if (result.success) {
      const authenticatedUser = useAuthStore.getState().user
      const isMember = authenticatedUser?.role?.name === 'Member'
      const isAdmin = authenticatedUser?.role?.name === 'Admin'
      navigate(isMember ? '/perfil' : isAdmin ? '/admin' : '/', { replace: true });
    } else {
      const notice = getAccountNotice(result.error.status, result.error.message)
      const canRequestLink = ['activation', 'expired'].includes(notice)

      setFormError(result.error.message);
      setCanRequestActivationLink(canRequestLink);
      setAccountNotice(notice)
    }
  };

  const goToRegister = () => navigate("/registo");
  const goToHome = () => navigate("/");

  return {
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
    goToRegister,
    goToHome,
  };
}
