import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function useLoginForm(onLogin) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = (role = "member") => {
    // Espaço preparado para futura integração com API de autenticação
    if (onLogin) onLogin(role);
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
    handleLogin,
    goToRegister,
    goToHome
  };
}