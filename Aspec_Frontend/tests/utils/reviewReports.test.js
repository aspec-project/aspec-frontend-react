import { describe, expect, it } from 'vitest'
import { getReviewJustification, getReviewReasonLabel, getReviewReportSourceLabel, REVIEW_REPORT_REASON_LABELS } from '../../src/utils/reviewReports'

describe('getReviewReasonLabel', () => {
  it('tem um rótulo neutro para cada motivo da API', () => {
    expect(REVIEW_REPORT_REASON_LABELS).toEqual({
      offensive_or_disrespectful_content: 'Conteúdo ofensivo ou desrespeitoso',
      false_or_unsubstantiated_claims: 'Afirmações falsas ou sem fundamento',
      no_business_relationship: 'Sem relação comercial entre as partes',
      spam_or_advertising: 'Spam ou publicidade',
      other: 'Outro motivo',
      language_filter: 'Linguagem imprópria (deteção automática)',
    })
  })

  it('um código desconhecido passa a "Outro motivo", mesmo com nomes de propriedades do objeto', () => {
    expect(getReviewReasonLabel('codigo_novo')).toBe('Outro motivo')
    expect(getReviewReasonLabel('constructor')).toBe('Outro motivo')
    expect(getReviewReasonLabel('codigo_novo', 'Motivo não identificado')).toBe('Motivo não identificado')
  })
})

describe('getReviewReportSourceLabel', () => {
  it('traduz a origem do report', () => {
    expect(getReviewReportSourceLabel('automatic')).toBe('Automática')
    expect(getReviewReportSourceLabel('member')).toBe('Membro')
  })
})

describe('getReviewJustification', () => {
  it('uma avaliação oculta com justificação mostra o texto do admin', () => {
    expect(getReviewJustification({ status: 'Hidden', hidden_reason: 'Viola o código.', flagging_reasons: [] })).toEqual({
      tooltip: 'Ver justificação',
      title: 'Justificação da ocultação',
      reason: 'Viola o código.',
      footerBefore: 'Se pretender contestar esta decisão, envie um email para ',
      footerAfter: '.',
    })
  })

  it('uma avaliação sinalizada mostra os rótulos sem repetidos', () => {
    expect(getReviewJustification({ status: 'Flagged', hidden_reason: null, flagging_reasons: ['other', 'codigo_novo', 'language_filter'] })).toEqual({
      tooltip: 'Ver motivo',
      title: 'Motivo da sinalização',
      labels: ['Outro motivo', 'Linguagem imprópria (deteção automática)'],
      footerBefore: 'Esta avaliação aguarda a análise da administração ASPEC. Para mais informações, envie um email para ',
      footerAfter: '.',
    })
  })

  it.each([
    ['visível', { status: 'Visible', hidden_reason: null, flagging_reasons: [] }],
    ['oculta sem justificação', { status: 'Hidden', hidden_reason: null, flagging_reasons: [] }],
    ['oculta com justificação em branco', { status: 'Hidden', hidden_reason: '   ', flagging_reasons: [] }],
    ['sinalizada sem motivos', { status: 'Flagged', hidden_reason: null, flagging_reasons: [] }],
  ])('sem motivo não há justificação: %s', (_, review) => {
    expect(getReviewJustification(review)).toBeNull()
  })
})
