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
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stepUpTokenInput, setStepUpTokenInput] = useState('');
  const [stepUpTotpInput, setStepUpTotpInput] = useState('');
  const [rememberStepUpToken, setRememberStepUpToken] = useState(true);
  const [stepUpError, setStepUpError] = useState('');

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
    const savedToken = localStorage.getItem('admin_step_up_token') ?? '';
    setStepUpTokenInput(savedToken);
    setStepUpTotpInput('');
    setStepUpError('');
    setStepUpOpen(true);
  };

  const handleStepUpConfirm = () => {
    const token = stepUpTokenInput.trim();
    const totp = stepUpTotpInput.trim();
    if (!token) {
      setStepUpError('Step-up token zorunlu.');
      return;
    }
    if (!/^\d{6,8}$/.test(totp)) {
      setStepUpError('TOTP kodu 6-8 haneli sayi olmali.');
      return;
    }
    if (rememberStepUpToken) {
      localStorage.setItem('admin_step_up_token', token);
    } else {
      localStorage.removeItem('admin_step_up_token');
    }
    setStepUpError('');
    setStepUpOpen(false);
    setConfirmDeleteOpen(true);
  };

  const runConfirmedDeleteTransaction = async () => {
    const selected = transactions.find((tx) => tx.id === selectedTransactionId);
    if (!selected) {
      setActionMessage('No transaction selected.');
      return;
    }
    setIsDeleting(true);
    const previous = [...transactions];
    setTransactions((prev) => prev.filter((tx) => tx.id !== selectedTransactionId));
    setActionMessage('Deleting transaction...');
    try {
      await deleteAdminTransaction(selectedTransactionId, {
        token: stepUpTokenInput.trim(),
        totp: stepUpTotpInput.trim(),
      });
      await loadData();
      setActionMessage('Transaction deleted.');
      setConfirmDeleteOpen(false);
      setStepUpTotpInput('');
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
        open={stepUpOpen}
        title="Step-Up Verification"
        message="Kritik silme islemi icin step-up token ve TOTP kodu gir."
        confirmLabel="Devam et"
        cancelLabel="Iptal"
        onConfirm={handleStepUpConfirm}
        onCancel={() => {
          setStepUpOpen(false);
          setStepUpError('');
        }}
      >
        <div className="stepup-form-wrap">
          <label>
            Step-Up Token
            <input
              type="password"
              value={stepUpTokenInput}
              onChange={(event) => setStepUpTokenInput(event.target.value)}
              autoComplete="off"
              placeholder="x-admin-step-up degeri"
            />
          </label>
          <label>
            TOTP (6-8 hane)
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={stepUpTotpInput}
              onChange={(event) => setStepUpTotpInput(event.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
          <label className="stepup-remember">
            <input
              type="checkbox"
              checked={rememberStepUpToken}
              onChange={(event) => setRememberStepUpToken(event.target.checked)}
            />
            Step-up token bu tarayicida hatirlansin
          </label>
          {stepUpError ? <p className="stepup-error">{stepUpError}</p> : null}
        </div>
      </ConfirmDialog>
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
