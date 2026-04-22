import { useEffect, useMemo, useState } from 'react';
import { fetchAssets, fetchIncidents, fetchNorthStar, fetchPrices, fetchReadiness, fetchUsers, type PriceItem } from '../api/adminApi';
import type { KpiCard, PriceSourceHealthRecord } from '../types/admin';
import { InlineBadge } from '@marketpulse/ui';

const METRIC_GLYPHS = ['◉', '◈', '◍', '◎'];

function buildSparklinePoints(values: number[], width = 180, height = 44): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, idx) => {
      const x = (idx / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function DashboardPage() {
  const [kpiCards, setKpiCards] = useState<KpiCard[]>([
    { label: 'Tracked Assets', value: '—', delta: 'loading...' },
    { label: 'Price Feed Coverage', value: '—', delta: 'loading...' },
    { label: 'Readiness', value: '—', delta: 'loading...' },
    { label: 'Stale Symbols', value: '—', delta: 'loading...' },
  ]);
  const [priceSourceHealth, setPriceSourceHealth] = useState<PriceSourceHealthRecord[]>([]);
  const [northStar, setNorthStar] = useState<{
    activation: string;
    retention: string;
    weeklyActive: string;
    pushReach: string;
    coachFunnel: string;
    cohortRows: Array<{ cohort: string; users: number; retention7d: number; retention30d: number }>;
  }>({
    activation: 'loading...',
    retention: 'loading...',
    weeklyActive: 'loading...',
    pushReach: 'loading...',
    coachFunnel: 'loading...',
    cohortRows: [],
  });
  const [hoveredCohortIndex, setHoveredCohortIndex] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<Array<{ type: string; severity: string; value: number }>>([]);
  const [workspaceRows, setWorkspaceRows] = useState<Array<{ tenant: string; userCount: number }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [readiness, assets, growth, incidentCenter, users] = await Promise.all([
          fetchReadiness(),
          fetchAssets(),
          fetchNorthStar(),
          fetchIncidents(),
          fetchUsers(),
        ]);
        const symbols = assets.slice(0, 80).map((item) => item.symbol);
        const prices: PriceItem[] = await fetchPrices(symbols);
        const staleCount = prices.filter((p) => p.is_stale).length;
        const coveragePercent = symbols.length > 0 ? Math.round((prices.length / symbols.length) * 100) : 0;

        setKpiCards([
          { label: 'Tracked Assets', value: String(assets.length), delta: `${assets.filter((a) => a.is_active ?? true).length} active` },
          { label: 'Price Feed Coverage', value: `${coveragePercent}%`, delta: `${prices.length}/${symbols.length || 1} symbols` },
          { label: 'Readiness', value: readiness.ready ? 'READY' : 'NOT READY', delta: readiness.ready ? 'all critical checks pass' : 'check health details' },
          { label: 'Stale Symbols', value: String(staleCount), delta: staleCount === 0 ? 'fresh cache' : 'needs feed recovery' },
        ]);

        const checks = readiness.checks ?? {};
        setPriceSourceHealth([
          {
            source: 'Binance',
            uptime: checks.binance ? 'up' : 'down',
            latency: 'n/a',
            incident: checks.binance ? 'none' : 'unhealthy',
          },
          {
            source: 'Yahoo',
            uptime: checks.yahoo ? 'up' : 'down',
            latency: 'n/a',
            incident: checks.yahoo ? 'none' : 'unhealthy',
          },
          {
            source: 'Redis',
            uptime: checks.redis ? 'up' : 'down',
            latency: 'n/a',
            incident: checks.redis ? 'none' : 'unhealthy',
          },
          {
            source: 'Database',
            uptime: checks.database ? 'up' : 'down',
            latency: 'n/a',
            incident: checks.database ? 'none' : 'unhealthy',
          },
        ]);
        setNorthStar({
          activation: `${growth.activation_rate_percent}% (${growth.activated_users}/${growth.total_users})`,
          retention: `${growth.retention_proxy_percent}%`,
          weeklyActive: `${growth.weekly_active_ratio_percent}%`,
          pushReach: String(growth.push_reachable_users),
          coachFunnel: `${growth.coach_action_conversion_percent_7d}% (${growth.coach_action_users_7d}/${growth.coach_hub_open_users_7d})`,
          cohortRows: (growth.cohort_retention ?? []).map((c) => ({
            cohort: c.cohort,
            users: c.users,
            retention7d: c.retention_7d_percent,
            retention30d: c.retention_30d_percent,
          })),
        });
        setIncidents(incidentCenter.incidents ?? []);
        const grouped = users.reduce<Record<string, number>>((acc, user) => {
          const tenant = user.email.split('@')[1] || 'unknown';
          acc[tenant] = (acc[tenant] ?? 0) + 1;
          return acc;
        }, {});
        setWorkspaceRows(
          Object.entries(grouped)
            .map(([tenant, userCount]) => ({ tenant, userCount }))
            .sort((a, b) => b.userCount - a.userCount)
            .slice(0, 20)
        );
      } catch {
        setPriceSourceHealth([]);
      }
    };
    void load();
  }, []);

  const healthCards = useMemo(() => priceSourceHealth, [priceSourceHealth]);
  const cohortSparkData = useMemo(() => {
    const sorted = [...northStar.cohortRows].reverse();
    return {
      labels: sorted.map((r) => r.cohort),
      retention7d: sorted.map((r) => r.retention7d),
      retention30d: sorted.map((r) => r.retention30d),
      users: sorted.map((r) => r.users),
    };
  }, [northStar.cohortRows]);
  const points7d = buildSparklinePoints(cohortSparkData.retention7d);
  const points30d = buildSparklinePoints(cohortSparkData.retention30d);
  const tooltipData = useMemo(() => {
    if (hoveredCohortIndex === null) return null;
    return {
      cohort: cohortSparkData.labels[hoveredCohortIndex],
      users: cohortSparkData.users[hoveredCohortIndex],
      r7: cohortSparkData.retention7d[hoveredCohortIndex],
      r30: cohortSparkData.retention30d[hoveredCohortIndex],
    };
  }, [hoveredCohortIndex, cohortSparkData]);
  const exportCohortCsv = () => {
    if (northStar.cohortRows.length === 0) {
      return;
    }
    const header = ['cohort', 'users', 'retention_7d_percent', 'retention_30d_percent'];
    const lines = northStar.cohortRows.map((row) =>
      [row.cohort, String(row.users), String(row.retention7d), String(row.retention30d)].join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cohort-retention-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <header className="page-header">
        <span className="eyebrow">Control Tower</span>
        <h1>Executive Dashboard</h1>
        <p>Real-time operational pulse across users, assets and AI pipelines.</p>
      </header>

      <div className="kpi-grid">
        {kpiCards.map((card, index) => (
          <article className="panel metric-card" key={card.label}>
            <div className="metric-header">
              <p className="muted">{card.label}</p>
              <span className="metric-icon" aria-hidden>
                {METRIC_GLYPHS[index] ?? '◎'}
              </span>
            </div>
            <h2 className="metric-value">{card.value}</h2>
            <InlineBadge>{card.delta}</InlineBadge>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3>Price Feed Status</h3>
          <p>Provider latency and uptime overview</p>
        </div>
        <div className="status-grid">
          {healthCards.map((source) => (
            <div key={source.source} className="status-card">
              <h4>{source.source}</h4>
              <p>Uptime: {source.uptime}</p>
              <p>Latency: {source.latency}</p>
              <p>Incident: {source.incident}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-header">
          <h3>North-Star Metrics</h3>
          <p>Activation, retention proxy and engagement ratios.</p>
        </div>
        <div className="status-grid">
          <div className="status-card">
            <h4>Activation</h4>
            <p>{northStar.activation}</p>
          </div>
          <div className="status-card">
            <h4>Retention Proxy</h4>
            <p>{northStar.retention}</p>
          </div>
          <div className="status-card">
            <h4>Weekly Active Ratio</h4>
            <p>{northStar.weeklyActive}</p>
          </div>
          <div className="status-card">
            <h4>Push Reachable Users</h4>
            <p>{northStar.pushReach}</p>
          </div>
          <div className="status-card">
            <h4>Coach Funnel Conversion (7d)</h4>
            <p>{northStar.coachFunnel}</p>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-header">
          <h3>Advisor Workspace (Multi-account)</h3>
          <p>Tenant benzeri segmentte hesap yogunlugu.</p>
        </div>
        {workspaceRows.length === 0 ? (
          <p className="muted">Workspace verisi yok.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Accounts</th>
              </tr>
            </thead>
            <tbody>
              {workspaceRows.map((row) => (
                <tr key={row.tenant} className="data-row">
                  <td>{row.tenant}</td>
                  <td>{row.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-header">
          <h3>Incident Center</h3>
          <p>Error spike, queue lag, webhook failure sinyalleri.</p>
        </div>
        {incidents.length === 0 ? (
          <p className="muted">Acik incident yok.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident, idx) => (
                <tr key={`${incident.type}-${idx}`} className="data-row">
                  <td>{incident.type}</td>
                  <td>{incident.severity}</td>
                  <td>{incident.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-header">
          <h3>Cohort Retention</h3>
          <div className="cohort-header-actions">
            <p>Signup week bazli 7/30 gun retention gorunumu.</p>
            <button type="button" onClick={exportCohortCsv} disabled={northStar.cohortRows.length === 0}>
              Export CSV
            </button>
          </div>
        </div>
        {northStar.cohortRows.length > 0 ? (
          <div className="cohort-spark-wrap">
            <div className="cohort-spark-header">
              <span>Trend (last 8 cohorts)</span>
              <span>7d vs 30d retention</span>
            </div>
            <svg viewBox="0 0 180 44" className="cohort-spark-svg" role="img" aria-label="Cohort retention trend">
              <polyline points={points7d} className="sparkline sparkline-7d" />
              <polyline points={points30d} className="sparkline sparkline-30d" />
              {cohortSparkData.labels.map((label, idx) => {
                const x = (idx / Math.max(cohortSparkData.labels.length - 1, 1)) * 180;
                return (
                  <g key={label}>
                    <line
                      x1={x}
                      x2={x}
                      y1={0}
                      y2={44}
                      className={`sparkline-guide ${hoveredCohortIndex === idx ? 'visible' : ''}`}
                    />
                    <rect
                      x={x - 6}
                      y={0}
                      width={12}
                      height={44}
                      fill="transparent"
                      onMouseEnter={() => setHoveredCohortIndex(idx)}
                      onMouseLeave={() => setHoveredCohortIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="cohort-spark-legend">
              <span className="legend-item"><i className="legend-dot dot-7d" />7d retention</span>
              <span className="legend-item"><i className="legend-dot dot-30d" />30d retention</span>
            </div>
            {tooltipData ? (
              <div className="cohort-tooltip">
                <strong>{tooltipData.cohort}</strong>
                <span>{`Users: ${tooltipData.users}`}</span>
                <span>{`7d: ${tooltipData.r7}%`}</span>
                <span>{`30d: ${tooltipData.r30}%`}</span>
              </div>
            ) : (
              <p className="cohort-tooltip-placeholder">Grafik uzerinde cohort noktasina gelerek detay gor.</p>
            )}
          </div>
        ) : null}
        {northStar.cohortRows.length === 0 ? (
          <p className="muted">Henuz yeterli kohort verisi yok.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Users</th>
                <th>Retention 7d</th>
                <th>Retention 30d</th>
              </tr>
            </thead>
            <tbody>
              {northStar.cohortRows.map((row) => (
                <tr key={row.cohort} className="data-row">
                  <td>{row.cohort}</td>
                  <td>{row.users}</td>
                  <td>{row.retention7d}%</td>
                  <td>{row.retention30d}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
