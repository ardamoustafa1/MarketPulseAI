import { useEffect, useState } from 'react';
import { fetchReadiness } from '../../api/adminApi';

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

  useEffect(() => {
    const load = async () => {
      try {
        const readiness = await fetchReadiness();
        const checks = readiness.checks ?? {};
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
              'Latency: n/a',
              'Worker backlog: n/a',
            ],
          },
        ]);
      } catch {
        setCards([
          { title: 'API Cluster', lines: ['Status: unavailable'] },
          { title: 'Price Feed', lines: ['Status: unavailable'] },
          { title: 'Infrastructure', lines: ['Status: unavailable'] },
        ]);
      }
    };
    void load();
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>System Health Overview</h3>
        <p>Services, feeds and ingestion status in one view.</p>
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
