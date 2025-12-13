/**
 * Coupons Components
 * 
 * React components for coupon management in Partner/POS integrations.
 * These components work with the Partner API (X-API-Key/X-API-Secret auth).
 * 
 * @example
 * import { CouponCard, CouponList, CouponDetailSheet } from '@loyaltylt/sdk/components/coupons';
 * 
 * // Display a single coupon
 * <CouponCard 
 *   coupon={coupon}
 *   onRedeem={handleRedeem}
 * />
 * 
 * // Display coupon list with filters
 * <CouponList
 *   shopId={123}
 *   cardId={456}
 *   fetchCoupons={sdk.listCoupons.bind(sdk)}
 *   onRedeem={handleRedeem}
 * />
 * 
 * // Coupon detail sheet with product selection
 * <CouponDetailSheet
 *   coupon={selectedCoupon}
 *   isOpen={isSheetOpen}
 *   onClose={() => setIsSheetOpen(false)}
 *   onRedeem={handleRedeem}
 *   fetchProducts={(couponId) => sdk.getCouponProducts(couponId)}
 * />
 */

export { CouponCard, type CouponCardProps, type CouponCardTexts } from './CouponCard';
export { CouponList, type CouponListProps, type CouponListTexts } from './CouponList';
export { CouponDetailSheet, type CouponDetailSheetProps, type CouponDetailSheetTexts } from './CouponDetailSheet';

