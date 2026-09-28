import React, { useEffect, useState } from "react";
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

// ─── Configuração da API (se a equipa mudar algo, é só aqui) ───────────────
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const ENDPOINTS = {
  sectors: `${API_URL}/sectors`,
  locations: `${API_URL}/locations`,
  register: `${API_URL}/auth/register`,
};
// Sem "Accept: application/json" o Laravel responde a erros com redirect (302) e não 422.
const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

// false = payload plano (igual ao FormRequest) | true = formato do Postman (dentro de "profile")
const NESTED_PROFILE = false;

const STEPS = [
  { label: "Dados Pessoais", icon: User },
  { label: "Negócio", icon: Building },
  { label: "Localização", icon: MapPin },
  { label: "Congregação", icon: Church },
  { label: "Acesso", icon: Lock },
];

// Passo em que cada campo aparece (para saltar ao passo com erro devolvido pelo servidor)
const FIELD_STEP = {
  firstName: 0,
  lastName: 0,
  email: 0,
  phone: 0,
  business_name: 1,
  sector_id: 1,
  description: 1,
  website_url: 1,
  location_id: 2,
  address: 2,
  congregation: 3,
  role_in_congregation: 3,
  password: 4,
  password_confirmation: 4,
  acceptTerms: 4,
};

const PASSWORD_RULES = [
  ["minLength", "8 caracteres"],
  ["hasUpper", "1 maiúscula"],
  ["hasLower", "1 minúscula"],
  ["hasNumber", "1 número"],
  ["hasSpecial", "1 símbolo"],
];

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition";

// Aceita [{id, name}] ou { data: [{id, name}] }
const toList = (json) => (Array.isArray(json) ? json : json?.data ?? []);

// Converte o formulário no que o backend espera (nomes iguais ao RegisterMemberRequest)
const buildPayload = (f) => {
  const account = {
    email: f.email.trim(),
    password: f.password,
    password_confirmation: f.password_confirmation,
    phone: f.phone.replace(/[\s\-()]/g, ""),
  };
  const profile = {
    name: `${f.firstName.trim()} ${f.lastName.trim()}`,
    business_name: f.business_name.trim(),
    sector_id: f.sector_id,
    location_id: f.location_id,
    congregation: f.congregation.trim(),
    role_in_congregation: f.role_in_congregation.trim(),
    address: f.address.trim(),
  };
  if (f.description.trim()) profile.description = f.description.trim();
  if (f.website_url.trim()) profile.website_url = f.website_url.trim();

  return NESTED_PROFILE ? { ...account, profile } : { ...account, ...profile };
};

// Erros 422 do Laravel: { errors: { campo: ["msg"] } } → { campo: "msg" } com os nomes do formulário
const mapServerErrors = (serverErrors = {}) => {
  const mapped = {};
  Object.entries(serverErrors).forEach(([key, msgs]) => {
    let field = key.replace(/^profile\./, "");
    if (field === "name") field = "firstName"; // o backend só tem "name"
    mapped[field] = Array.isArray(msgs) ? msgs[0] : msgs;
  });
  return mapped;
};

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function RegisterPage({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [sectors, setSectors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    business_name: "",
    sector_id: "",
    description: "",
    website_url: "",
    location_id: "",
    address: "",
    congregation: "",
    role_in_congregation: "",
    password: "",
    password_confirmation: "",
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({});

  // Carrega setores e núcleos da base de dados
  useEffect(() => {
    const controller = new AbortController();

    const load = async (url) => {
      const res = await fetch(url, { headers: JSON_HEADERS, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return toList(await res.json());
    };

    Promise.all([load(ENDPOINTS.sectors), load(ENDPOINTS.locations)])
      .then(([s, l]) => {
        setSectors(s);
        setLocations(l);
      })
      .catch((err) => {
        if (err.name !== "AbortError")
          setListsError(
            "Não foi possível carregar os setores e núcleos. Recarregue a página."
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setListsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    return /^(\+351)?(9[1236]\d{7}|2\d{8}|30\d{7})$/.test(cleanPhone);
  };

  const getPasswordCriteria = (pwd) => ({
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  });

  const isPasswordValid = (pwd) => Object.values(getPasswordCriteria(pwd)).every(Boolean);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (submitError) setSubmitError("");
  };

  // Props comuns dos inputs: name, value, onChange e cor da borda
  const bind = (name) => ({
    name,
    value: formData[name],
    onChange: handleChange,
    style: { borderColor: errors[name] ? "#ef4444" : "#d4d8e3" },
  });

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = "O primeiro nome é obrigatório.";
      if (!formData.lastName.trim()) newErrors.lastName = "O apelido é obrigatório.";
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
      if (!formData.business_name.trim())
        newErrors.business_name = "O nome do negócio é obrigatório.";
      if (!formData.sector_id) newErrors.sector_id = "Selecione o setor de atividade.";
      if (formData.website_url.trim() && !/^https?:\/\/.+/i.test(formData.website_url)) {
        newErrors.website_url = "Introduza um URL válido (ex: https://meusite.pt).";
      }
    }

    if (currentStep === 2) {
      if (!formData.location_id) newErrors.location_id = "Selecione o núcleo regional.";
      if (!formData.address.trim()) newErrors.address = "A morada é obrigatória.";
    }

    if (currentStep === 3) {
      if (!formData.congregation.trim())
        newErrors.congregation = "O nome da congregação/igreja é obrigatório.";
      if (!formData.role_in_congregation.trim())
        newErrors.role_in_congregation = "O cargo ou função na igreja é obrigatório.";
    }

    if (currentStep === 4) {
      if (!formData.password) {
        newErrors.password = "A password é obrigatória.";
      } else if (!isPasswordValid(formData.password)) {
        newErrors.password = "A password não cumpre os requisitos mínimos de segurança.";
      }
      if (formData.password !== formData.password_confirmation) {
        newErrors.password_confirmation = "As passwords não coincidem.";
      }
      if (!formData.acceptTerms) {
        newErrors.acceptTerms = "Tem de concordar com os Termos e Condições para continuar.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) setStep((prev) => prev + 1);
  };

  // Mostra os erros do servidor nos campos e salta ao primeiro passo com erro
  const handleServerErrors = (data) => {
    const known = {};
    const extra = [];
    Object.entries(mapServerErrors(data.errors)).forEach(([field, msg]) => {
      if (FIELD_STEP[field] !== undefined) known[field] = msg;
      else extra.push(msg);
    });

    setErrors(known);
    const firstStep = Math.min(...Object.keys(known).map((f) => FIELD_STEP[f]));
    if (Number.isFinite(firstStep)) setStep(firstStep);

    if (extra.length) setSubmitError(extra.join(" "));
    else if (!Object.keys(known).length)
      setSubmitError(data.message ?? "Os dados enviados não são válidos.");
  };

  const handleSubmit = async () => {
    if (submitting || !validateStep(step)) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(ENDPOINTS.register, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(buildPayload(formData)),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => onNavigate("pending"), 2500);
      } else if (res.status === 422) {
        handleServerErrors(data);
      } else {
        setSubmitError(data.message ?? `Erro do servidor (${res.status}). Tente novamente.`);
      }
    } catch {
      setSubmitError("Não foi possível contactar o servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
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
          <p className="text-sm text-gray-500">A redirecionar para a confirmação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7f2" }}>
      {/* Painel Esquerdo */}
      <div
        className="w-5/12 flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1f35 0%, #060f1a 100%)" }}
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
          <h2 className="text-white mb-4 font-bold" style={{ fontSize: "1.6rem" }}>
            Junte-se à rede de confiança ASPEC
          </h2>
          <p
            className="text-sm mb-8"
            style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}
          >
            Ao tornar-se membro, ganha acesso ao diretório completo, pode participar em
            eventos exclusivos e fazer parte de uma comunidade de profissionais cristãos
            comprometidos com a excelência.
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
        <div className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                          i < step ? "#8a7043" : i === step ? "#0d1f35" : "#e8eef5",
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
                      style={{ backgroundColor: i < step ? "#8a7043" : "#e8eef5" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* PASSO 0 — Dados Pessoais */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
                1. Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primeiro nome *" error={errors.firstName}>
                  <input type="text" {...bind("firstName")} maxLength={120} placeholder="João" className={inputCls} />
                </Field>
                <Field label="Apelido *" error={errors.lastName}>
                  <input type="text" {...bind("lastName")} maxLength={120} placeholder="Silva" className={inputCls} />
                </Field>
              </div>
              <Field label="Email *" error={errors.email}>
                <input type="email" {...bind("email")} maxLength={255} placeholder="joao.silva@email.pt" className={inputCls} />
              </Field>
              <Field label="Contacto telefónico *" error={errors.phone}>
                <input type="tel" {...bind("phone")} maxLength={20} placeholder="+351 9xx xxx xxx" className={inputCls} />
              </Field>
            </div>
          )}

          {/* PASSO 1 — Negócio */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
                2. Informação do Negócio
              </h3>
              <Field label="Nome do Negócio / Empresa *" error={errors.business_name}>
                <input
                  type="text"
                  {...bind("business_name")}
                  maxLength={255}
                  placeholder="Ex: Construções Silva & Filhos"
                  className={inputCls}
                />
              </Field>
              <Field label="Setor de Atividade *" error={errors.sector_id || listsError}>
                <select
                  {...bind("sector_id")}
                  disabled={listsLoading || !!listsError}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">
                    {listsLoading ? "A carregar..." : "Selecionar setor..."}
                  </option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição breve do negócio" error={errors.description}>
                <textarea
                  {...bind("description")}
                  maxLength={1000}
                  rows={3}
                  placeholder="Descreve brevemente os teus produtos/serviços..."
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field label="Website (opcional)" error={errors.website_url}>
                <input
                  type="url"
                  {...bind("website_url")}
                  maxLength={255}
                  placeholder="https://www.meusite.pt"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* PASSO 2 — Localização */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
                3. Localização e Núcleo Regional
              </h3>
              <Field label="Núcleo Regional / Delegação *" error={errors.location_id || listsError}>
                <select
                  {...bind("location_id")}
                  disabled={listsLoading || !!listsError}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">
                    {listsLoading ? "A carregar..." : "Selecionar núcleo..."}
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Morada *" error={errors.address}>
                <input
                  type="text"
                  {...bind("address")}
                  maxLength={255}
                  placeholder="Ex: Rua das Flores, 11 - 3.º Esquerdo"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* PASSO 3 — Congregação */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
                4. Informação da Congregação
              </h3>
              <Field label="Nome da Igreja / Congregação *" error={errors.congregation}>
                <input
                  type="text"
                  {...bind("congregation")}
                  maxLength={255}
                  placeholder="Ex: Igreja Evangélica da Graça / Comunidade Cristã de Lisboa"
                  className={inputCls}
                />
              </Field>
              <Field label="Cargo / Função na Igreja *" error={errors.role_in_congregation}>
                <input
                  type="text"
                  {...bind("role_in_congregation")}
                  maxLength={255}
                  placeholder="Ex: Membro, Diácono, Líder de Jovens, Pastor, Voluntário"
                  className={inputCls}
                />
              </Field>
              <div
                className="rounded-xl p-4 text-sm mt-2"
                style={{ backgroundColor: "#f5f3ee", border: "1px solid #d4d8e3" }}
              >
                <p className="font-medium mb-1" style={{ color: "#0d1f35" }}>
                  Aprovação da candidatura
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A ASPEC valoriza o testemunho local. Estas informações servem para
                  garantir a autenticidade e ligação à comunidade cristã.
                </p>
              </div>
            </div>
          )}

          {/* PASSO 4 — Acesso */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
                5. Criar Acesso
              </h3>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Password *</label>
                <input
                  type="password"
                  {...bind("password")}
                  placeholder="Mínimo 8 caracteres"
                  className={inputCls}
                />
                <div
                  className="mt-2 p-3 bg-white rounded-xl border text-xs space-y-1"
                  style={{ borderColor: "#d4d8e3" }}
                >
                  <p className="font-medium text-gray-600 mb-1">
                    A password deve conter no mínimo:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-gray-400">
                    {PASSWORD_RULES.map(([key, text]) => (
                      <span
                        key={key}
                        className={passCriteria[key] ? "text-green-600 font-medium" : ""}
                      >
                        {passCriteria[key] ? "✓" : "•"} {text}
                      </span>
                    ))}
                  </div>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <Field label="Confirmar password *" error={errors.password_confirmation}>
                <input
                  type="password"
                  {...bind("password_confirmation")}
                  placeholder="Repetir a password"
                  className={inputCls}
                />
              </Field>

              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: "#f5f3ee",
                  border: errors.acceptTerms ? "1px solid #ef4444" : "1px solid #d4d8e3",
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
                  da ASPEC, comprometendo-me a agir com integridade e princípios cristãos
                  nas minhas relações dentro da associação.
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

          {/* Erro geral do servidor / rede */}
          {submitError && (
            <div className="flex items-center gap-1 text-xs text-red-500 mt-4">
              <AlertCircle size={13} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium cursor-pointer border text-sm transition hover:bg-gray-100 text-gray-700 disabled:opacity-60"
                style={{ borderColor: "#d4d8e3" }}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={step === STEPS.length - 1 ? handleSubmit : handleNextStep}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium cursor-pointer text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#0d1f35", color: "white" }}
            >
              {step === STEPS.length - 1 ? (
                <>
                  <CheckCircle size={15} /> {submitting ? "A enviar..." : "Submeter Candidatura"}
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