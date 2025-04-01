import { create } from 'zustand';
import { ToastProps } from '../components/Common/Toast/toast_types';

interface ToastStore {
  toast: ToastProps | null;
  showToast: (props: ToastProps) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  showToast: (props: ToastProps) => set({ toast: props }),
  hideToast: () => set({ toast: null }),
})); 