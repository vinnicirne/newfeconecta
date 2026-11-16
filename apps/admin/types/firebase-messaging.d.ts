declare module "firebase/messaging" {
  export interface Messaging {
    readonly app?: unknown;
  }

  export interface MessagePayload {
    [key: string]: unknown;
    data?: Record<string, string>;
    notification?: { title?: string; body?: string; image?: string };
  }

  export function getMessaging(app?: unknown): Messaging;
  export function isSupported(): Promise<boolean>;
  export function getToken(messaging: Messaging, options?: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration }): Promise<string>;
  export function onMessage(messaging: Messaging, callback: (payload: MessagePayload) => void): () => void;
}
