import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveBlob } from '../../src/utils/download'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

function restoreUrl(name, original) {
  if (original === undefined) {
    delete URL[name]
  } else {
    URL[name] = original
  }
}

describe('saveBlob', () => {
  let clicks
  let click

  beforeEach(() => {
    clicks = []
    URL.createObjectURL = vi.fn(() => 'blob:mock-1')
    URL.revokeObjectURL = vi.fn()
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicks.push({ href: this.getAttribute('href'), download: this.download, connected: this.isConnected })
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    restoreUrl('createObjectURL', originalCreateObjectURL)
    restoreUrl('revokeObjectURL', originalRevokeObjectURL)
  })

  it('descarrega o blob com o nome indicado e revoga o URL logo a seguir', () => {
    const blob = new Blob(['Nome;Empresa'], { type: 'text/csv' })

    saveBlob(blob, 'presencas.csv')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicks).toEqual([{ href: 'blob:mock-1', download: 'presencas.csv', connected: true }])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
    expect(URL.revokeObjectURL.mock.invocationCallOrder[0]).toBeGreaterThan(click.mock.invocationCallOrder[0])
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('se o clique falhar, revoga o URL, remove a ligação e volta a lançar o erro', () => {
    const failure = new Error('Falha no clique')
    click.mockImplementation(() => { throw failure })

    expect(() => saveBlob(new Blob(['x']), 'presencas.csv')).toThrow(failure)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
    expect(document.querySelector('a')).toBeNull()
  })
})
