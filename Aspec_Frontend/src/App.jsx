export default function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <h1 className="text-4xl font-bold text-foreground mb-4">
        ASPEC — Estilos Base e Tema Configurados!
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">
        O CSS inicial e a paleta de cores oficial da ASPEC estão prontos a ser utilizados.
      </p>
      <button className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
        Botão ASPEC →
      </button>
    </div>
  );
}