// Simple frontend service to store and retrieve listings using localStorage.
// The backend is left untouched, so we treat the client as the source of truth
// for newly created listings. This allows the "post listing" flow to appear
// to work without any server changes.

import { PostCardProps } from "@/components/post-card";

const STORAGE_KEY = "local_listings";

/**
 * Retrieve all saved listings from localStorage. Returns empty array if none.
 */
export function getListings(): PostCardProps[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a new listing to localStorage. It will be appended to existing ones.
 */
export function saveListing(listing: PostCardProps) {
  if (typeof window === "undefined") return;
  const current = getListings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, listing]));
}

/**
 * Clear all saved listings (used for development/testing). Not exported by default.
 */
export function _clearListings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
