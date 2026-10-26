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
  updateEventCategory,
} from '../../../src/services/adminEventCategories'

vi.mock('../../../src/services/adminEventCategories', () => ({
  getAdminEventCategories: vi.fn(),
  createEventCategory: vi.fn(),
  updateEventCategory: vi.fn(),
  deleteEventCategory: vi.fn(),
}))

const categories = [
  { id: 'c1', name: 'Almoço', color: '#2E7D32', events_count: 1 },
  { id: 'c2', name: 'Formação', color: '#1565C0', events_count: 7 },
  { id: 'c3', name: 'Jantar', color: '#8A7043', events_count: 6 },
  { id: 'c4', name: 'Workshop', color: '#C62828', events_count: 0 },
  { id: 'c5', name: 'Retiro', color: '#00838F', events_count: 0 },
]

const NOT_FOUND = 'Este tipo de evento já não existe. A lista foi atualizada.'
const RGB_ERROR = 'Os valores RGB têm de ser números inteiros entre 0 e 255.'
const COLOR_TAKEN = 'Já existe uma categoria com esta cor.'
const NAME_TAKEN = 'Já existe uma categoria com este nome.'
const FORMAT_ERROR = 'A cor tem de estar no formato #RRGGBB (ex.: #8A7043).'
const CREATED = 'Categoria criada com sucesso.'
const UPDATED = 'Categoria atualizada com sucesso.'
const DELETED = 'Categoria eliminada com sucesso.'
const WHEEL_RECT = { left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0 }

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

function hexField() {
  return inDialog().getByRole('textbox', { name: /^Hexadecimal/ })
}

function channel(label) {
  return inDialog().getByRole('spinbutton', { name: label })
}

function wheel() {
  return inDialog().getByRole('slider', { name: 'Roda de cores' })
}

function lightness() {
  return inDialog().getByRole('slider', { name: 'Luminosidade' })
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

async function typeHex(user, value) {
  await user.clear(hexField())
  await user.type(hexField(), value)
}

async function focusWheel(user) {
  for (let index = 0; index < 12 && document.activeElement !== wheel(); index += 1) {
    await user.tab()
  }
  expect(wheel()).toHaveFocus()
}

describe('Tipos de evento', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getAdminEventCategories.mockResolvedValue(categories)
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
      expect(rowOf('Jantar')).toHaveTextContent('#8A7043')
      expect(dinner.getByText('6 eventos')).toBeInTheDocument()
      expect(dinner.getByText('Jantar')).toHaveStyle({ backgroundColor: '#F1EEE8', color: '#3E321E' })
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
    it('abre com o foco no nome, a cor inicial do design sincronizada em todos os campos e a pré-visualização', async () => {
      const user = userEvent.setup()
      show()

      const created = await openCreate(user)

      expect(within(created).getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
      expect(nameField()).toHaveFocus()
      expect(nameField()).toHaveAttribute('placeholder', 'Ex.: Retiro anual')
      expect(nameField()).toHaveAttribute('maxlength', '30')
      expect(within(created).getByText('0/30')).toBeInTheDocument()
      expect(hexField()).toHaveValue('#B65220')
      expect(channel('Vermelho (R)')).toHaveValue(182)
      expect(channel('Verde (G)')).toHaveValue(82)
      expect(channel('Azul (B)')).toHaveValue(32)
      expect(wheel()).toHaveAttribute('aria-valuenow', '20')
      expect(wheel()).toHaveAttribute('aria-valuetext', 'Matiz 20°, saturação 82% (#B65220)')
      expect(lightness()).toHaveValue('71')
      expect(within(created).getByText('Nome do tipo')).toBeInTheDocument()
      expect(within(created).getByText('#B65220')).toBeInTheDocument()
      expect(within(created).getByText('As cores já usadas estão assinaladas na roda com uma cruz.')).toBeVisible()
      expect(submitButton()).toBeDisabled()

      await user.type(nameField(), 'Retiro Anual')

      expect(within(created).getByText('12/30')).toBeInTheDocument()
      expect(within(created).getByText('Retiro Anual')).toBeInTheDocument()
      expect(within(created).queryByText('Nome do tipo')).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
    })

    it('cria com o nome sem espaços nas pontas e a cor escrita, bloqueia o diálogo durante o pedido e recarrega', async () => {
      const pending = deferred()
      createEventCategory.mockImplementationOnce(() => pending.promise)
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), '  Retiro Anual  ')
      await typeHex(user, '#AD1457')
      await user.click(submitButton())

      expect(inDialog().getByRole('button', { name: 'A criar...' })).toBeInTheDocument()
      expect(inDialog().getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      expect(inDialog().getByRole('button', { name: 'Fechar' })).toBeDisabled()
      expect(createEventCategory).toHaveBeenCalledTimes(1)
      expect(createEventCategory).toHaveBeenCalledWith({ name: 'Retiro Anual', color: '#AD1457' })

      await act(async () => {
        pending.resolve({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#AD1457', events_count: 0 } })
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

    it('valida o hexadecimal: cor repetida sem distinguir maiúsculas, formato e obrigatório, sem mexer na pré-visualização', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')

      await typeHex(user, '#c62828')
      expect(inDialog().getByText(COLOR_TAKEN)).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()

      await typeHex(user, '#12')
      expect(inDialog().getByText(FORMAT_ERROR)).toBeInTheDocument()
      expect(hexField()).toHaveAttribute('aria-invalid', 'true')
      expect(hexField()).toHaveAccessibleDescription(expect.stringContaining(FORMAT_ERROR))
      expect(inDialog().getByText('#C62828')).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()

      await user.clear(hexField())
      expect(inDialog().getByText('O campo cor é obrigatório.')).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()

      await user.type(hexField(), '#AD1457')
      expect(inDialog().queryByText(FORMAT_ERROR)).not.toBeInTheDocument()
      expect(inDialog().queryByText('O campo cor é obrigatório.')).not.toBeInTheDocument()
      expect(inDialog().queryByText(COLOR_TAKEN)).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
      expect(createEventCategory).not.toHaveBeenCalled()
    })

    it('valores RGB inválidos mostram o erro e não mudam o hexadecimal', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')

      for (const value of ['300', '-1', '1.5', '']) {
        fireEvent.change(channel('Vermelho (R)'), { target: { value } })

        expect(inDialog().getByText(RGB_ERROR)).toBeInTheDocument()
        expect(hexField()).toHaveValue('#B65220')
        expect(submitButton()).toBeDisabled()
      }

      fireEvent.change(channel('Vermelho (R)'), { target: { value: '182' } })

      expect(inDialog().queryByText(RGB_ERROR)).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
      expect(createEventCategory).not.toHaveBeenCalled()
    })

    it('o hexadecimal sem # atualiza o RGB e a pré-visualização e é enviado normalizado', async () => {
      createEventCategory.mockResolvedValueOnce({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#ABCDEF', events_count: 0 } })
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await typeHex(user, 'abcdef')

      expect(channel('Vermelho (R)')).toHaveValue(171)
      expect(channel('Verde (G)')).toHaveValue(205)
      expect(channel('Azul (B)')).toHaveValue(239)
      expect(inDialog().getByText('#ABCDEF')).toBeInTheDocument()

      await user.click(submitButton())

      expect(createEventCategory).toHaveBeenCalledWith({ name: 'Retiro Anual', color: '#ABCDEF' })
    })

    it('o RGB atualiza o hexadecimal, um cinzento mantém a matiz da roda e a faixa mostra a cor atual', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      fireEvent.change(channel('Vermelho (R)'), { target: { value: '18' } })
      fireEvent.change(channel('Verde (G)'), { target: { value: '52' } })
      fireEvent.change(channel('Azul (B)'), { target: { value: '86' } })

      expect(hexField()).toHaveValue('#123456')
      expect(wheel()).toHaveAttribute('aria-valuenow', '210')

      await typeHex(user, '#808080')

      expect(wheel()).toHaveAttribute('aria-valuenow', '210')
      expect(wheel().getAttribute('aria-valuetext')).toContain('saturação 0%')
      expect(previewStrip('Nome do tipo')).toHaveStyle({ backgroundColor: '#808080' })
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
        .mockResolvedValueOnce({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#B65220', events_count: 0 } })
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await user.click(submitButton())

      expect(await inDialog().findByRole('alert')).toHaveTextContent(message)
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(nameField()).toHaveValue('Retiro Anual')
      expect(hexField()).toHaveValue('#B65220')

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
        pending.resolve({ success: true, message: CREATED, data: { id: 'n1', name: 'Retiro Anual', color: '#B65220', events_count: 0 } })
      })
    })
  })

  describe('Editar tipo', () => {
    it('abre com os valores do tipo, sem a marca da própria cor, e só guarda com uma alteração real', async () => {
      updateEventCategory.mockResolvedValueOnce({ success: true, message: UPDATED, data: { id: 'c2', name: 'Formações', color: '#1565C0', events_count: 7 } })
      const user = userEvent.setup()
      show()
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Editar Formação' }))

      const edited = screen.getByRole('dialog', { name: 'Editar tipo de evento' })
      expect(nameField()).toHaveValue('Formação')
      expect(hexField()).toHaveValue('#1565C0')
      expect(channel('Vermelho (R)')).toHaveValue(21)
      expect(channel('Verde (G)')).toHaveValue(101)
      expect(channel('Azul (B)')).toHaveValue(192)
      for (const label of ['#2E7D32, já usada por «Almoço»', '#8A7043, já usada por «Jantar»', '#C62828, já usada por «Workshop»', '#00838F, já usada por «Retiro»']) {
        expect(within(edited).getByRole('img', { name: label })).toBeInTheDocument()
      }
      expect(within(edited).queryByRole('img', { name: '#1565C0, já usada por «Formação»' })).not.toBeInTheDocument()
      expect(submitButton('Guardar alterações')).toBeDisabled()
      expect(within(edited).getByText('Ainda não fez nenhuma alteração.')).toBeInTheDocument()

      await typeHex(user, '#1565c0')
      expect(submitButton('Guardar alterações')).toBeDisabled()

      await user.clear(nameField())
      await user.type(nameField(), 'Formações')
      expect(submitButton('Guardar alterações')).toBeEnabled()

      await user.click(submitButton('Guardar alterações'))

      expect(updateEventCategory).toHaveBeenCalledTimes(1)
      expect(updateEventCategory).toHaveBeenCalledWith('c2', { name: 'Formações', color: '#1565C0' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(successBanner(UPDATED)).toBeDefined())
      await waitFor(() => expect(getAdminEventCategories).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Editar Formação' })).toHaveFocus())
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
    async function openWithWheelRect(user) {
      await openCreate(user)
      vi.spyOn(wheel(), 'getBoundingClientRect').mockReturnValue(WHEEL_RECT)
    }

    async function reopen(user) {
      await user.click(inDialog().getByRole('button', { name: 'Cancelar' }))
      await user.click(newButton())
      vi.spyOn(wheel(), 'getBoundingClientRect').mockReturnValue(WHEEL_RECT)
    }

    it('clicar e arrastar na roda muda a matiz e a saturação; depois de largar já não muda', async () => {
      const user = userEvent.setup()
      show()

      await openWithWheelRect(user)
      fireEvent.pointerDown(wheel(), { clientX: 100, clientY: 0, pointerId: 1 })

      expect(hexField()).toHaveValue('#B60000')
      expect(channel('Vermelho (R)')).toHaveValue(182)
      expect(channel('Verde (G)')).toHaveValue(0)
      expect(channel('Azul (B)')).toHaveValue(0)
      expect(inDialog().getByText('#B60000')).toBeInTheDocument()

      fireEvent.pointerMove(wheel(), { clientX: 200, clientY: 100, pointerId: 1 })
      expect(hexField()).toHaveValue('#5BB600')

      fireEvent.pointerUp(wheel(), { clientX: 200, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(wheel(), { clientX: 100, clientY: 200, pointerId: 1 })
      expect(hexField()).toHaveValue('#5BB600')

      fireEvent.pointerDown(wheel(), { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(wheel(), { clientX: 100, clientY: 100, pointerId: 1 })
      expect(hexField()).toHaveValue('#B6B6B6')
      expect(wheel()).toHaveAttribute('aria-valuenow', '90')
    })

    it('com o teclado as setas mudam a matiz e a saturação, com passos de 10 com Shift', async () => {
      const user = userEvent.setup()
      show()

      await openWithWheelRect(user)
      await focusWheel(user)
      await user.keyboard('{ArrowRight}')
      expect(wheel()).toHaveAttribute('aria-valuenow', '21')
      expect(hexField()).toHaveValue('#B65520')

      await reopen(user)
      await focusWheel(user)
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
      expect(wheel()).toHaveAttribute('aria-valuenow', '30')
      expect(hexField()).toHaveValue('#B66B20')

      await reopen(user)
      fireEvent.pointerDown(wheel(), { clientX: 100, clientY: 0, pointerId: 1 })
      fireEvent.pointerUp(wheel(), { clientX: 100, clientY: 0, pointerId: 1 })
      expect(wheel()).toHaveAttribute('aria-valuenow', '0')
      await focusWheel(user)
      await user.keyboard('{ArrowLeft}')
      expect(wheel()).toHaveAttribute('aria-valuenow', '359')

      await reopen(user)
      await focusWheel(user)
      await user.keyboard('{ArrowUp}')
      expect(hexField()).toHaveValue('#B6511E')

      await reopen(user)
      await focusWheel(user)
      await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
      expect(hexField()).toHaveValue('#B65E32')
    })

    it('as setas na roda não fazem scroll da página', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)

      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
        expect(fireEvent.keyDown(wheel(), { key })).toBe(false)
      }
    })

    it('a Luminosidade muda o valor da cor sem mudar a matiz e o hexadecimal atualiza a barra', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      fireEvent.change(lightness(), { target: { value: '100' } })

      expect(hexField()).toHaveValue('#FF732D')
      expect(lightness()).toHaveAttribute('aria-valuetext', 'Luminosidade 100%')

      fireEvent.change(lightness(), { target: { value: '50' } })

      expect(hexField()).toHaveValue('#803916')
      expect(wheel()).toHaveAttribute('aria-valuenow', '20')
      expect(lightness().style.backgroundImage).toMatch(/^linear-gradient\(.*rgb\(255, 115, 45\)\)$/)

      await typeHex(user, '#808080')

      expect(lightness()).toHaveValue('50')
    })

    it('as cores dos outros tipos aparecem marcadas na roda, fora do slider, na posição e cor de cada uma', async () => {
      const user = userEvent.setup()
      show()

      const created = await openCreate(user)

      const marks = within(created).getAllByRole('img', { name: /já usada por/ })
      expect(marks).toHaveLength(5)
      for (const label of ['#2E7D32, já usada por «Almoço»', '#1565C0, já usada por «Formação»', '#8A7043, já usada por «Jantar»', '#C62828, já usada por «Workshop»', '#00838F, já usada por «Retiro»']) {
        expect(within(created).getByRole('img', { name: label })).toBeInTheDocument()
      }
      expect(within(created).getByRole('img', { name: '#C62828, já usada por «Workshop»' })).toHaveStyle({ left: '50%', top: '10.1%', backgroundColor: '#C62828' })
      for (const mark of marks) {
        expect(wheel().contains(mark)).toBe(false)
      }
    })

    it('uma cor inválida da lista não gera marca nem chega ao HTML do diálogo', async () => {
      getAdminEventCategories.mockResolvedValue([...categories, { id: 'c6', name: 'Perigo', color: 'url(javascript:alert(1))', events_count: 0 }])
      const user = userEvent.setup()
      show()

      const created = await openCreate(user)

      expect(within(created).getAllByRole('img', { name: /já usada por/ })).toHaveLength(5)
      expect(within(created).queryByRole('img', { name: /«Perigo»/ })).not.toBeInTheDocument()
      expect(created.innerHTML).not.toContain('javascript')
    })

    it('escolher exatamente a cor de outro tipo mostra o erro e desativa Criar tipo', async () => {
      const user = userEvent.setup()
      show()

      await openCreate(user)
      await user.type(nameField(), 'Retiro Anual')
      await typeHex(user, '#C62828')

      expect(inDialog().getByText(COLOR_TAKEN)).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()
      expect(createEventCategory).not.toHaveBeenCalled()
    })
  })
})
