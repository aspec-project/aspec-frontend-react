import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const ACCOUNT_STATE_NOTICES = {
  pending: 'pending',
  approved: 'activation',
  inactive_unpaid: 'expired',
  inactive_cancelled: 'expired',
  inactive: 'blocked',
}

function getAccountNotice(status, accountState) {
  if (status !== 403) return 'error'
  return ACCOUNT_STATE_NOTICES[accountState] ?? 'error'
}

/*
 * Um destino só pode ser interno à aplicação. O parâmetro é usado nos links
 * dos emails e o estado é usado pelas rotas protegidas, pelo que nunca se
 * deve aceitar um URL externo após autenticar.
 */
function getReturnPath(location) {
  const queryPath = new URLSearchParams(location.search).get('redirect')
  const stateLocation = location.state?.from
  const statePath = typeof stateLocation?.pathname === 'string'
    ? `${stateLocation.pathname}${stateLocation.search ?? ''}${stateLocation.hash ?? ''}`
    : null
  const candidate = queryPath ?? statePath

  if (
    typeof candidate !== 'string'
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
  ) {
    return null
  }

  return candidate
}

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [canRequestActivationLink, setCanRequestActivationLink] = useState(false);
  const [accountNotice, setAccountNotice] = useState(null)

  const navigate = useNavigate();
  const location = useLocation()
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
      setFormError("Preencha o email e a palavra-passe.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Indique um endereço de email válido.");
      return;
    }

    const result = await login(email.trim(), password);
    if (result.cancelled) return;
    if (result.success) {
      const authenticatedUser = useAuthStore.getState().user
      const isMember = authenticatedUser?.role?.name === 'Member'
      const isAdmin = authenticatedUser?.role?.name === 'Admin'
      const memberDestination = getReturnPath(location) ?? '/perfil'
      navigate(isMember ? memberDestination : isAdmin ? '/admin' : '/', { replace: true });
    } else {
      const notice = getAccountNotice(result.error.status, result.error.accountState)
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
