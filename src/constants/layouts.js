export const LAYOUTS = {
  '1x1': { cols: 1, rows: 1, count: 1, label: '1×1' },
  '2x2': { cols: 2, rows: 2, count: 4, label: '2×2' },
  '3x0': { cols: 1, rows: 3, count: 3, label: '3×0', mobileRecommended: true },
  '3x2': { cols: 3, rows: 2, count: 6, label: '3×2' },
  '3x3': { cols: 3, rows: 3, count: 9, label: '3×3' },
  '4x0': { cols: 1, rows: 4, count: 4, label: '4×0', mobileRecommended: true },
  '4x2': { cols: 4, rows: 2, count: 8, label: '4×2' },
  '4x3': { cols: 4, rows: 3, count: 12, label: '4×3' },
};

export const LAYOUT_OPTIONS = Object.entries(LAYOUTS).map(
  ([value, { label, mobileRecommended = false }]) => ({
    value,
    label,
    mobileRecommended,
  })
);

export const MOBILE_RECOMMENDED_LAYOUTS = LAYOUT_OPTIONS.filter((o) => o.mobileRecommended);
export const STANDARD_LAYOUTS = LAYOUT_OPTIONS.filter((o) => !o.mobileRecommended);
