'use client';

import { useState, useCallback } from 'react';

export interface StampSettings {
  stamps_required: number;
  reward_type: 'free_product' | 'discount' | 'points';
  product_name?: string;
  discount_amount?: number;
  points_amount?: number;
  layout?: 'horizontal' | 'vertical' | 'grid';
  rows?: number;
  columns?: number;
  background_color?: string;
  text_color?: string;
  item_name_singular?: string;
  item_name_plural?: string;
  punch_text?: string;
  reward_text?: string;
  stamp_icon?: string;
  stamp_icon_type?: 'icon' | 'custom';
  stamp_custom_image?: string;
  empty_slot_image?: string;
  filled_slot_image?: string;
}

export interface GameProgress {
  current_step: number;
  completed: boolean;
  completed_at?: string;
}

export interface StampCardGame {
  id: number;
  name: string | Record<string, string>;
  description?: string | Record<string, string>;
  game_type: 'stamps';
  stamps_required?: number;
  stamp_settings?: StampSettings;
  user_progress?: GameProgress;
  status?: 'available' | 'active' | 'completed';
}

export interface StampCardProps {
  game: StampCardGame;
  cardId: number;
  shopId: number;
  locale?: string;
  onAddStamps?: (gameId: number, cardId: number, shopId: number, stampsCount: number) => Promise<any>;
  onComplete?: (gameId: number, cardId: number) => Promise<any>;
  onRestart?: (gameId: number, cardId: number, shopId: number) => Promise<any>;
  onStampsAdded?: (result: { current_step: number; is_completed: boolean }) => void;
  onGameCompleted?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  texts?: StampCardTexts;
}

export interface StampCardTexts {
  stampProgress?: string;
  selectStamps?: string;
  addStamps?: string;
  gameCompleted?: string;
  completedAt?: string;
  startNewGame?: string;
  loading?: string;
  error?: string;
  cancel?: string;
}

const DEFAULT_TEXTS: StampCardTexts = {
  stampProgress: 'Progress',
  selectStamps: 'Select stamps to add',
  addStamps: 'Add stamps',
  gameCompleted: 'Completed!',
  completedAt: 'Completed at',
  startNewGame: 'Start new game',
  loading: 'Loading...',
  error: 'An error occurred',
  cancel: 'Cancel',
};

// Icon SVG components
const STAMP_ICONS: Record<string, React.FC<{ filled: boolean; size: number; color: string }>> = {
  star: ({ filled, size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  heart: ({ filled, size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  coffee: ({ filled, size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  gift: ({ filled, size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  default: ({ filled, size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      {filled && <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth={2} />}
    </svg>
  ),
};

export function StampCard({
  game,
  cardId,
  shopId,
  locale = 'en',
  onAddStamps,
  onComplete,
  onRestart,
  onStampsAdded,
  onGameCompleted,
  onError,
  className = '',
  texts: customTexts,
}: StampCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [stampsToAdd, setStampsToAdd] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [localProgress, setLocalProgress] = useState<GameProgress | null>(null);

  const getLocalizedText = (text: string | Record<string, string> | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text['en'] || text['lt'] || Object.values(text)[0] || '';
  };

  const stampSettings = game.stamp_settings;
  const progress = localProgress || game.user_progress;
  const currentSteps = progress?.current_step ?? 0;
  const stampsRequired = stampSettings?.stamps_required ?? game.stamps_required ?? 10;
  const isCompleted = progress?.completed ?? false;
  const remainingStamps = stampsRequired - currentSteps;

  const stampIcon = stampSettings?.stamp_icon ?? 'star';
  const StampIconComponent = STAMP_ICONS[stampIcon] || STAMP_ICONS.default;

  const handleAddStamps = useCallback(async () => {
    if (isLoading || !onAddStamps) return;

    setIsLoading(true);
    try {
      const result = await onAddStamps(game.id, cardId, shopId, stampsToAdd);
      
      if (result?.is_completed) {
        setLocalProgress({ current_step: stampsRequired, completed: true, completed_at: new Date().toISOString() });
        onGameCompleted?.();
      } else {
        setLocalProgress({ 
          current_step: result?.current_step ?? currentSteps + stampsToAdd,
          completed: false 
        });
      }
      
      onStampsAdded?.(result);
      setStampsToAdd(1);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to add stamps'));
    } finally {
      setIsLoading(false);
    }
  }, [game.id, cardId, shopId, stampsToAdd, currentSteps, stampsRequired, onAddStamps, onStampsAdded, onGameCompleted, onError, isLoading]);

  const handleStartNewGame = useCallback(async () => {
    if (isLoading || !onRestart) return;

    setIsLoading(true);
    try {
      await onRestart(game.id, cardId, shopId);
      setLocalProgress({ current_step: 0, completed: false });
      setStampsToAdd(1);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to restart game'));
    } finally {
      setIsLoading(false);
    }
  }, [game.id, cardId, shopId, onRestart, onError, isLoading]);

  const progressPercent = Math.min((currentSteps / stampsRequired) * 100, 100);

  // Build stamp icons grid
  const buildStampGrid = () => {
    const layout = stampSettings?.layout ?? 'horizontal';
    const rows = stampSettings?.rows ?? 2;
    const columns = stampSettings?.columns ?? Math.ceil(stampsRequired / rows);
    const stampSize = layout === 'grid' ? 40 : 48;
    const primaryColor = '#10b981';
    const emptyColor = '#d1d5db';

    const stamps = Array.from({ length: stampsRequired }, (_, index) => {
      const isFilled = index < currentSteps;
      return (
        <div
          key={index}
          className="loyalty-stamp-card__stamp"
          style={{
            width: stampSize,
            height: stampSize,
            backgroundColor: isFilled ? `${primaryColor}15` : `${emptyColor}30`,
            borderColor: isFilled ? primaryColor : emptyColor,
          }}
        >
          {stampSettings?.stamp_icon_type === 'custom' && stampSettings?.stamp_custom_image ? (
            <img
              src={isFilled ? (stampSettings.filled_slot_image ?? stampSettings.stamp_custom_image) : (stampSettings.empty_slot_image ?? stampSettings.stamp_custom_image)}
              alt=""
              style={{ width: '70%', height: '70%', opacity: isFilled ? 1 : 0.3 }}
            />
          ) : (
            <StampIconComponent 
              filled={isFilled} 
              size={stampSize * 0.5} 
              color={isFilled ? primaryColor : emptyColor} 
            />
          )}
        </div>
      );
    });

    if (layout === 'grid') {
      const gridRows: React.ReactNode[] = [];
      for (let r = 0; r < rows && r * columns < stampsRequired; r++) {
        const rowStamps = stamps.slice(r * columns, (r + 1) * columns);
        gridRows.push(
          <div key={r} className="loyalty-stamp-card__stamp-row">
            {rowStamps}
          </div>
        );
      }
      return <div className="loyalty-stamp-card__stamp-grid">{gridRows}</div>;
    }

    return (
      <div className="loyalty-stamp-card__stamp-row loyalty-stamp-card__stamp-row--wrap">
        {stamps}
      </div>
    );
  };

  return (
    <div className={`loyalty-stamp-card ${className}`}>
      {/* Punch text / Description */}
      {stampSettings?.punch_text && (
        <div className="loyalty-stamp-card__punch-text">
          {getLocalizedText(stampSettings.punch_text)}
        </div>
      )}

      {/* Progress header */}
      <div className="loyalty-stamp-card__progress-header">
        <span className="loyalty-stamp-card__progress-text">
          {texts.stampProgress}: {currentSteps}/{stampsRequired}
          {stampSettings?.item_name_singular && ` ${getLocalizedText(stampSettings.item_name_singular)}`}
        </span>
        {isCompleted && (
          <span className="loyalty-stamp-card__completed-badge">
            ✓ {texts.gameCompleted}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="loyalty-stamp-card__progress-bar">
        <div 
          className="loyalty-stamp-card__progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stamp icons */}
      <div className="loyalty-stamp-card__stamps">
        {buildStampGrid()}
      </div>

      {/* Completion status or controls */}
      {isCompleted ? (
        <div className="loyalty-stamp-card__completion">
          <div className="loyalty-stamp-card__completion-icon">✓</div>
          <p className="loyalty-stamp-card__completion-text">
            {stampSettings?.reward_text 
              ? getLocalizedText(stampSettings.reward_text)
              : texts.gameCompleted}
          </p>
          {progress?.completed_at && (
            <p className="loyalty-stamp-card__completion-date">
              {texts.completedAt}: {new Date(progress.completed_at).toLocaleDateString()}
            </p>
          )}
          {onRestart && (
            <button
              className="loyalty-stamp-card__button loyalty-stamp-card__button--primary"
              onClick={handleStartNewGame}
              disabled={isLoading}
            >
              {isLoading ? texts.loading : texts.startNewGame}
            </button>
          )}
        </div>
      ) : (
        <div className="loyalty-stamp-card__controls">
          <p className="loyalty-stamp-card__select-text">{texts.selectStamps}</p>
          
          <div className="loyalty-stamp-card__counter">
            <button
              className="loyalty-stamp-card__counter-btn"
              onClick={() => setStampsToAdd(Math.max(1, stampsToAdd - 1))}
              disabled={stampsToAdd <= 1 || isLoading}
            >
              −
            </button>
            <span className="loyalty-stamp-card__counter-value">{stampsToAdd}</span>
            <button
              className="loyalty-stamp-card__counter-btn"
              onClick={() => setStampsToAdd(Math.min(remainingStamps, stampsToAdd + 1))}
              disabled={stampsToAdd >= remainingStamps || isLoading}
            >
              +
            </button>
          </div>

          <button
            className="loyalty-stamp-card__button loyalty-stamp-card__button--primary"
            onClick={handleAddStamps}
            disabled={isLoading || !onAddStamps}
          >
            {isLoading ? texts.loading : texts.addStamps}
          </button>
        </div>
      )}
    </div>
  );
}

export default StampCard;

