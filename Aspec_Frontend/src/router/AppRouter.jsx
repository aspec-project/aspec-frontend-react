import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import PlaceholderPage from "../pages/PlaceholderPage"
import RegisterPage from "../pages/RegisterPage"
import ShowcaseInfoPage from '../pages/ShowcaseInfoPage'
import ShowcaseContactsPage from '../pages/ShowcaseContactsPage'
import PortfolioPage from '../pages/PortfolioPage'
import SubscriptionPage from '../pages/SubscriptionPage'
import AccountActivationPage from '../pages/AccountActivationPage'
import AccountActivationSuccessPage from '../pages/AccountActivationSuccessPage'
import RequestActivationLinkPage from '../pages/RequestActivationLinkPage'
import { ProtectedRoute } from '../components/ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import AdminLayout from '../components/layout/AdminLayout'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminUserDetailPage from '../pages/admin/AdminUserDetailPage'
import HomePage from "../pages/HomePage"
import EventsPage from "../pages/EventsPage"
import EventDetailPage from "../pages/EventDetailPage"
import MembersPage from '../pages/MembersPage'
import PublicMemberProfilePage from '../pages/PublicMemberProfilePage'

/**
 * Centraliza as rotas da aplicação.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/eventos" element={<EventsPage />} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/membros" element={<MembersPage />} />
        <Route path="/membros/:id" element={<PublicMemberProfilePage />} />
      </Route>
      <Route path="/login" element={<LoginPage title="Iniciar sessão" />} />
      {/* Recuperação de password: rotas públicas abertas através do login e email. */}
      <Route path="/esqueci-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        path="/pendente"
        element={<PlaceholderPage title="Conta pendente" />}
      />

      {/* Rotas do membro autenticado — exigem sessão válida */}
      <Route element={<ProtectedRoute allowedRoles={["Member"]} allowedStatuses={["Active"]} />}>
        <Route
          path="/dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />
        {/*
         * Área privada da conta: apresenta apenas a subscrição do membro
         * com sessão iniciada, sem expor dados de outros utilizadores.
         */}
        <Route path="/conta/subscricao" element={<SubscriptionPage />} />
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
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={<PlaceholderPage title="Administração" />}
          />
          <Route path="/admin/utilizadores" element={<AdminUsersPage />} />
          <Route path="/admin/utilizadores/:id" element={<AdminUserDetailPage />} />
          <Route
            path="/admin/eventos"
            element={<PlaceholderPage title="Gestão de eventos" />}
          />
          <Route
            path="/admin/moderacao"
            element={<PlaceholderPage title="Moderação" />}
          />
        </Route>
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
