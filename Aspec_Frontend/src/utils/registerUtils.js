export const FIELD_STEP = {
  firstName: 0, lastName: 0, email: 0, phone: 0,
  business_name: 1, sector_id: 1, description: 1, website_url: 1,
  location_id: 2, address: 2,
  congregation: 3, role_in_congregation: 3,
  password: 4, password_confirmation: 4, acceptTerms: 4,
};

export const PASSWORD_RULES = [
  ["minLength", "8 caracteres"], ["hasUpper", "1 maiúscula"],
  ["hasLower", "1 minúscula"], ["hasNumber", "1 número"], ["hasSpecial", "1 símbolo"],
];

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePhone = (phone) => /^(\+351)?(9[1236]\d{7}|2\d{8}|30\d{7})$/.test(phone.replace(/[\s\-()]/g, ""));

export const getPasswordCriteria = (pwd) => ({
  minLength: pwd.length >= 8,
  hasUpper: /[A-Z]/.test(pwd),
  hasLower: /[a-z]/.test(pwd),
  hasNumber: /[0-9]/.test(pwd),
  hasSpecial: /[^A-Za-z0-9]/.test(pwd),
});

export const isPasswordValid = (pwd) => Object.values(getPasswordCriteria(pwd)).every(Boolean);

export const validateStepForm = (currentStep, formData) => {
  const newErrors = {};

  if (currentStep === 0) {
    if (!formData.firstName.trim()) newErrors.firstName = "Obrigatório.";
    if (!formData.lastName.trim()) newErrors.lastName = "Obrigatório.";
    if (!formData.email.trim()) newErrors.email = "Obrigatório.";
    else if (!validateEmail(formData.email)) newErrors.email = "Inválido.";
    if (!formData.phone.trim()) newErrors.phone = "Obrigatório.";
    else if (!validatePhone(formData.phone)) newErrors.phone = "Inválido.";
  }

  if (currentStep === 1) {
    if (!formData.business_name.trim()) newErrors.business_name = "Obrigatório.";
    if (!formData.sector_id) newErrors.sector_id = "Selecione o setor.";
    if (formData.website_url.trim() && !/^https?:\/\/.+/i.test(formData.website_url)) {
      newErrors.website_url = "Inválido.";
    }
  }

  if (currentStep === 2) {
    if (!formData.location_id) newErrors.location_id = "Selecione o núcleo.";
    if (!formData.address.trim()) newErrors.address = "Obrigatório.";
  }

  if (currentStep === 3) {
    if (!formData.congregation.trim()) newErrors.congregation = "Obrigatório.";
    if (!formData.role_in_congregation.trim()) newErrors.role_in_congregation = "Obrigatório.";
  }

  if (currentStep === 4) {
    if (!formData.password) newErrors.password = "Obrigatória.";
    else if (!isPasswordValid(formData.password)) newErrors.password = "Requisitos mínimos não cumpridos.";
    if (formData.password !== formData.password_confirmation) newErrors.password_confirmation = "Não coincidem.";
    if (!formData.acceptTerms) newErrors.acceptTerms = "Obrigatório aceitar.";
  }

  return {
    errors: newErrors,
    isValid: Object.keys(newErrors).length === 0
  };
};

export const buildPayload = (f) => {
  const payload = {
    email: f.email.trim(),
    password: f.password,
    phone: f.phone.replace(/[\s\-()]/g, ""),
    name: `${f.firstName.trim()} ${f.lastName.trim()}`,
    business_name: f.business_name.trim(),
    sector_id: f.sector_id,
    location_id: f.location_id,
    congregation: f.congregation.trim(),
    role_in_congregation: f.role_in_congregation.trim(),
    address: f.address.trim(),
  };

  if (f.description.trim()) payload.description = f.description.trim();
  if (f.website_url.trim()) payload.website_url = f.website_url.trim();

  return payload;
};

export const mapServerErrors = (serverErrors = {}) => {
  const mapped = {};
  Object.entries(serverErrors).forEach(([key, msgs]) => {
    let field = key.replace(/^profile\./, "");
    if (field === "name") field = "firstName";
    mapped[field] = Array.isArray(msgs) ? msgs[0] : msgs;
  });
  return mapped;
};