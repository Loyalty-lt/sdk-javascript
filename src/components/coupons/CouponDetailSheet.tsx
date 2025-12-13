'use client';

import { useState } from 'react';
import { Coupon, CouponProduct } from '../../types';

export interface CouponDetailSheetProps {
  coupon: Coupon;
  isOpen: boolean;
  onClose: () => void;
  onRedeem?: (coupon: Coupon, selectedProductId?: number) => Promise<void>;
  onSetPending?: (coupon: Coupon, selectedProductId?: number) => Promise<void>;
  onCancelPending?: (coupon: Coupon) => Promise<void>;
  fetchProducts?: (couponId: number) => Promise<{ products: CouponProduct[]; selection_required: boolean }>;
  locale?: string;
  className?: string;
  texts?: CouponDetailSheetTexts;
}

export interface CouponDetailSheetTexts {
  close?: string;
  redeem?: string;
  setPending?: string;
  cancelPending?: string;
  selectProduct?: string;
  availableProducts?: string;
  noProductsAvailable?: string;
  loading?: string;
  error?: string;
  rewardDetails?: string;
  termsConditions?: string;
  expiresAt?: string;
  couponCode?: string;
  status?: string;
  productRequired?: string;
  redeemSuccess?: string;
  pendingSuccess?: string;
  cancelSuccess?: string;
}

const DEFAULT_TEXTS: CouponDetailSheetTexts = {
  close: 'Close',
  redeem: 'Redeem Coupon',
  setPending: 'Reserve Coupon',
  cancelPending: 'Cancel Reservation',
  selectProduct: 'Select a product',
  availableProducts: 'Available Products',
  noProductsAvailable: 'No products available',
  loading: 'Loading...',
  error: 'An error occurred',
  rewardDetails: 'Reward Details',
  termsConditions: 'Terms & Conditions',
  expiresAt: 'Expires',
  couponCode: 'Code',
  status: 'Status',
  productRequired: 'Please select a product',
  redeemSuccess: 'Coupon redeemed successfully!',
  pendingSuccess: 'Coupon reserved successfully!',
  cancelSuccess: 'Reservation cancelled!',
};

export function CouponDetailSheet({
  coupon,
  isOpen,
  onClose,
  onRedeem,
  onSetPending,
  onCancelPending,
  fetchProducts,
  locale = 'en',
  className = '',
  texts: customTexts,
}: CouponDetailSheetProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [products, setProducts] = useState<CouponProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresProductSelection, setRequiresProductSelection] = useState(false);

  const getLocalizedText = (text: string | Record<string, string> | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text['en'] || text['lt'] || Object.values(text)[0] || '';
  };

  const loadProducts = async () => {
    if (!fetchProducts || products.length > 0) return;

    setIsLoadingProducts(true);
    setError(null);

    try {
      const result = await fetchProducts(coupon.id);
      setProducts(result.products);
      setRequiresProductSelection(result.selection_required);
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.error!);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleRedeem = async () => {
    if (requiresProductSelection && !selectedProductId) {
      setError(texts.productRequired!);
      return;
    }

    if (!onRedeem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onRedeem(coupon, selectedProductId || undefined);
      setSuccessMessage(texts.redeemSuccess!);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.error!);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPending = async () => {
    if (requiresProductSelection && !selectedProductId) {
      setError(texts.productRequired!);
      return;
    }

    if (!onSetPending) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSetPending(coupon, selectedProductId || undefined);
      setSuccessMessage(texts.pendingSuccess!);
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.error!);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPending = async () => {
    if (!onCancelPending) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCancelPending(coupon);
      setSuccessMessage(texts.cancelSuccess!);
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.error!);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load products when sheet opens
  if (isOpen && coupon.requires_product_selection && products.length === 0 && !isLoadingProducts) {
    loadProducts();
  }

  if (!isOpen) return null;

  const offer = coupon.offer;
  const game = coupon.game;
  const title = offer ? getLocalizedText(offer.title) : (game ? getLocalizedText(game.name) : coupon.code);
  const description = offer ? getLocalizedText(offer.description) : (game ? getLocalizedText(game.description) : '');
  const rewardDetails = offer?.reward_details || game?.reward_details || '';
  const termsConditions = offer?.terms_conditions || '';
  const isActive = coupon.status === 'active';
  const isPending = coupon.status === 'pending';

  return (
    <div className={`loyalty-coupon-detail ${className}`}>
      {/* Backdrop */}
      <div className="loyalty-coupon-detail__backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className="loyalty-coupon-detail__sheet">
        {/* Header */}
        <div className="loyalty-coupon-detail__header">
          <h2 className="loyalty-coupon-detail__title">{title}</h2>
          <button className="loyalty-coupon-detail__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="loyalty-coupon-detail__content">
          {/* Coupon code */}
          <div className="loyalty-coupon-detail__info-row">
            <span className="loyalty-coupon-detail__label">{texts.couponCode}:</span>
            <span className="loyalty-coupon-detail__value loyalty-coupon-detail__code">{coupon.code}</span>
          </div>

          {/* Status */}
          <div className="loyalty-coupon-detail__info-row">
            <span className="loyalty-coupon-detail__label">{texts.status}:</span>
            <span className={`loyalty-coupon-detail__status loyalty-coupon-detail__status--${coupon.status}`}>
              {coupon.status}
            </span>
          </div>

          {/* Description */}
          {description && (
            <div className="loyalty-coupon-detail__section">
              <p className="loyalty-coupon-detail__description">{description}</p>
            </div>
          )}

          {/* Reward details */}
          {rewardDetails && (
            <div className="loyalty-coupon-detail__section">
              <h3 className="loyalty-coupon-detail__section-title">{texts.rewardDetails}</h3>
              <p className="loyalty-coupon-detail__section-content">{rewardDetails}</p>
            </div>
          )}

          {/* Expiry */}
          {coupon.expires_at && (
            <div className="loyalty-coupon-detail__info-row">
              <span className="loyalty-coupon-detail__label">{texts.expiresAt}:</span>
              <span className="loyalty-coupon-detail__value">
                {new Date(coupon.expires_at).toLocaleDateString(locale === 'lt' ? 'lt-LT' : 'en-US')}
              </span>
            </div>
          )}

          {/* Product selection */}
          {coupon.requires_product_selection && (
            <div className="loyalty-coupon-detail__section">
              <h3 className="loyalty-coupon-detail__section-title">{texts.availableProducts}</h3>
              
              {isLoadingProducts ? (
                <div className="loyalty-coupon-detail__loading">{texts.loading}</div>
              ) : products.length > 0 ? (
                <div className="loyalty-coupon-detail__products">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className={`loyalty-coupon-detail__product ${selectedProductId === product.id ? 'loyalty-coupon-detail__product--selected' : ''}`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="loyalty-coupon-detail__product-image"
                        />
                      )}
                      <div className="loyalty-coupon-detail__product-info">
                        <span className="loyalty-coupon-detail__product-name">{product.name}</span>
                        {product.description && (
                          <span className="loyalty-coupon-detail__product-desc">{product.description}</span>
                        )}
                      </div>
                      {selectedProductId === product.id && (
                        <span className="loyalty-coupon-detail__product-check">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="loyalty-coupon-detail__empty">{texts.noProductsAvailable}</p>
              )}
            </div>
          )}

          {/* Terms & Conditions */}
          {termsConditions && (
            <div className="loyalty-coupon-detail__section">
              <h3 className="loyalty-coupon-detail__section-title">{texts.termsConditions}</h3>
              <p className="loyalty-coupon-detail__section-content loyalty-coupon-detail__terms">
                {termsConditions}
              </p>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="loyalty-coupon-detail__error">{error}</div>
          )}
          {successMessage && (
            <div className="loyalty-coupon-detail__success">{successMessage}</div>
          )}
        </div>

        {/* Actions */}
        <div className="loyalty-coupon-detail__actions">
          {isPending && onCancelPending && (
            <button
              className="loyalty-coupon-detail__button loyalty-coupon-detail__button--secondary"
              onClick={handleCancelPending}
              disabled={isSubmitting}
            >
              {isSubmitting ? texts.loading : texts.cancelPending}
            </button>
          )}
          
          {isActive && onSetPending && (
            <button
              className="loyalty-coupon-detail__button loyalty-coupon-detail__button--secondary"
              onClick={handleSetPending}
              disabled={isSubmitting}
            >
              {isSubmitting ? texts.loading : texts.setPending}
            </button>
          )}
          
          {(isActive || isPending) && onRedeem && (
            <button
              className="loyalty-coupon-detail__button loyalty-coupon-detail__button--primary"
              onClick={handleRedeem}
              disabled={isSubmitting}
            >
              {isSubmitting ? texts.loading : texts.redeem}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CouponDetailSheet;

