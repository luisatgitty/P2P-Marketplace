export interface DeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop";
  isMobile: boolean;

  signals: {
    mobileUserAgent:   boolean;
    coarsePointer:     boolean;
    maxTouchPoints:    number;
    screenWidthPx:     number;
    devicePixelRatio:  number;
    orientation:       string | null;
    touchEventsExist:  boolean;
  };
}

interface Options { asJson?: boolean }

export function getDeviceInfo(options: { asJson: true  }): string;
export function getDeviceInfo(options?: { asJson: false }): DeviceInfo;
export function getDeviceInfo(options?: Options): DeviceInfo | string;

export function getDeviceInfo(options: Options = {}): DeviceInfo | string {
  // ── SSR guard ────────────────────────────────────────────────────────────────
  if (typeof window === "undefined") {
    const empty: DeviceInfo = {
      deviceType: "desktop",
      isMobile:   false,
      signals: {
        mobileUserAgent:  false,
        coarsePointer:    false,
        maxTouchPoints:   0,
        screenWidthPx:    0,
        devicePixelRatio: 1,
        orientation:      null,
        touchEventsExist: false,
      },
    };
    return options.asJson ? JSON.stringify(empty) : empty;
  }

  // ── Collect signals ───────────────────────────────────────────────────────────

  // 1. UA string — weakest signal, trivially spoofed, but still useful
  const mobileUserAgent = /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(
    navigator.userAgent,
  );
  // 2. Pointer precision — coarse = finger, fine = mouse/trackpad
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  // 3. Touch point count — 0 on desktop, ≥1 on any touch device
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  // 4. Screen width — phones are typically ≤ 480 px, tablets ≤ 1024 px
  const screenWidthPx = window.screen.width;
  // 5. Device pixel ratio — retina / HiDPI screens are common on mobile (≥ 2)
  const devicePixelRatio = window.devicePixelRatio ?? 1;
  // 6. Orientation API — only exists on devices that can rotate
  const orientation = window.screen.orientation?.type ?? null;
  // 7. Touch event support in the window object
  const touchEventsExist = "ontouchstart" in window;

  // ── Resolve device type ───────────────────────────────────────────────────────
  const mobileSignalCount = [
    mobileUserAgent,
    coarsePointer,
    maxTouchPoints > 0,
    touchEventsExist,
  ].filter(Boolean).length;

  // isMobile: requires ≥ 2 signals to avoid false positives from UA spoofing
  // or touch-enabled desktop monitors
  const isMobile = mobileSignalCount >= 2;

  // Tablet heuristic: mobile signals present but screen is wider than a phone
  // Typical breakpoints: phones < 480 px, tablets 480–1024 px
  const isTablet = isMobile && screenWidthPx >= 480 && screenWidthPx <= 1024;

  const deviceType: DeviceInfo["deviceType"] = isTablet
    ? "tablet"
    : isMobile
    ? "mobile"
    : "desktop";

  const info: DeviceInfo = {
    deviceType,
    isMobile,
    signals: {
      mobileUserAgent,
      coarsePointer,
      maxTouchPoints,
      screenWidthPx,
      devicePixelRatio,
      orientation,
      touchEventsExist,
    },
  };

  return options.asJson ? JSON.stringify(info) : info;
}
