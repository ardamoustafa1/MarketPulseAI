import { DataTable } from '../components/Table';
import { SystemHealthOverview } from '../features/health/SystemHealthOverview';
import { useEffect, useState } from 'react';
import { fetchAuditLogs, fetchReadiness } from '../api/adminApi';
import type { FailedSyncRecord, PriceSourceHealthRecord } from '../types/admin';

export function HealthPage() {
  const [sourceHealth, setSourceHealth] = useState<PriceSourceHealthRecord[]>([]);
  const [failedSyncs, setFailedSyncs] = useState<FailedSyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [readiness, logs] = await Promise.all([fetchReadiness(), fetchAuditLogs(300)]);
        const checks = readiness.checks ?? {};
        const sources: PriceSourceHealthRecord[] = [
          { source: 'binance', uptime: checks.binance ? 'up' : 'down', latency: 'n/a', incident: checks.binance ? 'none' : 'unhealthy' },
          { source: 'yahoo', uptime: checks.yahoo ? 'up' : 'down', latency: 'n/a', incident: checks.yahoo ? 'none' : 'unhealthy' },
          { source: 'redis', uptime: checks.redis ? 'up' : 'down', latency: 'n/a', incident: checks.redis ? 'none' : 'unhealthy' },
          { source: 'database', uptime: checks.database ? 'up' : 'down', latency: 'n/a', incident: checks.database ? 'none' : 'unhealthy' },
        ];
        setSourceHealth(sources);

        const syncFailures = logs
          .filter((log) => log.action.includes('sync') || log.action.includes('price'))
          .map((log) => ({
            id: log.id,
            stream: log.entity_table,
            reason: log.action,
            retry: 'manual',
            status: 'investigating',
          }));
        setFailedSyncs(syncFailures);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="stack">
      <SystemHealthOverview />

      <DataTable
        title="Price Source Health"
        columns={[
          { key: 'source', label: 'Source' },
          { key: 'uptime', label: 'Uptime' },
          { key: 'latency', label: 'Latency' },
          { key: 'incident', label: 'Incident' },
        ]}
        data={sourceHealth}
        isLoading={isLoading}
        searchableKeys={['source', 'incident']}
        searchPlaceholder="Search source health"
        getRowId={(row) => row.source}
        renderDetails={(row) => (
          <>
            <p>Source: {row.source}</p>
            <p>Uptime: {row.uptime}</p>
            <p>Latency: {row.latency}</p>
            <p>Incident: {row.incident}</p>
          </>
        )}
      />

      <DataTable
        title="Failed Sync Records"
        columns={[
          { key: 'id', label: 'Sync ID' },
          { key: 'stream', label: 'Stream' },
          { key: 'reason', label: 'Reason' },
          { key: 'retry', label: 'Retry' },
          { key: 'status', label: 'Status' },
        ]}
        data={failedSyncs}
        isLoading={isLoading}
        filters={[{ key: 'status', label: 'Status', options: ['investigating'] }]}
        searchableKeys={['id', 'stream', 'reason']}
        searchPlaceholder="Search sync records"
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>Stream: {row.stream}</p>
            <p>Reason: {row.reason}</p>
            <p>Retry: {row.retry}</p>
            <p>Status: {row.status}</p>
          </>
        )}
      />
    </div>
  );
}
