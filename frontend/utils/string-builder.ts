const phpFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
});

export function formatPrice(value: number, unit?: string): string {
  const formattedPrice = phpFmt.format(value);
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

export function formatMemberSince(createdAt?: string): string {
  if (!createdAt) return "Member since —";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Member since —";

  return `Member since ${date.toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  })}`;
}

export function formatLastActive(lastLoginAt?: string): string {
  if (!lastLoginAt) return "Last active —";

  const date = new Date(lastLoginAt);
  if (Number.isNaN(date.getTime())) return "Last active —";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Last active just now";
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `Last active ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `Last active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `Last active ${days} day${days === 1 ? "" : "s"} ago`;
  }

  return `Last active ${date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })}`;
}

export function formatOverallRating(rating?: number, reviewCount?: number): string {
  const count = reviewCount ?? 0;
  if (count <= 0) return "No ratings yet";

  const safeRating = Number.isFinite(rating) ? Number(rating) : 0;
  return `${safeRating.toFixed(1)} (${count})`;
}
