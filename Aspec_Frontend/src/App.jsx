import { useEffect } from "react";
import AppRouter from "./router/AppRouter";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  /*
   * Sempre que a aplicação arranca, confirma no backend se o cookie
   * Sanctum corresponde a uma sessão de utilizador ainda válida.
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <AppRouter />;
}