import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import MemberDashboardLayout from "../components/layout/MemberDashboardLayout";
import PlaceholderPage from "../pages/PlaceholderPage";
import RegisterPage from "../pages/RegisterPage";

/**
 * Centraliza as rotas da aplicação.
 *
 * A rota de portefólio usa temporariamente o MemberDashboardLayout
 * para podermos validar a estrutura visual da ASPEC-33.
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

      {/* Rotas do membro autenticado */}
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

      {/* ASPEC-33: apresentação temporária do layout da área de membro. */}
      <Route
        path="/perfil/portefolio"
        element={
          <MemberDashboardLayout>
            <PlaceholderPage title="Montra digital e portefólio" />
          </MemberDashboardLayout>
        }
      />

      <Route
        path="/pendente"
        element={<PlaceholderPage title="Conta pendente" />}
      />

      {/* Rotas de administração */}
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

      {/* Rota para URLs que não existem */}
      <Route
        path="*"
        element={<PlaceholderPage title="Página não encontrada" />}
      />
    </Routes>
  );
}

export default AppRouter;