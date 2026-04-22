import { useEffect, useState } from 'react';
import { fetchHealth, fetchReadiness } from '../../api/adminApi';

type HealthCard = {
  title: string;
  lines: string[];
};

export function SystemHealthOverview() {
  const [cards, setCards] = useState<HealthCard[]>([
    { title: 'API Cluster', lines: ['Status: loading...'] },
    { title: 'Price Feed', lines: ['Status: loading...'] },
    { title: 'Infrastructure', lines: ['Status: loading...'] },
  ]);

  const [lastUpdated, setLastUpdated] = useState<string>('never');

  useEffect(() => {
    const load = async () => {
      try {
        const [readiness, health] = await Promise.all([fetchReadiness(), fetchHealth()]);
        const checks = readiness.checks ?? {};
        const metrics = health.metrics ?? {};
        setCards([
          {
            title: 'API Cluster',
            lines: [
              `Status: ${readiness.ready ? 'Healthy' : 'Degraded'}`,
              `Database: ${checks.database ? 'up' : 'down'}`,
              `Redis: ${checks.redis ? 'up' : 'down'}`,
            ],
          },
          {
            title: 'Price Feed',
            lines: [
              `Aggregator: ${checks.price_feed ? 'up' : 'down'}`,
              `Binance: ${checks.binance ? 'up' : 'down'}`,
              `Yahoo: ${checks.yahoo ? 'up' : 'down'}`,
            ],
          },
          {
            title: 'Infrastructure',
            lines: [
              `Readiness: ${readiness.ready ? 'pass' : 'fail'}`,
              `Latency P95: ${Math.round(metrics.p95_latency_ms ?? 0)}ms`,
              `Error rate: ${(metrics.error_rate_percent ?? 0).toFixed(2)}%`,
            ],
          },
        ]);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setCards([
          { title: 'API Cluster', lines: ['Status: unavailable'] },
          { title: 'Price Feed', lines: ['Status: unavailable'] },
          { title: 'Infrastructure', lines: ['Status: unavailable'] },
        ]);
        setLastUpdated('unavailable');
      }
    };
    void load();
    const interval = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>System Health Overview</h3>
        <p>Services, feeds and ingestion status in one view. Last update: {lastUpdated}</p>
      </div>
      <div className="status-grid">
        {cards.map((card) => (
          <div className="status-card" key={card.title}>
            <h4>{card.title}</h4>
            {card.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
