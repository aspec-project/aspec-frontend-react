export default function LoginSidebar({ onNavigateHome }) {
  const stats = [
    { num: "320+", label: "Membros" },
    { num: "18", label: "Delegações" },
    { num: "120+", label: "Eventos/Ano" },
  ];

  return (
    <div
      className="relative flex w-full flex-col justify-between overflow-hidden p-6 md:w-1/2 md:p-12"
      style={{ background: "linear-gradient(135deg, #0d1f35 0%, #060f1a 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1515169067868-5387ec356754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative z-10">
        <button type="button" onClick={onNavigateHome} className="w-48 max-w-full cursor-pointer md:w-70">
          <img src="/images/aspec-logo-sf.png" alt="ASPEC" className="h-auto w-full object-contain" />
        </button>
      </div>
      <div className="relative z-10 hidden md:block">
        <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: "#8a7043" }} />
        <h2 className="text-white mb-4" style={{ fontSize: "1.75rem" }}>
          Bem-vindo de volta à comunidade ASPEC
        </h2>
        <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          Aceda ao seu perfil profissional, gira as suas inscrições em eventos e conecte-se com a rede de confiança cristã em Portugal.
        </p>
      </div>
      <div className="relative z-10 hidden gap-6 md:flex">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-bold" style={{ color: "#8a7043" }}>{s.num}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
