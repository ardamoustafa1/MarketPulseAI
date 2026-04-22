import { useEffect, useState } from 'react';
import { DataTable } from '../components/Table';
import { fetchUsers, updateAdminUser } from '../api/adminApi';
import { useAuth } from '../components/AuthProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { UserRecord } from '../types/admin';

export function UsersPage() {
  const { state } = useAuth();
  const canMutate = state.role !== 'viewer';
  const [data, setData] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [nextRole, setNextRole] = useState<'user' | 'admin'>('user');
  const [nextStatus, setNextStatus] = useState<'active' | 'suspended'>('active');
  const [nextPlan, setNextPlan] = useState<'free' | 'pro'>('free');
  const [actionMessage, setActionMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const loadUsers = async () => {
    const users = await fetchUsers();
    const mapped = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.is_active ? 'active' : 'suspended',
      region: 'n/a',
      createdAt: new Date(user.created_at).toLocaleString(),
      subscriptionTier: user.subscription_tier ?? 'free',
    }));
    setData(mapped);
    if (!selectedUserId && mapped.length > 0) {
      const first = mapped[0];
      setSelectedUserId(first.id);
      setNextRole((first.role as 'user' | 'admin') ?? 'user');
      setNextStatus((first.status as 'active' | 'suspended') ?? 'active');
      setNextPlan((first.subscriptionTier as 'free' | 'pro') ?? 'free');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadUsers();
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const selectedUser = data.find((item) => item.id === selectedUserId);

  const handleApplyUserUpdate = async () => {
    if (!selectedUserId) {
      return;
    }
    if (!canMutate) {
      setActionMessage('Viewer role is read-only.');
      return;
    }
    setConfirmOpen(true);
  };

  const runConfirmedUserUpdate = async () => {
    setIsApplying(true);
    const previous = [...data];
    setData((prev) =>
      prev.map((item) =>
        item.id === selectedUserId
          ? { ...item, role: nextRole, status: nextStatus, subscriptionTier: nextPlan }
          : item
      )
    );
    setActionMessage('Applying user update...');
    try {
      await updateAdminUser(selectedUserId, {
        role: nextRole,
        is_active: nextStatus === 'active',
        subscription_tier: nextPlan,
      });
      setActionMessage('User updated successfully.');
      setConfirmOpen(false);
    } catch (error) {
      setData(previous);
      setActionMessage(`User update failed: ${String(error)}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="stack">
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm User Update"
        message="Apply moderation changes to selected user?"
        confirmLabel="Apply"
        isProcessing={isApplying}
        onConfirm={runConfirmedUserUpdate}
        onCancel={() => setConfirmOpen(false)}
      />
      <section className="panel">
        <div className="panel-header">
          <h3>User Moderation</h3>
          <p>Role, account status and plan controls</p>
        </div>
        <div className="action-grid">
          <label>
            User
            <select
              value={selectedUserId}
              disabled={!canMutate}
              onChange={(event) => {
                const userId = event.target.value;
                setSelectedUserId(userId);
                const found = data.find((item) => item.id === userId);
                if (found) {
                  setNextRole((found.role as 'user' | 'admin') ?? 'user');
                  setNextStatus((found.status as 'active' | 'suspended') ?? 'active');
                  setNextPlan((found.subscriptionTier as 'free' | 'pro') ?? 'free');
                }
              }}
            >
              {data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select
              value={nextRole}
              disabled={!canMutate}
              onChange={(event) => setNextRole(event.target.value as 'user' | 'admin')}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={nextStatus}
              disabled={!canMutate}
              onChange={(event) => setNextStatus(event.target.value as 'active' | 'suspended')}
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </label>
          <label>
            Plan
            <select
              value={nextPlan}
              disabled={!canMutate}
              onChange={(event) => setNextPlan(event.target.value as 'free' | 'pro')}
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
            </select>
          </label>
          <button type="button" onClick={handleApplyUserUpdate} disabled={!selectedUser || !canMutate}>
            Apply Update
          </button>
        </div>
        {actionMessage && <p className="inline-message">{actionMessage}</p>}
      </section>

      <DataTable
        title="Users Management"
        columns={[
          { key: 'id', label: 'User ID' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'subscriptionTier', label: 'Plan' },
        ]}
        data={data}
        isLoading={isLoading}
        filters={[
          { key: 'status', label: 'Status', options: ['active', 'suspended'] },
          { key: 'role', label: 'Role', options: ['user', 'admin'] },
          { key: 'subscriptionTier', label: 'Plan', options: ['free', 'pro'] },
        ]}
        searchableKeys={['id', 'email', 'role', 'subscriptionTier']}
        searchPlaceholder="Search users"
        getRowId={(row) => row.id}
        renderDetails={(row) => (
          <>
            <p>User: {row.email}</p>
            <p>Role: {row.role}</p>
            <p>Status: {row.status}</p>
            <p>Subscription: {row.subscriptionTier}</p>
            <p>Created at: {row.createdAt}</p>
          </>
        )}
      />
    </div>
  );
}
