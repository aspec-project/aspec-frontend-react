import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Switch from '../../../src/components/ui/Switch'

function show(props = {}) {
  const onChange = vi.fn()
  const view = render(
    <>
      <span id="t">Título</span>
      <Switch id="s" name="ativo" checked={false} onChange={onChange} labelledBy="t" {...props} />
    </>,
  )

  return { ...view, onChange }
}

function toggle() {
  return screen.getByRole('switch', { name: 'Título' })
}

describe('Switch', () => {
  it('é um botão com role switch, nome dado pela label e desligado por omissão', () => {
    show()

    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(toggle()).toHaveAttribute('type', 'button')
  })

  it('o clique pede o estado contrário e o nome não muda com o estado', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange, rerender } = show()

    await user.click(toggle())
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(
      <>
        <span id="t">Título</span>
        <Switch id="s" name="ativo" checked onChange={onChange} labelledBy="t" />
      </>,
    )

    expect(toggle()).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle())
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('o Espaço e o Enter mudam o estado com o foco no interruptor', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show()

    toggle().focus()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledTimes(1)

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(true)
  })

  it('desativado não muda o estado', async () => {
    const user = userEvent.setup({ delay: null })
    const { onChange } = show({ disabled: true })

    expect(toggle()).toBeDisabled()
    await user.click(toggle())

    expect(onChange).not.toHaveBeenCalled()
  })

  it('dentro de um formulário o clique não o submete', async () => {
    const user = userEvent.setup({ delay: null })
    const onSubmit = vi.fn((submitEvent) => submitEvent.preventDefault())
    const onChange = vi.fn()
    render(
      <form onSubmit={onSubmit}>
        <span id="t">Título</span>
        <Switch id="s" name="ativo" checked={false} onChange={onChange} labelledBy="t" />
      </form>,
    )

    await user.click(toggle())

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
