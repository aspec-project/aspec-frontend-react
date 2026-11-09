import { describe, expect, it } from 'vitest'
import { getOnlineMeetingUrl } from '../../src/utils/eventAccess'

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const deadline = '2030-10-14T23:59:00+01:00'
const afterDeadline = Date.parse(deadline) + 1
const event = { id: '019512a1-9999-7123-8123-123456789abc', is_online: true, is_registered: true, registration_deadline: deadline, online_url: 'https://reuniao.example.pt/x' }
const adminWithProfile = {
  id: 'admin-1',
  email: 'admin@example.pt',
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Admin', business_name: 'Santos Lda' },
}
const technicalAdmin = {
  id: 'tecnico-1',
  email: 'tecnico@example.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}
const auth = (user) => ({ user, status: 'authenticated', sessionChanging: false })

describe('URL da reunião online', () => {
  it('é devolvido ao admin com perfil inscrito e nunca ao admin técnico nas mesmas condições', () => {
    expect(getOnlineMeetingUrl(event, auth(adminWithProfile), afterDeadline)).toBe('https://reuniao.example.pt/x')
    expect(getOnlineMeetingUrl(event, auth(technicalAdmin), afterDeadline)).toBe('')
  })
})
