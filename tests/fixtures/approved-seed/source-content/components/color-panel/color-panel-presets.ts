import type { PinselPreset } from './color-panel-types';

/**
 * Color scheme presets for the Pinsel Color Panel.
 *
 * Each preset provides 10 hex colors mapped to pinsel's semantic roles:
 *   p0=fg, p1=bg, p2=accent, p3=link, p4=highlight,
 *   p5=muted, p6=border, p7=surface, p8=error, p9=success
 *
 * Optional `themeMappings` override the default 1:1 mapping when needed.
 */
export const colorPanelPresets: Record<string, PinselPreset> = {
  Dracula: {
    palette: [
      '#f8f8f2', // fg
      '#282a36', // bg
      '#ff79c6', // accent (pink)
      '#8be9fd', // link (cyan)
      '#f1fa8c', // highlight (yellow)
      '#6272a4', // muted
      '#44475a', // border
      '#21222c', // surface
      '#ff5555', // error (red)
      '#50fa7b', // success (green)
    ],
  },
  'Catppuccin Mocha': {
    palette: [
      '#cdd6f4', // fg
      '#1e1e2e', // bg
      '#f5c2e7', // accent (pink)
      '#89b4fa', // link (blue)
      '#f9e2af', // highlight (yellow)
      '#585b70', // muted
      '#45475a', // border
      '#313244', // surface
      '#f38ba8', // error (red)
      '#a6e3a1', // success (green)
    ],
  },
  Nord: {
    palette: [
      '#d8dee9', // fg
      '#2e3440', // bg
      '#b48ead', // accent (purple)
      '#81a1c1', // link (blue)
      '#ebcb8b', // highlight (yellow)
      '#596377', // muted
      '#3b4252', // border
      '#434c5e', // surface
      '#bf616a', // error (red)
      '#a3be8c', // success (green)
    ],
  },
  'Tokyo Night': {
    palette: [
      '#c0caf5', // fg
      '#1a1b26', // bg
      '#bb9af7', // accent (purple)
      '#7aa2f7', // link (blue)
      '#e0af68', // highlight (yellow)
      '#414868', // muted
      '#33467c', // border
      '#15161e', // surface
      '#f7768e', // error (red)
      '#9ece6a', // success (green)
    ],
  },
  'Solarized Dark': {
    palette: [
      '#839496', // fg
      '#002b36', // bg
      '#d33682', // accent (magenta)
      '#268bd2', // link (blue)
      '#b58900', // highlight (yellow)
      '#586e75', // muted
      '#073642', // border
      '#073642', // surface
      '#dc322f', // error (red)
      '#859900', // success (green)
    ],
  },
  'Solarized Light': {
    palette: [
      '#657b83', // fg
      '#fdf6e3', // bg
      '#d33682', // accent (magenta)
      '#268bd2', // link (blue)
      '#b58900', // highlight (yellow)
      '#93a1a1', // muted
      '#eee8d5', // border
      '#eee8d5', // surface
      '#dc322f', // error (red)
      '#859900', // success (green)
    ],
  },
  'Rose Pine': {
    palette: [
      '#e0def4', // fg
      '#191724', // bg
      '#c4a7e7', // accent (iris)
      '#9ccfd8', // link (foam)
      '#f6c177', // highlight (gold)
      '#6e6a86', // muted
      '#26233a', // border
      '#1f1d2e', // surface
      '#eb6f92', // error (love)
      '#31748f', // success (pine)
    ],
  },
  'GitHub Dark': {
    palette: [
      '#c9d1d9', // fg
      '#0d1117', // bg
      '#f78166', // accent (coral)
      '#58a6ff', // link (blue)
      '#d29922', // highlight (yellow)
      '#484f58', // muted
      '#30363d', // border
      '#161b22', // surface
      '#f85149', // error (red)
      '#3fb950', // success (green)
    ],
  },
  'GitHub Light': {
    palette: [
      '#24292f', // fg
      '#ffffff', // bg
      '#cf222e', // accent (red)
      '#0969da', // link (blue)
      '#bf8700', // highlight (yellow)
      '#6e7781', // muted
      '#d0d7de', // border
      '#f6f8fa', // surface
      '#cf222e', // error (red)
      '#1a7f37', // success (green)
    ],
  },
  'Gruvbox Dark': {
    palette: [
      '#ebdbb2', // fg
      '#282828', // bg
      '#d3869b', // accent (purple)
      '#83a598', // link (aqua)
      '#fabd2f', // highlight (yellow)
      '#928374', // muted
      '#3c3836', // border
      '#1d2021', // surface
      '#fb4934', // error (red)
      '#b8bb26', // success (green)
    ],
  },
  'Everforest Dark': {
    palette: [
      '#d3c6aa', // fg
      '#2d353b', // bg
      '#e67e80', // accent (red-ish)
      '#7fbbb3', // link (aqua)
      '#dbbc7f', // highlight (yellow)
      '#859289', // muted
      '#475258', // border
      '#343f44', // surface
      '#e67e80', // error (red)
      '#a7c080', // success (green)
    ],
  },
  'Atom One Dark': {
    palette: [
      '#abb2bf', // fg
      '#21252b', // bg
      '#c678dd', // accent (purple)
      '#61afef', // link (blue)
      '#e5c07b', // highlight (yellow)
      '#767676', // muted
      '#323844', // border
      '#2c313c', // surface
      '#e06c75', // error (red)
      '#98c379', // success (green)
    ],
  },
  Monokai: {
    palette: [
      '#f8f8f2', // fg
      '#272822', // bg
      '#ae81ff', // accent (purple)
      '#66d9ef', // link (cyan)
      '#e6db74', // highlight (yellow)
      '#75715e', // muted
      '#3e3d32', // border
      '#1e1f1c', // surface
      '#f92672', // error (red-pink)
      '#a6e22e', // success (green)
    ],
  },
};
