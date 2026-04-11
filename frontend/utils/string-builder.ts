export function formatPrice(value: number, unit?: string): string {
  const formattedPrice = "₱" + value.toLocaleString("en-PH", { minimumFractionDigits: 0 });
  return unit ? `${formattedPrice} / ${unit}` : formattedPrice;
}

export function formatTimeAgo(value: string): string {
  const postedDate = new Date(value);
  if (Number.isNaN(postedDate.getTime())) {
    return value;
  }

  const diffMs = Math.max(0, Date.now() - postedDate.getTime());
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < hourMs) {
    return 'Just now';
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (diffMs < weekMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  const weeks = Math.floor(diffMs / weekMs);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}
