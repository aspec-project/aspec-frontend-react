import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import PlaceholderPage from "../pages/PlaceholderPage"
import RegisterPage from "../pages/RegisterPage"
import ShowcaseInfoPage from '../pages/ShowcaseInfoPage'
import ShowcaseContactsPage from '../pages/ShowcaseContactsPage'
import PortfolioPage from '../pages/PortfolioPage'
import AccountActivationPage from '../pages/AccountActivationPage'
import AccountActivationSuccessPage from '../pages/AccountActivationSuccessPage'
import RequestActivationLinkPage from '../pages/RequestActivationLinkPage'
import { ProtectedRoute } from '../components/ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import HomePage from "../pages/HomePage"
import EventsPage from "../pages/EventsPage"
import MembersPage from '../pages/MembersPage'

/**
 * Centraliza as rotas da aplicação.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="/login" element={<LoginPage title="Iniciar sessão" />} />
      <Route path="/registo" element={<RegisterPage />} />
      <Route
        path="/ativacao/sucesso"
        element={<AccountActivationSuccessPage />}
      />
      <Route
        path="/ativacao/novo-link"
        element={<RequestActivationLinkPage />}
      />
      <Route path="/ativacao/:user" element={<AccountActivationPage />} />
      <Route
        path="/membros"
        element={<MembersPage />}
      />
      <Route
        path="/membros/:membroId"
        element={<PlaceholderPage title="Perfil do membro" />}
      />
      <Route path="/eventos" element={<EventsPage />} />
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
        {/*
         * /perfil mantém-se como endereço de entrada compatível, mas conduz
         * diretamente à primeira secção útil da área do membro.
         */}
        <Route
          path="/perfil"
          element={<Navigate replace to="/perfil/montra" />}
        />
        <Route path="/perfil/montra" element={<ShowcaseInfoPage />} />
        <Route path="/perfil/contactos" element={<ShowcaseContactsPage />} />
        <Route path="/perfil/portefolio" element={<PortfolioPage />} />
        <Route
          path="/perfil/editar"
          element={<PlaceholderPage title="Editar perfil" />}
        />
        <Route
          path="/perfil/inscricoes-eventos"
          element={<PlaceholderPage title="Inscrições em eventos" />}
        />
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
