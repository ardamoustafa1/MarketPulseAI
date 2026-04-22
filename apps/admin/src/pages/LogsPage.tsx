import { DataTable } from '../components/Table';
import { useEffect, useState } from 'react';
import { fetchAdminInsights, fetchAuditLogs } from '../api/adminApi';
import type { AiInsightLogRecord, AuditLogRecord } from '../types/admin';

export function LogsPage() {
  const [insights, setInsights] = useState<AiInsightLogRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [adminInsights, audits] = await Promise.all([
          fetchAdminInsights(200),
          fetchAuditLogs(200),
        ]);
        setInsights(
          adminInsights.map((item) => ({
            id: item.id,
            asset: item.user_email ?? item.user_id,
            model: item.insight_type,
            severity: 'info',
            createdAt: new Date(item.created_at).toLocaleString(),
            content: item.content,
          }))
        );
        setAuditLogs(
          audits.map((item) => ({
            id: item.id,
            actor: item.actor_email ?? item.user_id ?? 'system',
            action: item.action,
            target: `${item.entity_table}:${item.entity_id}`,
            result: 'success',
            details: JSON.stringify(item.details ?? {}),
            createdAt: new Date(item.created_at).toLocaleString(),
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="stack">
      <DataTable
        title="AI Insight Logs"
        columns={[
          { key: 'id', label: 'Log ID' },
          { key: 'asset', label: 'User' },
          { key: 'model', label: 'Insight Type' },
          { key: 'severity', label: 'Severity' },
          { key: 'createdAt', label: 'Created At' },
        ]}
        data={insights}
        isLoading={isLoading}
        filters={[{ key: 'severity', label: 'Severity', options: ['info'] }]}
        searchableKeys={['id', 'asset', 'model']}
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>Insight #{row.id}</p>
            <p>User: {row.asset}</p>
            <p>Type: {row.model}</p>
            <p>Created: {row.createdAt}</p>
            <p>Content: {row.content}</p>
          </>
        )}
      />

      <DataTable
        title="Audit Logs"
        columns={[
          { key: 'id', label: 'Audit ID' },
          { key: 'actor', label: 'Actor' },
          { key: 'action', label: 'Action' },
          { key: 'target', label: 'Target' },
          { key: 'result', label: 'Result' },
        ]}
        data={auditLogs}
        isLoading={isLoading}
        filters={[{ key: 'result', label: 'Result', options: ['success'] }]}
        searchableKeys={['id', 'actor', 'action', 'target']}
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>Action: {row.action}</p>
            <p>Actor: {row.actor}</p>
            <p>Target: {row.target}</p>
            <p>Result: {row.result}</p>
            <p>At: {row.createdAt}</p>
            <p>Details: {row.details}</p>
          </>
        )}
      />
    </div>
  );
}
