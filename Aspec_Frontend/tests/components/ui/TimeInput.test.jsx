import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import TimeInput from '../../../src/components/ui/TimeInput'

const LABEL = 'Hora de início'
const INCOMPLETE_ERROR = 'Preencha as horas e os minutos (ex.: 19:30).'

function Controlled({ initial = '', onChange, ...props }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <label htmlFor="hora-inicio">{LABEL}</label>
      <TimeInput
        id="hora-inicio"
        name="startTime"
        label={LABEL}
        value={value}
        onChange={(next) => {
          onChange(next)
          setValue(next)
        }}
        {...props}
      />
      <button type="button">Outro</button>
    </>
  )
}

function show(props = {}) {
  const onChange = vi.fn()
  const view = render(<Controlled onChange={onChange} {...props} />)

  return { ...view, onChange }
}

function hoursBox() {
  return screen.getByRole('spinbutton', { name: `${LABEL}, horas` })
}

function minutesBox() {
  return screen.getByRole('spinbutton', { name: `${LABEL}, minutos` })
}

function otherButton() {
  return screen.getByRole('button', { name: 'Outro' })
}

function describedIds(element) {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
}

describe('TimeInput', () => {
  it('tem duas caixas de horas e minutos com nome próprio, sem valor, e o separador e o ícone escondidos', () => {
    const { container } = show()

    expect(screen.getAllByRole('spinbutton')).toEqual([hoursBox(), minutesBox()])
    expect(screen.getByLabelText(LABEL)).toBe(hoursBox())
    expect(hoursBox()).toHaveAttribute('id', 'hora-inicio')
    expect(hoursBox()).toHaveAttribute('name', 'startTime')
    expect(minutesBox()).toHaveAttribute('id', 'hora-inicio-minutes')
    expect(minutesBox()).not.toHaveAttribute('name')

    for (const [box, max] of [[hoursBox(), '23'], [minutesBox(), '59']]) {
      expect(box).toHaveAttribute('inputmode', 'numeric')
      expect(box).toHaveAttribute('maxlength', '2')
      expect(box).toHaveAttribute('placeholder', '--')
      expect(box).toHaveAttribute('autocomplete', 'off')
      expect(box).toHaveValue('')
      expect(box).toHaveAttribute('aria-valuemin', '0')
      expect(box).toHaveAttribute('aria-valuemax', max)
      expect(box).not.toHaveAttribute('aria-valuenow')
      expect(box).toHaveAttribute('aria-valuetext', 'Sem valor')
    }

    const separator = Array.from(container.querySelectorAll('*')).find((element) => element.children.length === 0 && element.textContent.trim() === ':')
    expect(separator).toBeDefined()
    expect(separator).toHaveAttribute('aria-hidden', 'true')
    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('escrever as horas passa para os minutos e a hora completa vai para o formulário', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show()

    await user.click(hoursBox())
    await user.keyboard('15')

    expect(hoursBox()).toHaveValue('15')
    expect(minutesBox()).toHaveFocus()

    await user.keyboard('30')

    expect(minutesBox()).toHaveValue('30')
    expect(minutesBox()).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith('15:30')
    expect(hoursBox()).toHaveAttribute('aria-valuenow', '15')
    expect(hoursBox()).toHaveAttribute('aria-valuetext', '15')
  })

  it('só com as horas envia vazio e não mostra erro enquanto se está no campo', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show()

    await user.click(hoursBox())
    await user.keyboard('17')

    expect(onChange).toHaveBeenLastCalledWith('')
    expect(minutesBox()).toHaveFocus()
    expect(screen.queryByText(INCOMPLETE_ERROR)).not.toBeInTheDocument()
    expect(hoursBox()).not.toHaveAttribute('aria-invalid')
    expect(minutesBox()).not.toHaveAttribute('aria-invalid')
  })

  it('um dígito que não pode começar uma hora de dois dígitos passa logo para os minutos', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show()

    await user.click(hoursBox())
    await user.keyboard('9')

    expect(hoursBox()).toHaveValue('09')
    expect(minutesBox()).toHaveFocus()

    await user.clear(hoursBox())
    await user.keyboard('25')

    expect(hoursBox()).toHaveValue('05')
    expect(minutesBox()).toHaveFocus()

    await user.keyboard('7')

    expect(minutesBox()).toHaveValue('07')
    expect(minutesBox()).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith('05:07')
  })

  it('as setas mudam 1 de cada vez com volta e os minutos não mexem nas horas', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show()

    await user.click(hoursBox())
    await user.keyboard('{ArrowUp}')
    expect(hoursBox()).toHaveValue('00')
    await user.keyboard('{ArrowDown}')
    expect(hoursBox()).toHaveValue('23')
    await user.keyboard('{ArrowUp}')
    expect(hoursBox()).toHaveValue('00')
    expect(hoursBox()).toHaveFocus()

    await user.click(minutesBox())
    await user.keyboard('{ArrowDown}')
    expect(minutesBox()).toHaveValue('59')
    await user.keyboard('{ArrowUp}')
    expect(minutesBox()).toHaveValue('00')
    expect(hoursBox()).toHaveValue('00')
    expect(minutesBox()).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith('00:00')
  })

  it('as setas para os lados, o Tab e os dois pontos mudam de caixa', async () => {
    const user = userEvent.setup({ delay: null })
    show()

    await user.click(hoursBox())
    await user.keyboard('{ArrowRight}')
    expect(minutesBox()).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(hoursBox()).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(hoursBox()).toHaveFocus()

    await user.click(minutesBox())
    await user.keyboard('{ArrowRight}')
    expect(minutesBox()).toHaveFocus()

    await user.click(hoursBox())
    await user.tab()
    expect(minutesBox()).toHaveFocus()
    await user.tab()
    expect(otherButton()).toHaveFocus()
    await user.tab({ shift: true })
    expect(minutesBox()).toHaveFocus()

    await user.click(hoursBox())
    await user.keyboard('1:')
    expect(hoursBox()).toHaveValue('01')
    expect(minutesBox()).toHaveFocus()
  })

  it('o Backspace e o Delete limpam a caixa e o Backspace nos minutos vazios volta às horas', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show({ initial: '15:30' })

    await user.click(minutesBox())
    await user.keyboard('{Backspace}')

    expect(minutesBox()).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(minutesBox()).toHaveFocus()

    await user.keyboard('{Backspace}')

    expect(hoursBox()).toHaveFocus()
    expect(hoursBox()).toHaveValue('15')

    await user.keyboard('{Delete}')

    expect(hoursBox()).toHaveValue('')
  })

  it('letras, espaços e outros sinais são ignorados', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show({ initial: '15:30' })

    await user.click(hoursBox())
    await user.keyboard('a -')

    expect(hoursBox()).toHaveValue('15')
    expect(minutesBox()).toHaveValue('30')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ao sair do campo só com as horas mostra o erro de incompleto, que desaparece ao escrever os minutos', async () => {
    const user = userEvent.setup({ delay: null })
    const view = show()

    await user.click(hoursBox())
    await user.keyboard('17')
    await user.tab()
    expect(otherButton()).toHaveFocus()

    const error = screen.getByText(INCOMPLETE_ERROR)
    for (const box of [hoursBox(), minutesBox()]) {
      expect(box).toHaveAttribute('aria-invalid', 'true')
      expect(describedIds(box)).toContain(error.id)
    }

    await user.click(minutesBox())
    await user.keyboard('0')

    expect(screen.queryByText(INCOMPLETE_ERROR)).not.toBeInTheDocument()

    view.unmount()
    show()
    await user.click(hoursBox())
    await user.tab()
    await user.tab()

    expect(otherButton()).toHaveFocus()
    expect(screen.queryByText(INCOMPLETE_ERROR)).not.toBeInTheDocument()
    expect(hoursBox()).not.toHaveAttribute('aria-invalid')

    await user.click(hoursBox())
    await user.keyboard('1930')
    await user.tab()

    expect(otherButton()).toHaveFocus()
    expect(screen.queryByText(INCOMPLETE_ERROR)).not.toBeInTheDocument()
    expect(minutesBox()).not.toHaveAttribute('aria-invalid')
  })

  it('junta o invalid, o required e o describedBy de fora nas duas caixas e acrescenta o erro de incompleto', async () => {
    const user = userEvent.setup({ delay: null })
    show({ invalid: true, describedBy: 'e1', required: true })

    for (const box of [hoursBox(), minutesBox()]) {
      expect(box).toHaveAttribute('aria-invalid', 'true')
      expect(box).toHaveAttribute('aria-required', 'true')
      expect(describedIds(box)).toEqual(['e1'])
    }

    await user.click(hoursBox())
    await user.keyboard('17')
    await user.tab()

    const error = screen.getByText(INCOMPLETE_ERROR)
    for (const box of [hoursBox(), minutesBox()]) {
      expect(describedIds(box)).toEqual(expect.arrayContaining(['e1', error.id]))
    }
  })

  it('mostra o valor que muda por fora sem apagar uma hora a meio', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    const view = render(<TimeInput id="hora" name="startTime" label={LABEL} value="" onChange={onChange} />)

    view.rerender(<TimeInput id="hora" name="startTime" label={LABEL} value="08:00" onChange={onChange} />)

    expect(hoursBox()).toHaveValue('08')
    expect(minutesBox()).toHaveValue('00')

    view.rerender(<TimeInput id="hora" name="startTime" label={LABEL} value="" onChange={onChange} />)

    expect(hoursBox()).toHaveValue('')
    expect(minutesBox()).toHaveValue('')

    await user.click(hoursBox())
    await user.keyboard('17')
    view.rerender(<TimeInput id="hora" name="startTime" label={LABEL} value="" onChange={onChange} />)

    expect(hoursBox()).toHaveValue('17')
  })

  it('desativado, as duas caixas ficam desativadas e escrever não muda nada', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show({ disabled: true })

    expect(hoursBox()).toBeDisabled()
    expect(minutesBox()).toBeDisabled()

    await user.type(hoursBox(), '15')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('um texto colado ou de um teclado de telemóvel é aplicado com as mesmas regras', () => {
    const { onChange } = show()

    fireEvent.change(hoursBox(), { target: { value: '1930' } })

    expect(hoursBox()).toHaveValue('19')
    expect(minutesBox()).toHaveValue('30')
    expect(onChange).toHaveBeenLastCalledWith('19:30')

    fireEvent.change(hoursBox(), { target: { value: '' } })

    expect(hoursBox()).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith('')

    const calls = onChange.mock.calls.length
    fireEvent.change(minutesBox(), { target: { value: 'x' } })

    expect(hoursBox()).toHaveValue('')
    expect(minutesBox()).toHaveValue('30')
    expect(onChange).toHaveBeenCalledTimes(calls)
  })

  it('a caixa com foco fica toda selecionada e carregar na moldura foca as horas', async () => {
    const user = userEvent.setup({ delay: null })
    show({ initial: '15:30' })

    await user.tab()

    expect(hoursBox()).toHaveFocus()
    expect(hoursBox().selectionStart).toBe(0)
    expect(hoursBox().selectionEnd).toBe(2)

    await user.keyboard('{ArrowUp}')

    expect(hoursBox()).toHaveValue('16')
    expect(hoursBox().selectionStart).toBe(0)
    expect(hoursBox().selectionEnd).toBe(2)

    act(() => otherButton().focus())
    fireEvent.mouseDown(hoursBox().parentElement)

    expect(hoursBox()).toHaveFocus()
  })
})
