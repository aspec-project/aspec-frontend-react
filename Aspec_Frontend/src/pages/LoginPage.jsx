import LoginSidebar from "../components/login/LoginSidebar";
import LoginForm from "../components/login/LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginPage() {
  const formStateAndActions = useLoginForm();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: "#f8f7f2" }}>
      
      <LoginSidebar onNavigateHome={formStateAndActions.goToHome} />

      <div className="flex w-full flex-1 items-center justify-center px-4 py-8 md:w-1/2 md:px-6 md:py-12">
        <LoginForm {...formStateAndActions} />
      </div>
      
    </div>
  );
}