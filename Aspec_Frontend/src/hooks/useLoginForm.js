import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuthToken, normalizeError } from "../services/api";

const LOGIN_ENDPOINT = "/auth/login";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async () => {
    if (submitting) return;
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Preencha o email e a password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(LOGIN_ENDPOINT, { email: email.trim(), password });
      const { token } = res.data.data;

      setAuthToken(token);

      navigate("/dashboard", { replace: true });
    } catch (err) {

      const { message } = normalizeError(err);
      setFormError(message);
    } finally {
      setSubmitting(false);
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