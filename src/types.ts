// Authentication Types
export interface AuthRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  city?: string;
  postal_code?: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  birth_date?: string;
  gender?: string;
  city?: string;
  postal_code?: string;
  address?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// QR Login Types
export interface QrLoginSession {
  session_id: string;
  qr_code: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';
  expires_at: string;
  device_info?: string;
}

export interface QrLoginPollResponse {
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: User;
}

// QR Card Scan Types (POS Integration)
export interface QrCardScanSession {
  session_id: string;
  qr_code: string;
  ably_channel: string;
  partner_id: number;
  partner_name: string;
  shop_id?: number;
  expires_at: string;
}

export interface QrCardScanData {
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
}

export interface QrCardScanPollResponse {
  session_id: string;
  status: 'pending' | 'authenticated' | 'expired';
  card_data?: QrCardScanData;
  expires_at: string;
}

// Ably Token Types
export interface AblyTokenResponse {
  token: string;
  expires: number;
  channel: string;
  session_type: 'login' | 'card_scan';
  channels?: Record<string, string[]>;
}

// Loyalty Card Types
export interface LoyaltyCard {
  id: number;
  user_id: number;
  card_number: string;
  card_type: string;
  brand_name: string;
  brand_logo?: string;
  background_color?: string;
  text_color?: string;
  design_template?: string;
  custom_fields: Record<string, any>;
  points_balance: number;
  expires_at?: string;
  is_active: boolean;
  is_third_party: boolean;
  third_party_data: Record<string, any>;
  qr_code?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLoyaltyCardRequest {
  card_type: string;
  brand_name: string;
  brand_logo?: string;
  background_color?: string;
  text_color?: string;
  design_template?: string;
  custom_fields?: Record<string, any>;
  expires_at?: string;
}

export interface UpdateLoyaltyCardRequest {
  brand_name?: string;
  brand_logo?: string;
  background_color?: string;
  text_color?: string;
  design_template?: string;
  custom_fields?: Record<string, any>;
  expires_at?: string;
  is_active?: boolean;
}

export interface ThirdPartyCardRequest {
  brand_name: string;
  card_number: string;
  card_type: string;
  brand_logo?: string;
  custom_fields?: Record<string, any>;
}

// Points Types
export interface PointsTransaction {
  id: number;
  loyalty_card_id: number;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  description: string;
  reference_id?: string;
  reference_type?: string;
  expires_at?: string;
  is_expired: boolean;
  meta_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PointsBalance {
  total_points: number;
  available_points: number;
  expiring_soon: number;
  expired_points: number;
  transactions_count: number;
}

export interface AddPointsRequest {
  loyalty_card_id: number;
  points: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  expires_at?: string;
  meta_data?: Record<string, any>;
}

// Offers Types
export interface Offer {
  id: number;
  title: string;
  description: string;
  image?: string;
  type: 'discount_percentage' | 'discount_amount' | 'points_multiplier' | 'free_item' | 'cashback';
  discount_percentage?: number;
  discount_amount?: number;
  points_required?: number;
  points_earned?: number;
  promo_code?: string;
  terms_conditions?: string;
  starts_at?: string;
  ends_at?: string;
  usage_limit: number;
  usage_count: number;
  user_usage_limit: number;
  is_active: boolean;
  is_featured: boolean;
  categories: string[];
  meta_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Coupons Types
export interface Coupon {
  id: number;
  user_id: number;
  offer_id: number;
  code: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  redeemed_at?: string;
  expires_at?: string;
  redemption_reference?: string;
  meta_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  offer?: Offer;
}

// Games Types
export interface Game {
  id: number;
  name: string;
  description: string;
  image?: string;
  type: 'slot_machine' | 'wheel_of_fortune' | 'scratch_card' | 'memory' | 'quiz' | 'puzzle';
  config: Record<string, any>;
  rewards: GameReward[];
  points_cost?: number;
  daily_limit?: number;
  total_limit?: number;
  is_active: boolean;
  is_featured: boolean;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface GameReward {
  type: 'points' | 'coupon' | 'item' | 'discount';
  value: number | string;
  probability: number;
  description: string;
}

export interface GameSession {
  id: number;
  user_id: number;
  game_id: number;
  session_key: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  score?: number;
  level?: number;
  progress_data: Record<string, any>;
  reward_claimed?: GameReward;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  game?: Game;
}

export interface StartGameSessionRequest {
  game_id: number;
}

export interface GameProgressRequest {
  score?: number;
  level?: number;
  progress_data?: Record<string, any>;
}

// Shop Types
export interface Shop {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  opening_hours?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  images?: string[];
  is_active: boolean;
  partner_id: number;
  created_at: string;
  updated_at: string;
  partner?: {
    id: number;
    name: string;
  };
}

export interface CreateShopRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  is_active?: boolean;
}

export interface UpdateShopRequest {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  is_active?: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface QrLoginStatusMessage extends WebSocketMessage {
  type: 'qr_login_status';
  data: {
    session_id: string;
    status: 'scanned' | 'confirmed' | 'expired' | 'cancelled';
    user?: User;
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
    card_data: QrCardScanData;
    timestamp: string;
  };
}

// Shopping Session Ably Events (Partner App Integration)
// Channel: user-{userId}

export interface ShopInfo {
  id: number;
  name: string;
  address?: string;
  logo?: string;
}

export interface StaffInfo {
  id: number;
  name: string;
}

export interface CustomerInfo {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  availablePoints: number;
}

export interface PointsRules {
  // Earning rules
  points_per_currency: number;
  currency_amount: number;
  // Redemption rules
  points_redemption_enabled?: boolean;
  points_per_currency_redemption?: number;
  currency_amount_redemption?: number;
  min_points_for_redemption?: number;
  max_points_per_redemption?: number;
}

export interface SessionCreatedEvent {
  sessionId: string;
  cardId: number;
  shopId: number;
  shopInfo: ShopInfo;
  staffId: number;
  staffInfo: StaffInfo;
  customerInfo?: CustomerInfo;
  timestamp: string;
}

export interface SessionEndedEvent {
  sessionId: string;
  reason?: string;
  timestamp: string;
}

export interface CardScannedEvent {
  card_id: number;
  shop_id: number;
  shop_name: string;
  shop_address?: string;
  shop_logo?: string;
  staff_id: number;
  staff_name: string;
  scanned_at: string;
  session_ended?: boolean;
}

export interface PaymentRequestEvent {
  purchase_id: number;
  card_id: number;
  shop_id: number;
  shop_name: string;
  shop_address?: string;
  shop_logo?: string;
  staff_id: number;
  staff_name: string;
  amount: number;
  currency: string;
  points_to_earn: number;
  points_redeemed?: number;
  points_discount_amount?: number;
  final_amount: number;
  description?: string;
  timestamp: string;
}

export interface TransactionCompletedEvent {
  transaction_id: number;
  card_id: number;
  amount: number;
  currency: string;
  points_awarded: number;
  points_redeemed?: number;
  points_discount_amount?: number;
  final_amount: number;
  timestamp: string;
}

// Channel: session-{sessionId}

export type SessionStatus = 'editing' | 'ready_for_payment' | 'processing' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'app_payment';
export type LastUpdatedBy = 'staff' | 'customer';

export interface SessionUpdateEvent {
  sessionId: string;
  status?: SessionStatus;
  purchaseAmount?: string;
  pointsToEarn?: number;
  pointsToRedeem?: number;
  calculatedPoints?: number;
  customerPointsInput?: number;
  pointsRules?: PointsRules;
  customerInfo?: CustomerInfo;
  paymentMethod?: PaymentMethod;
  finalAmount?: number;
  lastUpdatedBy: LastUpdatedBy;
  timestamp: string;
}

// Ably Channel Names
export type UserChannelName = `user-${number}`;
export type SessionChannelName = `session-${string}`;
export type QrLoginChannelName = `qr-login:${string}`;
export type QrCardChannelName = `qr-card:${string}`;

// Ably Event Types
export type UserChannelEvents = 
  | 'session_created'
  | 'session_ended'
  | 'card_scanned'
  | 'payment_request'
  | 'transaction_completed';

export type SessionChannelEvents = 'session_update';
export type QrLoginChannelEvents = 'status_update';
export type QrCardChannelEvents = 'card_identified';

// Filter Types
export interface LoyaltyCardFilters {
  card_type?: string;
  is_active?: boolean;
  is_third_party?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface PointsTransactionFilters {
  loyalty_card_id?: number;
  type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface OfferFilters {
  type?: string;
  category?: string;
  is_active?: boolean;
  is_featured?: boolean;
  available_only?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface CouponFilters {
  status?: string;
  offer_id?: number;
  expires_soon?: boolean;
  page?: number;
  per_page?: number;
}

export interface GameFilters {
  type?: string;
  category?: string;
  is_active?: boolean;
  is_featured?: boolean;
  playable_only?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface GameHistoryFilters {
  game_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface ShopFilters {
  search?: string;
  is_active?: boolean;
  is_virtual?: boolean;
  page?: number;
  per_page?: number;
}

// SDK Configuration
export interface SDKConfig {
  baseUrl: string;
  locale?: string;
  timeout?: number;
  retries?: number;
  token?: string;
  ablyKey?: string;
  debug?: boolean;
}

// Error Types
export class LoyaltySDKError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LoyaltySDKError';
  }
} 
 
 