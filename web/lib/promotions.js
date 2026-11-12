/**
 * Promotions & Timed Sales Engine
 * Handles promotional discounts, scheduled sales, recurring weekend/day sales,
 * grace periods, and line-item markdown calculations.
 */

export function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Parses targetIds from JSON or comma-separated string into an array of trimmed strings.
 */
export function parseTargetIds(targetIds) {
  if (!targetIds) return [];
  if (Array.isArray(targetIds)) return targetIds.map(s => String(s).trim());
  if (typeof targetIds === 'string') {
    try {
      const parsed = JSON.parse(targetIds);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim());
    } catch (e) {
      // Fallback to comma-separated
    }
    return targetIds.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Checks if a promotion is actively running right now.
 * Takes into account:
 * - isActive toggle
 * - Start date/time & End date/time
 * - Grace period buffer (0 to 30 minutes)
 * - Recurring schedules (e.g. days of week: Sun=0..Sat=6)
 */
export function isPromotionActive(promo, now = new Date()) {
  if (!promo || promo.isActive === 0 || promo.isActive === false) {
    return false;
  }

  const nowTime = now.getTime();
  const startTime = new Date(promo.startDate).getTime();
  const baseEndTime = new Date(promo.endDate).getTime();
  const graceMinutes = parseInt(promo.gracePeriodMinutes, 10) || 0;
  const effectiveEndTime = baseEndTime + (graceMinutes * 60 * 1000);

  if (isNaN(startTime) || isNaN(baseEndTime)) {
    return false;
  }

  // Check overall date window
  if (nowTime < startTime || nowTime > effectiveEndTime) {
    return false;
  }

  // Recurring check
  if (promo.isRecurring === 1 || promo.isRecurring === true) {
    let days = [];
    if (promo.recurringDays) {
      try {
        days = typeof promo.recurringDays === 'string' 
          ? JSON.parse(promo.recurringDays) 
          : promo.recurringDays;
      } catch (e) {
        days = String(promo.recurringDays).split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
      }
    }
    if (Array.isArray(days) && days.length > 0) {
      const currentDay = now.getDay(); // 0 is Sunday, 6 is Saturday
      if (!days.map(Number).includes(currentDay)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Formats time remaining for a promotion.
 */
export function getPromotionTimeStatus(promo, now = new Date()) {
  if (!promo) return { status: 'expired', label: 'Expired', msRemaining: 0 };

  const nowTime = now.getTime();
  const startTime = new Date(promo.startDate).getTime();
  const baseEndTime = new Date(promo.endDate).getTime();
  const graceMinutes = parseInt(promo.gracePeriodMinutes, 10) || 0;
  const effectiveEndTime = baseEndTime + (graceMinutes * 60 * 1000);

  if (nowTime < startTime) {
    const diffMs = startTime - nowTime;
    return {
      status: 'scheduled',
      label: `Starts in ${formatDuration(diffMs)}`,
      msRemaining: diffMs,
      inGracePeriod: false
    };
  }

  if (nowTime > effectiveEndTime) {
    return {
      status: 'expired',
      label: 'Expired',
      msRemaining: 0,
      inGracePeriod: false
    };
  }

  // Check recurring day restriction
  if (promo.isRecurring === 1 || promo.isRecurring === true) {
    let days = [];
    try {
      days = typeof promo.recurringDays === 'string' ? JSON.parse(promo.recurringDays) : promo.recurringDays;
    } catch (e) {
      days = [];
    }
    if (Array.isArray(days) && days.length > 0 && !days.map(Number).includes(now.getDay())) {
      return {
        status: 'paused_recurring',
        label: 'Runs on select days',
        msRemaining: effectiveEndTime - nowTime,
        inGracePeriod: false
      };
    }
  }

  if (nowTime > baseEndTime && nowTime <= effectiveEndTime) {
    const graceLeftMs = effectiveEndTime - nowTime;
    return {
      status: 'grace_period',
      label: `Grace Period: ${formatDuration(graceLeftMs)} left`,
      msRemaining: graceLeftMs,
      inGracePeriod: true
    };
  }

  const diffMs = baseEndTime - nowTime;
  return {
    status: 'active',
    label: `${formatDuration(diffMs)} left`,
    msRemaining: diffMs,
    inGracePeriod: false
  };
}

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Checks if a specific item qualifies for a given promotion.
 */
export function itemMatchesPromotion(item, promo) {
  if (!promo || !item) return false;

  // Store/booth scope check: if promo specifies a storeId other than 'all' or empty, must match
  if (promo.storeId && promo.storeId !== 'all' && item.storeId && item.storeId !== 'unattributed') {
    if (String(promo.storeId) !== String(item.storeId)) {
      return false;
    }
  }

  const targetType = promo.targetType || 'booth';
  const targetIds = parseTargetIds(promo.targetIds);

  if (targetType === 'booth' || targetType === 'all') {
    return true;
  }

  if (targetType === 'category') {
    if (!item.categoryId) return false;
    return targetIds.includes(String(item.categoryId));
  }

  if (targetType === 'tag') {
    const itemTag = (item.tag || '').trim().toLowerCase();
    const itemColor = (item.colorTag || '').trim().toLowerCase();
    return targetIds.some(t => {
      const targetLower = t.toLowerCase();
      return (itemTag && itemTag === targetLower) || (itemColor && itemColor === targetLower);
    });
  }

  if (targetType === 'items') {
    const itemId = String(item.id || '').trim();
    const itemBarcode = String(item.barcode || item.itemNum || '').trim();
    return targetIds.some(id => id === itemId || id === itemBarcode);
  }

  return false;
}

/**
 * Evaluates an item against a list of promotions to determine if it has an active sale.
 * Selects the promotion providing the highest dollar savings for the customer.
 */
export function evaluateItemPromotion(item, promotions = [], now = new Date()) {
  const originalPrice = parseFloat(item.retailPrice !== undefined ? item.retailPrice : item.price);
  if (isNaN(originalPrice) || originalPrice <= 0) {
    return {
      hasSale: false,
      originalPrice: 0,
      discountAmount: 0,
      salePrice: 0,
      savingsPercent: 0,
      promotionName: null,
      promotionId: null
    };
  }

  let bestPromo = null;
  let maxDiscount = 0;
  let inGrace = false;

  for (const promo of promotions) {
    if (!isPromotionActive(promo, now)) continue;
    if (!itemMatchesPromotion(item, promo)) continue;

    let discount = 0;
    const val = parseFloat(promo.discountValue) || 0;

    if (promo.discountType === 'percentage') {
      discount = round2(originalPrice * (val / 100));
    } else if (promo.discountType === 'fixed_amount') {
      discount = round2(Math.min(originalPrice, val));
    } else if (promo.discountType === 'fixed_price') {
      discount = round2(Math.max(0, originalPrice - val));
    }

    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestPromo = promo;
      const status = getPromotionTimeStatus(promo, now);
      inGrace = status.inGracePeriod;
    }
  }

  if (bestPromo && maxDiscount > 0) {
    const salePrice = round2(Math.max(0, originalPrice - maxDiscount));
    const savingsPercent = Math.round((maxDiscount / originalPrice) * 100);

    return {
      hasSale: true,
      originalPrice,
      discountAmount: maxDiscount,
      salePrice,
      savingsPercent,
      promotionName: bestPromo.name,
      promotionId: bestPromo.id,
      discountType: bestPromo.discountType,
      discountValue: bestPromo.discountValue,
      endDate: bestPromo.endDate,
      inGracePeriod: inGrace
    };
  }

  return {
    hasSale: false,
    originalPrice,
    discountAmount: 0,
    salePrice: originalPrice,
    savingsPercent: 0,
    promotionName: null,
    promotionId: null,
    inGracePeriod: false
  };
}

