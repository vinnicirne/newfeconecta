type EventHandler = (event: any) => void | Promise<void>;

export class EventBus {
  private static handlers: Map<string, EventHandler[]> = new Map();

  static subscribe(eventName: string, handler: EventHandler): void {
    const currentHandlers = this.handlers.get(eventName) || [];
    currentHandlers.push(handler);
    this.handlers.set(eventName, currentHandlers);
  }

  static async publish(eventName: string, eventPayload: any): Promise<void> {
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(eventPayload);
        } catch (error) {
          console.error(`Error handling event ${eventName}:`, error);
        }
      }
    }
  }

  static clear(): void {
    this.handlers.clear();
  }
}
