import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { getMemberProfile } from '../../../src/services/memberProfile'
import { getMemberReviewPage, saveMemberReview } from '../../../src/services/members'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/members', async (importOriginal) => ({
  ...(await importOriginal()),
  getMemberReviewPage: vi.fn(),
  saveMemberReview: vi.fn(),
  deleteMemberReview: vi.fn(),
}))
vi.mock('../../../src/services/memberProfile', () => ({ getMemberProfile: vi.fn() }))

const target = '019512a1-9999-7123-8123-123456789abc'
const viewer = '019512a1-9998-7123-8123-123456789abc'
const reviewId = '019512a1-9997-7123-8123-123456789abc'
const ownReview = { id: reviewId, rating: 4, comment: 'A minha experiência', created_at: '2026-10-01T12:00:00Z', is_mine: true, reviewer: { id: viewer, business_name: 'Empresa membro' } }
const other = { ...ownReview, id: target, is_mine: false, rating: 5, comment: 'Outra experiência', reviewer: { id: target, business_name: 'Outra empresa' } }
const awaitingText = 'A sua avaliação ficou a aguardar moderação e só fica visível depois de aprovada.'
const page = (mine = null) => ({
  average_rating: 5,
  reviews_count: 1,
  rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rating === 5 ? 1 : 0 })),
  mine,
  items: [other],
  pagination: { current_page: 1, per_page: 5, total: 1, last_page: 1 },
})

const show = () => render(
  <MemoryRouter initialEntries={['/membros/x']}>
    <Routes>
      <Route path="/membros/x" element={<MemberReviews memberId={target} allowReview />} />
      <Route path="/perfil/avaliacoes" element={<p>Página das minhas avaliações</p>} />
    </Routes>
  </MemoryRouter>,
)

const publish = async () => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Avaliar', exact: true }))
  await user.click(screen.getByRole('radio', { name: '4 estrelas' }))
  await user.type(screen.getByRole('textbox'), 'Bom serviço')
  await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
  return user
}

const awaitingNotice = async () => (await screen.findByText(awaitingText)).closest('[role="status"]')

describe('Aviso de avaliação a aguardar moderação no perfil público', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', role: { name: 'Member' }, account_status: { name: 'Active' }, member_profile: { id: viewer } },
      status: 'authenticated',
    })
    getMemberProfile.mockResolvedValue({ id: viewer })
    getMemberReviewPage.mockResolvedValue(page())
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('ao publicar uma avaliação sinalizada mostra o aviso amarelo com a ligação e não diz Avaliação guardada', async () => {
    saveMemberReview.mockResolvedValue({ ...ownReview, rating: 4, comment: 'Bom serviço', status: 'Flagged' })
    show()
    const user = await publish()
    const notice = await awaitingNotice()
    expect(notice).not.toBeNull()
    expect(within(notice).getByText(awaitingText)).toBeInTheDocument()
    const link = within(notice).getByRole('link', { name: 'As minhas avaliações' })
    expect(link).toHaveAttribute('href', '/perfil/avaliacoes?separador=written')
    expect(screen.queryByText(/Avaliação guardada/)).toBeNull()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Avaliar', exact: true })).toBeInTheDocument()
    await user.click(link)
    expect(await screen.findByText('Página das minhas avaliações')).toBeInTheDocument()
  })

  it('ao editar uma avaliação que fica sinalizada mostra o mesmo aviso', async () => {
    getMemberReviewPage.mockResolvedValueOnce(page(ownReview)).mockResolvedValue(page())
    saveMemberReview.mockResolvedValue({ ...ownReview, comment: 'Texto alterado', status: 'Flagged' })
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Editar a minha avaliação' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Texto alterado')
    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }))
    const notice = await awaitingNotice()
    expect(notice).not.toBeNull()
    expect(within(notice).getByRole('link', { name: 'As minhas avaliações' })).toHaveAttribute('href', '/perfil/avaliacoes?separador=written')
    expect(await screen.findByRole('button', { name: 'Avaliar', exact: true })).toBeInTheDocument()
    expect(screen.queryByText('A minha avaliação')).not.toBeInTheDocument()
  })

  it.each([['Visible'], ['Hidden'], ['sem estado']])('com estado %s continua a mostrar Avaliação guardada', async (state) => {
    const saved = { ...ownReview, rating: 4, comment: 'Bom serviço' }
    saveMemberReview.mockResolvedValue(state === 'sem estado' ? saved : { ...saved, status: state })
    show()
    await publish()
    expect(await screen.findByText('Avaliação guardada.')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('link', { name: 'As minhas avaliações' })).not.toBeInTheDocument()
    expect(screen.queryByText(awaitingText)).not.toBeInTheDocument()
  })

  it('o aviso desaparece ao abrir de novo o formulário', async () => {
    saveMemberReview.mockResolvedValue({ ...ownReview, rating: 4, comment: 'Bom serviço', status: 'Flagged' })
    show()
    const user = await publish()
    await awaitingNotice()
    await user.click(await screen.findByRole('button', { name: 'Avaliar', exact: true }))
    expect(screen.queryByText(awaitingText)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('se a lista falhar depois de uma avaliação sinalizada, o erro diz que a alteração foi concluída', async () => {
    getMemberReviewPage.mockResolvedValueOnce(page()).mockRejectedValue(new Error('Falha'))
    saveMemberReview.mockResolvedValue({ ...ownReview, rating: 4, comment: 'Bom serviço', status: 'Flagged' })
    show()
    await publish()
    expect(await screen.findByRole('alert')).toHaveTextContent('A alteração foi concluída, mas a lista e o resumo ainda não foram atualizados.')
    expect(screen.getByText(awaitingText)).toBeInTheDocument()
  })
})
