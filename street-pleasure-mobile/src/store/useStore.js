import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  token: null,
  isAppReady: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAppReady: (isAppReady) => set({ isAppReady }),
  
  logout: () => set({ user: null, token: null }),
}));

export default useStore;
