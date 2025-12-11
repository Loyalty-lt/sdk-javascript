import Ably from 'ably';

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
    status: 'scanned' | 'confirmed' | 'expired' | 'cancelled';
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

export interface AblyTokenProvider {
  (): Promise<{ token: string; channel: string }>;
}

export class WebSocketManager {
  private ably: Ably.Realtime | null = null;
  private subscriptions: Map<string, any[]> = new Map();
  private debug: boolean;
  private tokenProvider?: AblyTokenProvider;

  constructor(debug = false) {
    this.debug = debug;
  }

  setTokenProvider(provider: AblyTokenProvider): void {
    this.tokenProvider = provider;
  }

  async connectWithToken(token: string, tokenRefreshCallback?: () => Promise<string>): Promise<void> {
    if (this.ably) {
      this.ably.close();
    }

    const ablyOptions: Ably.ClientOptions = {
      token: token,
      autoConnect: true
    };

    // Add authCallback for automatic token renewal
    if (tokenRefreshCallback) {
      ablyOptions.authCallback = async (tokenParams, callback) => {
        try {
          const newToken = await tokenRefreshCallback();
          callback(null, newToken);
        } catch (err: any) {
          callback(err?.message || 'Token refresh failed', null);
        }
      };
    }

    this.ably = new Ably.Realtime(ablyOptions);

    return new Promise((resolve, reject) => {
      this.ably!.connection.on('connected', () => {
        if (this.debug) console.log('Ably connected');
        resolve();
      });

      this.ably!.connection.on('failed', (error: any) => {
        reject(error);
      });
    });
  }

  disconnect(): void {
    if (this.ably) {
      this.subscriptions.forEach((callbacks, channelName) => {
        const channel = this.ably!.channels.get(channelName);
        callbacks.forEach(callback => {
          channel.unsubscribe(callback);
        });
      });
      this.subscriptions.clear();
      this.ably.close();
      this.ably = null;
    }
  }

  subscribe(channelName: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    if (!this.ably) {
      throw new Error('Ably not connected. Call connectWithToken first.');
    }

    const channel = this.ably.channels.get(channelName);
    
    const ablyCallback = (message: Ably.Message) => {
      const wsMessage: WebSocketMessage = {
        type: message.name || 'message',
        data: message.data,
        timestamp: new Date(message.timestamp || Date.now()).toISOString(),
        channel: channelName
      };
      callback(wsMessage);
    };

    channel.subscribe(ablyCallback);

    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, []);
    }
    this.subscriptions.get(channelName)!.push(ablyCallback);

    return {
      unsubscribe: () => {
        channel.unsubscribe(ablyCallback);
        const callbacks = this.subscriptions.get(channelName) || [];
        const index = callbacks.indexOf(ablyCallback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.subscriptions.delete(channelName);
        }
      }
    };
  }

  subscribeToChannel(channelName: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    return this.subscribe(channelName, callback);
  }

  subscribeToQrLogin(sessionId: string, callback: (message: QrLoginStatusMessage) => void): WebSocketSubscription {
    const channelName = `qr-login:${sessionId}`;
    return this.subscribe(channelName, (message) => {
      if (message.type === 'qr_login_status') {
        callback(message as QrLoginStatusMessage);
      }
    });
  }

  subscribeToQrCardScan(sessionId: string, callback: (message: QrCardIdentifiedMessage) => void): WebSocketSubscription {
    const channelName = `qr-card:${sessionId}`;
    return this.subscribe(channelName, (message) => {
      if (message.type === 'card_identified') {
        callback(message as QrCardIdentifiedMessage);
      }
    });
  }

  getStatus(): { connected: boolean; subscriptions: number } {
    return {
      connected: this.ably?.connection.state === 'connected',
      subscriptions: this.subscriptions.size
    };
  }
}
