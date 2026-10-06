// EMA wellbeing label order and colors. Colors are CSS variables (app/globals.css) so
// charts switch correctly between light and dark themes; never use them for text.
export const PERMA_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'] as const;
export type PermaLabel = typeof PERMA_ORDER[number];

export const PERMA_COLOR: Record<string, string> = {
  Excelling: 'var(--perma-excelling)',
  Thriving: 'var(--perma-thriving)',
  Surviving: 'var(--perma-surviving)',
  Struggling: 'var(--perma-struggling)',
  'In Crisis': 'var(--perma-crisis)',
  'No Data': 'var(--perma-nodata)',
};

export const PERMA_SCORE: Record<string, number> = {
  Excelling: 5, Thriving: 4, Surviving: 3, Struggling: 2, 'In Crisis': 1,
};
