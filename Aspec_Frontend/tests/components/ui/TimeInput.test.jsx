import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import TimeInput from '../../../src/components/ui/TimeInput'

const FORMAT_ERROR = 'Indique uma hora entre 00:00 e 23:59 (ex.: 19:30).'

function Controlled({ initial = '', onChange, ...props }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <label htmlFor="hora-inicio">Hora de início</label>
      <TimeInput
        id="hora-inicio"
        name="startTime"
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

function field() {
  return screen.getByRole('textbox', { name: 'Hora de início' })
}

function describedIds(element) {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
}

describe('TimeInput', () => {
  it('é um campo de texto numérico de 5 caracteres com o placeholder hh:mm e o ícone escondido', () => {
    const { container } = show()

    expect(field()).toHaveValue('')
    expect(field()).toHaveAttribute('placeholder', 'hh:mm')
    expect(field()).toHaveAttribute('inputmode', 'numeric')
    expect(field()).toHaveAttribute('maxlength', '5')
    expect(field()).toHaveAttribute('name', 'startTime')
    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('escrever uma hora válida envia-a logo ao formulário', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.type(field(), '17:39')

    expect(field()).toHaveValue('17:39')
    expect(onChange).toHaveBeenLastCalledWith('17:39')
  })

  it('só aceita dígitos e dois pontos', async () => {
    const user = userEvent.setup()
    show()

    await user.type(field(), '1a7:3x9')

    expect(field()).toHaveValue('17:39')
  })

  it('uma hora incompleta envia vazio e não mostra erro enquanto se escreve', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.type(field(), '17:3')

    expect(field()).toHaveValue('17:3')
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument()
    expect(field()).not.toHaveAttribute('aria-invalid')
  })

  it('ao sair do campo escreve a hora no formato HH:MM', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.type(field(), '930')
    await user.tab()

    expect(field()).toHaveValue('09:30')
    expect(onChange).toHaveBeenLastCalledWith('09:30')
  })

  it('ao sair com uma hora inválida mostra o erro de formato, que desaparece ao voltar a escrever', async () => {
    const user = userEvent.setup()
    show()

    await user.type(field(), '25:00')
    await user.tab()

    const error = screen.getByText(FORMAT_ERROR)
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(describedIds(field())).toContain(error.id)

    await user.type(field(), '{Backspace}')

    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument()
  })

  it('vazio, sair do campo não mostra erro', async () => {
    const user = userEvent.setup()
    show()

    await user.click(field())
    await user.tab()

    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument()
    expect(field()).not.toHaveAttribute('aria-invalid')
  })

  it('junta o invalid e o describedBy de fora ao erro de formato', async () => {
    const user = userEvent.setup()
    show({ invalid: true, describedBy: 'e1', required: true })

    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(field()).toHaveAttribute('aria-required', 'true')
    expect(describedIds(field())).toEqual(['e1'])

    await user.type(field(), '17:60')
    await user.tab()

    const error = screen.getByText(FORMAT_ERROR)
    expect(describedIds(field())).toEqual(expect.arrayContaining(['e1', error.id]))
  })

  it('mostra o valor que muda por fora sem apagar o que se está a escrever', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = render(<TimeInput id="hora" name="startTime" value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')

    view.rerender(<TimeInput id="hora" name="startTime" value="08:00" onChange={onChange} />)

    expect(input).toHaveValue('08:00')

    view.rerender(<TimeInput id="hora" name="startTime" value="" onChange={onChange} />)
    await user.clear(input)
    await user.type(input, '17:3')
    view.rerender(<TimeInput id="hora" name="startTime" value="" onChange={onChange} />)

    expect(input).toHaveValue('17:3')
  })
})
