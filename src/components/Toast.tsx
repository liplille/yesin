// src/components/Toast.tsx
type ToastProps = {
  message: string;
  onClose: () => void;
};

export default function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-white shadow-lg animate-fade-in-up"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-white/20"
          aria-label="Fermer la notification"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
