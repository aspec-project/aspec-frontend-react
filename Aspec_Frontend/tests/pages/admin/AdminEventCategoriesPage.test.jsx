import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminEventCategoriesPage from '../../../src/pages/admin/AdminEventCategoriesPage'
import {
  createEventCategory,
  deleteEventCategory,
  getAdminEventCategories,
  getAdminEventCategoryPalette,
  updateEventCategory,
} from '../../../src/services/adminEventCategories'

vi.mock('../../../src/services/adminEventCategories', () => ({
  getAdminEventCategories: vi.fn(),
  getAdminEventCategoryPalette: vi.fn(),
  createEventCategory: vi.fn(),
  updateEventCategory: vi.fn(),
  deleteEventCategory: vi.fn(),
}))

const palette = [
  ['#0D1F35', 'Azul-marinho'], ['#1E449A', 'Azul-cobalto'], ['#2A6E9E', 'Azul-aço'], ['#0A4251', 'Azul-petróleo'],
  ['#1C747E', 'Turquesa-escuro'], ['#0B4D3F', 'Verde-petróleo'], ['#0E784F', 'Verde-esmeralda'], ['#2B4A12', 'Verde-floresta'],
  ['#53731A', 'Verde-musgo'], ['#5E6013', 'Verde-azeitona'], ['#7A6238', 'Ouro-velho'], ['#94591A', 'Bronze'],
  ['#5A3A14', 'Castanho'], ['#3A2E1C', 'Café'], ['#38207E', 'Índigo'], ['#6548B8', 'Violeta'],
  ['#763B82', 'Púrpura'], ['#686693', 'Lilás-acinzentado'], ['#5B6670', 'Ardósia'], ['#383B41', 'Grafite'],
].map(([color, name]) => ({ color, name }))

const categories = [
  { id: 'c1', name: 'Almoço', color: '#0E784F', events_count: 1 },
  { id: 'c2', name: 'Formação', color: '#1E449A', events_count: 7 },
  { id: 'c3', name: 'Jantar', color: '#7A6238', events_count: 6 },
  { id: 'c4', name: 'Workshop', color: '#1C747E', events_count: 0 },
  { id: 'c5', name: 'Retiro', color: '#763B82', events_count: 0 },
]

const NOT_FOUND = 'Este tipo de evento já não existe. A lista foi atualizada.'
const COLOR_TAKEN = 'Já existe uma categoria com esta cor.'
const NAME_TAKEN = 'Já existe uma categoria com este nome.'
const NOT_IN_PALETTE = 'A cor escolhida não faz parte da paleta de cores disponíveis.'
const EXHAUSTED = 'Já estão em uso as 20 cores disponíveis. Para criar um novo tipo, apague primeiro um tipo sem eventos.'
const CREATED = 'Categoria criada com sucesso.'
const UPDATED = 'Categoria atualizada com sucesso.'
const DELETED = 'Categoria eliminada com sucesso.'

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function apiError(status, message, errors) {
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: {},
    data: { success: false, message, ...(errors ? { errors } : {}) },
  })
}

function show() {
  return render(<MemoryRouter><AdminEventCategoriesPage /></MemoryRouter>)
}

function table() {
  return screen.getByRole('table', { name: 'Tipos de evento' })
}

function rowOf(name) {
  return within(table()).getByText(name).closest('tr')
}

function newButton() {
  return screen.getByRole('button', { name: 'Novo tipo' })
}

function dialog() {
  return screen.getByRole('dialog')
}

function inDialog() {
  return within(dialog())
}

function nameField() {
  return inDialog().getByRole('textbox', { name: /^Nome/ })
}

function swatch(name) {
  return inDialog().getByRole('radio', { name })
}

function submitButton(name = 'Criar tipo') {
  return inDialog().getByRole('button', { name })
}

function previewStrip(badgeText) {
  return inDialog().getByText(badgeText).closest('.rounded-lg').querySelector('.h-2')
}

function successBanner(message) {
  return screen.queryAllByRole('status').find((element) => element.textContent.includes(message))
}

function errorBanner(message) {
  return screen.queryAllByRole('alert').find((element) => element.textContent.includes(message))
}

async function openCreate(user) {
  await screen.findByRole('table')
  await user.click(newButton())

  return screen.getByRole('dialog', { name: 'Novo tipo de evento' })
}

describe('Tipos de evento', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getAdminEventCategories.mockResolvedValue(categories)
    getAdminEventCategoryPalette.mockResolvedValue(palette)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Lista', () => {
    it('mostra o carregamento e depois o título, o subtítulo, o botão e a tabela pela ordem recebida', async () => {
      const pending = deferred()
      getAdminEventCategories.mockImplementationOnce(() => pending.promise)
      show()

      expect(screen.getByRole('status')).toHaveTextContent('A carregar tipos de evento...')

      await act(async () => { pending.resolve(categories) })

      expect(screen.getByRole('heading', { level: 2, name: 'Tipos de Evento' })).toBeInTheDocument()
      expect(screen.getByText('Só é possível apagar tipos que não estejam ligados a nenhum evento.')).toBeInTheDocument()
      expect(newButton()).toHaveAttribute('aria-haspopup', 'dialog')
      expect(within(table()).getAllByRole('columnheader').map((header) => header.textContent.trim())).toEqual(['Tipo', 'Eventos', 'Ações'])
      const rows = within(table()).getAllByRole('row').slice(1)
      expect(rows).toHaveLength(5)
      rows.forEach((row, index) => expect(row).toHaveTextContent(categories[index].name))

      const dinner = within(rowOf('Jantar'))
      expect(rowOf('Jantar')).toHaveTextContent('#7A6238')
      expect(dinner.getByText('6 eventos')).toBeInTheDocument()
      expect(dinner.getByText('Jantar')).toHaveStyle({ backgroundColor: '#EFECE7', color: '#7A6238' })
      expect(within(rowOf('Almoço')).getByText('1 evento')).toBeInTheDocument()
      expect(within(rowOf('Retiro')).getByText('0 eventos')).toBeInTheDocument()
      expect(getAdminEventCategories).toHaveBeenCalledTimes(1)
      expect(getAdminEventCategories).toHaveBeenCalledWith(expect.any(AbortSignal))
    })

    it('todos têm editar e só os tipos sem eventos têm apagar; os outros mostram o cadeado com a explicação', async () => {
      getAdminEventCategories.mockResolvedValue([...categories, { id: 'c6', name: 'Convívio', color: '#AD1457', events_count: null }])
      show()
      await screen.findByRole('table')

      for (const { name } of [...categories, { name: 'Convívio' }]) {
        const edit = within(rowOf(name)).getByRole('button', { name: `Editar ${name}` })
        expect(edit).toHaveAttribute('aria-haspopup', 'dialog')
      }
      for (const name of ['Workshop', 'Retiro']) {
        expect(within(rowOf(name)).getByRole('button', { name: `Apagar ${name}` })).toHaveAttribute('aria-haspopup', 'dialog')
      }
      for (const name of ['Formação', 'Jantar', 'Almoço', 'Convívio']) {
        expect(screen.queryByRole('button', { name: `Apagar ${name}` })).not.toBeInTheDocument()
      }
      expect(within(rowOf('Formação')).getByRole('img', { name: 'Não é possível apagar «Formação»: está ligado a 7 eventos.' })).toBeInTheDocument()
      expect(within(rowOf('Almoço')).getByRole('img', { name: 'Não é possível apagar «Almoço»: está ligado a 1 evento.' })).toBeInTheDocument()
      expect(within(rowOf('Convívio')).getByRole('img', { name: 'Não é possível apagar «Convívio».' })).toBeInTheDocument()
      expect(within(rowOf('Convívio')).getByText('—')).toBeInTheDocument()
    })

    it('uma cor inválida usa o azul-marinho, mostra um travessão no código e não chega ao HTML', async () => {
      getAdminEventCategories.mockResolvedValue([
        { id: 'x1', name: 'Vermelho', color: 'red', events_count: 0 },
        { id: 'x2', name: 'Perigo', color: 'url(javascript:alert(1))', events_count: 0 },
      ])
      const { container } = show()
      await screen.findByRole('table')

      for (const name of ['Vermelho', 'Perigo']) {
        expect(within(rowOf(name)).getByText(name)).toHaveStyle({ backgroundColor: '#E2E4E7' })
        expect(within(rowOf(name)).getByText('—')).toBeInTheDocument()
      }
      expect(container.innerHTML).not.toContain('javascript')
      expect(container.innerHTML).not.toContain('url(')
    })

    it('sem tipos mostra a mensagem de lista vazia e o botão Novo tipo, sem tabela', async () => {
      getAdminEventCategories.mockResolvedValue([])
      show()

      expect(await screen.findByText('Ainda não há tipos de evento.')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Novo tipo' }).length).toBeGreaterThan(0)
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('um erro ao obter a paleta mostra o erro e recupera com Tentar novamente', async () => {
      getAdminEventCategoryPalette.mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
      const user = userEvent.setup()
      show()

      expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')

      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(getAdminEventCategoryPalette).toHaveBeenCalledTimes(2)
    })

    it('mostra o erro da API e recupera com Tentar novamente', async () => {
      getAdminEventCategories.mockRejectedValueOnce(apiError(500, 'Erro interno do servidor.'))
      const user = userEvent.setup()
      show()

      expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')

      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(getAdminEventCategories).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('uma resposta com formato inesperado mostra a frase própria', async () => {
      getAdminEventCategories.mockRejectedValueOnce(new Error('A resposta dos tipos de evento tem um formato inesperado.'))
      show()

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os tipos de evento. Tente novamente.')
    })

    it('um pedido cancelado não mostra erro', async () => {
      getAdminEventCategories.mockRejectedValueOnce(new CanceledError())
      show()

      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Criar tipo', () => {
    it('abre com o foco no nome, a primeira cor livre selecionada e a pré-visualização', async () => {
      const user = userEvent.setup()
      show()

      const created = await openCreate(user)

      expect(within(created).getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
      expect(nameField()).toHaveFocus()
      expect(nameField()).toHaveAttribute('placeholder', 'Ex.: Retiro anual')
      expect(nameField()).toHaveAttribute('maxlength', '30')
      expect(within(created).getByText('0/30')).toBeInTheDocument()
      expect(within(created).getAllByRole('radio')).toHaveLength(20)
      expect(swatch('Azul-marinho')).toBeChecked()
      expect(within(created).getByText('Azul-marinho')).toBeInTheDocument()
      expect(within(created).getByText('Nome do tipo')).toBeInTheDocument()
      expect(within(created).getByText('#0D1F35')).toBeInTheDocument()
      expect(within(created).getByText('As cores já usadas por outros tipos estão assinaladas com uma cruz.')).toBeVisible()
      expect(within(created).queryByRole('slider')).not.toBeInTheDocument()
      expect(within(created).queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(within(created).getAllByRole('textbox')).toHaveLength(1)
      expect(submitButton()).toBeDisabled()

      await user.type(nameField(), 'Retiro Anual')

      expect(within(created).getByText('12/30')).toBeInTheDocument()
      expect(within(created).getByText('Retiro Anual')).toBeInTheDocument()
      expect(within(created).queryByText('Nome do tipo')).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
    })

    it('cria com o nome sem espaços nas pontas e a cor escolhida, bloqueia o diálogo durante o pedido e recarrega', async () => {
      const pending = deferred()
      createEventCategory.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), '  Retiro Anual  ')
      await user.click(swatch('Violeta'))

      expect(swatch('Violeta')).toBeChecked()
      expect(swatch('Azul-marinho')).not.toBeChecked()
      expect(previewStrip('Retiro Anual')).toHaveStyle({ backgroundColor: '#6548B8' })

      await user.click(submitButton())

      expect(inDialog().getByRole('button', { name: 'A criar...' })).toBeInTheDocument()
      expect(inDialog().getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      expect(inDialog().getByRole('button', { name: 'Fechar' })).toBeDisabled()
      expect(swatch('Violeta')).toBeDisabled()
      expect(createEventCategory).toHaveBeenCalledTimes(1)
      expect(createEventCategory).toHaveBeenCalledWith({ name: 'Retiro Anual', color: '#6548B8' })

      await act(async () => {
        pending.resolve({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#6548B8', events_count: 0 } })
      })

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner(CREATED)).toBeDefined())
      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(newButton()).toHaveFocus())
    })

    it('valida o nome no browser com as frases do backend depois de sair do campo', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'jantar')
      await user.tab()

      expect(inDialog().getByText(NAME_TAKEN)).toBeInTheDocument()
      expect(nameField()).toHaveAttribute('aria-invalid', 'true')
      expect(nameField()).toHaveAccessibleDescription(expect.stringContaining(NAME_TAKEN))
      expect(submitButton()).toBeDisabled()

      await user.clear(nameField())

      expect(inDialog().getByText('O campo nome é obrigatório.')).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()

      await user.type(nameField(), 'Retiro Anual')

      expect(inDialog().queryByText(NAME_TAKEN)).not.toBeInTheDocument()
      expect(inDialog().queryByText('O campo nome é obrigatório.')).not.toBeInTheDocument()
      expect(nameField()).not.toHaveAttribute('aria-invalid', 'true')
      expect(submitButton()).toBeEnabled()
      expect(createEventCategory).not.toHaveBeenCalled()
    })

    it('um 422 na cor mostra errors.color junto à grelha, foca a cor selecionada e desaparece ao escolher outra', async () => {
      const message = 'Todas as cores disponíveis já estão em uso. Apague um tipo de evento sem eventos para libertar uma cor.'
      createEventCategory.mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', { color: [message, 'Segunda mensagem.'] }))
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      expect(await inDialog().findByText(message)).toBeInTheDocument()
      expect(inDialog().queryByText('Segunda mensagem.')).not.toBeInTheDocument()
      expect(swatch('Azul-marinho')).toHaveFocus()
      expect(swatch('Azul-marinho')).toHaveAccessibleDescription(message)

      await user.click(swatch('Bronze'))

      expect(inDialog().queryByText(message)).not.toBeInTheDocument()
    })

    it('um 422 mostra o erro por baixo do campo e põe lá o foco, com o diálogo aberto', async () => {
      createEventCategory.mockRejectedValueOnce(apiError(422, 'Os dados enviados são inválidos.', { name: [NAME_TAKEN] }))
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      expect(await inDialog().findByText(NAME_TAKEN)).toBeInTheDocument()
      expect(nameField()).toHaveFocus()
      expect(nameField()).toHaveAttribute('aria-invalid', 'true')
      expect(dialog()).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Fechar mensagem' })).not.toBeInTheDocument()
    })

    it.each([
      [500, 'Erro interno do servidor.'],
      [429, 'Demasiados pedidos. Tente novamente mais tarde.'],
    ])('um erro %s aparece dentro do diálogo, mantém os valores e deixa submeter de novo', async (status, message) => {
      createEventCategory
        .mockRejectedValueOnce(apiError(status, message))
        .mockResolvedValueOnce({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#0D1F35', events_count: 0 } })
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      expect(await inDialog().findByRole('alert')).toHaveTextContent(message)
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(nameField()).toHaveValue('Retiro Anual')
      expect(swatch('Azul-marinho')).toBeChecked()

      await user.click(submitButton())

      expect(createEventCategory).toHaveBeenCalledTimes(2)
    })

    it('um pedido cancelado não mostra nada', async () => {
      createEventCategory.mockRejectedValueOnce(new CanceledError())
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      await waitFor(() => expect(createEventCategory).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Fechar mensagem' })).not.toBeInTheDocument()
    })

    it('Escape, Cancelar e Fechar fecham sem pedido e devolvem o foco ao botão que abriu', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(newButton()).toHaveFocus()

      await user.click(newButton())
      await user.click(inDialog().getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(newButton()).toHaveFocus()

      await user.click(newButton())
      await user.click(inDialog().getByRole('button', { name: 'Fechar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(newButton()).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Editar Retiro' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Editar Retiro' })).toHaveFocus()

      expect(createEventCategory).not.toHaveBeenCalled()
      expect(updateEventCategory).not.toHaveBeenCalled()
    })

    it('o clique no fundo não fecha e o Tab fica preso no diálogo', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.click(dialog().parentElement)
      expect(dialog()).toBeInTheDocument()

      await user.type(nameField(), 'Retiro Anual')
      act(() => { submitButton().focus() })

      await user.tab()
      expect(inDialog().getByRole('button', { name: 'Fechar' })).toHaveFocus()

      await user.tab({ shift: true })
      expect(submitButton()).toHaveFocus()
    })

    it('durante o pedido o Escape não fecha e dois cliques rápidos fazem um só pedido', async () => {
      const pending = deferred()
      createEventCategory.mockImplementation(() => pending.promise)
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      const submit = submitButton()
      fireEvent.click(submit)
      fireEvent.click(submit)

      expect(createEventCategory).toHaveBeenCalledTimes(1)
      fireEvent.keyDown(dialog(), { key: 'Escape' })
      expect(dialog()).toBeInTheDocument()

      await act(async () => {
        pending.resolve({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#0D1F35', events_count: 0 } })
      })
    })
  })

  describe('Editar tipo', () => {
    it('abre com a cor do próprio tipo disponível e só guarda com uma alteração real', async () => {
      updateEventCategory.mockResolvedValueOnce({ success: true, message: UPDATED, data: { id: 'c2', name: 'Formações', color: '#1E449A', events_count: 7 } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Editar Formação' }))

      const edited = screen.getByRole('dialog', { name: 'Editar tipo de evento' })
      expect(nameField()).toHaveValue('Formação')
      expect(swatch('Azul-cobalto')).toBeChecked()
      expect(swatch('Azul-cobalto')).toBeEnabled()
      for (const label of ['Verde-esmeralda, já usada por «Almoço»', 'Ouro-velho, já usada por «Jantar»', 'Turquesa-escuro, já usada por «Workshop»', 'Púrpura, já usada por «Retiro»']) {
        expect(swatch(label)).toBeDisabled()
      }
      expect(submitButton('Guardar alterações')).toBeDisabled()
      expect(within(edited).getByText('Ainda não fez nenhuma alteração.')).toBeInTheDocument()

      await user.clear(nameField())
      await user.type(nameField(), 'Formações')
      expect(submitButton('Guardar alterações')).toBeEnabled()

      await user.click(submitButton('Guardar alterações'))

      expect(updateEventCategory).toHaveBeenCalledTimes(1)
      expect(updateEventCategory).toHaveBeenCalledWith('c2', { name: 'Formações', color: '#1E449A' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner(UPDATED)).toBeDefined())
      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Editar Formação' })).toHaveFocus())
    })

    it('escolher outra cor livre conta como alteração', async () => {
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Editar Formação' }))
      await user.click(swatch('Bronze'))

      expect(submitButton('Guardar alterações')).toBeEnabled()

      await user.click(swatch('Azul-cobalto'))

      expect(submitButton('Guardar alterações')).toBeDisabled()
    })

    it('uma cor fora da paleta mostra o erro e obriga a escolher uma da paleta', async () => {
      getAdminEventCategories.mockResolvedValue([...categories, { id: 'c6', name: 'Antigo', color: '#AD1457', events_count: 0 }])
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Editar Antigo' }))

      expect(inDialog().getByText(NOT_IN_PALETTE)).toBeInTheDocument()
      expect(inDialog().queryByRole('radio', { checked: true })).not.toBeInTheDocument()
      await user.clear(nameField())
      await user.type(nameField(), 'Novo nome')
      expect(submitButton('Guardar alterações')).toBeDisabled()

      await user.click(swatch('Bronze'))

      expect(inDialog().queryByText(NOT_IN_PALETTE)).not.toBeInTheDocument()
      expect(submitButton('Guardar alterações')).toBeEnabled()
    })

    it('se o tipo já não existir fecha o diálogo, avisa e recarrega', async () => {
      updateEventCategory.mockRejectedValueOnce(apiError(404, 'Recurso não encontrado.'))
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Editar Retiro' }))
      await user.type(nameField(), ' Anual')
      await user.click(submitButton('Guardar alterações'))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(errorBanner(NOT_FOUND)).toBeDefined())
      expect(screen.queryByText('Recurso não encontrado.')).not.toBeInTheDocument()
      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
    })
  })

  describe('Apagar tipo', () => {
    it('confirma antes de apagar, Cancelar não faz pedido e Apagar apaga e recarrega', async () => {
      deleteEventCategory.mockResolvedValueOnce({ success: true, message: DELETED, data: null })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Apagar Retiro' }))

      const confirm = screen.getByRole('dialog', { name: 'Apagar tipo de evento?' })
      expect(confirm).toHaveAccessibleDescription('O tipo «Retiro» vai ser apagado. Esta ação não pode ser desfeita.')

      await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteEventCategory).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Apagar Retiro' })).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Apagar Retiro' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Apagar tipo de evento?' })).getByRole('button', { name: 'Apagar' }))

      expect(deleteEventCategory).toHaveBeenCalledTimes(1)
      expect(deleteEventCategory).toHaveBeenCalledWith('c5')
      await waitFor(() => expect(successBanner(DELETED)).toBeDefined())
      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
    })

    it.each([
      ['409', apiError(409, 'Não é possível eliminar uma categoria com eventos associados.'), 'Não é possível eliminar uma categoria com eventos associados.', true],
      ['404', apiError(404, 'Recurso não encontrado.'), NOT_FOUND, true],
      ['500', apiError(500, 'Erro interno do servidor.'), 'Erro interno do servidor.', false],
    ])('um erro %s fecha a confirmação e mostra a mensagem certa', async (_, error, message, reloads) => {
      deleteEventCategory.mockRejectedValueOnce(error)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Apagar Retiro' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Apagar tipo de evento?' })).getByRole('button', { name: 'Apagar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(errorBanner(message)).toBeDefined())
      if (reloads) {
        await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
      } else {
        await act(async () => {})
        expect(getAdminEventCategories).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Estado ocupado', () => {
    it('enquanto a lista recarrega a tabela fica ocupada e as ações e o Novo tipo ficam desativados', async () => {
      createEventCategory.mockResolvedValueOnce({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#B65220', events_count: 0 } })
      const user = userEvent.setup()
      show()

      await openCreate(user)
      const reload = deferred()
      getAdminEventCategories.mockImplementationOnce(() => reload.promise)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      await waitFor(() => expect(table().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true'))
      for (const button of screen.getAllByRole('button', { name: /^(Editar|Apagar) / })) {
        expect(button).toBeDisabled()
      }
      expect(newButton()).toBeDisabled()

      await act(async () => { reload.resolve(categories) })

      await waitFor(() => expect(newButton()).toBeEnabled())
    })

    it('enquanto um apagar está pendente as ações e o Novo tipo ficam desativados', async () => {
      const pending = deferred()
      deleteEventCategory.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Apagar Retiro' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Apagar tipo de evento?' })).getByRole('button', { name: 'Apagar' }))

      for (const button of screen.getAllByRole('button', { name: /^(Editar|Apagar) / })) {
        expect(button).toBeDisabled()
      }
      expect(newButton()).toBeDisabled()

      await act(async () => { pending.resolve({ success: true, message: DELETED, data: null }) })
    })
  })

  describe('Seletor de cor', () => {
    it('as cores dos outros tipos ficam desativadas, com o nome do tipo que as usa, e não podem ser escolhidas', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)

      for (const label of ['Azul-cobalto, já usada por «Formação»', 'Verde-esmeralda, já usada por «Almoço»', 'Ouro-velho, já usada por «Jantar»', 'Turquesa-escuro, já usada por «Workshop»', 'Púrpura, já usada por «Retiro»']) {
        expect(swatch(label)).toBeDisabled()
      }

      await user.click(swatch('Azul-cobalto, já usada por «Formação»'))

      expect(swatch('Azul-marinho')).toBeChecked()
      expect(swatch('Azul-cobalto, já usada por «Formação»')).not.toBeChecked()
    })

    it('a primeira cor livre salta as já usadas', async () => {
      getAdminEventCategories.mockResolvedValue([...categories, { id: 'c6', name: 'Convívio', color: '#0D1F35', events_count: 0 }])
      const user = userEvent.setup()
      show()

      await openCreate(user)

      expect(swatch('Azul-aço')).toBeChecked()
    })

    it('uma cor inválida da lista não desativa amostras nem chega ao HTML do diálogo', async () => {
      getAdminEventCategories.mockResolvedValue([...categories, { id: 'c6', name: 'Perigo', color: 'url(javascript:alert(1))', events_count: 0 }])
      const user = userEvent.setup()
      show()

      const created = await openCreate(user)

      expect(within(created).getAllByRole('radio').filter((radio) => radio.disabled)).toHaveLength(5)
      expect(created.innerHTML).not.toContain('javascript')
    })

    it('com as 20 cores usadas o Novo tipo fica desativado e aparece o aviso', async () => {
      getAdminEventCategories.mockResolvedValue(palette.map(({ color }, index) => ({ id: `x${index}`, name: `Tipo ${index}`, color, events_count: 0 })))
      show()
      await screen.findByRole('table')

      expect(newButton()).toBeDisabled()
      expect(screen.getByText(EXHAUSTED)).toBeInTheDocument()
      expect(newButton()).toHaveAccessibleDescription(EXHAUSTED)
    })

    it('com 19 cores usadas o Novo tipo continua ativo, sem aviso', async () => {
      getAdminEventCategories.mockResolvedValue(palette.slice(1).map(({ color }, index) => ({ id: `x${index}`, name: `Tipo ${index}`, color, events_count: 0 })))
      show()
      await screen.findByRole('table')

      expect(newButton()).toBeEnabled()
      expect(screen.queryByText(EXHAUSTED)).not.toBeInTheDocument()
    })
  })
})
