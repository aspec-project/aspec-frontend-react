import React, { useState } from "react";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Building,
  MapPin,
  Church,
  Lock,
  AlertCircle,
} from "lucide-react";

const SECTORS = [
  "Construção Civil",
  "Tecnologia & Software",
  "Serviços Jurídicos",
  "Alimentação & Restauração",
  "Saúde & Bem-estar",
  "Contabilidade & Finanças",
  "Educação & Formação",
  "Imobiliário",
  "Comércio a Retalho",
  "Consultoria",
  "Marketing & Comunicação",
  "Outro",
];

const NUCLEOS = [
  "Lisboa",
  "Porto",
  "Braga",
  "Coimbra",
  "Aveiro",
  "Setúbal",
  "Faro",
  "Évora",
  "Viseu",
  "Leiria",
  "Santarém",
  "Viana do Castelo",
];

const STEPS = [
  { label: "Dados Pessoais", icon: User },
  { label: "Negócio", icon: Building },
  { label: "Localização", icon: MapPin },
  { label: "Congregação", icon: Church },
  { label: "Acesso", icon: Lock },
];

export default function RegisterPage({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    sector: "",
    description: "",
    website: "",
    nucleo: "",
    address: "",
    churchName: "",
    churchRole: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({});

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    return /^(\+351)?(9[1236]\d{7}|2\d{8}|30\d{7})$/.test(cleanPhone);
  };

  const getPasswordCriteria = (pwd) => ({
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  });

  const isPasswordValid = (pwd) => {
    const c = getPasswordCriteria(pwd);
    return c.minLength && c.hasUpper && c.hasLower && c.hasNumber && c.hasSpecial;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 0) {
      if (!formData.firstName.trim())
        newErrors.firstName = "O primeiro nome é obrigatório.";
      if (!formData.lastName.trim())
        newErrors.lastName = "O apelido é obrigatório.";
      if (!formData.email.trim()) {
        newErrors.email = "O e-mail é obrigatório.";
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Introduza um e-mail válido.";
      }

      if (!formData.phone.trim()) {
        newErrors.phone = "O contacto telefónico é obrigatório.";
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone =
          "Introduza um número de contacto válido (ex: 912345678 ou +351 912345678).";
      }
    }

    if (currentStep === 1) {
      if (!formData.businessName.trim())
        newErrors.businessName = "O nome do negócio é obrigatório.";
      if (!formData.sector)
        newErrors.sector = "Selecione o setor de atividade.";
      if (
        formData.website.trim() &&
        !/^https?:\/\/.+/i.test(formData.website)
      ) {
        newErrors.website =
          "Introduza um URL válido (ex: https://meusite.pt).";
      }
    }

    if (currentStep === 2) {
      if (!formData.nucleo) newErrors.nucleo = "Selecione o núcleo regional.";
      if (!formData.address.trim()) newErrors.address = "A morada é obrigatória.";
    }

    if (currentStep === 3) {
      if (!formData.churchName.trim())
        newErrors.churchName = "O nome da congregação/igreja é obrigatório.";
      if (!formData.churchRole.trim())
        newErrors.churchRole = "O cargo ou função na igreja é obrigatório.";
    }

    if (currentStep === 4) {
      if (!formData.password) {
        newErrors.password = "A password é obrigatória.";
      } else if (!isPasswordValid(formData.password)) {
        newErrors.password =
          "A password não cumpre os requisitos mínimos de segurança.";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "As passwords não coincidem.";
      }

      if (!formData.acceptTerms) {
        newErrors.acceptTerms =
          "Tem de concordar com os Termos e Condições para continuar.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = () => {
    if (!validateStep(step)) return;

    setSubmitted(true);
    setTimeout(() => onNavigate("pending"), 2500);
  };

  const passCriteria = getPasswordCriteria(formData.password);

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8f7f2" }}
      >
        <div className="text-center max-w-sm px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#e8f5ee" }}
          >
            <CheckCircle size={40} style={{ color: "#2d8e5a" }} />
          </div>
          <h2 style={{ color: "#0d1f35" }} className="mb-3 text-2xl font-bold">
            Candidatura enviada!
          </h2>
          <p className="text-sm text-gray-500">
            A redirecionar para a confirmação...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7f2" }}>
      {/* Painel Esquerdo */}
      <div
        className="w-5/12 flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1f35 0%, #060f1a 100%)",
        }}
      >
        <div className="relative z-10">
          <button onClick={() => onNavigate("home")} className="cursor-pointer">
            <img
              src="/images/log-branco.png"
              alt="ASPEC"
              className="h-10 w-70 object-contain"
            />
          </button>
        </div>
        <div className="relative z-10">
          <h2
            className="text-white mb-4 font-bold"
            style={{ fontSize: "1.6rem" }}
          >
            Junte-se à rede de confiança ASPEC
          </h2>
          <p
            className="text-sm mb-8"
            style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}
          >
            Ao tornar-se membro, ganha acesso ao diretório completo, pode
            participar em eventos exclusivos e fazer parte de uma comunidade de
            profissionais cristãos comprometidos com a excelência.
          </p>
          <div className="space-y-3">
            {[
              "Perfil profissional verificado",
              "Diretório de confiança nacional",
              "Eventos de networking exclusivos",
              "Avaliações entre membros",
            ].map((b) => (
              <div
                key={b}
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                <CheckCircle size={14} style={{ color: "#8a7043" }} /> {b}
              </div>
            ))}
          </div>
        </div>
        <div
          className="relative z-10 text-xs"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          A sua candidatura será revista por um administrador antes da aprovação.
        </div>
      </div>

      {/* Painel Direito (Formulário) */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <h2 className="mb-1 text-2xl font-bold" style={{ color: "#0d1f35" }}>
            Candidatura a Membro
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Já é membro?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="cursor-pointer font-medium"
              style={{ color: "#8a7043" }}
            >
              Entrar aqui
            </button>
          </p>

          {/* Indicador de Passos */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor:
                          i < step
                            ? "#8a7043"
                            : i === step
                            ? "#0d1f35"
                            : "#e8eef5",
                        color: i <= step ? "white" : "#999",
                      }}
                    >
                      {i < step ? <CheckCircle size={16} /> : <Icon size={15} />}
                    </div>
                    <span
                      className="text-[11px] mt-1 font-medium"
                      style={{ color: i === step ? "#0d1f35" : "#999" }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-1.5 mt-[-10px]"
                      style={{
                        backgroundColor: i < step ? "#8a7043" : "#e8eef5",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* PASSO 0 — Dados Pessoais */}
          {step === 0 && (
            <div className="space-y-4">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "#0d1f35" }}
              >
                1. Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Primeiro nome *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="João"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                    style={{
                      borderColor: errors.firstName ? "#ef4444" : "#d4d8e3",
                    }}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Apelido *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Silva"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                    style={{
                      borderColor: errors.lastName ? "#ef4444" : "#d4d8e3",
                    }}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="joao.silva@email.pt"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{ borderColor: errors.email ? "#ef4444" : "#d4d8e3" }}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Contacto telefónico *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+351 9xx xxx xxx"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{ borderColor: errors.phone ? "#ef4444" : "#d4d8e3" }}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* PASSO 1 — Negócio */}
          {step === 1 && (
            <div className="space-y-4">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "#0d1f35" }}
              >
                2. Informação do Negócio
              </h3>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Nome do Negócio / Empresa *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Ex: Construções Silva & Filhos"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.businessName ? "#ef4444" : "#d4d8e3",
                  }}
                />
                {errors.businessName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.businessName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Setor de Atividade *
                </label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none bg-white transition"
                  style={{
                    borderColor: errors.sector ? "#ef4444" : "#d4d8e3",
                  }}
                >
                  <option value="">Selecionar setor...</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.sector && (
                  <p className="text-xs text-red-500 mt-1">{errors.sector}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Descrição breve do negócio
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none resize-none"
                  style={{ borderColor: "#d4d8e3" }}
                  rows={3}
                  placeholder="Descreve brevemente os teus produtos/serviços..."
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Website (opcional)
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.meusite.pt"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.website ? "#ef4444" : "#d4d8e3",
                  }}
                />
                {errors.website && (
                  <p className="text-xs text-red-500 mt-1">{errors.website}</p>
                )}
              </div>
            </div>
          )}

          {/* PASSO 2 — Localização */}
          {step === 2 && (
            <div className="space-y-4">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "#0d1f35" }}
              >
                3. Localização e Núcleo Regional
              </h3>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Núcleo Regional / Delegação *
                </label>
                <select
                  name="nucleo"
                  value={formData.nucleo}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none bg-white transition"
                  style={{
                    borderColor: errors.nucleo ? "#ef4444" : "#d4d8e3",
                  }}
                >
                  <option value="">Selecionar núcleo...</option>
                  {NUCLEOS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {errors.nucleo && (
                  <p className="text-xs text-red-500 mt-1">{errors.nucleo}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Morada *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ex: Rua das Flores, 11 - 3.º Esquerdo"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.address ? "#ef4444" : "#d4d8e3",
                  }}
                />
                {errors.address && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PASSO 3 — Congregação */}
          {step === 3 && (
            <div className="space-y-4">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "#0d1f35" }}
              >
                4. Informação da Congregação
              </h3>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Nome da Igreja / Congregação *
                </label>
                <input
                  type="text"
                  name="churchName"
                  value={formData.churchName}
                  onChange={handleChange}
                  placeholder="Ex: Igreja Evangélica da Graça / Comunidade Cristã de Lisboa"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.churchName ? "#ef4444" : "#d4d8e3",
                  }}
                />
                {errors.churchName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.churchName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Cargo / Função na Igreja *
                </label>
                <input
                  type="text"
                  name="churchRole"
                  value={formData.churchRole}
                  onChange={handleChange}
                  placeholder="Ex: Membro, Diácono, Líder de Jovens, Pastor, Voluntário"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.churchRole ? "#ef4444" : "#d4d8e3",
                  }}
                />
                {errors.churchRole && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.churchRole}
                  </p>
                )}
              </div>

              <div
                className="rounded-xl p-4 text-sm mt-2"
                style={{
                  backgroundColor: "#f5f3ee",
                  border: "1px solid #d4d8e3",
                }}
              >
                <p className="font-medium mb-1" style={{ color: "#0d1f35" }}>
                  Aprovação da candidatura
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A ASPEC valoriza o testemunho local. Estas informações servem
                  para garantir a autenticidade e ligação à comunidade cristã.
                </p>
              </div>
            </div>
          )}

          {/* PASSO 4 — Acesso */}
          {step === 4 && (
            <div className="space-y-4">
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: "#0d1f35" }}
              >
                5. Criar Acesso
              </h3>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.password ? "#ef4444" : "#d4d8e3",
                  }}
                />

                {/* Validações visuais da Password */}
                <div
                  className="mt-2 p-3 bg-white rounded-xl border text-xs space-y-1"
                  style={{ borderColor: "#d4d8e3" }}
                >
                  <p className="font-medium text-gray-600 mb-1">
                    A password deve conter no mínimo:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-gray-400">
                    <span
                      className={
                        passCriteria.minLength
                          ? "text-green-600 font-medium"
                          : ""
                      }
                    >
                      {passCriteria.minLength ? "✓" : "•"} 8 caracteres
                    </span>
                    <span
                      className={
                        passCriteria.hasUpper
                          ? "text-green-600 font-medium"
                          : ""
                      }
                    >
                      {passCriteria.hasUpper ? "✓" : "•"} 1 maiúscula 
                    </span>
                    <span
                      className={
                        passCriteria.hasLower
                          ? "text-green-600 font-medium"
                          : ""
                      }
                    >
                      {passCriteria.hasLower ? "✓" : "•"} 1 minúscula
                    </span>
                    <span
                      className={
                        passCriteria.hasNumber
                          ? "text-green-600 font-medium"
                          : ""
                      }
                    >
                      {passCriteria.hasNumber ? "✓" : "•"} 1 número
                    </span>
                    <span
                      className={
                        passCriteria.hasSpecial
                          ? "text-green-600 font-medium"
                          : ""
                      }
                    >
                      {passCriteria.hasSpecial ? "✓" : "•"} 1 símbolo
                    </span>
                  </div>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Confirmar password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repetir a password"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition"
                  style={{
                    borderColor: errors.confirmPassword
                      ? "#ef4444"
                      : "#d4d8e3",
                  }}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: "#f5f3ee",
                  border: errors.acceptTerms
                    ? "1px solid #ef4444"
                    : "1px solid #d4d8e3",
                }}
              >
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-0.5 cursor-pointer"
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-xs text-gray-600 cursor-pointer leading-relaxed"
                >
                  Concordo com os{" "}
                  <span className="underline" style={{ color: "#0d1f35" }}>
                    Termos e Condições
                  </span>{" "}
                  e o{" "}
                  <span className="underline" style={{ color: "#0d1f35" }}>
                    Código de Conduta
                  </span>{" "}
                  da ASPEC, comprometendo-me a agir com integridade e princípios
                  cristãos nas minhas relações dentro da associação.
                </label>
              </div>
              {errors.acceptTerms && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={13} />
                  <span>{errors.acceptTerms}</span>
                </div>
              )}
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium cursor-pointer border text-sm transition hover:bg-gray-100 text-gray-700"
                style={{ borderColor: "#d4d8e3" }}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
            )}

            <button
              type="button"
              onClick={
                step === STEPS.length - 1 ? handleSubmit : handleNextStep
              }
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium cursor-pointer text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0d1f35", color: "white" }}
            >
              {step === STEPS.length - 1 ? (
                <>
                  <CheckCircle size={15} /> Submeter Candidatura
                </>
              ) : (
                <>
                  Continuar <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}