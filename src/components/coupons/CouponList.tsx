'use client';

import { useState, useEffect } from 'react';
import { Coupon, CouponListFilters } from '../../types';
import { CouponCard, CouponCardTexts } from './CouponCard';

export interface CouponListProps {
  shopId: number;
  cardId?: number;
  userId?: number;
  status?: 'active' | 'used' | 'expired' | 'all';
  fetchCoupons?: (filters: CouponListFilters) => Promise<{ coupons: Coupon[]; pagination: any }>;
  onVerify?: (coupon: Coupon) => void;
  onRedeem?: (coupon: Coupon) => void;
  onViewProducts?: (coupon: Coupon) => void;
  locale?: string;
  className?: string;
  texts?: CouponListTexts;
  cardTexts?: CouponCardTexts;
}

export interface CouponListTexts {
  title?: string;
  noCoupons?: string;
  loading?: string;
  error?: string;
  loadMore?: string;
  filterActive?: string;
  filterUsed?: string;
  filterExpired?: string;
  filterAll?: string;
}

const DEFAULT_TEXTS: CouponListTexts = {
  title: 'Coupons',
  noCoupons: 'No coupons available',
  loading: 'Loading...',
  error: 'Failed to load coupons',
  loadMore: 'Load more',
  filterActive: 'Active',
  filterUsed: 'Used',
  filterExpired: 'Expired',
  filterAll: 'All',
};

export function CouponList({
  shopId,
  cardId,
  userId,
  status = 'active',
  fetchCoupons,
  onVerify,
  onRedeem,
  onViewProducts,
  locale = 'en',
  className = '',
  texts: customTexts,
  cardTexts,
}: CouponListProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number }>({ current_page: 1, last_page: 1 });

  const loadCoupons = async (page = 1, newStatus = currentStatus) => {
    if (!fetchCoupons) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const filters: CouponListFilters = {
        shop_id: shopId,
        ...(cardId && { card_id: cardId }),
        ...(userId && { user_id: userId }),
        status: newStatus,
        page,
        per_page: 20,
      };

      const result = await fetchCoupons(filters);
      
      if (page === 1) {
        setCoupons(result.coupons);
      } else {
        setCoupons(prev => [...prev, ...result.coupons]);
      }
      
      setPagination({
        current_page: result.pagination.current_page,
        last_page: result.pagination.last_page,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.error!);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons(1);
  }, [shopId, cardId, userId]);

  const handleStatusFilter = (newStatus: typeof currentStatus) => {
    setCurrentStatus(newStatus);
    loadCoupons(1, newStatus);
  };

  const handleLoadMore = () => {
    if (pagination.current_page < pagination.last_page) {
      loadCoupons(pagination.current_page + 1);
    }
  };

  const statusFilters = [
    { value: 'active' as const, label: texts.filterActive },
    { value: 'used' as const, label: texts.filterUsed },
    { value: 'expired' as const, label: texts.filterExpired },
    { value: 'all' as const, label: texts.filterAll },
  ];

  return (
    <div className={`loyalty-coupon-list ${className}`}>
      {/* Header with filters */}
      <div className="loyalty-coupon-list__header">
        <h2 className="loyalty-coupon-list__title">{texts.title}</h2>
        <div className="loyalty-coupon-list__filters">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              className={`loyalty-coupon-list__filter-btn ${currentStatus === filter.value ? 'loyalty-coupon-list__filter-btn--active' : ''}`}
              onClick={() => handleStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && coupons.length === 0 && (
        <div className="loyalty-coupon-list__loading">
          <div className="loyalty-coupon-list__spinner" />
          <span>{texts.loading}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="loyalty-coupon-list__error">
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && coupons.length === 0 && (
        <div className="loyalty-coupon-list__empty">
          <div className="loyalty-coupon-list__empty-icon">🎟️</div>
          <span>{texts.noCoupons}</span>
        </div>
      )}

      {/* Coupons grid */}
      {coupons.length > 0 && (
        <div className="loyalty-coupon-list__grid">
          {coupons.map(coupon => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              locale={locale}
              onVerify={onVerify}
              onRedeem={onRedeem}
              onViewProducts={onViewProducts}
              texts={cardTexts}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {pagination.current_page < pagination.last_page && (
        <div className="loyalty-coupon-list__load-more">
          <button
            className="loyalty-coupon-list__load-more-btn"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? texts.loading : texts.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

export default CouponList;

