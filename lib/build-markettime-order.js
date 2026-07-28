/**
 * Assembles a MarketTime POST /orders payload from portal cart data +
 * customer + ship-to records fetched from the MT API.
 */

export function getShipToRecordId(shipTo) {
  if (!shipTo) return null;
  const id = shipTo.retailerShipToID ?? shipTo.recordID ?? shipTo.shipToID ?? shipTo.id;
  if (id == null || id === '') return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function buildMarketTimeOrder({ clientOrder, customer, shipTo, retailerID }) {
  const details = (clientOrder.details ?? []).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return {
      sequenceID: index + 1,
      itemNumber: item.itemNumber,
      name: item.name || item.itemNumber,
      quantity,
      unitPrice,
      unitQty: Number(item.unitQty ?? item.quantity) || quantity,
    };
  });

  const orderTotal = details.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const shippingMethod = (clientOrder.shippingMethod || 'STANDARD').trim();

  return {
    manufacturerID: clientOrder.manufacturerID,
    retailerID,
    retailerShipToID: getShipToRecordId(shipTo),
    poNumber: clientOrder.poNumber,
    orderDate: formatDate(clientOrder.orderDate),
    requestDate: formatDate(clientOrder.requestDate),
    shipDate: clientOrder.shipDate ? formatDate(clientOrder.shipDate) : undefined,
    cancelDate: clientOrder.cancelDate ? formatDate(clientOrder.cancelDate) : undefined,
    acceptBackOrder: clientOrder.acceptBackOrder ?? true,
    shippingMethod,
    orderCode: clientOrder.orderCode || 'R',
    orderTotal,
    paymentTerm: 'See Special Instructions',
    specialInstructions: clientOrder.specialInstructions || 'Net 30',
    manufacturerOrderStatus: 'NOT TRANSMITTED',
    repGroupOrderStatus: 'OPEN',
    billToName: customer.name,
    billToAddress1: customer.address1,
    billToAddress2: customer.address2 || '',
    billToCity: customer.city,
    billToState: customer.state,
    billToZip: customer.zip,
    billToCountry: customer.country || 'US',
    billToEmail: customer.email || '',
    shipToName: shipTo.name,
    shipToAddress1: shipTo.address1,
    shipToAddress2: shipTo.address2 || '',
    shipToCity: shipTo.city,
    shipToState: shipTo.state,
    shipToZip: shipTo.zip,
    shipToCountry: shipTo.country || 'US',
    shipToEmail: shipTo.email || '',
    shippingAddress1: shipTo.address1,
    details,
  };
}
