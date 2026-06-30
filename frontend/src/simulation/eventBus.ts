type Listener = (data?: any) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  subscribe(event: string, callback: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    };
  }

  publish(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(data));
  }
}

export const eventBus = new EventBus();
