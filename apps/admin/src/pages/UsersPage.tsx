import { useEffect, useState } from 'react';
import { DataTable } from '../components/Table';
import { fetchUsers } from '../api/adminApi';
import type { UserRecord } from '../types/admin';

export function UsersPage() {
  const [data, setData] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const users = await fetchUsers();
        setData(
          users.map((user) => ({
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.is_active ? 'active' : 'suspended',
            region: 'n/a',
            createdAt: new Date(user.created_at).toLocaleString(),
            subscriptionTier: user.subscription_tier ?? 'free',
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
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
  );
}
