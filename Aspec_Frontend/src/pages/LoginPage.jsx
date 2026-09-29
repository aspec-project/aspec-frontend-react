import LoginSidebar from "../components/login/LoginSidebar";
import LoginForm from "../components/login/LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginPage({ onLogin }) {
  const formStateAndActions = useLoginForm(onLogin);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7f2" }}>
      
      <LoginSidebar onNavigateHome={formStateAndActions.goToHome} />

      <div className="w-1/2 flex items-center justify-center px-6 py-12">
        <LoginForm {...formStateAndActions} />
      </div>
      
    </div>
  );
}