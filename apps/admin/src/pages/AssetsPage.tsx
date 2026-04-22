import { useEffect, useState } from 'react';
import { DataTable } from '../components/Table';
import { fetchAssets, fetchPrices } from '../api/adminApi';
import type { AssetRecord } from '../types/admin';

export function AssetsPage() {
  const [data, setData] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const assets = await fetchAssets();
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
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
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
        { key: 'source', label: 'Source', options: ['binance', 'yahoo', 'harem', 'unknown'] },
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
  );
}
