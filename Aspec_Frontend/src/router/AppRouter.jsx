import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import PlaceholderPage from "../pages/PlaceholderPage"
import RegisterPage from "../pages/RegisterPage"
import ShowcaseInfoPage from '../pages/ShowcaseInfoPage'
import { ProtectedRoute } from '../components/ProtectedRoute'

/**
 * Centraliza as rotas da aplicação.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<PlaceholderPage title="Página inicial" />} />
      <Route path="/login" element={<LoginPage title="Iniciar sessão" />} />
      <Route path="/registo" element={<RegisterPage />} />
      <Route
        path="/membros"
        element={<PlaceholderPage title="Diretório de membros" />}
      />
      <Route
        path="/membros/:membroId"
        element={<PlaceholderPage title="Perfil do membro" />}
      />
      <Route path="/eventos" element={<PlaceholderPage title="Eventos" />} />
      <Route
        path="/eventos/:eventoId"
        element={<PlaceholderPage title="Detalhe do evento" />}
      />
      <Route
        path="/pendente"
        element={<PlaceholderPage title="Conta pendente" />}
      />

      {/* Rotas do membro autenticado — exigem sessão válida */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />
        <Route
          path="/perfil"
          element={<PlaceholderPage title="O meu perfil" />}
        />
        <Route
          path="/perfil/editar"
          element={<PlaceholderPage title="Editar perfil" />}
        />
        <Route
          path="/perfil/inscricoes-eventos"
          element={<PlaceholderPage title="Inscrições em eventos" />}
        />
        <Route path="/perfil/portefolio" element={<ShowcaseInfoPage />} />
      </Route>

      {/* Rotas de administração — exigem sessão válida E role "Admin" */}
      <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
        <Route
          path="/admin"
          element={<PlaceholderPage title="Administração" />}
        />
        <Route
          path="/admin/utilizadores"
          element={<PlaceholderPage title="Gestão de utilizadores" />}
        />
        <Route
          path="/admin/eventos"
          element={<PlaceholderPage title="Gestão de eventos" />}
        />
        <Route
          path="/admin/moderacao"
          element={<PlaceholderPage title="Moderação" />}
        />
      </Route>

      {/* Rota para URLs que não existem */}
      <Route
        path="*"
        element={<PlaceholderPage title="Página não encontrada" />}
      />
    </Routes>
  );
}

export default AppRouter;