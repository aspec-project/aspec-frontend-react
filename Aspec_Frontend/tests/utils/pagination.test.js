import { describe, expect, it } from 'vitest'
import { getPageItems } from '../../src/utils/pagination'

describe('getPageItems', () => {
  it('mostra todas as páginas até sete', () => {
    expect(getPageItems(1, 1)).toEqual([1])
    expect(getPageItems(2, 3)).toEqual([1, 2, 3])
    expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('acima de sete mostra a primeira, a última, a atual com as vizinhas e saltos', () => {
    expect(getPageItems(1, 10)).toEqual([1, 2, 'gap', 10])
    expect(getPageItems(3, 10)).toEqual([1, 2, 3, 4, 'gap', 10])
    expect(getPageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
    expect(getPageItems(10, 10)).toEqual([1, 'gap', 9, 10])
  })
})
