import { create } from "zustand";

interface LoadingState {
  count: number;
  message: string | null;
  start: (message?: string) => void;
  stop: () => void;
  setMessage: (message?: string | null) => void;
  reset: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  count: 0,
  message: null,
  start: (message) =>
    set((s) => ({ count: s.count + 1, message: message ?? s.message })),
  stop: () =>
    set((s) => {
      const next = Math.max(0, s.count - 1);
      return { count: next, message: next === 0 ? null : s.message };
    }),
  setMessage: (message) => set(() => ({ message: message ?? null })),
  reset: () => set(() => ({ count: 0, message: null })),
}));
