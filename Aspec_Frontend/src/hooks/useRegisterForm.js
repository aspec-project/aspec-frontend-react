import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import do React Router
import { 
  FIELD_STEP, 
  validateStepForm, 
  buildPayload, 
  mapServerErrors 
} from "../utils/registerUtils";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const ENDPOINTS = {
  sectors: `${API_URL}/sectors`,
  locations: `${API_URL}/locations`,
  register: `${API_URL}/auth/register`,
};
const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

export function useRegisterForm(onNavigate) {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [sectors, setSectors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    business_name: "", sector_id: "", description: "", website_url: "",
    location_id: "", address: "",
    congregation: "", role_in_congregation: "",
    password: "", password_confirmation: "", acceptTerms: false,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const load = async (url) => {
      const res = await fetch(url, { headers: JSON_HEADERS, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? [];
    };

    Promise.all([load(ENDPOINTS.sectors), load(ENDPOINTS.locations)])
      .then(([s, l]) => { setSectors(s); setLocations(l); })
      .catch((err) => {
        if (err.name !== "AbortError") setListsError("Não foi possível carregar os dados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setListsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (submitError) setSubmitError("");
  };

  const bindField = (name) => ({
    name,
    value: formData[name],
    onChange: handleChange,
    style: { borderColor: errors[name] ? "#ef4444" : "#d4d8e3" },
  });

  const processStepValidation = (currentStep) => {
    const { errors: newErrors, isValid } = validateStepForm(currentStep, formData);
    setErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    if (processStepValidation(step)) setStep((prev) => prev + 1);
  };
  
  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  // Navegação
  const goToHome = () => navigate("/");
  const goToLogin = () => navigate("/login");

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
    else if (!Object.keys(known).length) setSubmitError(data.message ?? "Dados inválidos.");
  };

  const handleSubmit = async () => {
    if (submitting || !processStepValidation(step)) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(ENDPOINTS.register, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(buildPayload(formData, false)),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => navigate("/pending"), 2500);
      } else if (res.status === 422) {
        handleServerErrors(data);
      } else {
        setSubmitError(data.message ?? `Erro do servidor (${res.status}).`);
      }
    } catch {
      setSubmitError("Falha na rede.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    submitted,
    submitting,
    submitError,
    sectors,
    locations,
    listsLoading,
    listsError,
    formData,
    errors,
    handleChange,
    bindField,
    handleNextStep,
    handlePrevStep,
    handleSubmit,
    goToHome,
    goToLogin
  };
}