'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { hexToHsl, hslToHex } from './color-convert';
import { colorPanelPresets } from './color-panel-presets';
import {
  PALETTE_COUNT,
  THEME_ROLES,
  THEME_ROLE_KEYS,
  defaultThemeMappings,
  defaultTweakState,
  type ThemeRole,
  type TweakState,
  type PanelPosition,
  type PinselPreset,
} from './color-panel-types';

// --- Storage keys ---
const STORAGE_KEY = 'pinsel-color-panel-state';
const OPEN_KEY = 'pinsel-color-panel-open';
const POSITION_KEY = 'pinsel-color-panel-position';

// --- Inline style constants for panel chrome ---
// We use hardcoded colors because the panel tweaks the very CSS vars
// that drive pinsel's Tailwind tokens.
const S = {
  panelBg: '#ffffff',
  panelBorder: '#d1d5db',
  text: '#111827',
  textMuted: '#6b7280',
  textAccent: '#c85080',
  surface: '#f9fafb',
  borderLight: '#e5e7eb',
  hoverBorder: '#9ca3af',
  ring: '#c85080',
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  sectionTitle: '#9ca3af',
  btnBg: '#f3f4f6',
  btnHover: '#e5e7eb',
  dialogBackdrop: 'rgba(0,0,0,0.5)',
  codeBg: '#f3f4f6',
} as const;

const presetNames = Object.keys(colorPanelPresets).sort();

// --- Position management ---

const DEFAULT_POSITION: PanelPosition = { top: 60, right: 20 };
const VISIBLE_MIN = 60;

function loadPosition(): PanelPosition {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PanelPosition;
      if (typeof parsed.top === 'number' && typeof parsed.right === 'number') {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
}

function savePosition(pos: PanelPosition) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function clampPosition(top: number, right: number, panelWidth: number): PanelPosition {
  const minRight = -(panelWidth - VISIBLE_MIN);
  const maxRight = window.innerWidth - VISIBLE_MIN;
  const minTop = -(VISIBLE_MIN / 2);
  const maxTop = window.innerHeight - VISIBLE_MIN;
  return {
    top: Math.max(minTop, Math.min(top, maxTop)),
    right: Math.max(minRight, Math.min(right, maxRight)),
  };
}

// --- CSS var helpers ---

function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function removeCssVar(name: string) {
  document.documentElement.style.removeProperty(name);
}

function applyFullState(state: TweakState) {
  for (let i = 0; i < PALETTE_COUNT; i++) {
    setCssVar(`--pd-p${i}`, state.palette[i]);
  }
  for (const role of THEME_ROLE_KEYS) {
    const slot = state.themeMappings[role];
    setCssVar(THEME_ROLES[role].cssVar, `var(--pd-p${slot})`);
  }
}

function removeAllOverrides() {
  for (let i = 0; i < PALETTE_COUNT; i++) {
    removeCssVar(`--pd-p${i}`);
  }
  for (const role of THEME_ROLE_KEYS) {
    removeCssVar(THEME_ROLES[role].cssVar);
  }
}

// --- State persistence ---

function loadPersistedState(): TweakState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as TweakState;
    if (!parsed.palette?.length || parsed.palette.length !== PALETTE_COUNT) return null;
    if (!parsed.themeMappings || typeof parsed.themeMappings !== 'object') return null;
    // Validate all palette entries are hex strings
    for (const c of parsed.palette) {
      if (typeof c !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c)) return null;
    }
    // Validate all theme role keys exist with in-range values
    for (const role of THEME_ROLE_KEYS) {
      const val = parsed.themeMappings[role];
      if (typeof val !== 'number' || val < 0 || val >= PALETTE_COUNT) return null;
    }
    return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function initFromPreset(preset: PinselPreset): TweakState {
  const mappings = defaultThemeMappings();
  if (preset.themeMappings) {
    for (const [role, slot] of Object.entries(preset.themeMappings)) {
      if (slot !== undefined) mappings[role as ThemeRole] = slot;
    }
  }
  return { palette: [...preset.palette], themeMappings: mappings };
}

// --- Export code generation ---

function generateExportCode(state: TweakState): string {
  const lines: string[] = [':root {'];
  lines.push('  /* Palette */');
  for (let i = 0; i < PALETTE_COUNT; i++) {
    lines.push(`  --pd-p${i}: ${state.palette[i]};`);
  }
  lines.push('');
  lines.push('  /* Theme Mapping */');
  for (const role of THEME_ROLE_KEYS) {
    const slot = state.themeMappings[role];
    lines.push(`  ${THEME_ROLES[role].cssVar}: var(--pd-p${slot});`);
  }
  lines.push('}');
  return lines.join('\n');
}

// --- Shared hooks ---

function usePopoverClose(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  isOpen: boolean,
) {
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, containerRef]);

  useEffect(() => {
    if (!isOpen) return;
    function handleScroll(e: Event) {
      // Don't close if the scroll originated inside the popover itself
      if (
        containerRef.current &&
        e.target instanceof Node &&
        containerRef.current.contains(e.target)
      ) {
        return;
      }
      onClose();
    }
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, onClose, containerRef]);
}

function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
  extraStyle?: React.CSSProperties,
): React.CSSProperties {
  if (!anchor) return { position: 'fixed', zIndex: 100000, ...extraStyle };
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const below = window.innerHeight - rect.bottom - pad;
  const above = rect.top - pad;
  const flipAbove = below < estH && above > below;
  let left = rect.left;
  if (left + estW > window.innerWidth - pad) left = window.innerWidth - pad - estW;
  if (left < pad) left = pad;
  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    zIndex: 100000,
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    ...extraStyle,
  };
  if (flipAbove) {
    style.bottom = window.innerHeight - rect.top + gap;
  } else {
    style.top = rect.bottom + gap;
  }
  return style;
}

// --- UI Components ---

function HslPicker({
  color,
  onChange,
  onClose,
  anchorRef,
}: {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hsl, setHsl] = useState(() => hexToHsl(color));
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHsl(hexToHsl(color));
    setHexInput(color);
  }, [color]);

  usePopoverClose(containerRef, onClose, true);

  function updateFromHsl(newHsl: { h: number; s: number; l: number }) {
    setHsl(newHsl);
    const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setHexInput(hex);
    onChange(hex);
  }

  function handleHexChange(value: string) {
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsl(hexToHsl(value));
      onChange(value);
    }
  }

  const sliders = [
    { label: 'H', value: hsl.h, max: 360, key: 'h' as const },
    { label: 'S', value: hsl.s, max: 100, key: 's' as const },
    { label: 'L', value: hsl.l, max: 100, key: 'l' as const },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        ...getFixedPopoverStyle(anchorRef.current, 340, 200, { width: 340 }),
        backgroundColor: S.panelBg,
        border: `1px solid ${S.panelBorder}`,
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div
          style={{
            backgroundColor: hslToHex(hsl.h, hsl.s, hsl.l),
            width: '3rem',
            height: '3rem',
            borderRadius: '4px',
            border: `1px solid ${S.borderLight}`,
            flexShrink: 0,
          }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          style={{
            backgroundColor: S.inputBg,
            color: S.text,
            border: `1px solid ${S.inputBorder}`,
            padding: '4px 6px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            width: '7rem',
            borderRadius: '4px',
          }}
          spellCheck={false}
          aria-label="Hex color value"
        />
      </div>
      {sliders.map(({ label, value, max, key }) => (
        <div
          key={key}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
        >
          <span style={{ color: S.textMuted, fontSize: '0.8rem', width: '1rem', flexShrink: 0 }}>
            {label}
          </span>
          <input
            type="range"
            min={0}
            max={max}
            value={value}
            onChange={(e) => updateFromHsl({ ...hsl, [key]: parseInt(e.target.value, 10) })}
            style={{ flex: 1, height: '1.2rem', accentColor: S.textAccent }}
            aria-label={label === 'H' ? 'Hue' : label === 'S' ? 'Saturation' : 'Lightness'}
          />
          <span
            style={{
              color: S.text,
              fontSize: '0.8rem',
              width: '2.5rem',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {value}
            {key === 'h' ? '' : '%'}
          </span>
        </div>
      ))}
    </div>
  );
}

function ColorSwatch({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <button
        ref={buttonRef}
        type="button"
        style={{
          backgroundColor: color,
          width: '2.8rem',
          height: '2.8rem',
          borderRadius: '4px',
          border: `1px solid ${S.borderLight}`,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseOver={(e) => {
          (e.target as HTMLElement).style.borderColor = S.hoverBorder;
        }}
        onMouseOut={(e) => {
          (e.target as HTMLElement).style.borderColor = S.borderLight;
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${label}: ${color}`}
        aria-label={`${label}: ${color}`}
      />
      {isOpen && (
        <HslPicker color={color} onChange={onChange} onClose={handleClose} anchorRef={buttonRef} />
      )}
      <span style={{ color: S.textMuted, fontSize: '0.7rem', lineHeight: 1, userSelect: 'none' }}>
        {label}
      </span>
    </div>
  );
}

function PaletteSelector({
  label,
  value,
  palette,
  onChange,
}: {
  label: string;
  value: number;
  palette: string[];
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const resolvedColor = palette[value] ?? '#000000';

  usePopoverClose(containerRef, handleClose, isOpen);

  function select(val: number) {
    onChange(val);
    setIsOpen(false);
  }

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          backgroundColor: S.surface,
          border: `1px solid ${S.borderLight}`,
          padding: '4px 6px',
          fontSize: '0.7rem',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = S.hoverBorder;
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = S.borderLight;
        }}
        aria-label={`${label}: p${value}`}
        aria-expanded={isOpen}
      >
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            color: S.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <div
          style={{
            backgroundColor: resolvedColor,
            width: '14px',
            height: '14px',
            borderRadius: '2px',
            border: `1px solid ${S.borderLight}`,
            flexShrink: 0,
          }}
        />
        <span style={{ color: S.text, width: '2em', flexShrink: 0 }}>p{value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke={S.textMuted}
          strokeWidth="2"
          style={{ flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={`${label} color options`}
          style={{
            ...getFixedPopoverStyle(buttonRef.current, 300, 100),
            backgroundColor: S.panelBg,
            border: `1px solid ${S.panelBorder}`,
            padding: '10px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
            {palette.map((color, i) => {
              const isSelected = value === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(i)}
                  title={`p${i}: ${color}`}
                  style={{
                    backgroundColor: color,
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '3px',
                    border: `1px solid ${S.borderLight}`,
                    cursor: 'pointer',
                    outline: isSelected ? `2px solid ${S.ring}` : 'none',
                    outlineOffset: '1px',
                    transition: 'outline 0.1s',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copyLabel, setCopyLabel] = useState('Copy');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClose() {
      onClose();
    }
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      dialog.close();
    }
  }

  async function handleCopy() {
    let ok = false;
    // Try modern Clipboard API first
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      /* ignore */
    }
    // Fallback: execCommand inside the dialog's focus trap
    if (!ok) {
      const dialog = dialogRef.current;
      if (dialog) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = code;
          textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
          dialog.appendChild(textarea);
          textarea.focus();
          textarea.select();
          ok = document.execCommand('copy');
          dialog.removeChild(textarea);
        } catch {
          /* ignore */
        }
      }
    }
    setCopyLabel(ok ? 'Copied!' : 'Failed');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), 2000);
  }

  const btnStyle: React.CSSProperties = {
    backgroundColor: S.btnBg,
    color: S.text,
    border: `1px solid ${S.inputBorder}`,
    padding: '4px 12px',
    fontSize: '0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '36rem',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: S.panelBg,
        color: S.text,
        border: `1px solid ${S.panelBorder}`,
        borderRadius: '8px',
        padding: '20px',
        userSelect: 'text',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, color: S.text }}>
        Export Color Scheme
      </h2>
      <pre
        style={{
          overflowX: 'auto',
          backgroundColor: S.codeBg,
          border: `1px solid ${S.borderLight}`,
          padding: '12px',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          borderRadius: '4px',
          color: S.text,
          margin: 0,
        }}
      >
        <code>{code}</code>
      </pre>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleCopy} style={btnStyle}>
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          style={{ ...btnStyle, color: S.textMuted }}
        >
          {' '}
          Close
        </button>
      </div>
    </dialog>
  );
}

// --- Main Component ---

export default function ColorPanel() {
  const [open, setOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [state, setState] = useState<TweakState | null>(null);
  const [position, setPosition] = useState<PanelPosition>(DEFAULT_POSITION);
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<PanelPosition>(DEFAULT_POSITION);
  positionRef.current = position;
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Restore open state and position on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    const loaded = loadPosition();
    setPosition(loaded);
    positionRef.current = loaded;
  }, []);

  // Persist open state
  useEffect(() => {
    try {
      if (open) localStorage.setItem(OPEN_KEY, '1');
      else localStorage.removeItem(OPEN_KEY);
    } catch {
      /* ignore */
    }
  }, [open]);

  // Toggle via custom event (from header button or console)
  useEffect(() => {
    function handleToggle() {
      setOpen((prev) => !prev);
    }
    window.addEventListener('toggle-color-panel', handleToggle);
    return () => window.removeEventListener('toggle-color-panel', handleToggle);
  }, []);

  // Register window.pinsel.toggleColorPanel
  useEffect(() => {
    const w = window as unknown as Record<string, Record<string, unknown>>;
    const pinsel = w.pinsel || {};
    pinsel.toggleColorPanel = () => {
      window.dispatchEvent(new CustomEvent('toggle-color-panel'));
    };
    w.pinsel = pinsel;
  }, []);

  // Initialize state on first open
  useEffect(() => {
    if (!open || state) return;
    const persisted = loadPersistedState();
    if (persisted) {
      applyFullState(persisted);
      setState(persisted);
      return;
    }
    setState(defaultTweakState());
  }, [open, state]);

  // Drag handler
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, select, option')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRight = positionRef.current.right;
    const startTop = positionRef.current.top;
    const panelWidth = panelRef.current?.offsetWidth ?? 500;

    function onMouseMove(ev: MouseEvent) {
      const clamped = clampPosition(
        startTop + (ev.clientY - startY),
        startRight - (ev.clientX - startX),
        panelWidth,
      );
      setPosition(clamped);
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragCleanupRef.current = null;
      savePosition(positionRef.current);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Cleanup drag on unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  // Re-clamp on resize
  useEffect(() => {
    function handleResize() {
      const panelWidth = panelRef.current?.offsetWidth ?? 500;
      setPosition((prev) => {
        const clamped = clampPosition(prev.top, prev.right, panelWidth);
        savePosition(clamped);
        return clamped;
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Re-apply after View Transition page swaps
  useEffect(() => {
    function handleSwap() {
      const persisted = loadPersistedState();
      if (persisted) {
        applyFullState(persisted);
        if (state) setState(persisted);
      }
    }
    document.addEventListener('astro:after-swap', handleSwap);
    return () => document.removeEventListener('astro:after-swap', handleSwap);
  }, [state]);

  const persist = useCallback((updater: (prev: TweakState) => TweakState) => {
    setState((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  }, []);

  // Apply CSS vars and save to localStorage whenever state changes
  const stateRef = useRef<TweakState | null>(null);
  useEffect(() => {
    if (!state || state === stateRef.current) return;
    stateRef.current = state;
    applyFullState(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full */
    }
  }, [state]);

  const handlePaletteChange = useCallback(
    (index: number, hex: string) => {
      persist((prev) => ({
        ...prev,
        palette: prev.palette.map((c, i) => (i === index ? hex : c)),
      }));
    },
    [persist],
  );

  const handleThemeChange = useCallback(
    (role: ThemeRole, val: number) => {
      persist((prev) => ({
        ...prev,
        themeMappings: { ...prev.themeMappings, [role]: val },
      }));
    },
    [persist],
  );

  const handleResetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    removeAllOverrides();
    setState(defaultTweakState());
  }, []);

  const handleLoadPreset = useCallback(
    (name: string) => {
      if (name === '__default') {
        handleResetAll();
        return;
      }
      const preset = colorPanelPresets[name];
      if (!preset) return;
      persist(() => initFromPreset(preset));
    },
    [persist, handleResetAll],
  );

  if (!open) return null;

  return (
    <>
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          zIndex: 99999,
          width: 'min(520px, calc(100vw - 40px))',
          maxHeight: 'calc(100vh - 80px)',
          top: position.top,
          right: position.right,
          backgroundColor: S.panelBg,
          border: `1px solid ${S.panelBorder}`,
          borderRadius: '8px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
          color: S.text,
        }}
      >
        {/* Header bar (draggable) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderBottom: `1px solid ${S.borderLight}`,
            cursor: 'move',
          }}
          onMouseDown={handleDragStart}
        >
          <span style={{ fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>Color Panel</span>
          <select
            onChange={(e) => {
              const name = e.target.value;
              if (name) {
                handleLoadPreset(name);
                e.target.value = '';
              }
            }}
            style={{
              backgroundColor: S.inputBg,
              color: S.text,
              border: `1px solid ${S.inputBorder}`,
              padding: '2px 4px',
              fontSize: '0.7rem',
              borderRadius: '4px',
              maxWidth: '9rem',
            }}
            aria-label="Load preset"
            defaultValue=""
          >
            <option value="" disabled>
              Preset...
            </option>
            <option value="__default">Default</option>
            <optgroup label="────────">
              {presetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            style={{
              color: S.textAccent,
              fontSize: '0.7rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            style={{
              color: S.textAccent,
              fontSize: '0.7rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Reset
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              color: S.textMuted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 0,
            }}
            aria-label="Close panel"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            overflowY: 'auto',
            padding: '12px 14px',
            maxHeight: 'calc(100vh - 80px - 4rem)',
          }}
        >
          {state && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Section A: Palette */}
              <div>
                <h3
                  style={{
                    color: S.sectionTitle,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 6px',
                  }}
                >
                  Palette
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '8px',
                    justifyItems: 'center',
                  }}
                >
                  {state.palette.map((color, i) => (
                    <ColorSwatch
                      key={i}
                      color={color}
                      label={`p${i}`}
                      onChange={(hex) => handlePaletteChange(i, hex)}
                    />
                  ))}
                </div>
              </div>

              {/* Section B: Theme Mapping */}
              <div>
                <h3
                  style={{
                    color: S.sectionTitle,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 6px',
                  }}
                >
                  Theme Mapping
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {THEME_ROLE_KEYS.map((role) => (
                    <PaletteSelector
                      key={role}
                      label={role}
                      value={state.themeMappings[role]}
                      palette={state.palette}
                      onChange={(val) => handleThemeChange(role, val)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showExport && state && (
        <ExportModal code={generateExportCode(state)} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
