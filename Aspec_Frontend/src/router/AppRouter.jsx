import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import RegisterPage from '../pages/RegisterPage'
import PortfolioPage from '../pages/PortfolioPage'
import SubscriptionPage from '../pages/SubscriptionPage'
import MemberProfilePage from '../pages/MemberProfilePage'
import MemberRegistrationsPage from '../pages/MemberRegistrationsPage'
import MemberReviewsPage from '../pages/MemberReviewsPage'
import AccountInformationPage from '../pages/AccountInformationPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'
import AccountActivationPage from '../pages/AccountActivationPage'
import AccountActivationSuccessPage from '../pages/AccountActivationSuccessPage'
import RequestActivationLinkPage from '../pages/RequestActivationLinkPage'
import { ProtectedRoute } from '../components/ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import MemberAreaLayout from '../components/layout/MemberAreaLayout'
import AdminLayout from '../components/layout/AdminLayout'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminUserDetailPage from '../pages/admin/AdminUserDetailPage'
import AdminEventsPage from '../pages/admin/AdminEventsPage'
import HomePage from '../pages/HomePage'
import EventsPage from '../pages/EventsPage'
import EventDetailPage from '../pages/EventDetailPage'
import MembersPage from '../pages/MembersPage'
import PublicMemberProfilePage from '../pages/PublicMemberProfilePage'

/*
 * Centraliza as rotas da aplicação.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas com cabeçalho e rodapé. */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/eventos" element={<EventsPage />} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/membros" element={<MembersPage />} />
        <Route path="/membros/:id" element={<PublicMemberProfilePage />} />
      </Route>

      {/* Rotas públicas sem o layout global. */}
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

      {/* Área privada do membro: exige sessão ativa e mostra o layout do Figma. */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={['Member']}
            allowedStatuses={['Active']}
          />
        }
      >
        <Route
          path="/dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />

        <Route element={<MainLayout />}>
          <Route element={<MemberAreaLayout />}>
            <Route path="/perfil" element={<MemberProfilePage />} />
            {/* A edição é feita diretamente nos cartões da página de perfil. */}
            <Route path="/perfil/editar" element={<Navigate replace to="/perfil" />} />
            <Route path="/perfil/portefolio" element={<PortfolioPage />} />

            {/*
             * A aba de avaliações aguarda um endpoint autenticado próprio.
             * Não apresentamos dados fictícios enquanto a API não existir.
             */}
            <Route
              path="/perfil/inscricoes"
              element={<MemberRegistrationsPage />}
            />
            <Route
              path="/perfil/avaliacoes"
              element={<MemberReviewsPage />}
            />

            <Route
              path="/perfil/conta"
              element={<AccountInformationPage />}
            />
            <Route
              path="/perfil/conta/password"
              element={<ChangePasswordPage />}
            />
            <Route
              path="/perfil/subscricao"
              element={<SubscriptionPage />}
            />

            {/*
             * Compatibilidade com endereços usados pela antiga área da montra.
             * A edição passa a ser feita diretamente em “Perfil”.
             */}
            <Route
              path="/perfil/montra"
              element={<Navigate replace to="/perfil" />}
            />
            <Route
              path="/perfil/contactos"
              element={<Navigate replace to="/perfil" />}
            />
            <Route
              path="/perfil/inscricoes-eventos"
              element={<Navigate replace to="/perfil/inscricoes" />}
            />
          </Route>
        </Route>

        {/* Endereço antigo da subscrição, preservado para links já existentes. */}
        <Route
          path="/conta/subscricao"
          element={<Navigate replace to="/perfil/subscricao" />}
        />
      </Route>

      {/* Rotas de administração — exigem sessão válida e role Admin. */}
      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={<PlaceholderPage title="Administração" />}
          />
          <Route path="/admin/utilizadores" element={<AdminUsersPage />} />
          <Route path="/admin/utilizadores/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/eventos" element={<AdminEventsPage />} />
          <Route
            path="/admin/moderacao"
            element={<PlaceholderPage title="Moderação" />}
          />
        </Route>
      </Route>

      {/* Rota para URLs que não existem. */}
      <Route
        path="*"
        element={<PlaceholderPage title="Página não encontrada" />}
      />
    </Routes>
  )
}

export default AppRouter
