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
  Game,
  GameSession,
  GameFilters,
  GameHistoryFilters,
  Coupon,
  CouponVerifyResponse,
  CouponRedeemResponse,
  CouponPendingResponse,
  CouponDiscountCalculation,
  CouponListFilters,
  CouponProduct,
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

  // ==================== GAMES API ====================

  /**
   * Get list of available games
   * @param filters - Optional filters for games
   * @returns Paginated list of games with user progress
   */
  async getGames(filters?: GameFilters): Promise<PaginatedResponse<Game>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<Game>>('GET', `/shop/games?${params.toString()}`);
  }

  /**
   * Get all games with user progress for the current user
   * @param filters - Optional filters
   * @returns Paginated list of games with user progress
   */
  async getMyGames(filters?: { partner_id?: number; status?: 'available' | 'active' | 'completed'; per_page?: number; page?: number }): Promise<PaginatedResponse<Game>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<Game>>('GET', `/shop/games/my-games?${params.toString()}`);
  }

  /**
   * Get a single game by ID with user progress
   * @param id - Game ID
   * @returns Game details with user progress
   */
  async getGame(id: number): Promise<Game> {
    return await this.makeRequest<Game>('GET', `/shop/games/${id}`);
  }

  /**
   * Start a new game session
   * @param gameId - Game ID
   * @returns New game session details
   */
  async startGameSession(gameId: number): Promise<{
    session_id: number;
    session_key: string;
    expires_at: string;
    progress: any;
    game: {
      id: number;
      name: string;
      type: string;
      description: string;
    };
  }> {
    return await this.makeRequest('POST', `/shop/games/${gameId}/start-session`);
  }

  /**
   * Get game session status
   * @param sessionKey - Session key from startGameSession
   * @returns Game session details
   */
  async getGameSession(sessionKey: string): Promise<GameSession> {
    return await this.makeRequest<GameSession>('GET', `/shop/game-sessions/${sessionKey}`);
  }

  /**
   * Record game progress
   * @param sessionKey - Session key
   * @param progress - Progress data
   * @returns Updated game session
   */
  async recordGameProgress(sessionKey: string, progress: {
    score?: number;
    level?: number;
    progress_data?: Record<string, any>;
  }): Promise<GameSession> {
    return await this.makeRequest<GameSession>('PUT', `/shop/game-sessions/${sessionKey}/progress`, progress);
  }

  /**
   * Claim game reward after completing a game
   * @param sessionKey - Session key
   * @returns Reward details
   */
  async claimGameReward(sessionKey: string): Promise<{
    reward_claimed: boolean;
    coupon: any | null;
    session: GameSession;
    reward_description: string;
  }> {
    return await this.makeRequest('POST', `/shop/game-sessions/${sessionKey}/claim-reward`);
  }

  /**
   * Get user's game history
   * @param filters - Optional filters
   * @returns Paginated list of game sessions
   */
  async getGameHistory(filters?: GameHistoryFilters): Promise<PaginatedResponse<GameSession>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<GameSession>>('GET', `/shop/game-sessions/history?${params.toString()}`);
  }

  // ==================== PARTNER GAMES API (Staff/POS) ====================

  /**
   * List games available for a specific shop (Partner API)
   * @param shopId - Shop ID
   * @param filters - Optional filters
   * @returns Paginated list of games with stamp settings
   */
  async listShopGames(shopId: number, filters?: { type?: string; per_page?: number; page?: number }): Promise<PaginatedResponse<Game>> {
    const params = new URLSearchParams();
    params.append('shop_id', String(shopId));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return await this.makeRequest<PaginatedResponse<Game>>('GET', `/shop/games?${params.toString()}`);
  }

  /**
   * Get games for a specific customer card (Partner API)
   * @param cardId - Loyalty card ID
   * @param shopId - Shop ID
   * @returns List of games with user progress
   */
  async getCardGames(cardId: number, shopId?: number): Promise<Game[]> {
    const params = new URLSearchParams();
    if (shopId) params.append('shop_id', String(shopId));
    return await this.makeRequest<Game[]>('GET', `/shop/cards/${cardId}/games?${params.toString()}`);
  }

  /**
   * Get customer game history (Partner API)
   * @param cardId - Loyalty card ID  
   * @param shopId - Optional shop ID filter
   * @returns List of game progress history
   */
  async getCustomerGameHistory(cardId: number, shopId?: number): Promise<Game[]> {
    const params = new URLSearchParams();
    if (shopId) params.append('shop_id', String(shopId));
    return await this.makeRequest<Game[]>('GET', `/shop/cards/${cardId}/games/history?${params.toString()}`);
  }

  /**
   * Get detailed game progress for a customer (Partner API)
   * @param gameId - Game ID
   * @param cardId - Loyalty card ID
   * @returns Detailed game progress including stamp settings
   */
  async getGameProgress(gameId: number, cardId: number): Promise<{
    game: Game;
    progress: { current_step: number; completed: boolean; completed_at?: string; history: any[] };
    stamps_required: number;
    stamp_settings?: any;
  }> {
    return await this.makeRequest('GET', `/shop/games/${gameId}/progress?card_id=${cardId}`);
  }

  /**
   * Add stamps to a customer's stamp card (Partner API)
   * @param gameId - Game ID
   * @param cardId - Loyalty card ID
   * @param shopId - Shop ID
   * @param stampsCount - Number of stamps to add
   * @returns Updated progress and completion status
   */
  async addStamps(gameId: number, cardId: number, shopId: number, stampsCount: number = 1): Promise<{
    current_step: number;
    is_completed: boolean;
    was_already_completed: boolean;
    reward_generated?: any;
  }> {
    return await this.makeRequest('POST', `/shop/games/${gameId}/add-stamps`, {
      card_id: cardId,
      shop_id: shopId,
      stamps_count: stampsCount,
    });
  }

  /**
   * Complete a stamp card game (Partner API)
   * @param gameId - Game ID
   * @param cardId - Loyalty card ID
   * @returns Completion result with reward details
   */
  async completeStampCard(gameId: number, cardId: number): Promise<{
    completed: boolean;
    reward?: any;
    coupon?: any;
  }> {
    return await this.makeRequest('POST', `/shop/games/${gameId}/complete`, {
      card_id: cardId,
    });
  }

  /**
   * Restart a game session for a customer (Partner API)
   * @param gameId - Game ID
   * @param cardId - Loyalty card ID
   * @param shopId - Shop ID
   * @returns New game session details
   */
  async restartGame(gameId: number, cardId: number, shopId: number): Promise<{
    success: boolean;
    message: string;
    progress: { current_step: number; completed: boolean };
  }> {
    return await this.makeRequest('POST', `/shop/games/${gameId}/restart`, {
      card_id: cardId,
      shop_id: shopId,
    });
  }

  // ==================== COUPONS API (Partner API) ====================

  /**
   * Verify a coupon by scanning its code (Partner API)
   * @param couponCode - Coupon code or QR code
   * @param shopId - Shop ID where the coupon is being verified
   * @returns Coupon details with user and card info
   */
  async verifyCoupon(couponCode: string, shopId: number): Promise<CouponVerifyResponse> {
    return await this.makeRequest<CouponVerifyResponse>('POST', '/shop/coupons/verify', {
      coupon_code: couponCode,
      shop_id: shopId,
    });
  }

  /**
   * Redeem a coupon (Partner API)
   * @param couponId - Coupon ID
   * @param shopId - Shop ID where the coupon is being redeemed
   * @param selectedProductId - Optional product ID if coupon requires product selection
   * @param notes - Optional notes for the redemption
   * @returns Redemption confirmation
   */
  async redeemCoupon(couponId: number, shopId: number, selectedProductId?: number, notes?: string): Promise<CouponRedeemResponse> {
    return await this.makeRequest<CouponRedeemResponse>('POST', '/shop/coupons/redeem', {
      coupon_id: couponId,
      shop_id: shopId,
      ...(selectedProductId && { selected_product_id: selectedProductId }),
      ...(notes && { notes }),
    });
  }

  /**
   * Set a coupon to pending status (Partner API)
   * @param couponId - Coupon ID
   * @param shopId - Shop ID
   * @param selectedProductId - Optional product ID for selection
   * @returns Pending status confirmation
   */
  async setCouponPending(couponId: number, shopId: number, selectedProductId?: number): Promise<CouponPendingResponse> {
    return await this.makeRequest<CouponPendingResponse>('POST', '/shop/coupons/pending', {
      coupon_id: couponId,
      shop_id: shopId,
      ...(selectedProductId && { selected_product_id: selectedProductId }),
    });
  }

  /**
   * Cancel pending status of a coupon (Partner API)
   * @param couponId - Coupon ID
   * @param shopId - Shop ID
   * @returns Cancellation confirmation
   */
  async cancelCouponPending(couponId: number, shopId: number): Promise<{ coupon_id: number; cancelled_at: string }> {
    return await this.makeRequest('POST', '/shop/coupons/cancel-pending', {
      coupon_id: couponId,
      shop_id: shopId,
    });
  }

  /**
   * List coupons for a shop/customer (Partner API)
   * @param filters - Filters including shop_id, user_id, card_id, status
   * @returns Paginated list of coupons
   */
  async listCoupons(filters: CouponListFilters): Promise<{ coupons: Coupon[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return await this.makeRequest('GET', `/shop/coupons?${params.toString()}`);
  }

  /**
   * Get active coupons for a specific loyalty card (Partner API)
   * @param shopId - Shop ID
   * @param cardId - Optional loyalty card ID
   * @param userId - Optional user ID (if card_id not provided)
   * @returns List of active coupons with products/categories
   */
  async getCardCoupons(shopId: number, cardId?: number, userId?: number): Promise<{ coupons: Coupon[]; total_count: number }> {
    const params = new URLSearchParams();
    params.append('shop_id', String(shopId));
    if (cardId) params.append('card_id', String(cardId));
    if (userId) params.append('user_id', String(userId));
    return await this.makeRequest('GET', `/shop/coupons/card?${params.toString()}`);
  }

  /**
   * Get available products for a coupon (Partner API)
   * @param couponId - Coupon ID
   * @returns List of products available for this coupon
   */
  async getCouponProducts(couponId: number): Promise<{ products: CouponProduct[]; total_count: number; selection_required: boolean }> {
    return await this.makeRequest('GET', `/shop/coupons/products?coupon_id=${couponId}`);
  }

  /**
   * Calculate discount amount for a coupon (Partner API)
   * @param couponCode - Coupon code
   * @param purchaseAmount - Purchase amount to calculate discount for
   * @returns Discount calculation details
   */
  async calculateCouponDiscount(couponCode: string, purchaseAmount: number): Promise<CouponDiscountCalculation> {
    return await this.makeRequest<CouponDiscountCalculation>('POST', '/shop/coupons/calculate-discount', {
      coupon_code: couponCode,
      purchase_amount: purchaseAmount,
    });
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
