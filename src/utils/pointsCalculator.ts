import { PointsRules } from '../types';

/**
 * Calculate the currency amount (discount) from points using redemption rules
 * @param points - Number of points to redeem
 * @param pointsRules - Points rules configuration
 * @returns Amount in currency that points are worth (discount amount)
 */
export function calculateAmountFromPoints(points: number, pointsRules: PointsRules | null | undefined): number {
  if (!pointsRules || points <= 0) {
    return 0;
  }

  // Check if redemption is enabled (default to true if not specified)
  if (pointsRules.points_redemption_enabled === false) {
    return 0;
  }

  // Use redemption rules if available, otherwise fall back to earning rules
  const pointsPerCurrency = pointsRules.points_per_currency_redemption || pointsRules.points_per_currency;
  const currencyAmount = pointsRules.currency_amount_redemption || pointsRules.currency_amount;

  if (!pointsPerCurrency || pointsPerCurrency <= 0 || !currencyAmount || currencyAmount <= 0) {
    return 0;
  }

  // Calculate the amount: (points / pointsPerCurrency) * currencyAmount
  const amount = (points / pointsPerCurrency) * currencyAmount;
  
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate points earned from a purchase amount
 * @param amount - Purchase amount in currency
 * @param pointsRules - Points rules configuration
 * @returns Number of points earned
 */
export function calculatePointsFromAmount(amount: number, pointsRules: PointsRules | null | undefined): number {
  if (!pointsRules || amount <= 0) {
    return 0;
  }

  const pointsPerCurrency = pointsRules.points_per_currency;
  const currencyAmount = pointsRules.currency_amount;

  if (!pointsPerCurrency || pointsPerCurrency <= 0 || !currencyAmount || currencyAmount <= 0) {
    return 0;
  }

  // Calculate points: (amount / currencyAmount) * pointsPerCurrency
  const points = (amount / currencyAmount) * pointsPerCurrency;
  
  return Math.floor(points); // Round down to whole points
}

/**
 * Validate if points can be redeemed
 * @param points - Number of points to redeem
 * @param availablePoints - User's available points balance
 * @param pointsRules - Points rules configuration
 * @returns Validation result with isValid flag and error message if invalid
 */
export function validatePointsRedemption(
  points: number,
  availablePoints: number,
  pointsRules: PointsRules | null | undefined
): { isValid: boolean; error?: string } {
  if (!pointsRules) {
    return { isValid: false, error: 'Points rules not configured' };
  }

  if (pointsRules.points_redemption_enabled === false) {
    return { isValid: false, error: 'Points redemption is not enabled' };
  }

  if (points <= 0) {
    return { isValid: false, error: 'Points must be greater than 0' };
  }

  if (points > availablePoints) {
    return { isValid: false, error: 'Insufficient points balance' };
  }

  const minPoints = pointsRules.min_points_for_redemption || 0;
  if (points < minPoints) {
    return { isValid: false, error: `Minimum ${minPoints} points required for redemption` };
  }

  const maxPoints = pointsRules.max_points_per_redemption;
  if (maxPoints && points > maxPoints) {
    return { isValid: false, error: `Maximum ${maxPoints} points allowed per redemption` };
  }

  return { isValid: true };
}

/**
 * Calculate the final amount after applying points discount
 * @param originalAmount - Original purchase amount
 * @param pointsToRedeem - Number of points to redeem
 * @param pointsRules - Points rules configuration
 * @returns Final amount after discount
 */
export function calculateFinalAmount(
  originalAmount: number,
  pointsToRedeem: number,
  pointsRules: PointsRules | null | undefined
): number {
  if (originalAmount <= 0) {
    return 0;
  }

  const discount = calculateAmountFromPoints(pointsToRedeem, pointsRules);
  const finalAmount = Math.max(0, originalAmount - discount);
  
  return Math.round(finalAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate maximum points that can be redeemed for a given amount
 * @param amount - Purchase amount
 * @param availablePoints - User's available points
 * @param pointsRules - Points rules configuration
 * @returns Maximum redeemable points
 */
export function calculateMaxRedeemablePoints(
  amount: number,
  availablePoints: number,
  pointsRules: PointsRules | null | undefined
): number {
  if (!pointsRules || amount <= 0 || availablePoints <= 0) {
    return 0;
  }

  if (pointsRules.points_redemption_enabled === false) {
    return 0;
  }

  // Calculate points needed to cover the full amount
  const pointsPerCurrency = pointsRules.points_per_currency_redemption || pointsRules.points_per_currency;
  const currencyAmount = pointsRules.currency_amount_redemption || pointsRules.currency_amount;

  if (!pointsPerCurrency || pointsPerCurrency <= 0 || !currencyAmount || currencyAmount <= 0) {
    return 0;
  }

  const pointsForFullAmount = Math.ceil((amount / currencyAmount) * pointsPerCurrency);

  // Apply constraints
  let maxPoints = Math.min(pointsForFullAmount, availablePoints);

  // Apply max redemption limit if set
  if (pointsRules.max_points_per_redemption) {
    maxPoints = Math.min(maxPoints, pointsRules.max_points_per_redemption);
  }

  return maxPoints;
}
