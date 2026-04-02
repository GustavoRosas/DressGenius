/**
 * DressGenius — Subscription Plans & Free Tier Limits
 */

export const FREE_WARDROBE_LIMIT = 50;
export const FREE_ANALYSES_PER_MONTH = 3;
export const FREE_CHATS_PER_MONTH = 5;

export const MONTHLY_PRICE = 4.99;
export const YEARLY_PRICE = 39.99;

// BRL prices
export const MONTHLY_PRICE_BRL = 'R$ 24,90';
export const YEARLY_PRICE_BRL = 'R$ 199,90';
export const MONTHLY_PRICE_BRL_RAW = 24.9;
export const YEARLY_PRICE_BRL_RAW = 199.9;
export const YEARLY_MONTHLY_EQUIVALENT = +(YEARLY_PRICE / 12).toFixed(2); // ~3.33
export const YEARLY_SAVINGS_PERCENT = Math.round(
  ((MONTHLY_PRICE * 12 - YEARLY_PRICE) / (MONTHLY_PRICE * 12)) * 100,
);

export type PlanInterval = 'monthly' | 'yearly';

export interface PlanInfo {
  interval: PlanInterval;
  price: number;
  label: string;
}

export const PLANS: Record<PlanInterval, PlanInfo> = {
  monthly: { interval: 'monthly', price: MONTHLY_PRICE, label: '$4.99/mo' },
  yearly: { interval: 'yearly', price: YEARLY_PRICE, label: '$39.99/yr' },
};

export const PREMIUM_BENEFITS = [
  { emoji: '♾️', key: 'unlimitedWardrobe' },
  { emoji: '📸', key: 'unlimitedAnalyses' },
  { emoji: '💬', key: 'unlimitedChat' },
  { emoji: '🎨', key: 'colorTheory' },
  { emoji: '🌤️', key: 'weatherAware' },
  { emoji: '📊', key: 'styleAnalytics' },
] as const;
