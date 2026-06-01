/**
 * Recursively builds a flat list of categories with indentation to represent hierarchy.
 * @param {Array} categories - Raw category array from DB.
 * @param {String|null} parentId - Current parent to process.
 * @param {Number} level - Current depth level.
 * @returns {Array} - Array of categories with 'displayName' and 'level'.
 */
export function buildCategoryTree(categories, parentId = null, level = 0) {
  let result = [];
  
  // Find all children of the current parent, sort them alphabetically
  const children = categories
    .filter(c => c.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const child of children) {
    // Add prefix based on level
    const prefix = level > 0 ? '— '.repeat(level) : '';
    
    result.push({
      ...child,
      level,
      displayName: `${prefix}${child.name}`
    });

    // Recurse for nested children
    result = result.concat(buildCategoryTree(categories, child.id, level + 1));
  }

  return result;
}

/**
 * Gets an array of a category ID and ALL of its nested children IDs recursively.
 * Useful for SQL filtering.
 */
export function getCategoryAndChildrenIds(categories, startCategoryId) {
  const ids = new Set([startCategoryId]);

  const findChildren = (parentId) => {
    const children = categories.filter(c => c.parentId === parentId);
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        findChildren(child.id); // recurse
      }
    }
  };

  findChildren(startCategoryId);
  return Array.from(ids);
}
