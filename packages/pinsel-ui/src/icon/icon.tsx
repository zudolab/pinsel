import { h, type Child } from "@takazudo/zfb/zudo-react";

// Drawings are the approved prototype's `icons.py` (24×24 grid, currentColor,
// 1.7 stroke). Every icon is decorative; the surrounding control carries the name.
const ICON_PATHS = {
  "arrow-right": [["path", { d: "M4.75 12h14.5M13 5.75 19.25 12 13 18.25" }]],
  "arrow-up-right": [["path", { d: "M6.75 17.25 17.25 6.75M6.75 6.75h10.5v10.5" }]],
  "arrow-up": [["path", { d: "M12 19.25V4.75M5.75 11 12 4.75 18.25 11" }]],
  "arrow-left": [["path", { d: "M19.25 12H4.75M11 5.75 4.75 12 11 18.25" }]],
  "chevron-right": [["path", { d: "m9 5.75 6.25 6.25L9 18.25" }]],
  "chevron-down": [["path", { d: "m5.75 9 6.25 6.25L18.25 9" }]],
  mail: [
    ["rect", { x: "3.5", y: "5.5", width: "17", height: "13", rx: "1.5" }],
    ["path", { d: "m4.25 6.5 7.75 6 7.75-6" }],
  ],
  instagram: [
    ["rect", { x: "3.5", y: "3.5", width: "17", height: "17", rx: "4.75" }],
    ["circle", { cx: "12", cy: "12", r: "4" }],
    ["circle", { cx: "17.25", cy: "6.75", r: "1", fill: "currentColor", stroke: "none" }],
  ],
  home: [
    ["path", { d: "m3.5 10.25 8.5-7 8.5 7M5.5 8.75V20h13V8.75" }],
    ["path", { d: "M9.5 20v-6.5h5V20" }],
  ],
  menu: [["path", { d: "M4 7h16M4 12h16M4 17h16" }]],
  close: [["path", { d: "m6 6 12 12M18 6 6 18" }]],
  check: [["path", { d: "m5 12.5 4.5 4.5L19 7.5" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  minus: [["path", { d: "M5 12h14" }]],
  contents: [
    ["path", { d: "M9 6h11M9 12h11M9 18h11" }],
    ["circle", { cx: "4.25", cy: "6", r: ".85", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "4.25", cy: "12", r: ".85", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "4.25", cy: "18", r: ".85", fill: "currentColor", stroke: "none" }],
  ],
  play: [["path", { d: "m8 5.25 10.25 6.75L8 18.75Z" }]],
  pause: [
    ["rect", { x: "6.5", y: "5", width: "3.5", height: "14", rx: ".65" }],
    ["rect", { x: "14", y: "5", width: "3.5", height: "14", rx: ".65" }],
  ],
  motion: [["path", { d: "M3 8.5c3-3 6-3 9 0s6 3 9 0M3 15.5c3-3 6-3 9 0s6 3 9 0" }]],
} as const satisfies Record<string, readonly (readonly [string, Record<string, string>])[]>;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  class?: string;
}

export function Icon({ name, class: extra }: IconProps): Child {
  const drawing = ICON_PATHS[name];
  return h(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      class: `ui-icon ui-icon--${name}${extra ? ` ${extra}` : ""}`,
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.7",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    ...drawing.map(([tag, attributes]) => h(tag, attributes)),
  );
}
