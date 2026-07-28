/**
 * PO number generation for Toys2000 portal orders.
 * Format: T2K-{YYYYMMDD}-{4 random alphanumeric chars}
 * Example: T2K-20260423-X7Q2
 *
 * The generated value pre-fills the PO field at checkout.
 * Customers can override it with their own PO number.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion

const randomChars = (length) =>
  Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

export const generatePO = (date = new Date()) =>
  `T2K-${formatDate(date)}-${randomChars(4)}`;
