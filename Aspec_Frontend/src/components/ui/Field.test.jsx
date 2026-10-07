import { render, screen } from '@testing-library/react'
import Field from './Field'

describe('Field', () => {
  it('mostra a etiqueta e o campo', () => {
    render(
      <Field label="Email">
        <input aria-label="email" />
      </Field>
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('email')).toBeInTheDocument()
  })

  it('mostra a mensagem de erro quando existe', () => {
    render(
      <Field label="Email" error="O email é obrigatório.">
        <input />
      </Field>
    )

    expect(screen.getByText('O email é obrigatório.')).toBeInTheDocument()
  })

  it('não mostra erro quando não existe', () => {
    render(
      <Field label="Email">
        <input />
      </Field>
    )

    expect(screen.queryByText(/obrigatório/)).not.toBeInTheDocument()
  })
})
