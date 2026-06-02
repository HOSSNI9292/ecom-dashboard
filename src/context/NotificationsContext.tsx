"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle, Bell, Package, ShoppingCart, X } from "lucide-react";
import { useEffect } from "react";

interface Notification {
  id: string;
  type: "low_stock" | "new_order" | "out_of_stock";
  message: string;
  timestamp: number;
}

interface NotificationsContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "timestamp">) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  addNotification: () => {},
  dismiss: () => {},
  clearAll: () => {},
  unreadCount: 0,
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp">) => {
    const notif: Notification = { ...n, id: crypto.randomUUID(), timestamp: Date.now() };
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.length;

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, dismiss, clearAll, unreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

const ICONS: Record<string, React.ReactNode> = {
  low_stock: <Package className="w-4 h-4 text-warning" />,
  out_of_stock: <AlertTriangle className="w-4 h-4 text-error" />,
  new_order: <ShoppingCart className="w-4 h-4 text-accent-400" />,
};

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const { notifications, dismiss } = useNotifications();
  const latest = notifications.slice(0, 1);

  useEffect(() => {
    if (latest.length > 0) {
      const timer = setTimeout(() => dismiss(latest[0].id), 5000);
      return () => clearTimeout(timer);
    }
  }, [latest.length, dismiss]);

  return (
    <div className="relative">
      <button onClick={onClick} className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>
      {latest.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-dark-700/50 last:border-0 hover:bg-dark-700/50 transition-colors">
              <div className="mt-0.5">{ICONS[n.type]}</div>
              <p className="text-sm text-dark-200 flex-1">{n.message}</p>
              <button onClick={() => dismiss(n.id)} className="text-dark-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
