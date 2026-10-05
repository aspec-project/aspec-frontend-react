import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const submitting = status === "loading";

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async () => {
    if (submitting) return;
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Preencha o email e a password.");
      return;
    }

    const result = await login(email.trim(), password);
    if (result.success) {
      navigate("/dashboard", { replace: true });
    } else {
      // já vem em pt-PT certo do backend (401 credenciais, 403 pendente/inativa)
      setFormError(result.error.message);
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
    handleLogin,
    goToRegister,
    goToHome,
  };
}