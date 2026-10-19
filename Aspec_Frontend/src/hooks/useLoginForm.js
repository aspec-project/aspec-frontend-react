import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const ACTIVATION_LINK_MESSAGES = [
  'A sua conta foi aprovada. Ative-a através do link enviado por email.',
  'A sua conta está inativa por falta de pagamento. Use o link de reativação enviado por email.',
]

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [canRequestActivationLink, setCanRequestActivationLink] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const submitting = status === "loading";

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async () => {
    if (submitting) return;
    setFormError("");
    setCanRequestActivationLink(false);

    if (!email.trim() || !password) {
      setFormError("Preencha o email e a password.");
      return;
    }

    const result = await login(email.trim(), password);
    if (result.cancelled) return;
    if (result.success) {
      navigate("/", { replace: true });
    } else {
      /*
      * Apenas os estados Approved e Inactive por falta de pagamento
      * permitem pedir um novo link pela página pública.
      */
      const canRequestLink =
        result.error.status === 403 &&
        ACTIVATION_LINK_MESSAGES.includes(result.error.message);

      setFormError(result.error.message);
      setCanRequestActivationLink(canRequestLink);
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
    handleLogin,
    goToRegister,
    goToHome,
  };
}
