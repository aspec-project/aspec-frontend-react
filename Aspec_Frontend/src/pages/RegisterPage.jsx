import React from "react";
import { CheckCircle, ChevronRight, ChevronLeft, User, Building, MapPin, Church, Lock, AlertCircle } from "lucide-react";

import RegisterSidebar from "../components/register/RegisterSidebar";
import StepIndicator from "../components/register/StepIndicator";
import SuccessView from "../components/register/SuccessView";
import PersonalInfoStep from "../components/register/steps/PersonalInfoStep";
import BusinessInfoStep from "../components/register/steps/BusinessInfoStep";
import LocationStep from "../components/register/steps/LocationStep";
import CongregationStep from "../components/register/steps/CongregationStep";
import AccessStep from "../components/register/steps/PasswordStep";

import { useRegisterForm } from "../hooks/useRegisterForm";
import { PASSWORD_RULES, getPasswordCriteria } from "../utils/registerUtils";

const STEPS = [
  { label: "Dados Pessoais", icon: User },
  { label: "Negócio", icon: Building },
  { label: "Localização", icon: MapPin },
  { label: "Congregação", icon: Church },
  { label: "Acesso", icon: Lock },
];

const inputCls = "w-full px-4 py-2.5 rounded-xl border text-sm text-black outline-none transition";

export default function RegisterPage({ onNavigate }) {
  const {
    step, submitted, submitting, submitError,
    sectors, locations, listsLoading, listsError,
    formData, errors, handleChange, bindField,
    handleNextStep, handlePrevStep, handleSubmit,
    goToHome, goToLogin
  } = useRegisterForm(onNavigate);

  if (submitted) return <SuccessView />;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7f2" }}>
      
      {/* Sidebar do Registo com o redirecionamento direto para a página inicial */}
      <RegisterSidebar onNavigateHome={goToHome} />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <h2 className="mb-1 text-2xl font-bold" style={{ color: "#0d1f35" }}>
            Candidatura a Membro
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Já é membro?{" "}
            <button onClick={goToLogin} className="cursor-pointer font-medium text-[#8a7043]">
              Entrar aqui
            </button>
          </p>

          <StepIndicator step={step} steps={STEPS} />

          {step === 0 && <PersonalInfoStep bind={bindField} errors={errors} inputCls={inputCls} />}
          {step === 1 && <BusinessInfoStep bind={bindField} errors={errors} inputCls={inputCls} sectors={sectors} listsLoading={listsLoading} listsError={listsError} />}
          {step === 2 && <LocationStep bind={bindField} errors={errors} inputCls={inputCls} locations={locations} listsLoading={listsLoading} listsError={listsError} />}
          {step === 3 && <CongregationStep bind={bindField} errors={errors} inputCls={inputCls} />}
          {step === 4 && <AccessStep bind={bindField} errors={errors} inputCls={inputCls} formData={formData} handleChange={handleChange} passCriteria={getPasswordCriteria(formData.password)} PASSWORD_RULES={PASSWORD_RULES} />}

          {submitError && (
            <div className="flex items-center gap-1 text-xs text-red-500 mt-4">
              <AlertCircle size={13} />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                disabled={submitting}
                onClick={handlePrevStep}
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
                <><CheckCircle size={15} /> {submitting ? "A enviar..." : "Submeter Candidatura"}</>
              ) : (
                <>Continuar <ChevronRight size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}