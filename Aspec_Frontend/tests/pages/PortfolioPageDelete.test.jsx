import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PortfolioPage from '../../src/pages/PortfolioPage'
import { deletePortfolioImage } from '../../src/services/memberProfile'

vi.mock('../../src/services/memberProfile', () => ({
  deletePortfolioImage: vi.fn(),
  uploadPortfolioImages: vi.fn(),
}))

const profile = {
  portfolio: [
    { id: 'img-1', image_url: 'https://media.example.pt/portfolios/p1/img-1.jpg' },
    { id: 'img-2', image_url: 'https://media.example.pt/portfolios/p1/img-2.jpg' },
  ],
}

function apiError(status, message) {
  return { response: { status, data: { success: false, message } } }
}

function show(reloadProfile) {
  return render(
    <MemoryRouter initialEntries={['/perfil/portefolio']}>
      <Routes>
        <Route element={<Outlet context={{ profile, reloadProfile }} />}>
          <Route path="/perfil/portefolio" element={<PortfolioPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

/*
 * Remover uma imagem que outro separador ou dispositivo já apagou: a API responde 404
 * e a galeria deve ficar igual à do servidor, sem mostrar um erro ao membro.
 */
describe('PortfolioPage: remover uma imagem já removida', () => {
  afterEach(() => vi.clearAllMocks())

  it('com 404 retira a imagem da galeria, recarrega o perfil e informa que já tinha sido removida', async () => {
    deletePortfolioImage.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    const reloadProfile = vi.fn().mockResolvedValue(undefined)
    show(reloadProfile)

    await userEvent.click(screen.getByRole('button', { name: 'Remover Imagem guardada img-1' }))

    expect(await screen.findByRole('status')).toHaveTextContent('A imagem já tinha sido removida. A galeria foi atualizada.')
    expect(reloadProfile).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Remover Imagem guardada img-1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover Imagem guardada img-2' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('com 404 e falha ao recarregar o perfil retira a imagem e mostra o erro da recarga', async () => {
    deletePortfolioImage.mockRejectedValue(apiError(404, 'Recurso não encontrado.'))
    const reloadProfile = vi.fn().mockRejectedValue(apiError(500, 'Erro interno do servidor.'))
    show(reloadProfile)

    await userEvent.click(screen.getByRole('button', { name: 'Remover Imagem guardada img-1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A imagem já tinha sido removida, mas não foi possível atualizar o perfil')
    expect(screen.queryByRole('button', { name: 'Remover Imagem guardada img-1' })).not.toBeInTheDocument()
  })

  it('com outro erro mantém a imagem e mostra a mensagem da API', async () => {
    deletePortfolioImage.mockRejectedValue(apiError(500, 'Erro interno do servidor.'))
    const reloadProfile = vi.fn()
    show(reloadProfile)

    await userEvent.click(screen.getByRole('button', { name: 'Remover Imagem guardada img-1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover Imagem guardada img-1' })).toBeEnabled())
    expect(reloadProfile).not.toHaveBeenCalled()
  })
})
