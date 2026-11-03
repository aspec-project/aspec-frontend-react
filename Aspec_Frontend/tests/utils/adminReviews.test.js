import { describe, expect, it } from 'vitest'
import {
  REVIEW_FILTERS,
  formatReviewsTotal,
  getEmptyReviewsText,
  getFlaggedBannerText,
  getRatingLabel,
  getReviewActionLabel,
  getReviewActions,
  getReviewBadge,
  getReviewDialog,
  getReviewNote,
  parseReviewFilter,
} from '../../src/utils/adminReviews'

function review(status, extra = {}) {
  return {
    id: 'r1',
    rating: 4,
    comment: 'Comentário',
    status,
    hidden_reason: null,
    reviewer: { business_name: 'Construções Silva & Filhos' },
    reviewed: { business_name: 'TechBless Solutions' },
    flagging_sources: [],
    created_at: '2025-01-15T10:00:00+00:00',
    ...extra,
  }
}

describe('regras da moderação de avaliações', () => {
  it('tem os quatro filtros por ordem e só aceita do URL os três estados conhecidos', () => {
    expect(REVIEW_FILTERS.map((filter) => [filter.key, filter.label])).toEqual([
      ['all', 'Todas'],
      ['flagged', 'Sinalizadas'],
      ['visible', 'Visíveis'],
      ['hidden', 'Ocultas'],
    ])

    for (const value of ['flagged', 'visible', 'hidden']) {
      expect(parseReviewFilter(value)).toBe(value)
    }
    for (const value of [null, '', 'Flagged', 'xyz']) {
      expect(parseReviewFilter(value)).toBe('all')
    }
  })

  it('escreve a faixa das sinalizadas no singular e no plural e não a mostra com zero', () => {
    expect(getFlaggedBannerText(1)).toEqual({ strong: '1 avaliação sinalizada', rest: ' oculta ao público até decisão do admin.' })
    expect(getFlaggedBannerText(4)).toEqual({ strong: '4 avaliações sinalizadas', rest: ' ocultas ao público até decisão do admin.' })
    expect(getFlaggedBannerText(0)).toBeNull()
  })

  it('dá o badge Sinalizada ou Oculta e nenhum às visíveis', () => {
    expect(getReviewBadge('Flagged')).toEqual({ label: 'Sinalizada', tone: 'danger' })
    expect(getReviewBadge('Hidden')).toEqual({ label: 'Oculta', tone: 'muted' })
    expect(getReviewBadge('Visible')).toBeNull()
  })

  it('escreve a nota de estado e só lê as origens nas sinalizadas', () => {
    const flaggedLead = 'Oculta enquanto estiver sinalizada.'

    expect(getReviewNote(review('Visible'))).toBeNull()
    expect(getReviewNote(review('Hidden'))).toEqual({ tone: 'muted', lead: null, text: 'Oculta sem justificação.' })
    expect(getReviewNote(review('Hidden', { hidden_reason: '   ' }))).toEqual({ tone: 'muted', lead: null, text: 'Oculta sem justificação.' })
    expect(getReviewNote(review('Hidden', { hidden_reason: 'Viola o código' }))).toEqual({ tone: 'muted', lead: null, text: 'Viola o código' })
    expect(getReviewNote(review('Flagged', { flagging_sources: ['automatic'] })))
      .toEqual({ tone: 'danger', lead: flaggedLead, text: 'Sinalizada pelo filtro automático.' })
    expect(getReviewNote(review('Flagged', { flagging_sources: ['member'] })))
      .toEqual({ tone: 'danger', lead: flaggedLead, text: 'Denunciada por membros.' })
    expect(getReviewNote(review('Flagged', { flagging_sources: ['automatic', 'member'] })))
      .toEqual({ tone: 'danger', lead: flaggedLead, text: 'Sinalizada pelo filtro automático e denunciada por membros.' })
    expect(getReviewNote(review('Flagged', { flagging_sources: [] })))
      .toEqual({ tone: 'danger', lead: flaggedLead, text: 'Sinalizada para moderação.' })
    expect(getReviewNote(review('Hidden', { flagging_sources: ['automatic'] })))
      .toEqual({ tone: 'muted', lead: null, text: 'Oculta sem justificação.' })
  })

  it('dá as ações de cada estado', () => {
    expect(getReviewActions('Visible')).toEqual(['hide'])
    expect(getReviewActions('Hidden')).toEqual(['show'])
    expect(getReviewActions('Flagged')).toEqual(['unflag', 'hide'])
    expect(getReviewActions('Removed')).toEqual([])
  })

  it('dá a cada botão um nome que começa pelo texto visível e diz qual é a avaliação', () => {
    const flagged = review('Flagged', {
      reviewer: { business_name: 'Casa Moderna Decorações' },
      reviewed: { business_name: 'Padaria São João' },
    })

    expect(getReviewActionLabel('hide', review('Visible'))).toBe('Ocultar avaliação de Construções Silva & Filhos a TechBless Solutions')
    expect(getReviewActionLabel('show', review('Hidden'))).toBe('Mostrar avaliação de Construções Silva & Filhos a TechBless Solutions')
    expect(getReviewActionLabel('unflag', flagged)).toBe('Retirar sinalização da avaliação de Casa Moderna Decorações a Padaria São João')
    expect(getReviewActionLabel('hide', review('Visible', { reviewer: { business_name: null } })))
      .toBe('Ocultar avaliação de Empresa desconhecida a TechBless Solutions')
  })

  it('escreve a nota em estrelas, o total no singular e no plural e o texto da lista vazia de cada filtro', () => {
    expect(getRatingLabel(1)).toBe('1 de 5 estrelas')
    expect(formatReviewsTotal(1)).toBe('1 avaliação')
    expect(formatReviewsTotal(31)).toBe('31 avaliações')
    expect(getEmptyReviewsText('all')).toBe('Não há avaliações.')
    expect(getEmptyReviewsText('flagged')).toBe('Não há avaliações sinalizadas.')
    expect(getEmptyReviewsText('visible')).toBe('Não há avaliações visíveis.')
    expect(getEmptyReviewsText('hidden')).toBe('Não há avaliações ocultas.')
  })

  it('dá os textos de cada diálogo', () => {
    expect(getReviewDialog('hide')).toEqual({
      title: 'Ocultar avaliação',
      description: 'A avaliação deixa de ser visível publicamente. Pode indicar uma justificação, que será mostrada ao membro avaliado na sua área pessoal.',
      confirmLabel: 'Ocultar avaliação',
      label: 'Justificação (opcional)',
      placeholder: 'Ex: A avaliação viola o Código de Conduta da ASPEC...',
      maxLength: 2000,
      tone: 'primary',
    })
    expect(getReviewDialog('show')).toMatchObject({
      title: 'Mostrar avaliação',
      description: 'A avaliação volta a ficar visível publicamente e a justificação de ocultação é removida.',
      confirmLabel: 'Mostrar avaliação',
      tone: 'primary',
    })
    expect(getReviewDialog('unflag')).toMatchObject({
      title: 'Retirar sinalização',
      description: 'A avaliação deixa de estar sinalizada e volta a ficar visível publicamente.',
      confirmLabel: 'Retirar sinalização',
      tone: 'primary',
    })
  })
})
