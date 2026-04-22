import { DataTable } from '../components/Table';
import { useEffect, useState } from 'react';
import {
  deleteAdminTransaction,
  fetchAdminActions,
  fetchAdminAuditTimeline,
  fetchAdminTransactions,
  fetchReadiness,
} from '../api/adminApi';
import { useAuth } from '../components/AuthProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AdminActionRecord, FeatureToggleRecord, TransactionRecord } from '../types/admin';

export function OperationsPage() {
  const { state } = useAuth();
  const canMutate = state.role !== 'viewer';
  const [actions, setActions] = useState<AdminActionRecord[]>([]);
  const [runtimeFlags, setRuntimeFlags] = useState<FeatureToggleRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [timeline, setTimeline] = useState<
    Array<{ id: string; source: string; actor: string; action: string; target: string; createdAt: string }>
  >([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    const [adminActions, readiness, txRows, timelineRows] = await Promise.all([
      fetchAdminActions(200),
      fetchReadiness(),
      fetchAdminTransactions(200),
      fetchAdminAuditTimeline(200),
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

    const txMapped = txRows.map((row) => ({
      id: row.id,
      symbol: row.asset_symbol,
      type: row.tx_type,
      quantity: String(row.quantity),
      price: row.price ? String(row.price) : '0',
      date: new Date(row.transaction_date).toLocaleString(),
    }));
    setTransactions(txMapped);
    if (!selectedTransactionId && txMapped.length > 0) {
      setSelectedTransactionId(txMapped[0].id);
    }

    setTimeline(
      timelineRows.map((item) => ({
        id: item.id,
        source: item.source,
        actor: item.actor ?? 'system',
        action: item.action,
        target: item.target,
        createdAt: new Date(item.created_at).toLocaleString(),
      }))
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadData();
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleDeleteTransaction = async () => {
    if (!selectedTransactionId) {
      return;
    }
    if (!canMutate) {
      setActionMessage('Viewer role is read-only.');
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const runConfirmedDeleteTransaction = async () => {
    setIsDeleting(true);
    const selected = transactions.find((tx) => tx.id === selectedTransactionId);
    if (!selected) {
      return;
    }
    const previous = [...transactions];
    setTransactions((prev) => prev.filter((tx) => tx.id !== selectedTransactionId));
    setActionMessage('Deleting transaction...');
    try {
      await deleteAdminTransaction(selectedTransactionId);
      await loadData();
      setActionMessage('Transaction deleted.');
      setConfirmDeleteOpen(false);
    } catch (error) {
      setTransactions(previous);
      setActionMessage(`Delete failed: ${String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="stack">
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Confirm Transaction Deletion"
        message="Delete selected transaction permanently?"
        confirmLabel="Delete"
        isProcessing={isDeleting}
        onConfirm={runConfirmedDeleteTransaction}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <section className="panel">
        <div className="panel-header">
          <h3>Transaction Moderation</h3>
          <p>Delete invalid or abusive transaction entries</p>
        </div>
        <div className="action-grid">
          <label>
            Transaction
            <select
              value={selectedTransactionId}
              disabled={!canMutate}
              onChange={(event) => setSelectedTransactionId(event.target.value)}
            >
              {transactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.symbol} / {tx.type} / {tx.quantity}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleDeleteTransaction} disabled={!selectedTransactionId || !canMutate}>
            Delete Transaction
          </button>
        </div>
        {actionMessage && <p className="inline-message">{actionMessage}</p>}
      </section>

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

      <DataTable
        title="Recent Transactions"
        columns={[
          { key: 'id', label: 'Transaction ID' },
          { key: 'symbol', label: 'Asset' },
          { key: 'type', label: 'Type' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'date', label: 'Date' },
        ]}
        data={transactions}
        isLoading={isLoading}
        searchableKeys={['id', 'symbol', 'type']}
        searchPlaceholder="Search transactions"
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>ID: {row.id}</p>
            <p>Symbol: {row.symbol}</p>
            <p>Type: {row.type}</p>
            <p>Quantity: {row.quantity}</p>
            <p>Price: {row.price}</p>
            <p>Date: {row.date}</p>
          </>
        )}
      />

      <DataTable
        title="Audit Timeline"
        columns={[
          { key: 'id', label: 'Event ID' },
          { key: 'source', label: 'Source' },
          { key: 'actor', label: 'Actor' },
          { key: 'action', label: 'Action' },
          { key: 'target', label: 'Target' },
        ]}
        data={timeline}
        isLoading={isLoading}
        searchableKeys={['id', 'source', 'actor', 'action', 'target']}
        searchPlaceholder="Search timeline"
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>Source: {row.source}</p>
            <p>Actor: {row.actor}</p>
            <p>Action: {row.action}</p>
            <p>Target: {row.target}</p>
            <p>At: {row.createdAt}</p>
          </>
        )}
      />
    </div>
  );
}
