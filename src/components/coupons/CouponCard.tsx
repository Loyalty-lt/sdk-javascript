'use client';

import { Coupon, CouponOffer, CouponGame } from '../../types';

export interface CouponCardProps {
  coupon: Coupon;
  locale?: string;
  onVerify?: (coupon: Coupon) => void;
  onRedeem?: (coupon: Coupon) => void;
  onViewProducts?: (coupon: Coupon) => void;
  className?: string;
  texts?: CouponCardTexts;
}

export interface CouponCardTexts {
  active?: string;
  pending?: string;
  used?: string;
  expired?: string;
  expiresAt?: string;
  redeemedAt?: string;
  viewProducts?: string;
  redeem?: string;
  verify?: string;
  discount?: string;
  freeProduct?: string;
  points?: string;
  gameReward?: string;
  selectProduct?: string;
}

const DEFAULT_TEXTS: CouponCardTexts = {
  active: 'Active',
  pending: 'Pending',
  used: 'Used',
  expired: 'Expired',
  expiresAt: 'Expires',
  redeemedAt: 'Redeemed',
  viewProducts: 'View Products',
  redeem: 'Redeem',
  verify: 'Verify',
  discount: 'Discount',
  freeProduct: 'Free Product',
  points: 'Points',
  gameReward: 'Game Reward',
  selectProduct: 'Select Product',
};

export function CouponCard({
  coupon,
  locale = 'en',
  onVerify,
  onRedeem,
  onViewProducts,
  className = '',
  texts: customTexts,
}: CouponCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };

  const getLocalizedText = (text: string | Record<string, string> | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text['en'] || text['lt'] || Object.values(text)[0] || '';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'used': return '#6b7280';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active': return texts.active!;
      case 'pending': return texts.pending!;
      case 'used': return texts.used!;
      case 'expired': return texts.expired!;
      default: return status;
    }
  };

  const getRewardDescription = (offer?: CouponOffer, game?: CouponGame): string => {
    if (offer?.reward_details) return offer.reward_details;
    
    if (offer) {
      if (offer.discount_type === 'percentage') {
        return `${offer.discount_amount}% ${texts.discount}`;
      } else if (offer.discount_type === 'fixed') {
        return `${offer.discount_amount}€ ${texts.discount}`;
      } else if (offer.discount_type === 'points') {
        return `${offer.discount_amount} ${texts.points}`;
      }
      return getLocalizedText(offer.title);
    }
    
    if (game) {
      return game.reward_details || getLocalizedText(game.name) || texts.gameReward!;
    }
    
    return '';
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(locale === 'lt' ? 'lt-LT' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const offer = coupon.offer;
  const game = coupon.game;
  const title = offer ? getLocalizedText(offer.title) : (game ? getLocalizedText(game.name) : coupon.code);
  const description = offer ? getLocalizedText(offer.description) : (game ? getLocalizedText(game.description) : '');
  const rewardText = getRewardDescription(offer, game);
  const requiresProductSelection = coupon.requires_product_selection;
  const isActive = coupon.status === 'active';
  const isPending = coupon.status === 'pending';

  return (
    <div className={`loyalty-coupon-card ${className}`}>
      {/* Header with status */}
      <div className="loyalty-coupon-card__header">
        <div className="loyalty-coupon-card__title-section">
          <h3 className="loyalty-coupon-card__title">{title}</h3>
          <span 
            className="loyalty-coupon-card__status"
            style={{ backgroundColor: `${getStatusColor(coupon.status)}20`, color: getStatusColor(coupon.status) }}
          >
            {getStatusText(coupon.status)}
          </span>
        </div>
        <span className="loyalty-coupon-card__code">{coupon.code}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="loyalty-coupon-card__description">{description}</p>
      )}

      {/* Reward info */}
      <div className="loyalty-coupon-card__reward">
        <span className="loyalty-coupon-card__reward-label">
          {game ? texts.gameReward : texts.discount}:
        </span>
        <span className="loyalty-coupon-card__reward-value">{rewardText}</span>
      </div>

      {/* Product selection indicator */}
      {requiresProductSelection && isActive && (
        <div className="loyalty-coupon-card__product-selection">
          <span className="loyalty-coupon-card__product-icon">📦</span>
          <span className="loyalty-coupon-card__product-text">{texts.selectProduct}</span>
        </div>
      )}

      {/* Expiry / Redemption info */}
      <div className="loyalty-coupon-card__meta">
        {coupon.status === 'used' && coupon.redeemed_at ? (
          <span className="loyalty-coupon-card__meta-item">
            {texts.redeemedAt}: {formatDate(coupon.redeemed_at)}
          </span>
        ) : coupon.expires_at ? (
          <span className="loyalty-coupon-card__meta-item">
            {texts.expiresAt}: {formatDate(coupon.expires_at)}
          </span>
        ) : null}
      </div>

      {/* Actions */}
      {(isActive || isPending) && (onVerify || onRedeem || onViewProducts) && (
        <div className="loyalty-coupon-card__actions">
          {requiresProductSelection && onViewProducts && (
            <button
              className="loyalty-coupon-card__button loyalty-coupon-card__button--secondary"
              onClick={() => onViewProducts(coupon)}
            >
              {texts.viewProducts}
            </button>
          )}
          {onVerify && isActive && (
            <button
              className="loyalty-coupon-card__button loyalty-coupon-card__button--secondary"
              onClick={() => onVerify(coupon)}
            >
              {texts.verify}
            </button>
          )}
          {onRedeem && (isActive || isPending) && (
            <button
              className="loyalty-coupon-card__button loyalty-coupon-card__button--primary"
              onClick={() => onRedeem(coupon)}
            >
              {texts.redeem}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CouponCard;

