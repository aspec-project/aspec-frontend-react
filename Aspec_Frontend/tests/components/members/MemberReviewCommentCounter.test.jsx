import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { getMemberProfile } from '../../../src/services/memberProfile'
import { getMemberReviewPage } from '../../../src/services/members'
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
const ownReview = { id: reviewId, rating: 4, comment: 'Bom trabalho', created_at: '2026-10-01T12:00:00Z', is_mine: true, reviewer: { id: viewer, business_name: 'Empresa membro' } }
const other = { ...ownReview, id: target, is_mine: false, rating: 5, comment: 'Outra experiência', reviewer: { id: target, business_name: 'Outra empresa' } }
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
    </Routes>
  </MemoryRouter>,
)

const openForm = async (name = 'Avaliar') => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name, exact: true }))
  return user
}

describe('Contador do comentário da avaliação', () => {
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

  it('mostra o número de caracteres escritos e acompanha a escrita', async () => {
    show()
    const user = await openForm()
    expect(screen.getByText('0/2000')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), 'Ótimo')
    expect(screen.getByText('5/2000')).toBeInTheDocument()
    expect(screen.queryByText('0/2000')).not.toBeInTheDocument()
  })

  it('ao editar a minha avaliação começa no tamanho do comentário guardado', async () => {
    getMemberReviewPage.mockResolvedValue(page(ownReview))
    show()
    await openForm('Editar a minha avaliação')
    expect(screen.getByRole('textbox')).toHaveValue('Bom trabalho')
    expect(screen.getByText('12/2000')).toBeInTheDocument()
  })

  it('a descrição acessível do comentário inclui o contador e, com erro, também o erro', async () => {
    show()
    const user = await openForm()
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(/0\/2000/)
    await user.click(screen.getByRole('radio', { name: '4 estrelas' }))
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    expect(await screen.findByText('Escreva um comentário.')).toBeInTheDocument()
    const textbox = screen.getByRole('textbox')
    expect(textbox).toHaveAccessibleDescription(/0\/2000/)
    expect(textbox).toHaveAccessibleDescription(/Escreva um comentário\./)
  })

  it('no limite de 2000 caracteres o contador fica âmbar', async () => {
    show()
    await openForm()
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'a'.repeat(1999) } })
    expect(screen.getByText('1999/2000')).not.toHaveClass('text-amber-800')
    fireEvent.change(textbox, { target: { value: 'a'.repeat(2000) } })
    expect(screen.getByText('2000/2000')).toHaveClass('text-amber-800')
  })
})
