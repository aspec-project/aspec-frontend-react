import { isValidPhoneNumber } from 'libphonenumber-js/min'

export const FIELD_STEP = {
  firstName: 0,
  lastName: 0,
  email: 0,
  phone: 0,
  business_name: 1,
  sector_id: 1,
  description: 1,
  website_url: 1,
  commercial_email: 1,
  commercial_phone: 1,
  location_id: 2,
  address: 2,
  postal_code: 2,
  city: 2,
  congregation: 3,
  role_in_congregation: 3,
  password: 4,
  password_confirmation: 4,
  acceptTerms: 4,
  terms_accepted: 4,
}

export const PASSWORD_RULES = [
  ['minLength', '8 caracteres'],
  ['hasUpper', '1 maiúscula'],
  ['hasLower', '1 minúscula'],
  ['hasNumber', '1 número'],
  ['hasSpecial', '1 símbolo'],
]

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/*
 * Mantém o código postal no formato português enquanto é escrito. A API
 * também aceita os sete algarismos sem hífen, mas o formato apresentado ao
 * utilizador fica sempre consistente.
 */
export const formatPostalCode = (postalCode) => {
  const digits = String(postalCode ?? '').replace(/\D/g, '').slice(0, 7)

  return digits.length > 4
    ? `${digits.slice(0, 4)}-${digits.slice(4)}`
    : digits
}

export const validatePostalCode = (postalCode) =>
  /^\d{4}-?\d{3}$/.test(String(postalCode ?? '').trim())

/*
 * Remove apenas separadores habituais e converte o prefixo internacional
 * 00 para +. A validação definitiva de cada país é feita pelo backend.
 */
export const normalizePhone = (phone) =>
  String(phone ?? '')
    .trim()
    .replace(/[\s\-.()]/g, '')
    .replace(/^00/, '+')

/*
 * Só aceita números completos e válidos para o respetivo país. O seletor
 * acrescenta o indicativo antes de esta validação ser chamada.
 */
export const validatePhone = (phone) =>
  isValidPhoneNumber(normalizePhone(phone))

export const getPasswordCriteria = (pwd) => ({
  minLength: pwd.length >= 8,
  hasUpper: /[A-Z]/.test(pwd),
  hasLower: /[a-z]/.test(pwd),
  hasNumber: /[0-9]/.test(pwd),
  hasSpecial: /[^A-Za-z0-9]/.test(pwd),
})

export const isPasswordValid = (pwd) =>
  Object.values(getPasswordCriteria(pwd)).every(Boolean)

export const validateStepForm = (currentStep, formData) => {
  const newErrors = {}

  if (currentStep === 0) {
    if (!formData.firstName.trim()) newErrors.firstName = 'Obrigatório.'
    if (!formData.lastName.trim()) newErrors.lastName = 'Obrigatório.'

    if (!formData.email.trim()) newErrors.email = 'Obrigatório.'
    else if (!validateEmail(formData.email)) newErrors.email = 'Inválido.'

    if (!formData.phone.trim()) newErrors.phone = 'Obrigatório.'
    else if (!validatePhone(formData.phone)) newErrors.phone = 'Inválido.'
  }

  if (currentStep === 1) {
    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Obrigatório.'
    }

    if (!formData.sector_id) {
      newErrors.sector_id = 'Selecione o setor.'
    }

    if (!formData.commercial_email.trim()) {
      newErrors.commercial_email = 'Obrigatório.'
    } else if (!validateEmail(formData.commercial_email)) {
      newErrors.commercial_email = 'Inválido.'
    }

    if (!formData.commercial_phone.trim()) {
      newErrors.commercial_phone = 'Obrigatório.'
    } else if (!validatePhone(formData.commercial_phone)) {
      newErrors.commercial_phone = 'Indique um telefone válido.'
    }
  }

  if (currentStep === 2) {
    if (!formData.location_id) {
      newErrors.location_id = 'Selecione o núcleo.'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Obrigatório.'
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Obrigatório.'
    } else if (!validatePostalCode(formData.postal_code)) {
      newErrors.postal_code = 'Use o formato 0000-000.'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Obrigatório.'
    }
  }

  if (currentStep === 3) {
    if (!formData.congregation.trim()) {
      newErrors.congregation = 'Obrigatório.'
    }

    if (!formData.role_in_congregation.trim()) {
      newErrors.role_in_congregation = 'Obrigatório.'
    }
  }

  if (currentStep === 4) {
    if (!formData.password) {
      newErrors.password = 'Obrigatória.'
    } else if (!isPasswordValid(formData.password)) {
      newErrors.password = 'Requisitos mínimos não cumpridos.'
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Não coincidem.'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Obrigatório aceitar.'
    }
  }

  return {
    errors: newErrors,
    isValid: Object.keys(newErrors).length === 0,
  }
}

export const buildPayload = (formData) => {
  const payload = {
    email: formData.email.trim(),
    password: formData.password,
    phone: normalizePhone(formData.phone),
    name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
    business_name: formData.business_name.trim(),
    sector_id: formData.sector_id,
    location_id: formData.location_id,
    congregation: formData.congregation.trim(),
    role_in_congregation: formData.role_in_congregation.trim(),
    address: formData.address.trim(),
    postal_code: formatPostalCode(formData.postal_code),
    city: formData.city.trim(),
    commercial_email: formData.commercial_email.trim(),
    commercial_phone: normalizePhone(formData.commercial_phone),
    terms_accepted: formData.acceptTerms,
  }

  if (formData.description.trim()) {
    payload.description = formData.description.trim()
  }

  if (formData.website_url.trim()) {
    payload.website_url = formData.website_url.trim()
  }

  return payload
}

export const mapServerErrors = (serverErrors = {}) => {
  const mapped = {}

  Object.entries(serverErrors).forEach(([key, messages]) => {
    let field = key.replace(/^profile\./, '')

    if (field === 'name') field = 'firstName'
    if (field === 'terms_accepted') field = 'acceptTerms'

    mapped[field] = Array.isArray(messages) ? messages[0] : messages
  })

  return mapped
}
