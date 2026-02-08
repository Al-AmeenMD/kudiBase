type DbListener = (event: 'sales' | 'payments' | 'items' | 'profile') => void;

const listeners = new Set<DbListener>();

export function subscribeDbEvents(listener: DbListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDbEvent(event: 'sales' | 'payments' | 'items' | 'profile') {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Ignore listener errors to keep updates flowing.
    }
  });
}
