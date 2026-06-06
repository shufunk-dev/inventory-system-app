/**
 * Calculates fluid ounces remaining based on scale weight.
 * 
 * Formula:
 * Volume (ml) = (Measured Weight (grams) - Bottle Tare Weight (grams)) / Specific Gravity
 * Volume (oz) = Volume (ml) / 29.5735
 * 
 * @param {number} measuredWeightGrams - Total weight read from scale
 * @param {number} emptyWeightGrams - Tare weight of the empty bottle
 * @param {number} specificGravity - Specific gravity multiplier (e.g. 0.94 for spirits, 1.15 for cordials)
 * @returns {number} - Volume in fluid ounces, rounded to 2 decimal places
 */
export function calculateVolumeOz(measuredWeightGrams, emptyWeightGrams, specificGravity = 1.0) {
  if (isNaN(measuredWeightGrams) || isNaN(emptyWeightGrams) || isNaN(specificGravity)) {
    return 0;
  }
  if (measuredWeightGrams <= emptyWeightGrams) {
    return 0;
  }
  const netWeightGrams = measuredWeightGrams - emptyWeightGrams;
  const volumeMl = netWeightGrams / specificGravity;
  const volumeOz = volumeMl / 29.5735;
  return parseFloat(volumeOz.toFixed(2));
}

/**
 * Calculates theoretical pour volume in fluid ounces for a list of recipes sold.
 * 
 * @param {number} numSold - Number of POS items sold
 * @param {number} pourSizeOz - Recipe pour size in ounces (e.g. 1.5, 2.0)
 * @returns {number} - Volume in fluid ounces
 */
export function calculateTheoreticalPourOz(numSold, pourSizeOz) {
  if (isNaN(numSold) || isNaN(pourSizeOz)) {
    return 0;
  }
  return parseFloat((numSold * pourSizeOz).toFixed(2));
}
