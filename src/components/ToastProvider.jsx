import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import './ToastProvider.css';

const ToastContext = createContext(null);

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const addToast = useCallback((message, type = 'info', timeout = 5000) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), timeout);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>{toast.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
