import { create } from "zustand";

interface UserState {
  id: string | null;
  username: string | null;
  role: "PLAYER" | "ADMIN" | null;
  status: string | null;
  personality: string | null;
  balance: number;
  health: number;
  stamina: number;
  maxStamina: number;
}

interface AppState {
  user: UserState;
  isLoading: boolean;
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  updateBalance: (amount: number) => void;
  updateHealth: (amount: number) => void;
  updateStamina: (amount: number) => void;
}

const initialUserState: UserState = {
  id: null,
  username: null,
  role: null,
  status: null,
  personality: null,
  balance: 0,
  health: 100,
  stamina: 100,
  maxStamina: 100,
};

export const useAppStore = create<AppState>((set) => ({
  user: initialUserState,
  isLoading: false,

  setUser: (userData) =>
    set((state) => ({
      user: { ...state.user, ...userData },
    })),

  clearUser: () =>
    set(() => ({
      user: initialUserState,
    })),

  setLoading: (loading) =>
    set(() => ({
      isLoading: loading,
    })),

  updateBalance: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        balance: Math.max(0, state.user.balance + amount),
      },
    })),

  updateHealth: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        health: Math.min(100, Math.max(0, state.user.health + amount)),
      },
    })),

  updateStamina: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        stamina: Math.min(
          state.user.maxStamina,
          Math.max(0, state.user.stamina + amount)
        ),
      },
    })),
}));
