export const PALETTE_COUNT = 10;

export const DEFAULT_PALETTE: string[] = [
  '#1f1f1f', // p0
  '#fafafa', // p1
  '#c85080', // p2
  '#2f9d92', // p3
  '#ddb830', // p4
  '#575757', // p5
  '#8a8a8a', // p6
  '#f0ebe4', // p7
  '#dc2626', // p8
  '#22c55e', // p9
];

export const THEME_ROLES = {
  fg: { cssVar: '--pd-theme-fg', defaultSlot: 0 },
  bg: { cssVar: '--pd-theme-bg', defaultSlot: 1 },
  accent: { cssVar: '--pd-theme-accent', defaultSlot: 2 },
  link: { cssVar: '--pd-theme-link', defaultSlot: 3 },
  highlight: { cssVar: '--pd-theme-highlight', defaultSlot: 4 },
  muted: { cssVar: '--pd-theme-muted', defaultSlot: 5 },
  border: { cssVar: '--pd-theme-border', defaultSlot: 6 },
  surface: { cssVar: '--pd-theme-surface', defaultSlot: 7 },
  error: { cssVar: '--pd-theme-error', defaultSlot: 8 },
  success: { cssVar: '--pd-theme-success', defaultSlot: 9 },
  'bg-pattern-a': { cssVar: '--pd-theme-bg-pattern-a', defaultSlot: 7 },
  'bg-pattern-b': { cssVar: '--pd-theme-bg-pattern-b', defaultSlot: 4 },
  'bg-pattern-c': { cssVar: '--pd-theme-bg-pattern-c', defaultSlot: 1 },
  'bg-pattern-d': { cssVar: '--pd-theme-bg-pattern-d', defaultSlot: 8 },
} as const;

export type ThemeRole = keyof typeof THEME_ROLES;
export const THEME_ROLE_KEYS = Object.keys(THEME_ROLES) as ThemeRole[];

export interface TweakState {
  palette: string[];
  themeMappings: Record<ThemeRole, number>;
}

export interface PanelPosition {
  top: number;
  right: number;
}

export interface PinselPreset {
  palette: string[];
  themeMappings?: Partial<Record<ThemeRole, number>>;
}

export function defaultThemeMappings(): Record<ThemeRole, number> {
  const mappings = {} as Record<ThemeRole, number>;
  for (const [role, def] of Object.entries(THEME_ROLES)) {
    mappings[role as ThemeRole] = def.defaultSlot;
  }
  return mappings;
}

export function defaultTweakState(): TweakState {
  return {
    palette: [...DEFAULT_PALETTE],
    themeMappings: defaultThemeMappings(),
  };
}
