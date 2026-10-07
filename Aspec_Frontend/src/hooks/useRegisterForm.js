import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  ensureCsrfCookie,
  normalizeError,
  extractList,
} from "../services/api";
import {
  FIELD_STEP,
  validateStepForm,
  buildPayload,
  mapServerErrors
} from "../utils/registerUtils";

export function useRegisterForm() {
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

    Promise.all([
      api.get("/sectors", { signal: controller.signal }),
      api.get("/locations", { signal: controller.signal }),
    ])
      .then(([sRes, lRes]) => {
        setSectors(extractList(sRes.data.data));
        setLocations(extractList(lRes.data.data));
      })
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") setListsError("Não foi possível carregar os dados.");
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

  const goToHome = () => navigate("/");
  const goToLogin = () => navigate("/login");

  const handleServerErrors = (fieldErrors, fallbackMessage) => {
    const known = {};
    const extra = [];
    Object.entries(mapServerErrors(fieldErrors)).forEach(([field, msg]) => {
      if (FIELD_STEP[field] !== undefined) known[field] = msg;
      else extra.push(msg);
    });

    setErrors(known);
    const firstStep = Math.min(...Object.keys(known).map((f) => FIELD_STEP[f]));
    if (Number.isFinite(firstStep)) setStep(firstStep);

    if (extra.length) setSubmitError(extra.join(" "));
    else if (!Object.keys(known).length) setSubmitError(fallbackMessage ?? "Dados inválidos.");
  };

  const handleSubmit = async () => {
    if (submitting || !processStepValidation(step)) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      /*
       * Obtém o cookie CSRF do Sanctum antes de enviar o formulário.
       */
      await ensureCsrfCookie();

      await api.post("/auth/register", buildPayload(formData));

      setSubmitted(true);
      setTimeout(() => navigate("/pendente"), 2500);
    } catch (err) {
      const { status, message, fieldErrors } = normalizeError(err);
      if (status === 422) handleServerErrors(fieldErrors, message);
      else setSubmitError(message);
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
