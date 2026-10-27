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
import AdminEventCategoriesPage from '../pages/admin/AdminEventCategoriesPage'
import HomePage from '../pages/HomePage'
import EventsPage from '../pages/EventsPage'
import EventDetailPage from '../pages/EventDetailPage'
import MembersPage from '../pages/MembersPage'
import PublicMemberProfilePage from '../pages/PublicMemberProfilePage'
import PageTitle from '../components/PageTitle'
import NotFoundPage from '../pages/NotFoundPage'

/*
 * Centraliza as rotas da aplicação.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas com cabeçalho e rodapé. */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<PageTitle title="Início"><HomePage /></PageTitle>} />
        <Route path="/eventos" element={<PageTitle title="Agenda de Eventos"><EventsPage /></PageTitle>} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/membros" element={<PageTitle title="Diretório de Confiança"><MembersPage /></PageTitle>} />
        <Route path="/membros/:id" element={<PublicMemberProfilePage />} />
        <Routepath="*" element={<PageTitle title="Página não encontrada"><NotFoundPage /></PageTitle>} />
      </Route>

      {/* Rotas públicas sem o layout global. */}
      <Route path="/login" element={<PageTitle title="Iniciar sessão"><LoginPage title="Iniciar sessão" /></PageTitle>} />
      {/* Recuperação de password: rotas públicas abertas através do login e email. */}
      <Route path="/esqueci-password" element={<PageTitle title="Recuperar palavra-passe"><ForgotPasswordPage /></PageTitle>} />
      <Route path="/reset-password" element={<PageTitle title="Redefinir palavra-passe"><ResetPasswordPage /></PageTitle>} />
      <Route path="/registo" element={<PageTitle title="Candidatura"><RegisterPage /></PageTitle>} />
      <Route
        path="/ativacao/sucesso"
        element={<PageTitle title="Conta ativada"><AccountActivationSuccessPage /></PageTitle>}
      />
      <Route
        path="/ativacao/novo-link"
        element={<PageTitle title="Novo link de ativação"><RequestActivationLinkPage /></PageTitle>}
      />
      <Route path="/ativacao/:user" element={<PageTitle title="Ativar conta"><AccountActivationPage /></PageTitle>} />
      <Route
        path="/pendente"
        element={<PageTitle title="Conta pendente"><PlaceholderPage title="Conta pendente" /></PageTitle>}
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
          element={<PageTitle title="Dashboard"><PlaceholderPage title="Dashboard" /></PageTitle>}
        />

        <Route element={<MainLayout />}>
          <Route element={<MemberAreaLayout />}>
            <Route path="/perfil" element={<PageTitle title="Perfil"><MemberProfilePage /></PageTitle>} />
            {/* A edição é feita diretamente nos cartões da página de perfil. */}
            <Route path="/perfil/editar" element={<Navigate replace to="/perfil" />} />
            <Route path="/perfil/portefolio" element={<PageTitle title="Portefólio"><PortfolioPage /></PageTitle>} />

            {/*
             * A aba de avaliações aguarda um endpoint autenticado próprio.
             * Não apresentamos dados fictícios enquanto a API não existir.
             */}
            <Route
              path="/perfil/inscricoes"
              element={<PageTitle title="Inscrições em eventos"><MemberRegistrationsPage /></PageTitle>}
            />
            <Route
              path="/perfil/avaliacoes"
              element={<PageTitle title="Avaliações"><MemberReviewsPage /></PageTitle>}
            />

            <Route
              path="/perfil/conta"
              element={<PageTitle title="Informações da conta"><AccountInformationPage /></PageTitle>}
            />
            <Route
              path="/perfil/conta/password"
              element={<PageTitle title="Alterar palavra-passe"><ChangePasswordPage /></PageTitle>}
            />
            <Route
              path="/perfil/subscricao"
              element={<PageTitle title="Subscrição"><SubscriptionPage /></PageTitle>}
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
            element={<PageTitle title="Administração"><PlaceholderPage title="Administração" /></PageTitle>}
          />
          <Route path="/admin/utilizadores" element={<PageTitle title="Utilizadores"><AdminUsersPage /></PageTitle>} />
          <Route path="/admin/utilizadores/:id" element={<PageTitle title="Detalhe do utilizador"><AdminUserDetailPage /></PageTitle>} />
          <Route path="/admin/eventos" element={<PageTitle title="Gestão de eventos"><AdminEventsPage /></PageTitle>} />
          <Route path="/admin/tipos-evento" element={<PageTitle title="Tipos de evento"><AdminEventCategoriesPage /></PageTitle>} />
          <Route
            path="/admin/moderacao"
            element={<PageTitle title="Moderação"><PlaceholderPage title="Moderação" /></PageTitle>}
          />
        </Route>
      </Route>

    </Routes>
  )
}

export default AppRouter
