import { create } from 'zustand';
import { apiClient } from '../api/client';

export type AlertCondition = 'gt' | 'lt' | 'pct_up' | 'pct_down';

export interface Alert {
  id: string;
  asset_id: string;
  target_price: string;
  condition: AlertCondition;
  base_price: string | null;
  is_active: boolean;
}

export interface AlertEvent {
  id: string;
  alert_id: string;
  triggered_price: string;
}

interface AlertState {
  alerts: Alert[];
  history: AlertEvent[];
  isLoading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  createAlert: (data: Omit<Alert, 'id' | 'is_active'>) => Promise<boolean>;
  toggleAlert: (id: string, is_active: boolean) => Promise<boolean>;
  deleteAlert: (id: string) => Promise<boolean>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  history: [],
  isLoading: false,
  error: null,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<Alert[]>('/api/v1/alerts');
      set({ alerts: data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          'Alarmlar yuklenemedi. Baglantiyi kontrol edip tekrar dene.',
        isLoading: false,
      });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<AlertEvent[]>('/api/v1/alerts/history');
      set({ history: data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          'Alarm gecmisi yuklenemedi. Biraz sonra tekrar dene.',
        isLoading: false,
      });
    }
  },

  createAlert: async (alertData) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/api/v1/alerts', alertData);
      await get().fetchAlerts();
      return true;
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          'Alarm olusturulamadi. Degerleri kontrol edip yeniden dene.',
        isLoading: false,
      });
      return false;
    }
  },

  toggleAlert: async (id, is_active) => {
    try {
      await apiClient.patch(`/api/v1/alerts/${id}`, { is_active });
      set(state => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, is_active } : a)
      }));
      return true;
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          'Alarm durumu guncellenemedi. Tekrar dene.',
      });
      return false;
    }
  },

  deleteAlert: async (id) => {
    try {
      await apiClient.delete(`/api/v1/alerts/${id}`);
      set(state => ({
        alerts: state.alerts.filter(a => a.id !== id)
      }));
      return true;
    } catch (error: any) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          'Alarm silinemedi. Tekrar dene.',
      });
      return false;
    }
  }
}));
