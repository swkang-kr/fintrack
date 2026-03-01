import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PORTFOLIO_KEY = 'fintrack_selected_portfolio';

interface PortfolioStoreState {
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  loadFromStorage: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStoreState>((set) => ({
  selectedPortfolioId: null,

  setSelectedPortfolioId: async (id: string | null) => {
    set({ selectedPortfolioId: id });
    if (id) await AsyncStorage.setItem(PORTFOLIO_KEY, id);
    else await AsyncStorage.removeItem(PORTFOLIO_KEY);
  },

  loadFromStorage: async () => {
    const portfolioId = await AsyncStorage.getItem(PORTFOLIO_KEY);
    set({ selectedPortfolioId: portfolioId ?? null });
  },
}));
