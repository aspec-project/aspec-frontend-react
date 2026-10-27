import { describe, expect, it } from 'vitest'
import {
  CATEGORY_NAME_MAX_LENGTH,
  DEFAULT_CATEGORY_COLOR,
  EVENT_CATEGORY_TEXTS,
  canDeleteCategory,
  findCategoryWithColor,
  formatEventsCount,
  getCategoryBadgeColors,
  getDefaultCategoryColor,
  getDeleteCategoryDescription,
  getDeleteLabel,
  getEditLabel,
  getLockedLabel,
  getUsedColorLabel,
  getUsedColors,
  validateEventCategory,
} from '../../src/utils/eventCategories'

const categories = [
  { id: 'c1', name: 'Almoço', color: '#2E7D32', events_count: 1 },
  { id: 'c2', name: 'Formação', color: '#1565C0', events_count: 7 },
  { id: 'c3', name: 'Jantar', color: '#8A7043', events_count: 6 },
  { id: 'c4', name: 'Workshop', color: '#C62828', events_count: 0 },
  { id: 'c5', name: 'Retiro', color: '#00838F', events_count: 0 },
]

const NAVY = { color: '#0D1F35', background: '#E2E4E7', text: '#060E18' }

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)

  return (light + 0.05) / (dark + 0.05)
}

describe('getCategoryBadgeColors', () => {
  it('calcula o fundo claro e o texto escuro na mesma cor', () => {
    expect(getCategoryBadgeColors('#8A7043')).toEqual({ color: '#8A7043', background: '#F1EEE8', text: '#3E321E' })
    expect(getCategoryBadgeColors('#1565c0')).toEqual({ color: '#1565C0', background: '#E3EDF7', text: '#092D56' })
  })

  it('uma cor inválida usa o azul-marinho', () => {
    for (const value of ['red', null, 'url(javascript:alert(1))', '#FFF']) {
      expect(getCategoryBadgeColors(value)).toEqual(NAVY)
    }
  })

  it('o texto tem contraste AA com o fundo nas cores do seeder e nos piores casos', () => {
    for (const color of ['#B84A00', '#2E7D32', '#6A1B9A', '#C62828', '#1565C0', '#B65220', '#FFFF00', '#00FFFF', '#00FF00', '#FFFFFF', '#000000']) {
      const { background, text } = getCategoryBadgeColors(color)

      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('formatEventsCount', () => {
  it('diz o número de eventos no singular e no plural', () => {
    expect(formatEventsCount(0)).toBe('0 eventos')
    expect(formatEventsCount(1)).toBe('1 evento')
    expect(formatEventsCount(7)).toBe('7 eventos')
  })

  it('devolve um travessão quando não é um inteiro maior ou igual a zero', () => {
    for (const value of [-1, 1.5, '3', null]) {
      expect(formatEventsCount(value)).toBe('—')
    }
  })
})

describe('rótulos das ações', () => {
  it('explica porque não se pode apagar, com o número de eventos quando é conhecido', () => {
    expect(getLockedLabel({ name: 'Formação', events_count: 7 })).toBe('Não é possível apagar «Formação»: está ligado a 7 eventos.')
    expect(getLockedLabel({ name: 'Formação', events_count: 1 })).toBe('Não é possível apagar «Formação»: está ligado a 1 evento.')
    expect(getLockedLabel({ name: 'Formação', events_count: null })).toBe('Não é possível apagar «Formação».')
  })

  it('tem os textos de editar, apagar e da confirmação', () => {
    expect(getDeleteCategoryDescription('Retiro')).toBe('O tipo «Retiro» vai ser apagado. Esta ação não pode ser desfeita.')
    expect(getEditLabel('Retiro')).toBe('Editar Retiro')
    expect(getDeleteLabel('Retiro')).toBe('Apagar Retiro')
  })

  it('só deixa apagar tipos com zero eventos', () => {
    expect(canDeleteCategory({ events_count: 0 })).toBe(true)
    for (const events_count of [1, 7, null, '0', undefined]) {
      expect(canDeleteCategory({ events_count })).toBe(false)
    }
  })
})

describe('validateEventCategory', () => {
  it('nome vazio e cor de outro tipo dão os erros do backend', () => {
    expect(validateEventCategory({ name: '   ', color: '#00838F' }, categories)).toEqual({
      name: 'O campo nome é obrigatório.',
      color: 'Já existe uma categoria com esta cor.',
    })
  })

  it('conta os caracteres como o backend, incluindo acentos', () => {
    expect(validateEventCategory({ name: 'a'.repeat(31), color: '#AD1457' }, categories).name)
      .toBe('O campo nome não pode ter mais de 30 caracteres.')
    expect(validateEventCategory({ name: 'ç'.repeat(30), color: '#AD1457' }, categories).name).toBeUndefined()
    expect(validateEventCategory({ name: 'ç'.repeat(31), color: '#AD1457' }, categories).name)
      .toBe('O campo nome não pode ter mais de 30 caracteres.')
  })

  it('o nome repetido não distingue maiúsculas nem espaços nas pontas e ignora o próprio tipo', () => {
    for (const name of [' jantar ', 'JANTAR', 'FORMAÇÃO']) {
      expect(validateEventCategory({ name, color: '#AD1457' }, categories).name).toBe('Já existe uma categoria com este nome.')
    }
    expect(validateEventCategory({ name: 'Formação', color: '#1565C0' }, categories, 'c2')).toEqual({})
  })

  it('valida a cor obrigatória, o formato e a cor repetida sem distinguir maiúsculas', () => {
    expect(validateEventCategory({ name: 'Retiro Anual', color: '' }, categories).color).toBe('O campo cor é obrigatório.')
    expect(validateEventCategory({ name: 'Retiro Anual', color: '#12345' }, categories).color)
      .toBe('A cor tem de estar no formato #RRGGBB (ex.: #8A7043).')
    expect(validateEventCategory({ name: 'Retiro Anual', color: '#c62828' }, categories).color).toBe('Já existe uma categoria com esta cor.')
    expect(validateEventCategory({ name: 'Workshop', color: '#c62828' }, categories, 'c4')).toEqual({})
  })

  it('sem problemas devolve um objeto vazio', () => {
    expect(validateEventCategory({ name: 'Retiro Anual', color: '#AD1457' }, categories)).toEqual({})
  })
})

describe('cores já usadas', () => {
  it('lista as cores válidas dos outros tipos em maiúsculas', () => {
    expect(getUsedColors(categories)).toEqual(categories.map(({ id, name, color }) => ({ id, name, color })))
    expect(getUsedColors(categories, 'c2').map((used) => used.name)).toEqual(['Almoço', 'Jantar', 'Workshop', 'Retiro'])
    expect(getUsedColors([
      { id: 'x1', name: 'Vermelho', color: 'red', events_count: 0 },
      { id: 'x2', name: 'Sem cor', color: null, events_count: 0 },
      { id: 'x3', name: 'Verde', color: '#2e7d32', events_count: 0 },
    ])).toEqual([{ id: 'x3', name: 'Verde', color: '#2E7D32' }])
  })

  it('encontra o tipo com a mesma cor sem distinguir maiúsculas, ignorando o próprio', () => {
    expect(findCategoryWithColor('#c62828', categories)).toEqual(categories[3])
    expect(findCategoryWithColor('#c62828', categories, 'c4')).toBeNull()
  })

  it('a cor inicial é a do design e roda a matiz 30° de cada vez quando já está usada', () => {
    const rotations = ['#B65220', '#B69D20', '#84B620', '#39B620', '#20B652', '#20B69D', '#2084B6', '#2039B6', '#5220B6', '#9D20B6', '#B62084', '#B62039']
    const withColors = (colors) => [...categories, ...colors.map((color, index) => ({ id: `x${index}`, name: `Extra ${index}`, color, events_count: 0 }))]

    expect(getDefaultCategoryColor(categories)).toBe('#B65220')
    expect(getDefaultCategoryColor(withColors(['#B65220']))).toBe('#B69D20')
    expect(getDefaultCategoryColor(withColors(['#B65220', '#B69D20']))).toBe('#84B620')
    expect(getDefaultCategoryColor(withColors(rotations))).toBe('#B65220')
  })

  it('descreve a marca de uma cor usada', () => {
    expect(getUsedColorLabel('#2E7D32', 'Almoço')).toBe('#2E7D32, já usada por «Almoço»')
  })
})

describe('constantes', () => {
  it('tem os textos da página e dos diálogos, o limite do nome e a cor inicial', () => {
    expect(EVENT_CATEGORY_TEXTS).toEqual({
      pageTitle: 'Tipos de Evento',
      subtitle: 'Só é possível apagar tipos que não estejam ligados a nenhum evento.',
      newButton: 'Novo tipo',
      tableCaption: 'Tipos de evento',
      loading: 'A carregar tipos de evento...',
      empty: 'Ainda não há tipos de evento.',
      loadError: 'Não foi possível carregar os tipos de evento. Tente novamente.',
      retry: 'Tentar novamente',
      createTitle: 'Novo tipo de evento',
      editTitle: 'Editar tipo de evento',
      nameLabel: 'Nome',
      namePlaceholder: 'Ex.: Retiro anual',
      colorLabel: 'Cor',
      wheelLabel: 'Roda de cores',
      lightnessLabel: 'Luminosidade',
      hexLabel: 'Hexadecimal',
      rgbLabel: 'RGB',
      redLabel: 'Vermelho (R)',
      greenLabel: 'Verde (G)',
      blueLabel: 'Azul (B)',
      rgbError: 'Os valores RGB têm de ser números inteiros entre 0 e 255.',
      usedColorsHint: 'As cores já usadas estão assinaladas na roda com uma cruz.',
      previewLabel: 'Pré-visualização',
      previewPlaceholder: 'Nome do tipo',
      createSubmit: 'Criar tipo',
      createPending: 'A criar...',
      editSubmit: 'Guardar alterações',
      editPending: 'A guardar...',
      noChanges: 'Ainda não fez nenhuma alteração.',
      cancel: 'Cancelar',
      close: 'Fechar',
      notFound: 'Este tipo de evento já não existe. A lista foi atualizada.',
      deleteTitle: 'Apagar tipo de evento?',
      deleteConfirm: 'Apagar',
    })
    expect(CATEGORY_NAME_MAX_LENGTH).toBe(30)
    expect(DEFAULT_CATEGORY_COLOR).toBe('#B65220')
  })
})
