/**
 * Normalize MarketTime manufacturer payment terms into a display label.
 */
export function formatPaymentTermsLabel(terms) {
  if (!terms) return 'Net 30';

  const list = Array.isArray(terms)
    ? terms
    : terms.records ?? (typeof terms === 'object' ? [terms] : []);

  const primary = list.find((t) => t?.isDefault || t?.default) ?? list[0];
  if (!primary) return 'Net 30';

  return (
    primary.description ??
    primary.name ??
    primary.paymentTerms ??
    primary.termName ??
    primary.termsDescription ??
    'Net 30'
  );
}
