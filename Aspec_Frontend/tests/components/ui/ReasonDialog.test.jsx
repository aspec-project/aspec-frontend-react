import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TriangleAlert } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import ReasonDialog from '../../../src/components/ui/ReasonDialog'

const FIELD = 'Justificação (opcional)'

function dialog(props = {}) {
  return (
    <ReasonDialog
      open
      title="Recusar candidatura"
      description="Desc."
      note="Nota."
      confirmLabel="Recusar"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  )
}

function field() {
  return screen.getByRole('textbox', { name: FIELD })
}

function button(name) {
  return screen.getByRole('button', { name })
}

describe('ReasonDialog', () => {
  it('fechado não mostra nada', () => {
    render(dialog({ open: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra o título, a descrição e a nota, o campo opcional vazio, o contador e os botões', () => {
    render(dialog())

    const element = screen.getByRole('dialog', { name: 'Recusar candidatura' })
    expect(element).toHaveAttribute('aria-modal', 'true')
    expect(element).toHaveAccessibleDescription(/Desc\./)
    expect(element).toHaveAccessibleDescription(/Nota\./)
    expect(field()).toHaveAttribute('placeholder', 'Explique o motivo da decisão...')
    expect(field()).toHaveAttribute('maxlength', '2000')
    expect(field()).toHaveValue('')
    expect(screen.getByText('0/2000 caracteres')).toBeInTheDocument()

    for (const name of ['Fechar', 'Cancelar', 'Recusar']) {
      expect(button(name)).toBeEnabled()
    }
  })

  it('ao abrir põe o foco no campo da justificação', () => {
    render(dialog())

    expect(field()).toHaveFocus()
  })

  it('o contador acompanha o texto escrito e descreve o campo', async () => {
    const user = userEvent.setup()
    render(dialog())

    await user.type(field(), 'Motivo')

    expect(screen.getByText('6/2000 caracteres')).toBeInTheDocument()
    expect(field()).toHaveAccessibleDescription('6/2000 caracteres')
  })

  it('confirma uma vez com o texto tal como foi escrito', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(dialog({ onConfirm }))

    await user.type(field(), '  Falta de documentos  ')
    await user.click(button('Recusar'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('  Falta de documentos  ')
  })

  it('sem justificação o botão continua ativo e confirma com texto vazio', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(dialog({ onConfirm }))

    expect(button('Recusar')).toBeEnabled()
    await user.click(button('Recusar'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('')
  })

  it('Enter no campo faz uma nova linha e não confirma', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(dialog({ onConfirm }))

    await user.type(field(), 'Linha 1{Enter}Linha 2')

    expect(field()).toHaveValue('Linha 1\nLinha 2')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Cancelar, Fechar e Escape cancelam sem confirmar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(dialog({ onConfirm, onCancel }))

    await user.click(button('Cancelar'))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(button('Fechar'))
    expect(onCancel).toHaveBeenCalledTimes(2)

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('durante o pedido desativa o campo e os botões, mostra A processar... e ignora o Escape', () => {
    const onCancel = vi.fn()
    render(dialog({ onCancel, pending: true }))

    expect(field()).toBeDisabled()
    expect(button('Fechar')).toBeDisabled()
    expect(button('Cancelar')).toBeDisabled()
    expect(button('A processar...')).toBeDisabled()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('mantém o foco dentro do diálogo com Tab e Shift+Tab', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Antes</button>
        {dialog()}
        <button type="button">Depois</button>
      </>
    )

    expect(field()).toHaveFocus()

    await user.tab()
    expect(button('Cancelar')).toHaveFocus()

    await user.tab()
    expect(button('Recusar')).toHaveFocus()

    await user.tab()
    expect(button('Fechar')).toHaveFocus()

    await user.tab()
    expect(field()).toHaveFocus()

    act(() => button('Fechar').focus())
    await user.tab({ shift: true })
    expect(button('Recusar')).toHaveFocus()
  })

  it('devolve o foco ao elemento que o tinha antes de abrir', () => {
    const { rerender } = render(<><button type="button">Abrir</button>{dialog({ open: false })}</>)
    const opener = button('Abrir')
    act(() => opener.focus())

    rerender(<><button type="button">Abrir</button>{dialog()}</>)
    expect(field()).toHaveFocus()

    rerender(<><button type="button">Abrir</button>{dialog({ open: false })}</>)
    expect(opener).toHaveFocus()
  })

  it('limpa o texto escrito sempre que volta a abrir', async () => {
    const user = userEvent.setup()
    const { rerender } = render(dialog())

    await user.type(field(), 'abc')

    rerender(dialog({ open: false }))
    rerender(dialog())

    expect(field()).toHaveValue('')
    expect(screen.getByText('0/2000 caracteres')).toBeInTheDocument()
  })

  it('o limite de caracteres vem da prop maxLength', async () => {
    const user = userEvent.setup()
    render(dialog({ maxLength: 10 }))

    await user.click(field())
    await user.paste('a'.repeat(15))

    expect(field()).toHaveValue('a'.repeat(10))
    expect(screen.getByText('10/10 caracteres')).toBeInTheDocument()
  })

  describe('justificação obrigatória', () => {
    const HINT = 'A justificação é obrigatória para apagar o evento.'

    function requiredDialog(props = {}) {
      return dialog({
        title: 'Apagar evento?',
        note: undefined,
        required: true,
        label: 'Justificação',
        hint: HINT,
        confirmLabel: 'Apagar e notificar',
        cancelLabel: 'Voltar',
        ...props,
      })
    }

    function requiredField() {
      return screen.getByRole('textbox', { name: 'Justificação' })
    }

    it('marca o campo como obrigatório, mostra a ajuda e só ativa o botão com texto', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(requiredDialog({ onConfirm }))

      expect(requiredField()).toBeRequired()
      expect(requiredField()).toHaveAccessibleDescription(expect.stringContaining(HINT))
      expect(requiredField()).toHaveAccessibleDescription(expect.stringContaining('0/2000 caracteres'))
      expect(screen.getByText('*').closest('label')).not.toBeNull()
      expect(button('Apagar e notificar')).toBeDisabled()

      await user.type(requiredField(), '   ')
      expect(button('Apagar e notificar')).toBeDisabled()

      await user.clear(requiredField())
      await user.type(requiredField(), '  Motivo  ')
      expect(button('Apagar e notificar')).toBeEnabled()

      await user.click(button('Apagar e notificar'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith('  Motivo  ')
    })

    it('com o campo só com espaços o submit do formulário não confirma', () => {
      const onConfirm = vi.fn()
      render(requiredDialog({ onConfirm }))

      fireEvent.change(requiredField(), { target: { value: '   ' } })
      fireEvent.submit(requiredField().closest('form'))

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('sem required o submit do formulário com o campo vazio confirma com texto vazio', () => {
      const onConfirm = vi.fn()
      render(dialog({ onConfirm }))

      fireEvent.submit(field().closest('form'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith('')
    })

    it('mostra o ícone no título e o erro dentro do diálogo sem apagar o texto escrito', async () => {
      const user = userEvent.setup()
      const { rerender } = render(requiredDialog({ icon: TriangleAlert, tone: 'danger', error: 'Demasiados pedidos.' }))

      const heading = screen.getByRole('heading', { name: 'Apagar evento?' })
      expect(heading.querySelector('svg[aria-hidden="true"]')).not.toBeNull()

      const alert = screen.getByRole('alert')
      expect(screen.getByRole('dialog')).toContainElement(alert)
      expect(alert).toHaveTextContent('Demasiados pedidos.')
      expect(requiredField()).not.toHaveAccessibleDescription(expect.stringContaining('Demasiados pedidos.'))

      await user.type(requiredField(), 'abc')
      rerender(requiredDialog({ icon: TriangleAlert, tone: 'danger', error: 'Erro interno do servidor.' }))

      expect(requiredField()).toHaveValue('abc')
      expect(screen.getByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    })

    it('sem as props novas o campo não é obrigatório e não há alerta nem ícone no título', () => {
      render(dialog())

      expect(field()).not.toBeRequired()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Recusar candidatura' }).querySelector('svg')).toBeNull()
    })
  })

  describe('subtítulo, conteúdo e sem campo', () => {
    const SUBTITLE = 'Pequeno-Almoço de Negócios Lisboa'
    const NOTICE = 'Será enviado um email aos 22 inscritos a avisar que o evento foi alterado.'

    function confirmDialog(props = {}) {
      return dialog({
        title: 'Confirmar alterações?',
        subtitle: SUBTITLE,
        note: undefined,
        tone: 'primary',
        description: <>Será enviado um email aos <strong>22 inscritos</strong> a avisar que o evento foi alterado.</>,
        confirmLabel: 'Guardar e notificar',
        cancelLabel: 'Voltar',
        children: (
          <ul aria-label="Alterações">
            <li>Título: antigo → novo</li>
          </ul>
        ),
        ...props,
      })
    }

    function isBefore(first, second) {
      return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
    }

    it('mostra o subtítulo abaixo do título, o conteúdo antes da descrição e a descrição com negrito', () => {
      render(confirmDialog())

      const element = screen.getByRole('dialog', { name: 'Confirmar alterações?' })
      const heading = screen.getByRole('heading', { name: 'Confirmar alterações?' })
      const subtitle = screen.getByText(SUBTITLE)
      const list = screen.getByRole('list', { name: 'Alterações' })
      const strong = screen.getByText('22 inscritos')
      const description = strong.closest('p')

      expect(element).toContainElement(subtitle)
      expect(element).toContainElement(list)
      expect(strong.tagName).toBe('STRONG')
      expect(isBefore(heading, subtitle)).toBe(true)
      expect(isBefore(subtitle, list)).toBe(true)
      expect(isBefore(list, description)).toBe(true)
      expect(isBefore(description, field())).toBe(true)
      expect(element).toHaveAccessibleDescription(NOTICE)
    })

    it('sem campo não há caixa de texto nem contador, foca o botão de cancelar e confirma com texto vazio', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(confirmDialog({ withField: false, confirmLabel: 'Guardar', onConfirm }))

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByText(/caracteres/)).not.toBeInTheDocument()
      expect(screen.queryByText(FIELD)).not.toBeInTheDocument()
      expect(button('Voltar')).toHaveFocus()

      await user.click(button('Guardar'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith('')
    })

    it('sem campo o Tab fica preso entre os botões', async () => {
      const user = userEvent.setup()
      render(
        <>
          <button type="button">Antes</button>
          {confirmDialog({ withField: false, confirmLabel: 'Guardar' })}
          <button type="button">Depois</button>
        </>
      )

      expect(button('Voltar')).toHaveFocus()

      await user.tab()
      expect(button('Guardar')).toHaveFocus()

      await user.tab()
      expect(button('Fechar')).toHaveFocus()

      await user.tab()
      expect(button('Voltar')).toHaveFocus()

      act(() => button('Fechar').focus())
      await user.tab({ shift: true })
      expect(button('Guardar')).toHaveFocus()
    })
  })
})
