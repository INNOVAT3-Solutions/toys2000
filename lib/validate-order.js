import { createAdminClient } from '@/lib/supabase-server';
import { getUnitPriceForQuantity, isValidQuantity } from '@/lib/cart';

/**
 * Re-price and validate order line items against the synced catalog.
 * Prevents clients from submitting tampered unitPrice values.
 */
export async function validateAndNormalizeOrderDetails(details, manufacturerID) {
  if (!details?.length) {
    throw new Error('Order must include at least one line item.');
  }

  const itemNumbers = [...new Set(details.map((d) => d.itemNumber).filter(Boolean))];
  if (itemNumbers.length === 0) {
    throw new Error('Each line item must include an itemNumber.');
  }

  const db = createAdminClient();
  const { data: products, error } = await db
    .from('products')
    .select(
      'item_number, name, unit_price, minimum_quantity, quantity_increment, volume_pricing, manufacturer_id, show_on_website, discontinued, is_available'
    )
    .eq('manufacturer_id', manufacturerID)
    .in('item_number', itemNumbers);

  if (error) {
    throw new Error(`Could not validate order items: ${error.message}`);
  }

  const byItemNumber = Object.fromEntries((products ?? []).map((p) => [p.item_number, p]));

  return details.map((line, index) => {
    const product = byItemNumber[line.itemNumber];
    if (!product) {
      throw new Error(`Product ${line.itemNumber} was not found for this manufacturer.`);
    }
    if (!product.show_on_website || product.discontinued) {
      throw new Error(`${product.name ?? line.itemNumber} is no longer available.`);
    }
    if (product.is_available === false) {
      throw new Error(`${product.name ?? line.itemNumber} is currently out of stock.`);
    }

    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${line.itemNumber}.`);
    }
    if (!isValidQuantity(quantity, product.minimum_quantity, product.quantity_increment)) {
      throw new Error(
        `Quantity for ${product.name ?? line.itemNumber} must meet minimum ${product.minimum_quantity} and increment ${product.quantity_increment}.`
      );
    }

    return {
      sequenceID: index + 1,
      itemNumber: line.itemNumber,
      name: product.name || line.name || line.itemNumber,
      quantity,
      unitPrice: getUnitPriceForQuantity(product, quantity),
      unitQty: Number(line.unitQty ?? quantity) || quantity,
    };
  });
}
