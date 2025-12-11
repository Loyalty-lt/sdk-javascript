import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ConfigManager, LoyaltySDKConfig, Environment } from './config';
import { WebSocketManager, WebSocketSubscription, QrLoginStatusMessage, QrCardIdentifiedMessage, WebSocketMessage } from './websocket/WebSocketManager';
import {
  QrLoginSession,
  QrLoginPollResponse,
  QrCardScanSession,
  QrCardScanData,
  QrCardScanPollResponse,
  AblyTokenResponse,
  LoyaltyCard,
  PointsTransaction,
  PointsBalance,
  Offer,
  Shop,
  ApiResponse,
  PaginatedResponse,
  LoyaltyCardFilters,
  OfferFilters,
  ShopFilters,
  LoyaltySDKError
} from './types';

export class LoyaltySDK {
  private httpClient: AxiosInstance;
  private configManager: ConfigManager;
  private webSocketManager: WebSocketManager;
  private retryCount: number = 0;

  constructor(config: LoyaltySDKConfig) {
    this.configManager = new ConfigManager(config);
    const sdkConfig = this.configManager.getConfig();

    const validation = this.configManager.validate();
    if (!validation.valid) {
      throw new LoyaltySDKError(
        `Invalid SDK configuration: ${validation.errors.join(', ')}`,
        'INVALID_CONFIG'
      );
    }

    this.httpClient = axios.create({
      baseURL: this.configManager.getApiUrl(),
      timeout: sdkConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LoyaltySDK/1.0.0',
        ...(sdkConfig.apiKey && { 'X-API-Key': sdkConfig.apiKey }),
        ...(sdkConfig.apiSecret && { 'X-API-Secret': sdkConfig.apiSecret })
      }
    });

    this.setupInterceptors();
    this.webSocketManager = new WebSocketManager(sdkConfig.debug || false);
  }

  getConfig(): LoyaltySDKConfig {
    return this.configManager.getConfig();
  }

  updateConfig(updates: Partial<LoyaltySDKConfig>): void {
    this.configManager.updateConfig(updates);
    
    if (updates.baseUrl || updates.environment) {
      this.httpClient.defaults.baseURL = this.configManager.getApiUrl();
    }
    
    if (updates.apiKey) {
      this.httpClient.defaults.headers['X-API-Key'] = updates.apiKey;
    }
    if (updates.apiSecret) {
      this.httpClient.defaults.headers['X-API-Secret'] = updates.apiSecret;
    }
    
    if (updates.timeout) {
      this.httpClient.defaults.timeout = updates.timeout;
    }
  }

  switchEnvironment(environment: Environment): void {
    this.updateConfig({ environment });
  }

  setApiCredentials(apiKey: string, apiSecret: string): void {
    this.updateConfig({ apiKey, apiSecret });
  }

  async validateCredentials(): Promise<{ valid: boolean; partner_name: string }> {
    return await this.makeRequest('POST', '/shop/validate-credentials');
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return await this.makeRequest('GET', '/shop/system/health');
  }

  async getAblyToken(sessionId: string, options?: { user_id?: number; shopping_session_id?: string }): Promise<AblyTokenResponse> {
    return await this.makeRequest<AblyTokenResponse>('POST', '/shop/ably/token', {
      session_id: sessionId,
      ...(options?.user_id && { user_id: options.user_id }),
      ...(options?.shopping_session_id && { shopping_session_id: options.shopping_session_id })
    });
  }

  async generateQrLogin(deviceName?: string, shopId?: number): Promise<QrLoginSession> {
    return await this.makeRequest<QrLoginSession>('POST', '/shop/auth/qr-login/generate', {
      device_name: deviceName || 'POS Terminal',
      ...(shopId && { shop_id: shopId })
    });
  }

  async pollQrLoginStatus(sessionId: string): Promise<QrLoginPollResponse> {
    return await this.makeRequest<QrLoginPollResponse>('POST', `/shop/auth/qr-login/poll/${sessionId}`);
  }

  async subscribeToQrLogin(sessionId: string, callback: (message: QrLoginStatusMessage) => void): Promise<WebSocketSubscription> {
    const tokenResponse = await this.getAblyToken(sessionId);
    
    // Token refresh callback for automatic renewal
    const tokenRefreshCallback = async (): Promise<string> => {
      const newTokenResponse = await this.getAblyToken(sessionId);
      return newTokenResponse.token;
    };
    
    await this.webSocketManager.connectWithToken(tokenResponse.token, tokenRefreshCallback);
    return this.webSocketManager.subscribeToQrLogin(sessionId, callback);
  }

  async sendAppLink(phone: string, shopId: number, customerName?: string, language: string = 'lt'): Promise<any> {
    return await this.makeRequest('POST', '/shop/auth/send-app-link', {
      phone,
      shop_id: shopId,
      ...(customerName && { customer_name: customerName }),
      language
    });
  }

  async generateQrCardSession(deviceName?: string, shopId?: number): Promise<QrCardScanSession> {
    return await this.makeRequest<QrCardScanSession>('POST', '/shop/qr-card/generate', {
      device_name: deviceName || 'POS Terminal',
      ...(shopId && { shop_id: shopId })
    });
  }

  async pollQrCardStatus(sessionId: string): Promise<QrCardScanPollResponse> {
    return await this.makeRequest<QrCardScanPollResponse>('GET', `/shop/qr-card/status/${sessionId}`);
  }

  async subscribeToQrCardScan(sessionId: string, callback: (cardData: QrCardScanData) => void): Promise<WebSocketSubscription> {
    const tokenResponse = await this.getAblyToken(sessionId);
    
    // Token refresh callback for automatic renewal
    const tokenRefreshCallback = async (): Promise<string> => {
      const newTokenResponse = await this.getAblyToken(sessionId);
      return newTokenResponse.token;
    };
    
    await this.webSocketManager.connectWithToken(tokenResponse.token, tokenRefreshCallback);
    return this.webSocketManager.subscribeToQrCardScan(sessionId, (message: QrCardIdentifiedMessage) => {
      callback(message.data.card_data);
    });
  }

  async getShops(filters?: ShopFilters): Promise<PaginatedResponse<Shop>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<Shop>>('GET', `/shop/shops?${params.toString()}`);
  }

  async getLoyaltyCards(filters?: LoyaltyCardFilters): Promise<PaginatedResponse<LoyaltyCard>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<LoyaltyCard>>('GET', `/shop/loyalty-cards?${params.toString()}`);
  }

  async getLoyaltyCard(id: number): Promise<LoyaltyCard> {
    return await this.makeRequest<LoyaltyCard>('GET', `/shop/loyalty-cards/${id}`);
  }

  async getLoyaltyCardInfo(params: { card_id?: number; card_number?: string; user_id?: number }): Promise<LoyaltyCard> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });
    return await this.makeRequest<LoyaltyCard>('GET', `/shop/loyalty-cards/info?${queryParams.toString()}`);
  }

  async getPointsBalance(params: { card_id?: number; card_number?: string }): Promise<PointsBalance> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });
    return await this.makeRequest<PointsBalance>('GET', `/shop/loyalty-cards/balance?${queryParams.toString()}`);
  }

  async createTransaction(data: {
    user_id?: number;
    user_email?: string;
    order_id: string;
    order_total: number;
    currency?: string;
    description?: string;
    shop_id?: number;
    loyalty_card_id?: number;
    points?: number;
    points_redeemed?: number;
    points_discount_amount?: number;
    cart_items?: Array<{
      product_id?: number;
      product_name?: string;
      quantity?: number;
      unit_price?: number;
      total_price?: number;
      sku?: string;
      category?: string;
    }>;
    meta_data?: Record<string, any>;
  }): Promise<PointsTransaction> {
    return await this.makeRequest<PointsTransaction>('POST', '/shop/transactions/create', data);
  }

  async getTransactions(filters?: { page?: number; per_page?: number; shop_id?: number }): Promise<PaginatedResponse<PointsTransaction>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<PointsTransaction>>('GET', `/shop/transactions?${params.toString()}`);
  }

  async getOffers(filters?: OfferFilters): Promise<PaginatedResponse<Offer>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<Offer>>('GET', `/shop/offers?${params.toString()}`);
  }

  async getOffer(id: number): Promise<Offer> {
    return await this.makeRequest<Offer>('GET', `/shop/offers/${id}`);
  }

  async createOffer(offerData: Partial<Offer>): Promise<Offer> {
    return await this.makeRequest<Offer>('POST', '/shop/offers', offerData);
  }

  async updateOffer(id: number, offerData: Partial<Offer>): Promise<Offer> {
    return await this.makeRequest<Offer>('PUT', `/shop/offers/${id}`, offerData);
  }

  async deleteOffer(id: number): Promise<void> {
    await this.makeRequest('DELETE', `/shop/offers/${id}`);
  }

  async getCategories(): Promise<string[]> {
    return await this.makeRequest<string[]>('GET', '/shop/categories');
  }

  async getSyncStatus(): Promise<any> {
    return await this.makeRequest('GET', '/shop/sync-status');
  }

  async xmlImportFromUrl(url: string, options?: any): Promise<any> {
    return await this.makeRequest('POST', '/shop/xml-import/from-url', { url, ...options });
  }

  async xmlImportFromFile(file: File | Blob, options?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }
    return await this.makeRequest('POST', '/shop/xml-import/from-file', formData);
  }

  async validateXml(url: string): Promise<any> {
    return await this.makeRequest('POST', '/shop/xml-import/validate', { url });
  }

  async getXmlImportStats(): Promise<any> {
    return await this.makeRequest('GET', '/shop/xml-import/stats');
  }

  async getProductCategories(): Promise<any> {
    return await this.makeRequest('GET', '/shop/products/categories');
  }

  async getProductsSyncStatus(): Promise<any> {
    return await this.makeRequest('GET', '/shop/products/sync-status');
  }

  subscribeToChannel(channelName: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    return this.webSocketManager.subscribeToChannel(channelName, callback);
  }

  disconnectWebSocket(): void {
    this.webSocketManager.disconnect();
  }

  /**
   * Create an Ably Realtime client with automatic token renewal
   * Use this for shopping sessions or other real-time features
   * @param sessionId - The session ID for token generation
   * @param options - Optional parameters for extended permissions
   * @returns Ably client options with authCallback configured
   */
  async createAblyClientOptions(
    sessionId: string, 
    options?: { user_id?: number; shopping_session_id?: string }
  ): Promise<{ token: string; authCallback: (tokenParams: any, callback: (err: Error | null, token: string | null) => void) => void }> {
    const tokenResponse = await this.getAblyToken(sessionId, options);
    
    const authCallback = async (tokenParams: any, callback: (err: Error | null, token: string | null) => void) => {
      try {
        const newTokenResponse = await this.getAblyToken(sessionId, options);
        callback(null, newTokenResponse.token);
      } catch (err) {
        callback(err as Error, null);
      }
    };
    
    return {
      token: tokenResponse.token,
      authCallback
    };
  }

  getVersion(): string {
    return '1.0.0';
  }

  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const config = this.configManager.getConfig();
    const fullUrl = `${this.httpClient.defaults.baseURL}${endpoint}`;
    
    if (config.debug) {
      console.log(`[SDK] ${method} ${fullUrl}`);
    }
    
    try {
      let response: AxiosResponse<ApiResponse<T>>;
      
      if (method === 'GET') {
        response = await this.httpClient.get(endpoint);
      } else if (method === 'POST') {
        response = await this.httpClient.post(endpoint, data);
      } else if (method === 'PUT') {
        response = await this.httpClient.put(endpoint, data);
      } else {
        response = await this.httpClient.delete(endpoint);
      }

      this.retryCount = 0;

      if (config.debug) {
        console.log(`[SDK] Response:`, JSON.stringify(response.data).substring(0, 200));
      }

      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success) {
          if ('meta' in response.data) {
            return { data: response.data.data, meta: response.data.meta } as T;
          }
          return response.data.data;
        } else {
          throw new LoyaltySDKError(
            response.data.message || 'API request failed',
            response.data.code || 'API_ERROR',
            response.status
          );
        }
      }

      return response.data;
    } catch (error: any) {
      if (this.shouldRetry(error) && this.retryCount < (config.retries || 3)) {
        this.retryCount++;
        await this.delay(Math.pow(2, this.retryCount) * 1000);
        return this.makeRequest<T>(method, endpoint, data);
      }

      if (error.response) {
        const apiError = error.response.data;
        throw new LoyaltySDKError(
          apiError?.message || error.message || 'Request failed',
          apiError?.code || 'HTTP_ERROR',
          error.response.status
        );
      } else if (error.request) {
        throw new LoyaltySDKError('Network error', 'NETWORK_ERROR');
      } else {
        throw new LoyaltySDKError(error.message || 'Unknown error', 'UNKNOWN_ERROR');
      }
    }
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (requestConfig: any) => requestConfig,
      (error: any) => Promise.reject(error)
    );

    this.httpClient.interceptors.response.use(
      (response: any) => response,
      (error: any) => Promise.reject(error)
    );
  }
}

export default LoyaltySDK;
