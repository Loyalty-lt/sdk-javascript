import Pusher, { Channel } from 'pusher-js';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  channel?: string;
}

export interface QrLoginStatusMessage extends WebSocketMessage {
  type: 'qr_login_status';
  data: {
    session_id: string;
    status: 'scanned' | 'confirmed' | 'authenticated' | 'expired' | 'cancelled' | 'failed';
    user?: any;
    token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export interface QrCardIdentifiedMessage extends WebSocketMessage {
  type: 'card_identified';
  data: {
    session_id: string;
    status: 'authenticated';
    card_data: {
      loyalty_card_id: number;
      card_number: string;
      points: number;
      user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
      };
      redemption?: {
        enabled: boolean;
        points_per_currency: number;
        currency_amount: number;
        min_points: number;
        max_points: number;
      };
      scanned_at: string;
    };
    timestamp: string;
  };
}

export interface WebSocketSubscription {
  unsubscribe: () => void;
}

/**
 * Reverb (Pusher protocol) connection details, served by
 * `GET /{locale}/shop/realtime/config`.
 */
export interface RealtimeConfig {
  key: string;
  host: string;
  port: number;
  scheme: string;
}

/** Events the QR channels emit. Bound explicitly — Reverb has no wildcard bind. */
const QR_EVENTS = ['status_update', 'card_identified'];

/**
 * Realtime client for the Loyalty.lt QR flows.
 *
 * The QR channels are public: the unguessable session id in the channel name is
 * the secret, so no auth handshake is needed and no token has to be minted.
 */
export class WebSocketManager {
  private pusher: Pusher | null = null;
  private channels: Map<string, Channel> = new Map();
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  async connect(config: RealtimeConfig): Promise<void> {
    if (this.pusher) {
      this.disconnect();
    }

    this.pusher = new Pusher(config.key, {
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      // Reverb has no Pusher "cluster", but pusher-js throws without the option.
      cluster: '',
      disableStats: true,
    } as any);

    return new Promise((resolve, reject) => {
      this.pusher!.connection.bind('connected', () => {
        if (this.debug) console.log('Reverb connected');
        resolve();
      });
      this.pusher!.connection.bind('failed', (error: any) => reject(error));
      this.pusher!.connection.bind('error', (error: any) => reject(error));
    });
  }

  disconnect(): void {
    if (!this.pusher) return;

    this.channels.forEach((_channel, name) => this.pusher!.unsubscribe(name));
    this.channels.clear();
    this.pusher.disconnect();
    this.pusher = null;
  }

  subscribe(channelName: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    if (!this.pusher) {
      throw new Error('Realtime not connected. Call connect() first.');
    }

    const channel = this.channels.get(channelName) ?? this.pusher.subscribe(channelName);
    this.channels.set(channelName, channel);

    const handlers = QR_EVENTS.map((eventName) => {
      const handler = (data: any) => {
        callback({
          type: data?.type ?? eventName,
          data,
          timestamp: data?.timestamp ?? new Date().toISOString(),
          channel: channelName,
        });
      };
      channel.bind(eventName, handler);
      return { eventName, handler };
    });

    return {
      unsubscribe: () => {
        handlers.forEach(({ eventName, handler }) => channel.unbind(eventName, handler));
        this.pusher?.unsubscribe(channelName);
        this.channels.delete(channelName);
      },
    };
  }

  subscribeToChannel(channelName: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    return this.subscribe(channelName, callback);
  }

  subscribeToQrLogin(sessionId: string, callback: (message: QrLoginStatusMessage) => void): WebSocketSubscription {
    return this.subscribe(`qr-login.${sessionId}`, (message) => {
      if (message.type === 'status_update' || message.type === 'qr_login_status') {
        callback({ ...message, type: 'qr_login_status' } as QrLoginStatusMessage);
      }
    });
  }

  subscribeToQrCardScan(sessionId: string, callback: (message: QrCardIdentifiedMessage) => void): WebSocketSubscription {
    return this.subscribe(`qr-card.${sessionId}`, (message) => {
      if (message.type === 'card_identified') {
        callback(message as QrCardIdentifiedMessage);
      }
    });
  }

  getStatus(): { connected: boolean; subscriptions: number } {
    return {
      connected: this.pusher?.connection.state === 'connected',
      subscriptions: this.channels.size,
    };
  }
}
