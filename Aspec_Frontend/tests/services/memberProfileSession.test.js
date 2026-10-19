import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/services/api'
import { advanceSession, getSessionContext } from '../../src/services/sessionContext'
import {
  deletePortfolioImage, getMemberProfile, updateMemberProfile,
  uploadMemberLogo, uploadPortfolioImages,
} from '../../src/services/memberProfile'

describe('Pedidos privados ligados à sessão original', () => {
  beforeEach(() => advanceSession())
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['carregar', (context) => getMemberProfile(context)],
    ['guardar', (context) => updateMemberProfile({ address: 'A' }, context)],
    ['logótipo', (context) => uploadMemberLogo(new File(['a'], 'a.png'), context)],
    ['portefólio', (context) => uploadPortfolioImages([new File(['a'], 'a.png')], context)],
    ['apagar', (context) => deletePortfolioImage('image-a', context)],
  ])('não envia %s com contexto de outra identidade', async (_, request) => {
    const get = vi.spyOn(api, 'get')
    const put = vi.spyOn(api, 'put')
    const post = vi.spyOn(api, 'post')
    const remove = vi.spyOn(api, 'delete')
    const context = getSessionContext()
    advanceSession()

    await expect(request(context)).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    for (const method of [get, put, post, remove]) expect(method).not.toHaveBeenCalled()
  })

  it('interrompe uploads sequenciais quando a identidade muda durante o primeiro', async () => {
    let complete
    const post = vi.spyOn(api, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve }))
    const context = getSessionContext()
    const result = uploadPortfolioImages([new File(['a'], 'a.png'), new File(['b'], 'b.png')], context)
    const rejection = expect(result).rejects.toMatchObject({ code: 'ERR_CANCELED' })

    expect(post).toHaveBeenCalledTimes(1)
    advanceSession()
    complete({ data: { data: { id: 'a', image_url: '/storage/a.png' } } })
    await rejection
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('interrompe a sequência quando a página é desmontada', async () => {
    const controller = new AbortController()
    const context = { ...getSessionContext(), signal: controller.signal }
    const post = vi.spyOn(api, 'post').mockImplementation(async () => {
      controller.abort()
      return { data: { data: { id: 'a', image_url: '/storage/a.png' } } }
    })

    await expect(uploadPortfolioImages([new File(['a'], 'a.png'), new File(['b'], 'b.png')], context))
      .rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][2]).toMatchObject({ sessionGeneration: context.generation, signal: controller.signal })
  })
})
