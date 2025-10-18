// src/components/Toast.tsx
import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onClose: () => void;
  duration?: number;
};

export default function Toast({
  message,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-600 px-4 py-2 text-white shadow-lg animate-fade-in-up"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-lg hover:bg-white/20"
          aria-label="Fermer la notification"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
