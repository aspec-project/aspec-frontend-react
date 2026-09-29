import { CheckCircle } from "lucide-react";

export default function StepIndicator({ step, steps }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: i < step ? "#8a7043" : i === step ? "#0d1f35" : "#e8eef5",
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
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1.5 mt-[-10px]"
                style={{ backgroundColor: i < step ? "#8a7043" : "#e8eef5" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}