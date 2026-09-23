import { Route, Routes } from 'react-router-dom'
import PlaceholderPage from '../pages/PlaceholderPage'
import RegisterPage from '../pages/RegisterPage'

/**
 * Centraliza todas as rotas da aplicação.
 * As páginas são temporárias nesta fase; mais tarde cada uma terá
 * o seu componente final baseado no Figma.
 */
function AppRouter() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<PlaceholderPage title="Página inicial" />} />
      <Route path="/login" element={<PlaceholderPage title="Iniciar sessão" />} />
      <Route path="/registo" element={<RegisterPage />} />
      <Route path="/membros" element={<PlaceholderPage title="Diretório de membros" />} />
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
        <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="/perfil" element={<PlaceholderPage title="O meu perfil" />} />
        <Route
          path="/perfil/editar"
          element={<PlaceholderPage title="Editar perfil" />}
        />
        <Route
          path="/perfil/inscricoes-eventos"
          element={<PlaceholderPage title="Inscrições em eventos" />}
        />
        <Route
          path="/perfil/portefolio"
          element={<PlaceholderPage title="Portefólio" />}
        />
        <Route path="/pendente" element={<PlaceholderPage title="Conta pendente" />} />

        {/* Rotas de administração */}
        <Route path="/admin" element={<PlaceholderPage title="Administração" />} />
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
        <Route path="*" element={<PlaceholderPage title="Página não encontrada" />} />
      </Route>
    </Routes>
  )
}

export default AppRouter