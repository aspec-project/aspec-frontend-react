import { describe, expect, it } from 'vitest'
import { isOccupancyCritical, softCategoryColor } from '../../src/utils/eventFormatting'

describe('isOccupancyCritical', () => {
  it.each([
    [5, 2, false],
    [5, 3, true],
    [4, 1, false],
    [4, 2, true],
    [1, 1, true],
    [1, 0, false],
    [6, 2, false],
    [6, 3, true],
    [10, 4, false],
    [10, 5, true],
  ])('com %i lugares e %i inscritos usa a regra de metade: %s', (max, count, expected) => {
    expect(isOccupancyCritical(max, count)).toBe(expected)
  })

  it.each([
    [11, 5, false],
    [11, 6, true],
    [200, 100, false],
    [200, 194, false],
    [200, 195, true],
    [200, 200, true],
  ])('com %i lugares e %i inscritos usa as vagas restantes: %s', (max, count, expected) => {
    expect(isOccupancyCritical(max, count)).toBe(expected)
  })
})

describe('softCategoryColor', () => {
  it('acrescenta 12 % de opacidade à cor', () => {
    expect(softCategoryColor('#0D1F35')).toBe('#0D1F351F')
  })
})
