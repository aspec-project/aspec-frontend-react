import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviewsPage from '../../src/pages/MemberReviewsPage'
import { api } from '../../src/services/api'

const profileId = '019512a1-9998-7123-8123-123456789abc'
const ids = {
  visible: '019512a1-0001-7123-8123-123456789abc',
  hidden: '019512a1-0002-7123-8123-123456789abc',
  hiddenNoReason: '019512a1-0003-7123-8123-123456789abc',
  flagged: '019512a1-0004-7123-8123-123456789abc',
  flaggedNoReason: '019512a1-0005-7123-8123-123456789abc',
}

function review(id, status, comment, extra = {}) {
  return {
    id,
    direction: 'received',
    rating: 4,
    comment,
    status,
    hidden_reason: null,
    flagging_reasons: [],
    reviewer: { id: profileId, business_name: `Autor ${comment}` },
    reviewed: { id: profileId, business_name: `Avaliado ${comment}` },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...extra,
  }
}

const received = [
  review(ids.visible, 'Visible', 'visivel'),
  review(ids.hidden, 'Hidden', 'oculta', { hidden_reason: 'Viola o <b>código</b> de conduta.' }),
  review(ids.hiddenNoReason, 'Hidden', 'oculta-sem-motivo'),
  review(ids.flagged, 'Flagged', 'sinalizada', { flagging_reasons: ['language_filter', 'other', 'codigo_novo'] }),
  review(ids.flaggedNoReason, 'Flagged', 'sinalizada-sem-motivo'),
]
const written = [review(ids.flagged, 'Flagged', 'escrita', { direction: 'written', flagging_reasons: ['spam_or_advertising'] })]

function ok(config, items, counts) {
  return {
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      success: true,
      message: 'As suas avaliações foram obtidas com sucesso.',
      data: { items, pagination: { current_page: 1, per_page: 5, total: items.length, last_page: 1 }, counts },
    },
  }
}

describe('As minhas avaliações', () => {
  let original
  let adapter
  const counts = { received: 12, written: 3 }

  beforeEach(() => {
    original = api.defaults.adapter
    adapter = vi.fn(async (config) => ok(config, config.params.direction === 'written' ? written : received, counts))
    api.defaults.adapter = adapter
  })
  afterEach(() => {
    cleanup()
    api.defaults.adapter = original
    vi.restoreAllMocks()
  })

  function show(profile = { average_rating: 3.5, reviews_count: 12 }) {
    return render(
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{ profile }} />}>
            <Route index element={<MemberReviewsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  const tab = (name) => screen.getByRole('tab', { name })
  const card = (comment) => screen.getByText(comment).closest('li')
  const loaded = () => screen.findByText('visivel')

  it.each([
    ['sem avaliações (null)', null, '—'],
    ['média decimal', 3.5, '3,5'],
    ['média exata inteira', 3, '3,0'],
  ])('mostra a média no perfil: %s', async (_, average, expected) => {
    show({ average_rating: average, reviews_count: 0 })
    await loaded()

    expect(screen.getByText(expected, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('0,0')).not.toBeInTheDocument()
  })

  it('mostra as contagens dos dois separadores, qualquer que seja o ativo, e mantém-nas a carregar', async () => {
    const user = userEvent.setup()
    show()
    await loaded()

    expect(tab(/^Feitas ao meu perfil/)).toHaveTextContent('12')
    expect(tab(/^Feitas por mim/)).toHaveTextContent('3')

    let release
    adapter.mockImplementationOnce((config) => new Promise((resolve) => {
      release = () => resolve(ok(config, written, counts))
    }))
    await user.click(tab(/^Feitas por mim/))

    expect(screen.getByRole('status')).toHaveTextContent('A carregar avaliações')
    expect(tab(/^Feitas ao meu perfil/)).toHaveTextContent('12')
    expect(tab(/^Feitas por mim/)).toHaveTextContent('3')

    await act(async () => { release() })
    expect(screen.getByText('escrita')).toBeInTheDocument()
    expect(tab(/^Feitas ao meu perfil/)).toHaveTextContent('12')
  })

  it('uma avaliação oculta abre a justificação com o texto do admin, o email e o botão Fechar', async () => {
    const user = userEvent.setup()
    show()
    await loaded()

    const trigger = within(card('oculta')).getByRole('button', { name: 'Ver justificação' })
    expect(trigger).toHaveAttribute('title', 'Ver justificação')
    expect(screen.queryByText(/Motivo da ocultação/)).not.toBeInTheDocument()
    expect(screen.queryByText('Viola o <b>código</b> de conduta.')).not.toBeInTheDocument()

    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Justificação da ocultação' })
    expect(within(dialog).getByText('Viola o <b>código</b> de conduta.')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Se pretender contestar esta decisão, envie um email para aspec@aspec.pt.')
    expect(within(dialog).getByRole('link', { name: 'aspec@aspec.pt' })).toHaveAttribute('href', 'mailto:aspec@aspec.pt')
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('uma avaliação sinalizada abre o motivo com os rótulos sem repetidos', async () => {
    const user = userEvent.setup()
    show()
    await loaded()

    await user.click(within(card('sinalizada')).getByRole('button', { name: 'Ver motivo' }))

    const dialog = screen.getByRole('dialog', { name: 'Motivo da sinalização' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Linguagem imprópria (deteção automática)',
      'Outro motivo',
    ])
    expect(dialog).toHaveTextContent('Esta avaliação aguarda a análise da administração ASPEC. Para mais informações, envie um email para aspec@aspec.pt.')
  })

  it('o Escape fecha e o Tab fica preso no modal', async () => {
    const user = userEvent.setup()
    show()
    await loaded()

    await user.click(within(card('oculta')).getByRole('button', { name: 'Ver justificação' }))
    const dialog = screen.getByRole('dialog')
    const link = within(dialog).getByRole('link', { name: 'aspec@aspec.pt' })
    const close = within(dialog).getByRole('button', { name: 'Fechar' })

    await user.tab()
    expect(link).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('usa a paginação numerada comum e pede a página escolhida', async () => {
    adapter.mockImplementation(async (config) => ({
      ...ok(config, config.params.page === 2 ? [review(ids.hidden, 'Visible', 'pagina-dois')] : received, counts),
      data: {
        success: true,
        data: {
          items: config.params.page === 2 ? [review(ids.hidden, 'Visible', 'pagina-dois')] : received,
          pagination: { current_page: config.params.page, per_page: 5, total: 6, last_page: 2 },
          counts,
        },
      },
    }))
    const user = userEvent.setup()
    show()
    await loaded()

    const pagination = screen.getByRole('navigation', { name: 'Paginação das avaliações' })
    expect(within(pagination).getByRole('button', { name: 'Página 1', current: 'page' })).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Página anterior' })).toBeDisabled()

    await user.click(within(pagination).getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByText('pagina-dois')).toBeInTheDocument()
    expect(adapter.mock.calls.at(-1)[0].params.page).toBe(2)
  })

  it('sem motivo não há botão', async () => {
    show()
    await loaded()

    for (const comment of ['visivel', 'oculta-sem-motivo', 'sinalizada-sem-motivo']) {
      expect(within(card(comment)).queryByRole('button')).not.toBeInTheDocument()
    }
  })

  it('o botão também aparece no separador das avaliações feitas por mim', async () => {
    const user = userEvent.setup()
    show()
    await loaded()

    await user.click(tab(/^Feitas por mim/))
    await screen.findByText('escrita')
    await user.click(within(card('escrita')).getByRole('button', { name: 'Ver motivo' }))

    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Spam ou publicidade')).toBeInTheDocument())
  })
})
