import { h, Fragment } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chart, MapView } from './visuals';
import {
  PAGES,
  METRICS,
  fmt,
  pct,
  filteredRows,
  compare,
  readRoute,
  routeHash,
  csvFromRows,
} from './model';

const BASE = import.meta.env?.BASE_URL || './';
const arrow = '↗';

function Drop() {
  return (
    <svg viewBox="0 0 32 40" aria-hidden="true">
      <path
        d="M16 2C12 10 2 20 2 26a14 14 0 0 0 28 0C30 20 20 10 16 2Z"
        fill="currentColor"
      />
      <path
        d="M9 26c0 5 3 7 7 7"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Tag({ children }) {
  return <span class="tag">{children}</span>;
}

function Heading({ eyebrow, title, description }) {
  return (
    <div class="page-heading">
      <span class="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function MetricCard({ label, value, detail, accent = false }) {
  return (
    <div class={'metric-card ' + (accent ? 'accent' : '')}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SourceNote({ metric }) {
  const m = METRICS[metric];

  return (
    <p class="source-note">
      {m.source} · referência {m.year} · {m.code}. {m.description}
    </p>
  );
}

function Legend({ metric }) {
  return (
    <div class="legend" aria-label="Legenda do mapa">
      {METRICS[metric].colors.map((color, index) => (
        <span key={color}>
          <i style={{ background: color }} />
          {index * 20}–{(index + 1) * 20}%
        </span>
      ))}

      <span>
        <i style={{ background: '#c4cdd3' }} />
        Sem dados
      </span>

      <small>
        Faixas de visualização; limites inferiores inclusivos e superiores
        exclusivos, exceto 100%.
      </small>
    </div>
  );
}

function Selector({ label, value, onChange, options, id }) {
  return (
    <label class="field" for={id}>
      <span>{label}</span>

      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function downloadCSV(rows) {
  const url = URL.createObjectURL(
    new Blob([csvFromRows(rows)], {
      type: 'text/csv;charset=utf-8',
    }),
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = 'agua-para-todos-selecao.csv';
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function App({
  dataset,
  analysis,
  geo,
  enableVisuals = true,
}) {
  const [route, setRoute] = useState(() => readRoute(location.hash));
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const listener = () => {
      setRoute(readRoute(location.hash));
      setMenu(false);
    };

    window.addEventListener('hashchange', listener);

    return () => {
      window.removeEventListener('hashchange', listener);
    };
  }, []);

  useEffect(() => {
    const title = PAGES.find(([id]) => id === route.page)?.[1];
    document.title = `${title} · Água para Todos`;
  }, [route.page]);

  const nav = changes => {
    const next = { ...route, ...changes };

    setRoute(next);
    location.hash = routeHash(next);
    setMenu(false);
  };

  const props = {
    dataset,
    analysis,
    geo,
    route,
    nav,
    enableVisuals,
  };

  const pages = {
    inicio: Home,
    mapa: Explorer,
    comparar: Comparison,
    analise: Analysis,
    cidadania: Citizenship,
    metodologia: Methodology,
  };

  const Page = pages[route.page] || Home;

  return (
    <>
      <a
        href="#conteudo"
        class="skip-link"
        onClick={event => {
          event.preventDefault();
          document.getElementById('conteudo')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>

      <header class="header">
        <div class="topbar">
          <a
            href="#inicio"
            class="brand"
            onClick={event => {
              event.preventDefault();
              nav({ page: 'inicio' });
            }}
          >
            <span class="brand-icon">
              <Drop />
            </span>

            <span>
              água para todos
              <small>OBSERVATÓRIO DE PERNAMBUCO</small>
            </span>
          </a>

          <div class="header-end">
            <span class="data-badge">
              <i /> Dados públicos · 2024 / 2022
            </span>

            <button
              class="menu-button"
              aria-expanded={menu}
              aria-controls="main-nav"
              onClick={() => setMenu(!menu)}
            >
              Menu {menu ? '−' : '+'}
            </button>
          </div>
        </div>

        <nav
          id="main-nav"
          class={'nav ' + (menu ? 'open' : '')}
          aria-label="Navegação principal"
        >
          {PAGES.map(([id, label]) => (
            <a
              key={id}
              href={routeHash({ ...route, page: id })}
              aria-current={route.page === id ? 'page' : undefined}
              class={route.page === id ? 'active' : ''}
              onClick={event => {
                event.preventDefault();
                nav({ page: id });
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <Page {...props} />
      </main>

      <footer>
        <div class="footer-brand">
          <Drop />

          <span>
            Água para Todos
            <small>
              Dados que ajudam a compreender nosso território.
            </small>
          </span>
        </div>

        <p>
          Projeto acadêmico independente · Ciência de Dados
          <br />
          SINISA e IBGE
        </p>

        <button
          class="text-button"
          onClick={() => nav({ page: 'metodologia' })}
        >
          Fontes e limitações {arrow}
        </button>
      </footer>
    </>
  );
}

function Home({ dataset, geo, nav, enableVisuals }) {
  const rows = useMemo(
    () => filteredRows(dataset.rows, 'pe'),
    [dataset],
  );

  const q = dataset.quality;

  const features = [
    [
      '01',
      'Conheça seu município',
      'Veja o atendimento pela rede, as perdas e o contexto dos domicílios.',
      'mapa',
    ],
    [
      '02',
      'Observe as diferenças',
      'Compare dois municípios usando o mesmo indicador e ano.',
      'comparar',
    ],
    [
      '03',
      'Investigue as relações',
      'Explore os gráficos, o modelo e a incerteza dos resultados.',
      'analise',
    ],
  ];

  return (
    <div class="container">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="little-line" />
            ÁGUA, TERRITÓRIO E CIDADANIA
          </div>

          <h1>
            A água chega
            <br />
            a <em>todos?</em>
          </h1>

          <p>
            Explore o atendimento pela rede e as perdas de água em
            Pernambuco. Entenda as diferenças entre municípios com
            dados públicos e contexto.
          </p>

          <div class="actions">
            <button
              class="primary"
              onClick={() => nav({ page: 'mapa' })}
            >
              Explorar o mapa <span>→</span>
            </button>

            <button
              class="secondary"
              onClick={() => nav({ page: 'comparar' })}
            >
              Comparar municípios
            </button>
          </div>

          <div class="hero-footnote">
            <span>01</span> Explore. Compare. Entenda.
          </div>
        </div>

        <div class="hero-map">
          <div class="panel-top">
            <span>PERNAMBUCO</span>
            <Tag>SINISA · 2024</Tag>
          </div>

          <MapView
            geo={geo}
            rows={rows}
            metric="atendimento"
            onSelect={id => nav({ page: 'mapa', id })}
            compact
            enabled={enableVisuals}
          />

          <div class="hero-map-bottom">
            <strong>Atendimento pela rede</strong>
            <span>Clique em um município {arrow}</span>
          </div>

          <Legend metric="atendimento" />
        </div>
      </section>

      <section
        class="metric-grid home-metrics"
        aria-label="Abrangência dos dados"
      >
        <MetricCard
          label="Território em análise"
          value={q.totalMunicipalities}
          detail="municípios de Pernambuco"
        />

        <MetricCard
          label="Atendimento e perdas"
          value={q.completePairs}
          detail="municípios com os dois indicadores"
          accent
        />

        <MetricCard
          label="Região Metropolitana"
          value={`${q.rmrCount}/14`}
          detail="municípios com os dois indicadores"
        />

        <MetricCard
          label="Contexto domiciliar"
          value="2022"
          detail="Censo · ligação dos domicílios à rede"
        />
      </section>

      <section class="section-intro">
        <div>
          <span class="eyebrow">DO DADO À COMPREENSÃO</span>
          <h2>
            Um território.
            <br />
            Diferentes realidades.
          </h2>
        </div>

        <p>
          Uma rede disponível não garante água contínua ou potável.
          Cada indicador responde a uma pergunta. Aqui, você encontra
          também o significado e os limites de cada número.
        </p>
      </section>

      <section class="feature-grid">
        {features.map(([number, title, description, page]) => (
          <button
            key={page}
            class="feature"
            onClick={() => nav({ page })}
          >
            <span>
              {number}
              <b>{arrow}</b>
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </button>
        ))}
      </section>

      <div class="notice">
        <strong>Transparência faz parte da análise.</strong>

        <p>
          Cinco municípios não constam da base municipal SINISA
          utilizada e Quipapá tem atendimento não calculado. Todos
          continuam identificados no mapa. Fernando de Noronha tem
          consulta separada.
        </p>

        <button
          class="text-button"
          onClick={() => nav({ page: 'metodologia' })}
        >
          Ver a qualidade dos dados →
        </button>
      </div>
    </div>
  );
}

function Explorer({
  dataset,
  geo,
  route,
  nav,
  enableVisuals,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');

  const rows = useMemo(
    () => filteredRows(dataset.rows, route.scope),
    [dataset, route.scope],
  );

  const listed = useMemo(() => {
    return filteredRows(dataset.rows, route.scope, query).sort(
      (a, b) => {
        if (sort === 'name') {
          return a.name.localeCompare(b.name, 'pt-BR');
        }

        const aValue = Number.isFinite(a[route.metric])
          ? a[route.metric]
          : -Infinity;

        const bValue = Number.isFinite(b[route.metric])
          ? b[route.metric]
          : -Infinity;

        return (
          bValue - aValue ||
          a.name.localeCompare(b.name, 'pt-BR')
        );
      },
    );
  }, [dataset, route.scope, query, sort, route.metric]);

  const selected =
    rows.find(row => row.id === route.id) || rows[0];

  const changeScope = scope => {
    const next = filteredRows(dataset.rows, scope);

    nav({
      scope,
      id: next.some(row => row.id === route.id)
        ? route.id
        : next[0]?.id,
    });

    setQuery('');
  };

  return (
    <div class="container">
      <Heading
        eyebrow="EXPLORE O TERRITÓRIO"
        title="Mapa do abastecimento"
        description="Escolha um indicador e conheça os dados do seu município."
      />

      <div class="toolbar">
        <Selector
          id="scope"
          label="Recorte territorial"
          value={route.scope}
          onChange={changeScope}
          options={[
            ['pe', 'Pernambuco · 184 municípios'],
            ['rmr', 'Região Metropolitana · 14 municípios'],
            ['noronha', 'Fernando de Noronha · distrito'],
          ]}
        />

        <Selector
          id="indicator"
          label="Indicador e ano"
          value={route.metric}
          onChange={metric => nav({ metric })}
          options={Object.entries(METRICS).map(([key, metric]) => [
            key,
            `${metric.label} · ${metric.year}`,
          ])}
        />

        <Selector
          id="municipality"
          label="Escolha um município"
          value={selected?.id}
          onChange={id => nav({ id })}
          options={rows.map(row => [row.id, row.name])}
        />
      </div>

      <div class="explorer-grid">
        <section class="panel map-panel">
          <div class="panel-top">
            <strong>{METRICS[route.metric].label}</strong>
            <Tag>{METRICS[route.metric].year}</Tag>
          </div>

          <MapView
            geo={geo}
            rows={rows}
            metric={route.metric}
            selected={selected?.id}
            onSelect={id => nav({ id })}
            enabled={enableVisuals}
          />

          <Legend metric={route.metric} />
        </section>

        <MunicipalityPanel
          row={selected}
          metric={route.metric}
          nav={nav}
        />
      </div>

      <SourceNote metric={route.metric} />

      <section class="panel table-panel">
        <div class="section-top">
          <div>
            <span class="eyebrow">
              OS MESMOS DADOS, EM TABELA
            </span>
            <h2>Consulte os municípios</h2>
          </div>

          <button
            class="secondary"
            onClick={() => downloadCSV(listed)}
          >
            Baixar seleção CSV ↓
          </button>
        </div>

        <div class="table-controls">
          <label class="search-field">
            <span>Buscar município</span>

            <input
              value={query}
              onInput={event => setQuery(event.target.value)}
              placeholder="Digite o nome, com ou sem acento"
              type="search"
            />
          </label>

          <Selector
            id="sort"
            label="Ordenação"
            value={sort}
            onChange={setSort}
            options={[
              ['name', 'Nome do município'],
              ['value', 'Maior valor do indicador'],
            ]}
          />

          <span class="result-count" aria-live="polite">
            {listed.length} resultado(s)
          </span>
        </div>

        <div class="table-scroll">
          <table>
            <caption class="sr-only">
              Indicadores municipais e respectivos anos
            </caption>

            <thead>
              <tr>
                <th>Município</th>
                <th>Atendimento · 2024</th>
                <th>Perdas · 2024</th>
                <th>Sem ligação · 2022</th>
              </tr>
            </thead>

            <tbody>
              {listed.map(row => (
                <tr
                  key={row.id}
                  class={
                    row.id === selected?.id ? 'selected' : ''
                  }
                >
                  <th scope="row">
                    <button
                      class="table-link"
                      onClick={() => nav({ id: row.id })}
                    >
                      {row.name} {row.rmr && <small>RMR</small>}
                    </button>
                  </th>

                  <td>{pct(row.atendimento)}</td>
                  <td>{pct(row.perdas)}</td>
                  <td>{pct(row.semRede2022)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!listed.length && (
            <p class="empty">
              Nenhum município encontrado. Tente outro nome.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MunicipalityPanel({ row, metric, nav }) {
  if (!row) {
    return <aside class="panel">Selecione um município.</aside>;
  }

  const locationLabel = row.district
    ? 'DISTRITO ESTADUAL'
    : row.rmr
      ? 'REGIÃO METROPOLITANA'
      : 'MUNICÍPIO DE PERNAMBUCO';

  const missingStatus =
    metric === 'atendimento'
      ? row.atendimentoStatus
      : metric === 'perdas'
        ? row.perdasStatus
        : 'Informação não disponível';

  return (
    <aside class="municipality-panel">
      <div class="eyebrow">{locationLabel}</div>

      <h2>{row.name}</h2>
      <span class="code">IBGE {row.id}</span>

      <div class="selected-value">
        <span>{METRICS[metric].label}</span>
        <strong>{pct(row[metric])}</strong>

        <small>
          Referência {METRICS[metric].year} ·{' '}
          {METRICS[metric].source}
        </small>
      </div>

      {row[metric] === null && (
        <p class="missing-note">
          {missingStatus}. Ausência de dado não significa ausência
          do serviço.
        </p>
      )}

      <dl class="municipality-details">
        <div>
          <dt>Atendimento pela rede · 2024</dt>
          <dd>{pct(row.atendimento)}</dd>
        </div>

        <div>
          <dt>Perdas na distribuição · 2024</dt>
          <dd>{pct(row.perdas)}</dd>
        </div>

        <div>
          <dt>Domicílios sem ligação · 2022</dt>
          <dd>{pct(row.semRede2022)}</dd>
        </div>

        <div>
          <dt>População usada no SINISA · 2024</dt>
          <dd>{fmt(row.population, 0)}</dd>
        </div>
      </dl>

      <p class="panel-explanation">
        {METRICS[metric].description}
      </p>

      <button
        class="primary full"
        onClick={() =>
          nav({
            page: 'comparar',
            a: row.id,
            b: row.id === '2611606' ? '2609600' : '2611606',
          })
        }
      >
        Comparar este município →
      </button>

      <p class="source-note light">
        {row.provider
          ? `Prestador informado na fonte: ${row.provider}.`
          : 'Sem registro municipal na base SINISA utilizada.'}{' '}
        Não representa avaliação de uma concessionária atual.
      </p>
    </aside>
  );
}

function Comparison({
  dataset,
  route,
  nav,
  enableVisuals,
}) {
  const options = dataset.rows.map(row => [
    row.id,
    row.name + (row.district ? ' (distrito)' : ''),
  ]);

  const a =
    dataset.rows.find(row => row.id === route.a) ||
    dataset.rows[0];

  const b =
    dataset.rows.find(row => row.id === route.b) ||
    dataset.rows[1];

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div class="container">
      <Heading
        eyebrow="DIFERENÇAS QUE MERECEM CONTEXTO"
        title="Compare municípios"
        description="Veja o mesmo indicador, no mesmo ano, em dois territórios. A diferença não explica sozinha suas causas."
      />

      <div class="toolbar compare-toolbar">
        <Selector
          id="compare-a"
          label="Município A"
          value={a.id}
          onChange={id => nav({ a: id })}
          options={options}
        />

        <button
          class="swap"
          aria-label="Inverter municípios"
          onClick={() => nav({ a: b.id, b: a.id })}
        >
          ⇄
        </button>

        <Selector
          id="compare-b"
          label="Município B"
          value={b.id}
          onChange={id => nav({ b: id })}
          options={options}
        />

        <button class="secondary" onClick={copy}>
          {copied
            ? 'Link copiado ✓'
            : 'Compartilhar comparação ↗'}
        </button>
      </div>

      {copyError && (
        <p role="status">
          Copie o endereço desta página na barra do navegador para
          compartilhar.
        </p>
      )}

      {a.id === b.id && (
        <div class="notice">
          <strong>Você selecionou o mesmo município.</strong>
          <p>Escolha outro para comparar territórios diferentes.</p>
        </div>
      )}

      <section class="comparison-head">
        <div>
          <span class="compare-dot a" />
          MUNICÍPIO A
          <h2>{a.name}</h2>
        </div>

        <span class="versus">&</span>

        <div>
          <span class="compare-dot b" />
          MUNICÍPIO B
          <h2>{b.name}</h2>
        </div>
      </section>

      <div class="comparison-grid">
        {Object.entries(METRICS).map(([key, metric]) => {
          const delta = compare(a, b, key);

          const difference =
            delta === null
              ? 'Comparação indisponível'
              : Math.abs(delta) < 1e-10
                ? 'Mesmo valor'
                : `${a.name}: ${fmt(Math.abs(delta), 2)} p.p. ${
                    delta > 0 ? 'acima' : 'abaixo'
                  }`;

          return (
            <section class="panel compare-card" key={key}>
              <div class="panel-top">
                <h3>{metric.label}</h3>
                <Tag>{metric.year}</Tag>
              </div>

              <div class="compare-values">
                <div>
                  <small>{a.name}</small>
                  <strong>{pct(a[key])}</strong>
                </div>

                <div>
                  <small>{b.name}</small>
                  <strong>{pct(b[key])}</strong>
                </div>
              </div>

              <Chart
                enabled={enableVisuals}
                label={`${metric.label}: ${a.name} ${pct(
                  a[key],
                )}, ${b.name} ${pct(b[key])}`}
                data={[
                  {
                    type: 'bar',
                    x: ['Município A', 'Município B'],
                    y: [a[key], b[key]],
                    marker: {
                      color: ['#147e83', '#d58a4e'],
                    },
                    text: [pct(a[key]), pct(b[key])],
                    textposition: 'outside',
                    hovertemplate:
                      '%{x}: %{y:.2f}%<extra></extra>',
                  },
                ]}
                layout={{
                  height: 225,
                  margin: { t: 20, r: 12, b: 45, l: 35 },
                  yaxis: {
                    range: [0, 115],
                    ticksuffix: '%',
                    gridcolor: '#e9eef0',
                  },
                  xaxis: { fixedrange: true },
                }}
              />

              <p class="difference">{difference}</p>
              <p class="source-note">{metric.description}</p>
            </section>
          );
        })}
      </div>

      <div class="notice">
        <strong>Como ler essa comparação</strong>

        <p>
          “P.p.” significa pontos percentuais. Atendimento e perdas
          se referem a 2024; domicílios sem ligação se referem ao
          Censo 2022. São populações e conceitos diferentes. Não
          somamos esses indicadores nem criamos uma nota de
          “melhor município”.
        </p>
      </div>
    </div>
  );
}

function Analysis({
  dataset,
  analysis: m,
  enableVisuals,
}) {
  const [view, setView] = useState('relacao');

  const points = m.points;
  const distribution = dataset.rows.filter(row => !row.district);
  const summary = dataset.statistics.pe;

  const pvalue = value =>
    value < 0.001 ? '< 0,001' : fmt(value, 3);

  const weak = Math.abs(m.rho) < 0.1;
  const spatial = m.moran_residuals.p_permutacao < 0.05;

  return (
    <div class="container">
      <Heading
        eyebrow="MODELAGEM E INFERÊNCIA ESTATÍSTICA"
        title="O que os dados mostram?"
        description={`Análise exploratória de ${m.n} municípios com atendimento e perdas disponíveis em 2024. Fernando de Noronha está fora do ajuste.`}
      />

      <div class="research-question">
        <span>PERGUNTA DE PESQUISA</span>

        <h2>
          Maiores perdas estão associadas
          <br />
          a menor atendimento pela rede?
        </h2>

        <p>
          {weak
            ? 'Neste conjunto de dados, a associação monotônica observada é muito fraca.'
            : 'A intensidade e a direção da associação estão apresentadas abaixo.'}{' '}
          Isso não demonstra ausência de relação em outros períodos
          ou escalas.
        </p>
      </div>

      <div class="metric-grid">
        <MetricCard
          label="Municípios analisados"
          value={m.n}
          detail="casos completos, sem imputação"
        />

        <MetricCard
          label="Correlação de Spearman"
          value={fmt(m.rho, 3)}
          detail="−1 a +1 · associação monotônica"
          accent
        />

        <MetricCard
          label="R² da regressão"
          value={fmt(m.r2, 4)}
          detail="fração da variação descrita pelo ajuste"
        />

        <MetricCard
          label="Inclinação da regressão"
          value={fmt(m.slope, 3)}
          detail="p.p. de atendimento por 1 p.p. de perdas"
        />
      </div>

      <div
        class="segmented"
        role="group"
        aria-label="Gráfico da análise"
      >
        {[
          ['relacao', 'Relação entre indicadores'],
          ['distribuicao', 'Distribuição municipal'],
          ['diagnostico', 'Diagnóstico do modelo'],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={view === id}
            class={view === id ? 'active' : ''}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <section class="panel analysis-chart">
        {view === 'relacao' && (
          <>
            <div class="section-top">
              <h2>Perdas × atendimento</h2>
              <Tag>SINISA · 2024</Tag>
            </div>

            <Chart
              enabled={enableVisuals}
              label="Gráfico de dispersão: cada ponto representa um município, com perdas no eixo horizontal e atendimento no vertical."
              data={[
                {
                  x: points.map(point => point.x),
                  y: points.map(point => point.y),
                  text: points.map(point => point.name),
                  mode: 'markers',
                  type: 'scatter',
                  name: 'Municípios',
                  marker: {
                    color: '#248b8e',
                    size: 8,
                    opacity: 0.72,
                    line: { color: '#fff', width: 1 },
                  },
                  hovertemplate:
                    '<b>%{text}</b><br>Perdas: %{x:.2f}%<br>Atendimento: %{y:.2f}%<extra></extra>',
                },
                {
                  x: m.curve.x,
                  y: m.curve.y,
                  mode: 'lines',
                  name: 'Regressão linear',
                  line: { color: '#c77439', width: 2.5 },
                },
                {
                  x: m.curve.x,
                  y: m.curve.fractional,
                  mode: 'lines',
                  name: 'Sensibilidade: logit fracional',
                  line: {
                    color: '#5f5488',
                    dash: 'dot',
                    width: 2,
                  },
                },
              ]}
              layout={{
                height: 440,
                xaxis: {
                  title: { text: 'Perdas na distribuição (%)' },
                  range: [0, 100],
                  gridcolor: '#e9eef0',
                },
                yaxis: {
                  title: { text: 'Atendimento pela rede (%)' },
                  range: [0, 105],
                  gridcolor: '#e9eef0',
                },
                legend: { orientation: 'h', y: -0.18 },
                margin: { t: 20, r: 20, b: 100, l: 65 },
              }}
            />

            <p class="source-note">
              As linhas resumem associações no recorte observado;
              não representam uma relação causal. A curva fracional
              respeita os limites de 0–100%.
            </p>
          </>
        )}

        {view === 'distribuicao' && (
          <>
            <h2>Como os indicadores se distribuem</h2>

            <Chart
              enabled={enableVisuals}
              label="Boxplots de atendimento e perdas dos municípios com dados; pontos representam observações."
              data={['atendimento', 'perdas'].map((key, index) => ({
                type: 'box',
                name: METRICS[key].short,
                y: distribution
                  .map(row => row[key])
                  .filter(Number.isFinite),
                boxpoints: 'all',
                jitter: 0.45,
                pointpos: 0,
                marker: {
                  color: index ? '#d58a4e' : '#147e83',
                  size: 4,
                  opacity: 0.5,
                },
                line: { width: 2 },
                boxmean: true,
              }))}
              layout={{
                height: 440,
                yaxis: {
                  title: { text: 'Percentual (%)' },
                  gridcolor: '#e9eef0',
                },
                showlegend: false,
              }}
            />

            <p class="source-note">
              A caixa vai do primeiro ao terceiro quartil; a linha
              central indica a mediana. Pontos além dos limites
              usuais são sinalizados para inspeção, não removidos
              automaticamente.
            </p>
          </>
        )}

        {view === 'diagnostico' && (
          <>
            <h2>Resíduos do modelo linear</h2>

            <Chart
              enabled={enableVisuals}
              label="Resíduos em função dos valores ajustados pelo modelo."
              data={[
                {
                  x: points.map(point => point.fitted),
                  y: points.map(point => point.residual),
                  text: points.map(point => point.name),
                  type: 'scatter',
                  mode: 'markers',
                  marker: { color: '#147e83', size: 7 },
                  hovertemplate:
                    '%{text}<br>Ajustado: %{x:.2f}<br>Resíduo: %{y:.2f}<extra></extra>',
                },
              ]}
              layout={{
                height: 440,
                xaxis: {
                  title: { text: 'Atendimento ajustado (%)' },
                  gridcolor: '#e9eef0',
                },
                yaxis: {
                  title: { text: 'Resíduo (p.p.)' },
                  gridcolor: '#e9eef0',
                },
                shapes: [
                  {
                    type: 'line',
                    xref: 'paper',
                    x0: 0,
                    x1: 1,
                    y0: 0,
                    y1: 0,
                    line: {
                      color: '#d58a4e',
                      dash: 'dash',
                    },
                  },
                ],
              }}
            />

            <p class="source-note">
              Resíduo é a diferença entre valor observado e
              ajustado. A pequena variação horizontal reflete a
              fraca associação linear encontrada.
            </p>
          </>
        )}
      </section>

      <div class="two-column">
        <section class="panel prose">
          <span class="eyebrow">
            INFERÊNCIA COM LIMITES EXPLÍCITOS
          </span>

          <h2>Estimativa e incerteza</h2>

          <dl class="stat-list">
            <div>
              <dt>IC 95% nominal da inclinação · HC3</dt>
              <dd>
                {fmt(m.slope_ci95_hc3[0], 3)} a{' '}
                {fmt(m.slope_ci95_hc3[1], 3)}
              </dd>
            </div>

            <div>
              <dt>Valor-p nominal · inclinação</dt>
              <dd>{pvalue(m.p_slope_hc3_nominal)}</dd>
            </div>

            <div>
              <dt>Valor-p nominal · Spearman</dt>
              <dd>{pvalue(m.p_permutation_nominal)}</dd>
            </div>

            <div>
              <dt>Permutações · Spearman</dt>
              <dd>9.999</dd>
            </div>
          </dl>

          <p>
            Modelo: atendimento = intercepto + inclinação × perdas.
            O ajuste dá o mesmo peso a cada município.
          </p>

          <p>
            O intervalo e os valores-p dependem de pressupostos.
            HC3 trata heterocedasticidade, mas não corrige dependência
            espacial. Os municípios observados não são uma amostra
            aleatória de Pernambuco.
          </p>
        </section>

        <section class="panel prose">
          <span class="eyebrow">VERIFICAÇÃO DO MODELO</span>
          <h2>O que limita a conclusão</h2>

          <dl class="stat-list">
            <div>
              <dt>Moran I dos resíduos · 5 vizinhos</dt>
              <dd>{fmt(m.moran_residuals.I, 3)}</dd>
            </div>

            <div>
              <dt>Valor-p por permutação · Moran</dt>
              <dd>
                {pvalue(m.moran_residuals.p_permutacao)}
              </dd>
            </div>

            <div>
              <dt>RMSE · validação deixe-um-fora</dt>
              <dd>{fmt(m.loocv_rmse, 2)} p.p.</dd>
            </div>

            <div>
              <dt>RMSE · referência pela média</dt>
              <dd>{fmt(m.loocv_baseline_rmse, 2)} p.p.</dd>
            </div>
          </dl>

          <p>
            {spatial
              ? 'O diagnóstico aponta dependência espacial residual. Por isso, tratamos a inferência como exploratória e nominal, sem uma conclusão confirmatória.'
              : 'O diagnóstico espacial deve ser interpretado considerando a definição de vizinhança adotada.'}
          </p>

          <p>
            {m.loocv_rmse >= m.loocv_baseline_rmse
              ? 'O modelo não superou a previsão de referência pela média nessa verificação. Não é recomendado como ferramenta preditiva.'
              : 'A validação interna não demonstra desempenho em outros períodos ou regiões.'}
          </p>
        </section>
      </div>

      <section class="panel table-panel">
        <h2>Estatística descritiva municipal</h2>

        <p class="source-note">
          Valores de 2024. Cada coluna usa seus próprios casos
          disponíveis. Medianas e médias municipais não são o
          indicador agregado de Pernambuco.
        </p>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>n</th>
                <th>Média</th>
                <th>Mediana</th>
                <th>Desvio-padrão</th>
                <th>Q1</th>
                <th>Q3</th>
                <th>Mín.–máx.</th>
              </tr>
            </thead>

            <tbody>
              {['atendimento', 'perdas'].map(key => (
                <tr key={key}>
                  <th>{METRICS[key].short}</th>
                  <td>{summary[key].n}</td>
                  <td>{fmt(summary[key].mean)}</td>
                  <td>{fmt(summary[key].median)}</td>
                  <td>{fmt(summary[key].std)}</td>
                  <td>{fmt(summary[key].q1)}</td>
                  <td>{fmt(summary[key].q3)}</td>
                  <td>
                    {fmt(summary[key].min)}–
                    {fmt(summary[key].max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details>
          <summary>
            Sensibilidade e observações influentes
          </summary>

          <p>
            A inclinação ao retirar um município por vez varia de{' '}
            {fmt(m.loo_slope_min, 3)} a{' '}
            {fmt(m.loo_slope_max, 3)}. {m.influential.length}{' '}
            municípios ultrapassam o limiar de triagem de Cook
            (4/n). Nenhum foi excluído automaticamente.
          </p>

          <p>
            {m.influential.map(row => row.name).join(', ')}.
          </p>

          <p>
            O modelo fracional convergiu:{' '}
            {m.fractional_logit.converged ? 'sim' : 'não'}.
            Ajustes lineares fora de 0–100% nos casos observados:{' '}
            {m.fitted_outside_0_100}. A validação deixe-um-fora não
            separa regiões e pode ser otimista quando há
            dependência espacial.
          </p>
        </details>
      </section>

      <div class="actions end-actions">
        <a
          class="secondary"
          href={`${BASE}data/analysis.json`}
          download
        >
          Baixar resultados JSON ↓
        </a>

        <a
          class="secondary"
          href={`${BASE}relatorio-tecnico.md`}
          download
        >
          Ler relatório técnico ↓
        </a>
      </div>
    </div>
  );
}

function Citizenship() {
  const educationalCards = [
    [
      'Rede não é continuidade',
      'Uma ligação à rede não informa quantas horas por dia a água chega ao domicílio, nem sua qualidade.',
    ],
    [
      'Perdas não são só vazamentos',
      'As perdas podem envolver água perdida fisicamente e diferenças de medição ou contabilização.',
    ],
    [
      'Município não é bairro',
      'O indicador municipal é agregado. Ele pode esconder diferenças entre zonas urbanas, rurais e comunidades.',
    ],
  ];

  return (
    <div class="container">
      <Heading
        eyebrow="ÁGUA E CIDADANIA"
        title="Compreender também é participar."
        description="Informação acessível para conversar sobre abastecimento, preservação e desigualdades."
      />

      <div class="citizenship-hero">
        <div>
          <span class="eyebrow">UM RECURSO ESSENCIAL</span>

          <h2>
            O cuidado com a água
            <br />
            é uma responsabilidade
            <br />
            <em>compartilhada.</em>
          </h2>

          <p>
            Consumo consciente e melhorias nos sistemas se
            complementam. A responsabilidade por problemas
            estruturais não pode ser atribuída apenas aos moradores.
          </p>
        </div>

        <div class="water-art" aria-hidden="true">
          <Drop />
          <span class="ripple r1" />
          <span class="ripple r2" />
          <span class="ripple r3" />
        </div>
      </div>

      <div class="feature-grid educational">
        {educationalCards.map(([title, text]) => (
          <article class="panel prose" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div class="two-column">
        <section class="panel prose">
          <h2>No cotidiano</h2>

          <ul class="reading-list">
            <li>
              Observe vazamentos visíveis e procure o canal oficial
              responsável.
            </li>

            <li>
              Evite deixar torneiras abertas durante atividades em
              que a água não está sendo utilizada.
            </li>

            <li>
              Ao discutir o abastecimento, procure a fonte e o ano
              do indicador.
            </li>

            <li>
              Considere as condições locais: práticas adequadas
              dependem da infraestrutura disponível.
            </li>
          </ul>

          <a
            href="https://www.gov.br/ana/pt-br/acesso-a-informacao/acoes-e-programas/cursos-e-capacitacao"
            target="_blank"
            rel="noreferrer"
          >
            Educação e capacitação · ANA ↗
          </a>
        </section>

        <section class="panel prose">
          <h2>Na comunidade</h2>

          <p>
            Use os dados como ponto de partida para perguntas: há
            diferenças de atendimento? O dado representa o período
            que estamos discutindo? O que precisamos saber sobre
            continuidade e qualidade?
          </p>

          <p>
            O projeto aproxima Ciência de Dados e Direitos Humanos
            ao discutir desigualdades, acesso à informação e
            participação social. Não identifica consumidores ou
            domicílios individuais.
          </p>

          <a
            href="https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento"
            target="_blank"
            rel="noreferrer"
          >
            Informações públicas de saneamento ↗
          </a>
        </section>
      </div>
    </div>
  );
}

function Methodology({ dataset }) {
  const q = dataset.quality;

  return (
    <div class="container">
      <Heading
        eyebrow="METODOLOGIA E DADOS"
        title="De onde vêm os números?"
        description="Fontes, decisões e verificações para que você possa acompanhar o caminho de cada informação."
      />

      <section class="metric-grid">
        <MetricCard
          label="Mapa e cadastro"
          value="185"
          detail="184 municípios + Fernando de Noronha"
        />

        <MetricCard
          label="Fórmulas conferidas"
          value={`${q.formulasPassed}/${q.formulasChecked}`}
          detail="compatíveis dentro do arredondamento"
          accent
        />

        <MetricCard
          label="Censo 2022"
          value={`${q.censusSumChecks}/185`}
          detail="somas das categorias conferidas"
        />

        <MetricCard
          label="Códigos duplicados"
          value={q.duplicateCodes}
          detail="na base municipal do SINISA"
        />
      </section>

      <section class="panel table-panel">
        <h2>Fontes oficiais</h2>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Referência / uso</th>
                <th>Acesso</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <th>SINISA 2025</th>

                <td>
                  2024 · atendimento, perdas e denominador
                  populacional
                </td>

                <td>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/resultados-sinisa-2025"
                  >
                    Portal oficial ↗
                  </a>
                </td>
              </tr>

              <tr>
                <th>IBGE · Censo 2022</th>

                <td>
                  2022 · domicílios e ligação à rede, tabela 6803
                </td>

                <td>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://sidra.ibge.gov.br/tabela/6803"
                  >
                    Tabela SIDRA ↗
                  </a>
                </td>
              </tr>

              <tr>
                <th>IBGE · Localidades e malhas</th>
                <td>
                  Cadastro e geometria consultados em 19/10/2026
                </td>

                <td>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3"
                  >
                    Documentação ↗
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="source-note">
          SINISA: planilhas municipais retificadas em 25/05/2026.
          Arquivos originais e hashes acompanham o projeto. A malha
          é uma representação simplificada do território, sem
          infraestrutura de tubulações.
        </p>
      </section>

      <div class="two-column">
        <section class="panel prose">
          <h2>Dados que faltam</h2>

          <p>
            <strong>Ausentes da base SINISA:</strong>{' '}
            {q.missingMunicipalities.join(', ')}.
          </p>

          <p>
            <strong>Atendimento não calculado:</strong> Quipapá.
            A população atendida declarada supera o denominador da
            fonte; o bloqueio original foi preservado.
          </p>

          <p>
            Essas lacunas não foram preenchidas com zeros, médias
            ou valores do Censo. Os dados domiciliares de 2022 estão
            disponíveis para essas localidades, com conceito e
            período próprios.
          </p>

          <p>
            Não dispomos, nesta entrega, de diagnósticos de
            potabilidade, mapas de tubulações, vazamentos
            georreferenciados ou monitoramento ao vivo.
          </p>
        </section>

        <section class="panel prose">
          <h2>Tratamento e testes</h2>

          <ol class="reading-list">
            <li>
              Preservação dos arquivos originais e registro das
              fontes.
            </li>

            <li>
              Integração por código IBGE com unicidade e
              correspondência territorial.
            </li>

            <li>
              Separação de números válidos e motivos de não
              cálculo.
            </li>

            <li>
              Recálculo de atendimento e perdas e conferência das
              categorias do Censo.
            </li>

            <li>
              Modelagem exploratória, sensibilidade e diagnóstico
              espacial.
            </li>
          </ol>

          <p>
            A consistência interna não comprova a exatidão de todas
            as informações declaradas pelos prestadores.
          </p>

          <a href={`${BASE}verificacao.md`} download>
            Ver testes e limites de verificação ↓
          </a>
        </section>
      </div>

      <section class="panel prose">
        <h2>Escolhas de análise</h2>

        <div class="method-grid">
          <div>
            <h3>Escopo</h3>

            <p>
              184 municípios no recorte estadual; Fernando de
              Noronha é consultado separadamente. O modelo utiliza{' '}
              {q.completePairs} casos completos de 2024.
            </p>
          </div>

          <div>
            <h3>Períodos</h3>

            <p>
              O Censo 2022 contextualiza os domicílios. Seus dados
              não foram usados como substitutos dos indicadores de
              2024 nem como variáveis no modelo inicial.
            </p>
          </div>

          <div>
            <h3>Interpretação</h3>

            <p>
              Correlação não é causalidade. Os resultados agregados
              não descrevem famílias ou bairros, e o modelo não
              fundamenta recomendações automáticas de investimento.
            </p>
          </div>
        </div>
      </section>

      <div class="download-grid">
        <a href={`${BASE}data/municipios.csv`} download>
          <span>BASE INTEGRADA</span>
          <strong>Dados municipais ↓</strong>
          <small>CSV · números e status de ausência</small>
        </a>

        <a href={`${BASE}data/sources.json`} download>
          <span>RASTREABILIDADE</span>
          <strong>Fontes e hashes ↓</strong>
          <small>JSON · arquivos, URLs e datas</small>
        </a>

        <a href={`${BASE}relatorio-tecnico.md`} download>
          <span>DOCUMENTAÇÃO</span>
          <strong>Relatório técnico ↓</strong>
          <small>Markdown · metodologia e resultados</small>
        </a>
      </div>
    </div>
  );
}