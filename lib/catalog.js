/** Columns for catalog grid cards — omit description (large HTML blobs). */
export const CATALOG_PRODUCT_SELECT =
  'record_id, item_number, manufacturer_id, manufacturer_name, name, unit_price, primary_image_url, is_available, discontinued, discount_percent, minimum_quantity, quantity_increment, unit_qty, rep_group_category_path, volume_pricing';

export const CATALOG_PRODUCT_DETAIL_SELECT =
  'record_id, item_number, manufacturer_id, manufacturer_name, name, unit_price, retail_price, primary_image_url, additional_image_urls, is_available, discontinued, discount_percent, minimum_quantity, quantity_increment, unit_qty, rep_group_category_path, description, volume_pricing, scs_details, qty_available';

/** Estimated count is ~100x faster than exact on 80k+ rows. */
export const CATALOG_COUNT_TYPE = 'estimated';
