import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";

const baseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const apiUrl = baseUrl.endsWith("/api")
  ? baseUrl
  : `${baseUrl}/api`;

// A cor vem da categoria criada no backend.
// A cor de recurso evita erros caso a API envie uma cor inválida.
function obterCor(categoria) {
  const cor = categoria?.color;

  return typeof cor === "string" &&
    /^#[0-9a-f]{6}$/i.test(cor)
    ? cor
    : "#0D1F35";
}

// Escolhe texto branco ou escuro para manter o badge legível.
function obterCorTexto(cor) {
  const canais = [1, 3, 5].map((inicio) => {
    const canal = parseInt(cor.slice(inicio, inicio + 2), 16) / 255;

    return canal <= 0.04045
      ? canal / 12.92
      : ((canal + 0.055) / 1.055) ** 2.4;
  });

  const luminancia =
    0.2126 * canais[0] +
    0.7152 * canais[1] +
    0.0722 * canais[2];

  const contrasteBranco = 1.05 / (luminancia + 0.05);
  const contrastePreto = (luminancia + 0.05) / 0.05;

  return contrasteBranco >= contrastePreto
    ? "#FFFFFF"
    : "#000000";
}

function obterInicioEvento(evento) {
  const data = evento.event_date;
  const hora = evento.event_start_time;

  if (
    typeof data !== "string" ||
    typeof hora !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)
  ) {
    return null;
  }

  const inicio = new Date(`${data}T${hora}`);

  return Number.isNaN(inicio.getTime())
    ? null
    : inicio;
}

function formatarData(evento) {
  const inicio = obterInicioEvento(evento);

  if (!inicio) return "Data por confirmar";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(inicio);
}

function formatarHorario(inicio, fim) {
  if (!inicio) return "Horário por confirmar";

  const horaInicio = inicio.slice(0, 5);
  const horaFim = fim?.slice(0, 5);

  return horaFim
    ? `${horaInicio} – ${horaFim}`
    : horaInicio;
}

async function buscarEventos(signal) {
  const eventos = [];
  let pagina = 1;
  let ultimaPagina = 1;

  // Percorre a paginação para selecionar os três eventos
  // mais próximos entre todos os resultados da agenda.
  do {
    const response = await fetch(
      `${apiUrl}/events?page=${pagina}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        "Não foi possível carregar os próximos eventos."
      );
    }

    const resposta = await response.json();

    if (
      resposta.success !== true ||
      !Array.isArray(resposta.data?.items)
    ) {
      throw new Error(
        "A resposta dos eventos tem um formato inesperado."
      );
    }

    eventos.push(...resposta.data.items);

    ultimaPagina = Number(
      resposta.data.pagination?.last_page ?? 1
    );

    if (
      !Number.isInteger(ultimaPagina) ||
      ultimaPagina < 1
    ) {
      throw new Error(
        "A paginação dos eventos tem um formato inesperado."
      );
    }

    pagina += 1;
  } while (pagina <= ultimaPagina);

  // Evita repetir cards caso existam IDs duplicados nas páginas.
  return Array.from(
    new Map(eventos.map((evento) => [evento.id, evento])).values()
  );
}

export default function UpcomingEvents() {
  const [eventos, setEventos] = useState([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregarEventos() {
      try {
        const dados = await buscarEventos(controller.signal);

        if (!controller.signal.aborted) {
          setEventos(dados);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Sem eventos"
              : err instanceof Error
                ? err.message
                : "Ocorreu um erro ao carregar os eventos."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    carregarEventos();

    return () => controller.abort();
  }, []);

  // Atualiza a seleção enquanto a página estiver aberta,
  // retirando eventos cujo início já passou.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAgora(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const proximosEventos = eventos
    .map((evento) => ({
      evento,
      inicio: obterInicioEvento(evento)?.getTime(),
    }))
    .filter(
      ({ inicio }) =>
        typeof inicio === "number" && inicio >= agora
    )
    .sort((a, b) => a.inicio - b.inicio)
    .slice(0, 3)
    .map(({ evento }) => evento);

  return (
    <section
      aria-labelledby="upcoming-events-title"
      className="bg-[#F7F8FA] py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#9A742F]">
              Próximos Eventos
            </p>

            <h2
              id="upcoming-events-title"
              className="mt-3 text-3xl font-semibold text-[#0D1F35] md:text-4xl"
            >
              Agenda ASPEC
            </h2>
          </div>

          <Link
            to="/eventos"
            className="inline-flex items-center gap-1 rounded text-sm font-semibold text-[#0D1F35] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]"
          >
            Ver todos
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <p
            role="status"
            className="py-12 text-center text-gray-500"
          >
            A carregar eventos...
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700"
          >
            {error}
          </p>
        ) : proximosEventos.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            Ainda não existem próximos eventos disponíveis.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {proximosEventos.map((evento) => {
              const cor = obterCor(evento.category);
              const vagas = evento.available_spots;

              const textoVagas =
                typeof vagas !== "number"
                  ? "Vagas por confirmar"
                  : vagas <= 0
                    ? "Evento lotado"
                    : `${vagas} ${
                        vagas === 1
                          ? "vaga disponível"
                          : "vagas disponíveis"
                      }`;

              return (
                <article
                  key={evento.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    aria-hidden="true"
                    className="h-2"
                    style={{ backgroundColor: cor }}
                  />

                  <div className="flex flex-1 flex-col p-6">
                    <span
                      className="self-start rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: cor,
                        color: obterCorTexto(cor),
                      }}
                    >
                      {evento.category?.name || "Evento"}
                    </span>

                    <h3 className="mb-6 mt-4 text-xl font-semibold leading-snug text-[#0D1F35]">
                      {evento.name}
                    </h3>

                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start gap-3">
                        <CalendarDays
                          size={18}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#9A742F]"
                        />
                        <span>{formatarData(evento)}</span>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock
                          size={18}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#9A742F]"
                        />
                        <span>
                          {formatarHorario(
                            evento.event_start_time,
                            evento.event_end_time
                          )}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#9A742F]"
                        />
                        <span>
                          {evento.location?.name ||
                            "Local por confirmar"}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <Users
                          size={18}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#9A742F]"
                        />
                        <span>{textoVagas}</span>
                      </div>
                    </div>

                    {evento.registration_open === false && (
                      <p className="mt-4 text-xs font-medium text-gray-500">
                        Inscrições encerradas
                      </p>
                    )}

                    <div className="mt-auto pt-6">
                      <Link
                        to={`/eventos/${encodeURIComponent(
                          evento.id
                        )}`}
                        aria-label={`Ver evento: ${evento.name}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D1F35] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79]"
                      >
                        Ver evento
                        <ChevronRight
                          size={18}
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}