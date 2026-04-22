import { useEffect, useMemo, useState } from 'react';
import { fetchAssets, fetchPrices, fetchReadiness, type PriceItem } from '../api/adminApi';
import type { KpiCard, PriceSourceHealthRecord } from '../types/admin';

const METRIC_GLYPHS = ['◉', '◈', '◍', '◎'];

export function DashboardPage() {
  const [kpiCards, setKpiCards] = useState<KpiCard[]>([
    { label: 'Tracked Assets', value: '—', delta: 'loading...' },
    { label: 'Price Feed Coverage', value: '—', delta: 'loading...' },
    { label: 'Readiness', value: '—', delta: 'loading...' },
    { label: 'Stale Symbols', value: '—', delta: 'loading...' },
  ]);
  const [priceSourceHealth, setPriceSourceHealth] = useState<PriceSourceHealthRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [readiness, assets] = await Promise.all([fetchReadiness(), fetchAssets()]);
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
      } catch {
        setPriceSourceHealth([]);
      }
    };
    void load();
  }, []);

  const healthCards = useMemo(() => priceSourceHealth, [priceSourceHealth]);

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
            <span className="chip">{card.delta}</span>
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
    </section>
  );
}
