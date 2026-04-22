import { useEffect, useState } from 'react';
import { DataTable } from '../components/Table';
import {
  createManagedAsset,
  fetchAssets,
  fetchManagedAssets,
  fetchPrices,
  updateManagedAsset,
} from '../api/adminApi';
import { useAuth } from '../components/AuthProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AssetRecord } from '../types/admin';

export function AssetsPage() {
  const { state } = useAuth();
  const canMutate = state.role !== 'viewer';
  const [data, setData] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managedAssets, setManagedAssets] = useState<
    Array<{ id: string; symbol: string; name: string; type: string; is_active: boolean }>
  >([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'crypto' | 'fiat' | 'metal'>('crypto');
  const [assetMessage, setAssetMessage] = useState('');
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const loadAssets = async () => {
    const [assets, managed] = await Promise.all([fetchAssets(), fetchManagedAssets(500)]);
    const symbols = assets.map((asset) => asset.symbol).slice(0, 120);
    const prices = await fetchPrices(symbols);
    const bySymbol = new Map(prices.map((price) => [price.symbol, price]));

    setData(
      assets.map((asset) => {
        const price = bySymbol.get(asset.symbol);
        return {
          symbol: asset.symbol,
          source: price?.source ?? 'unknown',
          status: price?.is_stale ? 'stale' : 'healthy',
          lastSync: price?.last_updated_at
            ? new Date(price.last_updated_at).toLocaleString()
            : 'n/a',
          confidence: price?.is_stale ? 60 : 95,
        };
      })
    );

    const managedMapped = managed.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      type: item.type,
      is_active: item.is_active,
    }));
    setManagedAssets(managedMapped);
    if (!selectedAssetId && managedMapped.length > 0) {
      setSelectedAssetId(managedMapped[0].id);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadAssets();
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreateAsset = async () => {
    if (!canMutate) {
      setAssetMessage('Viewer role is read-only.');
      return;
    }
    if (!newSymbol.trim() || !newName.trim()) {
      setAssetMessage('Symbol and name are required.');
      return;
    }
    setConfirmCreateOpen(true);
  };

  const runConfirmedCreateAsset = async () => {
    setIsCreating(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      symbol: newSymbol.trim().toUpperCase(),
      name: newName.trim(),
      type: newType,
      is_active: true,
    };
    setManagedAssets((prev) => [optimistic, ...prev]);
    setAssetMessage('Creating asset...');
    try {
      await createManagedAsset({
        symbol: newSymbol.trim().toUpperCase(),
        name: newName.trim(),
        type: newType,
        is_active: true,
      });
      setNewSymbol('');
      setNewName('');
      await loadAssets();
      setAssetMessage('Asset created successfully.');
      setConfirmCreateOpen(false);
    } catch (error) {
      setManagedAssets((prev) => prev.filter((item) => item.id !== optimistic.id));
      setAssetMessage(`Asset create failed: ${String(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAsset = async () => {
    if (!canMutate) {
      setAssetMessage('Viewer role is read-only.');
      return;
    }
    const selected = managedAssets.find((item) => item.id === selectedAssetId);
    if (!selected) {
      return;
    }
    setConfirmToggleOpen(true);
  };

  const runConfirmedToggleAsset = async () => {
    const selected = managedAssets.find((item) => item.id === selectedAssetId);
    if (!selected) {
      setAssetMessage('No asset selected.');
      return;
    }
    setIsToggling(true);
    const previous = [...managedAssets];
    setManagedAssets((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, is_active: !item.is_active } : item
      )
    );
    setAssetMessage('Updating asset status...');
    try {
      await updateManagedAsset(selected.id, { is_active: !selected.is_active });
      await loadAssets();
      setAssetMessage('Asset status updated.');
      setConfirmToggleOpen(false);
    } catch (error) {
      setManagedAssets(previous);
      setAssetMessage(`Asset update failed: ${String(error)}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="stack">
      <ConfirmDialog
        open={confirmCreateOpen}
        title="Confirm Asset Creation"
        message="Create this new asset record?"
        confirmLabel="Create"
        isProcessing={isCreating}
        onConfirm={runConfirmedCreateAsset}
        onCancel={() => setConfirmCreateOpen(false)}
      />
      <ConfirmDialog
        open={confirmToggleOpen}
        title="Confirm Asset Status Change"
        message="Toggle selected asset active status?"
        confirmLabel="Toggle"
        isProcessing={isToggling}
        onConfirm={runConfirmedToggleAsset}
        onCancel={() => setConfirmToggleOpen(false)}
      />
      <section className="panel">
        <div className="panel-header">
          <h3>Asset Operations</h3>
          <p>Create assets and toggle activation state</p>
        </div>
        <div className="action-grid">
          <label>
            New Symbol
            <input
              value={newSymbol}
              disabled={!canMutate}
              onChange={(event) => setNewSymbol(event.target.value)}
              placeholder="BTC"
            />
          </label>
          <label>
            New Name
            <input
              value={newName}
              disabled={!canMutate}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Bitcoin"
            />
          </label>
          <label>
            Asset Type
            <select
              value={newType}
              disabled={!canMutate}
              onChange={(event) => setNewType(event.target.value as 'crypto' | 'fiat' | 'metal')}
            >
              <option value="crypto">crypto</option>
              <option value="fiat">fiat</option>
              <option value="metal">metal</option>
            </select>
          </label>
          <button type="button" onClick={handleCreateAsset} disabled={!canMutate}>
            Create Asset
          </button>
        </div>
        <div className="action-grid">
          <label>
            Existing Asset
            <select
              value={selectedAssetId}
              disabled={!canMutate}
              onChange={(event) => setSelectedAssetId(event.target.value)}
            >
              {managedAssets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.symbol} ({item.is_active ? 'active' : 'inactive'})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleToggleAsset} disabled={!selectedAssetId || !canMutate}>
            Toggle Active
          </button>
        </div>
        {assetMessage && <p className="inline-message">{assetMessage}</p>}
      </section>

      <DataTable
        title="Assets Management"
        columns={[
          { key: 'symbol', label: 'Symbol' },
          { key: 'source', label: 'Price Source' },
          { key: 'status', label: 'Health' },
          { key: 'lastSync', label: 'Last Sync' },
          { key: 'confidence', label: 'Confidence' },
        ]}
        data={data}
        isLoading={isLoading}
        filters={[
          { key: 'status', label: 'Health', options: ['healthy', 'stale'] },
          { key: 'source', label: 'Source', options: ['binance', 'exchange_rate_host', 'frankfurter', 'gold_api', 'twelve_data', 'alpha_vantage', 'yahoo', 'stooq', 'unknown'] },
        ]}
        searchableKeys={['symbol', 'source', 'status']}
        searchPlaceholder="Search by symbol/source"
        getRowId={(row) => row.symbol}
        renderDetails={(row) => (
          <>
            <p>Asset: {row.symbol}</p>
            <p>Source: {row.source}</p>
            <p>Health: {row.status}</p>
            <p>Last sync: {row.lastSync}</p>
            <p>Confidence: {row.confidence}%</p>
          </>
        )}
      />
    </div>
  );
}
