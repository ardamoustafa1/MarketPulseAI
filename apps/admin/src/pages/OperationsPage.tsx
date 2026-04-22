import { DataTable } from '../components/Table';
import { useEffect, useState } from 'react';
import { fetchAdminActions, fetchReadiness } from '../api/adminApi';
import type { AdminActionRecord, FeatureToggleRecord } from '../types/admin';

export function OperationsPage() {
  const [actions, setActions] = useState<AdminActionRecord[]>([]);
  const [runtimeFlags, setRuntimeFlags] = useState<FeatureToggleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [adminActions, readiness] = await Promise.all([
          fetchAdminActions(200),
          fetchReadiness(),
        ]);
        setActions(
          adminActions.map((item) => ({
            action: item.action,
            owner: item.admin_email ?? item.admin_id,
            scope: item.target_user_id ?? 'global',
          }))
        );

        const checks = readiness.checks ?? {};
        const checkFlags: FeatureToggleRecord[] = Object.entries(checks).map(([key, value]) => ({
          key: `check.${key}`,
          owner: 'runtime',
          state: value ? 'enabled' : 'disabled',
        }));
        setRuntimeFlags(checkFlags);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="stack">
      <DataTable
        title="Admin Actions"
        columns={[
          { key: 'action', label: 'Action' },
          { key: 'owner', label: 'Owner' },
          { key: 'scope', label: 'Scope' },
        ]}
        data={actions}
        isLoading={isLoading}
        searchableKeys={['action', 'owner', 'scope']}
        searchPlaceholder="Search admin actions"
        getRowId={(row, index) => `${row.action}-${index}`}
        renderDetails={(row) => (
          <>
            <p>Action: {row.action}</p>
            <p>Owner: {row.owner}</p>
            <p>Scope: {row.scope}</p>
          </>
        )}
      />

      <DataTable
        title="Runtime Checks"
        columns={[
          { key: 'key', label: 'Check Key' },
          { key: 'owner', label: 'Owner' },
          { key: 'state', label: 'State' },
        ]}
        data={runtimeFlags}
        isLoading={isLoading}
        filters={[{ key: 'state', label: 'State', options: ['enabled', 'disabled'] }]}
        searchableKeys={['key', 'owner', 'state']}
        searchPlaceholder="Search runtime checks"
        getRowId={(row) => row.key}
        renderDetails={(row) => (
          <>
            <p>Check: {row.key}</p>
            <p>Owner: {row.owner}</p>
            <p>State: {row.state}</p>
          </>
        )}
      />
    </div>
  );
}
