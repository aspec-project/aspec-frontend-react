import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FeedbackBanner from '../../../src/components/ui/FeedbackBanner'

describe('FeedbackBanner', () => {
  it('anuncia o sucesso como estado e o erro como alerta, e fecha com o botão', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { unmount } = render(<FeedbackBanner type="success" message="Utilizador bloqueado com sucesso." onClose={onClose} />)

    expect(screen.getByRole('status')).toHaveTextContent('Utilizador bloqueado com sucesso.')
    unmount()

    render(<FeedbackBanner type="error" message="O utilizador já está bloqueado." onClose={onClose} />)

    expect(screen.getByRole('alert')).toHaveTextContent('O utilizador já está bloqueado.')

    await user.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
