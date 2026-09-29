import { CheckCircle } from "lucide-react";

export default function SuccessView() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8f7f2" }}>
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