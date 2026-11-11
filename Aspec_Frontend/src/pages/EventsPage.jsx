import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EventFilters from "../components/events/EventFilters";
import EventCard from "../components/events/EventCard";
import ListPagination from "../components/ui/ListPagination";
import { getEventsPage, getEventsCapabilities, getEventsErrorMessage } from "../services/events";
import { getEventCategories, getLocations } from "../services/referenceLists";

function useFilterOptions(loadOptions) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ attempt: -1, items: [], error: "" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const items = await loadOptions(controller.signal);

        if (!controller.signal.aborted) {
          setResult({ attempt, items, error: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const status = error?.response?.status;

          setResult({
            attempt,
            items: [],
            error: status === 419 || status === 429
              ? getEventsErrorMessage(error)
              : "Tente novamente.",
          });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [attempt, loadOptions]);

  const loading = result.attempt !== attempt;

  return {
    items: loading ? [] : result.items,
    error: loading ? "" : result.error,
    loading,
    onRetry: () => setAttempt((current) => current + 1),
  };
}

const PER_PAGE_OPTIONS = [9, 18, 36];
const DEFAULT_QUERY = {
  categoryId: "",
  locationId: "",
  search: "",
  draftSearch: "",
  page: 1,
  perPage: 9,
};

function parsePositiveInteger(value, fallback) {
  if (!/^\d+$/.test(value ?? "")) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readAgendaQuery(searchParams) {
  const perPageCandidate = parsePositiveInteger(searchParams.get("per_page"), DEFAULT_QUERY.perPage);
  const search = searchParams.get("search") ?? "";

  return {
    categoryId: searchParams.get("category_id") ?? "",
    locationId: searchParams.get("location_id") ?? "",
    search,
    draftSearch: searchParams.has("draft_search") ? searchParams.get("draft_search") ?? "" : search,
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_QUERY.page),
    perPage: PER_PAGE_OPTIONS.includes(perPageCandidate) ? perPageCandidate : DEFAULT_QUERY.perPage,
  };
}

function agendaSearchParams(query) {
  const params = new URLSearchParams();

  if (query.categoryId) params.set("category_id", query.categoryId);
  if (query.locationId) params.set("location_id", query.locationId);
  if (query.search) params.set("search", query.search);
  if (query.draftSearch !== query.search) params.set("draft_search", query.draftSearch);
  if (query.page !== DEFAULT_QUERY.page) params.set("page", String(query.page));
  if (query.perPage !== DEFAULT_QUERY.perPage) params.set("per_page", String(query.perPage));

  return params;
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readAgendaQuery(searchParams);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: "", data: null, error: "" });
  const categories = useFilterOptions(getEventCategories);
  const locations = useFilterOptions(getLocations);
  const capabilities = getEventsCapabilities();
  const { categoryId, locationId, search, draftSearch, page, perPage } = query;
  const queryKey = JSON.stringify([categoryId, locationId, search, page, perPage, attempt]);

  function updateQuery(changes, options) {
    setSearchParams((currentParams) => {
      const currentQuery = readAgendaQuery(currentParams);
      return agendaSearchParams({ ...currentQuery, ...changes });
    }, options);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        if (controller.signal.aborted) return;
        const data = await getEventsPage({ categoryId, locationId, search, page, perPage }, controller.signal);

        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data, error: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data: null, error: getEventsErrorMessage(error) });
        }
      }
    }

    /* O replay imediato de efeitos do StrictMode cancela antes do envio. */
    queueMicrotask(load);

    return () => controller.abort();
  }, [categoryId, locationId, search, page, perPage, queryKey]);

  /*
   * Uma resposta pertence à consulta que a originou. Durante a mudança de
   * filtros ou página, os resultados anteriores deixam de ser apresentados.
   */
  const loading = result.key !== queryKey;
  const data = loading ? null : result.data;
  const error = loading ? "" : result.error;

  function changeFilter(field, value, options) {
    if (value && !options.some((option) => option.id === value)) return;

    updateQuery({ [field]: value, page: 1 });
  }

  function changePage(nextPage) {
    if (
      !data ||
      !Number.isInteger(nextPage) ||
      nextPage < 1 ||
      nextPage > data.pagination.last_page
    ) return;

    updateQuery({ page: nextPage });
  }

  return (
    <div className="min-h-[65vh] bg-gray-50 text-[#0D1F35]">
      <header className="bg-[#0d1f35] py-8">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-semibold leading-normal text-primary">Agenda de Eventos</h1>
          <p className="mt-2 text-sm text-white/75">Encontre e inscreva-se nos próximos eventos ASPEC em todo o país.</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-4">
        <EventFilters
          categoryId={categoryId}
          locationId={locationId}
          search={draftSearch}
          searchEnabled={capabilities.search}
          categories={categories}
          locations={locations}
          onCategoryChange={(value) => changeFilter("categoryId", value, categories.items)}
          onLocationChange={(value) => changeFilter("locationId", value, locations.items)}
          onSearchChange={(value) => {
            if (!capabilities.search) return;
            updateQuery({ draftSearch: value }, { replace: true });
            if (value === "") {
              updateQuery({ search: "", draftSearch: "", page: 1 }, { replace: true });
              setAttempt((current) => current + 1);
            }
          }}
          onSearch={(event) => {
            event.preventDefault();
            const submittedSearch = capabilities.search ? draftSearch.trim() : "";
            updateQuery({ search: submittedSearch, draftSearch: submittedSearch, page: 1 });
            setAttempt((current) => current + 1);
          }}
          onClear={() => {
            updateQuery(DEFAULT_QUERY);
            setAttempt((current) => current + 1);
          }}
        />
        <section aria-label="Resultados da agenda" aria-busy={loading}>
          {loading ? (
            <p role="status" className="py-16 text-center text-gray-600">A carregar eventos...</p>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <p role="alert">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((current) => current + 1)}
                className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : data.items.length === 0 ? (
            <p role="status" className="py-16 text-center text-gray-600">
              Não foram encontrados eventos para os filtros selecionados.
            </p>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500">
                {data.pagination.total} {data.pagination.total === 1 ? "evento encontrado" : "eventos encontrados"}
              </p>
              {/* Cada card partilha 11 linhas para alinhar as secções na mesma fila. */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((event, index) => <EventCard key={`${event.id}-${index}`} event={event} />)}
              </div>
            </>
          )}
          {data && (
            <ListPagination
              currentPage={data.pagination.current_page}
              lastPage={data.pagination.last_page}
              total={data.pagination.total}
              perPage={perPage}
              perPageOptions={PER_PAGE_OPTIONS}
              onPageChange={changePage}
              onPerPageChange={(value) => updateQuery({ perPage: value, page: 1 })}
              label="Paginação de eventos"
            />
          )}
        </section>
      </div>
    </div>
  );
}
