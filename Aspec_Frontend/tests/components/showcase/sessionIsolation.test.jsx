import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShowcaseContactsForm from '../../../src/components/showcase/ShowcaseContactsForm'
import ShowcaseInfoForm from '../../../src/components/showcase/ShowcaseInfoForm'
import PortfolioPage from '../../../src/pages/PortfolioPage'
import { ProtectedRoute } from '../../../src/components/ProtectedRoute'
import { getMemberProfile, updateMemberProfile, uploadMemberLogo, uploadPortfolioImages } from '../../../src/services/memberProfile'
import { advanceSession, getSessionContext } from '../../../src/services/sessionContext'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/memberProfile', () => ({
  getMemberProfile: vi.fn(), updateMemberProfile: vi.fn(), uploadMemberLogo: vi.fn(),
  uploadPortfolioImages: vi.fn(), deletePortfolioImage: vi.fn(),
}))
vi.mock('../../../src/services/referenceLists', () => ({
  getSocialPlatforms: vi.fn().mockResolvedValue([]), getWeekDays: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../../src/components/showcase/BusinessHoursEditor', () => ({ default: () => null }))
vi.mock('../../../src/components/showcase/SocialLinksEditor', () => ({ default: () => null }))
vi.mock('../../../src/components/showcase/LogoUploader', () => ({
  default: ({ onLogoChange }) => <button type="button" onClick={() => onLogoChange(new File(['a'], 'a.png'))}>Escolher logo</button>,
}))
vi.mock('../../../src/components/layout/MemberDashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../../../src/components/showcase/PortfolioGallery', () => ({
  default: ({ initialImages, onImagesChange }) => <div>
    {initialImages.map((image) => <img key={image.id} src={image.image_url} alt={image.id} />)}
    <button type="button" onClick={() => onImagesChange([new File(['a'], 'a.png')])}>Escolher imagem</button>
  </div>,
}))

const member = (id) => ({ id, role: { name: 'Member' }, account_status: { name: 'Active' } })
const profile = (id) => ({ commercial_contacts: `Contactos ${id}`, address: `Morada ${id}`, business_name: `Empresa ${id}` })
function setIdentity(id) {
  const context = advanceSession()
  useAuthStore.setState({ user: member(id), status: 'authenticated', sessionGeneration: context.generation })
}
function show(component) {
  return render(<MemoryRouter initialEntries={['/privado']}><Routes>
    <Route element={<ProtectedRoute allowedRoles={['Member']} allowedStatuses={['Active']} />}>
      <Route path="/privado" element={component} />
    </Route>
  </Routes></MemoryRouter>)
}

describe('Isolamento dos formulários privados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const method of [getMemberProfile, updateMemberProfile, uploadMemberLogo, uploadPortfolioImages]) method.mockReset()
    setIdentity('A')
  })
  afterEach(() => cleanup())

  it('limpa os contactos de A imediatamente e carrega os de B', async () => {
    getMemberProfile.mockResolvedValueOnce(profile('A'))
    let completeB
    getMemberProfile.mockImplementationOnce(() => new Promise((resolve) => { completeB = resolve }))
    show(<ShowcaseContactsForm />)
    await screen.findByDisplayValue('Contactos A')
    const contextA = getMemberProfile.mock.calls[0][0]

    act(() => setIdentity('B'))
    expect(screen.queryByDisplayValue('Contactos A')).not.toBeInTheDocument()
    expect(contextA.signal.aborted).toBe(true)
    await waitFor(() => expect(getMemberProfile).toHaveBeenCalledTimes(2))
    await act(async () => completeB(profile('B')))
    expect(await screen.findByDisplayValue('Contactos B')).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar alterações' }).closest('form'))
    await waitFor(() => expect(updateMemberProfile).toHaveBeenCalledTimes(1))
    expect(updateMemberProfile.mock.calls[0][0].commercial_contacts).toBe('Contactos B')
    expect(updateMemberProfile.mock.calls[0][1].generation).toBe(getSessionContext().generation)
  })

  it('ignora a resposta antiga de A depois de carregar B', async () => {
    let completeA
    getMemberProfile.mockImplementationOnce(() => new Promise((resolve) => { completeA = resolve }))
    getMemberProfile.mockResolvedValueOnce(profile('B'))
    show(<ShowcaseContactsForm />)
    await waitFor(() => expect(getMemberProfile).toHaveBeenCalledTimes(1))
    act(() => setIdentity('B'))
    await screen.findByDisplayValue('Contactos B')
    await act(async () => completeA(profile('A')))
    expect(screen.queryByDisplayValue('Contactos A')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Contactos B')).toBeInTheDocument()
  })

  it('não envia o logótipo de A quando o PUT termina depois da troca para B', async () => {
    getMemberProfile.mockResolvedValueOnce(profile('A')).mockResolvedValueOnce(profile('B'))
    let completePut
    updateMemberProfile.mockImplementationOnce(() => new Promise((resolve) => { completePut = resolve }))
    show(<ShowcaseInfoForm />)
    await screen.findByDisplayValue('Empresa A')
    fireEvent.click(screen.getByRole('button', { name: 'Escolher logo' }))
    const form = screen.getByRole('button', { name: 'Guardar alterações' }).closest('form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(updateMemberProfile).toHaveBeenCalledTimes(1)
    act(() => setIdentity('B'))
    await screen.findByDisplayValue('Empresa B')
    await act(async () => completePut(profile('A')))
    expect(uploadMemberLogo).not.toHaveBeenCalled()
    expect(screen.queryByText('Informação da montra guardada com sucesso.')).not.toBeInTheDocument()
  })

  it('cancela pedidos ao desmontar e recria o contexto no replay do StrictMode', async () => {
    getMemberProfile.mockResolvedValue(profile('A'))
    const view = render(<StrictMode><ShowcaseContactsForm /></StrictMode>)
    await screen.findByDisplayValue('Contactos A')
    expect(getMemberProfile).toHaveBeenCalledTimes(2)
    const first = getMemberProfile.mock.calls[0][0]
    const second = getMemberProfile.mock.calls[1][0]
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
    view.unmount()
    expect(second.signal.aborted).toBe(true)
  })

  it('limpa imagens/ficheiros de A e ignora o upload antigo no portefólio de B', async () => {
    getMemberProfile.mockResolvedValueOnce({ portfolio: [{ id: 'imagem-A', image_url: '/a.png' }] })
      .mockResolvedValueOnce({ portfolio: [{ id: 'imagem-B', image_url: '/b.png' }] })
    let completeUpload
    uploadPortfolioImages.mockImplementationOnce(() => new Promise((resolve) => { completeUpload = resolve }))
    show(<PortfolioPage />)
    await screen.findByRole('img', { name: 'imagem-A' })
    fireEvent.click(screen.getByRole('button', { name: 'Escolher imagem' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar alterações' }).closest('form'))
    expect(uploadPortfolioImages).toHaveBeenCalledTimes(1)
    const context = uploadPortfolioImages.mock.calls[0][1]
    act(() => setIdentity('B'))
    expect(screen.queryByRole('img', { name: 'imagem-A' })).not.toBeInTheDocument()
    await screen.findByRole('img', { name: 'imagem-B' })
    await act(async () => completeUpload([{ id: 'upload-A', image_url: '/old.png' }]))
    expect(context.signal.aborted).toBe(true)
    expect(screen.queryByRole('img', { name: 'upload-A' })).not.toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar alterações' }).closest('form'))
    expect(uploadPortfolioImages).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Não existem novas imagens para guardar.')).toBeInTheDocument()
  })
})
