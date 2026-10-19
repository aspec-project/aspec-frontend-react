import { useEffect } from "react";
import AppRouter from "./router/AppRouter";
import { useAuthStore } from "./store/authStore";
import { listenSessionChanges } from './services/sessionSync';

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  /*
   * Sempre que a aplicação arranca, confirma no backend se o cookie
   * Sanctum corresponde a uma sessão de utilizador ainda válida.
   */
  useEffect(() => {
    const stop = listenSessionChanges((type) => useAuthStore.getState().receiveSessionChange(type));
    initialize();
    return stop;
  }, [initialize]);

  return <AppRouter />;
}
