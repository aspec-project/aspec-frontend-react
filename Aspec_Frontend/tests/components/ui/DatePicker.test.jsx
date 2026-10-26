import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DatePicker from '../../../src/components/ui/DatePicker'

function show(props = {}) {
  const onChange = vi.fn()
  const view = render(<DatePicker id="filtro-data-de" label="Data de" value="" placeholder="Qualquer data" onChange={onChange} {...props} />)

  return { ...view, onChange }
}

function opener() {
  return screen.getByRole('button', { name: /^Data de / })
}

function picker() {
  return screen.getByRole('dialog', { name: 'Escolher data de' })
}

function day(label) {
  return within(picker()).getByRole('button', { name: label })
}

async function open(user) {
  await user.click(opener())

  return picker()
}

describe('DatePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('o botão diz o rótulo e o valor, ou Qualquer data sem valor', () => {
    const { unmount } = show()

    const empty = screen.getByRole('button', { name: 'Data de Qualquer data' })
    expect(empty).toHaveAttribute('aria-haspopup', 'dialog')
    expect(empty).toHaveAttribute('aria-expanded', 'false')
    expect(empty).toHaveTextContent('Qualquer data')
    unmount()

    show({ value: '2026-11-20', invalid: true, describedBy: 'x' })

    const filled = screen.getByRole('button', { name: 'Data de 20 Nov 2026' })
    expect(filled).toHaveAttribute('aria-invalid', 'true')
    expect(filled).toHaveAttribute('aria-describedby', 'x')
  })

  it('abre no mês de hoje com o dia de hoje marcado e focado, a semana de segunda a domingo e o rodapé', async () => {
    const user = userEvent.setup()
    show()

    const dialog = await open(user)

    expect(opener()).toHaveAttribute('aria-expanded', 'true')
    expect(within(dialog).getByText('Novembro 2026')).toBeInTheDocument()
    const grid = within(dialog).getByRole('grid')
    expect(within(grid).getAllByRole('columnheader').map((header) => header.textContent.trim())).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'])
    expect(day('15 de novembro de 2026')).toHaveAttribute('aria-current', 'date')
    expect(day('15 de novembro de 2026')).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Hoje' })).toBeEnabled()
    expect(within(dialog).getByText('Use as setas do teclado')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Limpar data' })).not.toBeInTheDocument()
    expect(within(grid).getAllByRole('button').filter((button) => button.tabIndex === 0)).toHaveLength(1)
  })

  it('com valor abre no mês do valor, com o dia escolhido focado e selecionado, e mostra Limpar data', async () => {
    const user = userEvent.setup()
    show({ value: '2026-12-20' })

    const dialog = await open(user)

    expect(within(dialog).getByText('Dezembro 2026')).toBeInTheDocument()
    expect(day('20 de dezembro de 2026')).toHaveFocus()
    expect(day('20 de dezembro de 2026').closest('td')).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByRole('button', { name: 'Limpar data' })).toBeInTheDocument()
    expect(within(within(dialog).getByRole('grid')).getAllByRole('button').filter((button) => button.tabIndex === 0)).toHaveLength(1)
  })

  it('com o teclado navega por dias, semanas e meses, Enter escolhe e Escape fecha sem mudar', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await open(user)

    await user.keyboard('{ArrowRight}')
    expect(day('16 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(day('23 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{End}')
    expect(day('29 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(day('23 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(day('23 de dezembro de 2026')).toHaveFocus()
    expect(within(picker()).getByText('Dezembro 2026')).toBeInTheDocument()
    await user.keyboard('{PageUp}')
    expect(day('23 de novembro de 2026')).toHaveFocus()
    expect(within(picker()).getByText('Novembro 2026')).toBeInTheDocument()

    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowLeft}')
    expect(day('1 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(day('31 de outubro de 2026')).toHaveFocus()
    expect(within(picker()).getByText('Outubro 2026')).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2026-10-31')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener()).toHaveFocus()

    await open(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener()).toHaveFocus()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('o Escape não chega aos elementos à volta', async () => {
    const outerKeyDown = vi.fn()
    const user = userEvent.setup()
    render(
      <div onKeyDown={(event) => outerKeyDown(event.key)}>
        <DatePicker id="filtro-data-de" label="Data de" value="" placeholder="Qualquer data" onChange={vi.fn()} />
      </div>,
    )

    await open(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outerKeyDown).not.toHaveBeenCalledWith('Escape')
  })

  it('com o rato muda de mês, escolhe um dia, escolhe hoje e clicar fora fecha sem mudar', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    const dialog = await open(user)
    await user.click(within(dialog).getByRole('button', { name: 'Mês seguinte' }))
    expect(within(picker()).getByText('Dezembro 2026')).toBeInTheDocument()
    await user.click(day('20 de dezembro de 2026'))
    expect(onChange).toHaveBeenLastCalledWith('2026-12-20')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await open(user)
    await user.click(within(picker()).getByRole('button', { name: 'Hoje' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-11-15')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await open(user)
    await user.click(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('Limpar data devolve uma data vazia', async () => {
    const user = userEvent.setup()
    const { onChange } = show({ value: '2026-11-20' })

    await open(user)
    await user.click(within(picker()).getByRole('button', { name: 'Limpar data' }))

    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('os dias antes do mínimo ficam desativados e não se escolhem com o rato nem com Enter', async () => {
    const user = userEvent.setup()
    const { onChange } = show({ min: '2026-11-10' })

    await open(user)
    expect(day('9 de novembro de 2026')).toHaveAttribute('aria-disabled', 'true')

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(day('9 de novembro de 2026')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChange).not.toHaveBeenCalled()

    await user.click(day('9 de novembro de 2026'))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(day('10 de novembro de 2026'))
    expect(onChange).toHaveBeenCalledWith('2026-11-10')
  })

  it('com hoje antes do mínimo abre no mês do mínimo e Hoje fica desativado; depois do máximo os dias ficam desativados', async () => {
    const user = userEvent.setup()
    const { unmount } = show({ min: '2026-12-01' })

    await open(user)
    expect(within(picker()).getByText('Dezembro 2026')).toBeInTheDocument()
    expect(within(picker()).getByRole('button', { name: 'Hoje' })).toBeDisabled()
    unmount()

    show({ max: '2026-11-12' })
    await open(user)
    expect(day('13 de novembro de 2026')).toHaveAttribute('aria-disabled', 'true')
    expect(day('12 de novembro de 2026')).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('o Tab fica preso no calendário, sem valor e com valor', async () => {
    const user = userEvent.setup()
    const { unmount } = show()

    await open(user)
    const sequence = ['Hoje', 'Mês anterior', 'Mês seguinte', '15 de novembro de 2026']
    for (const name of sequence) {
      await user.tab()
      expect(within(picker()).getByRole('button', { name })).toHaveFocus()
    }
    for (const name of ['Mês seguinte', 'Mês anterior', 'Hoje', '15 de novembro de 2026']) {
      await user.tab({ shift: true })
      expect(within(picker()).getByRole('button', { name })).toHaveFocus()
    }
    unmount()

    show({ value: '2026-11-20' })
    await open(user)
    for (const name of ['Hoje', 'Limpar data', 'Mês anterior', 'Mês seguinte', '20 de novembro de 2026']) {
      await user.tab()
      expect(within(picker()).getByRole('button', { name })).toHaveFocus()
      expect(picker()).toContainElement(document.activeElement)
    }
  })
})
