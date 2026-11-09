import type { SVGProps } from "react";

const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  face: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8 M9 9.5h.01 M15 9.5h.01",
  gamepad:
    "M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7.2 2.4L14 14h-4l-.8 1.4A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4z M7 10v4 M5 12h4 M16 11h.01 M18 13h.01",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  wrench: "M14 7l3-3 3 3-3 3 M17 10l-9.5 9.5a2.1 2.1 0 0 1-3-3L14 7",
  sparkles:
    "M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  gear: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M12 2v3 M12 19v3 M4.9 4.9 7 7 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1 7 17 M17 7l2.1-2.1",
  info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 11v5 M12 8h.01",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4",
  logout: "M9 4H5v16h4 M16 8l4 4-4 4 M20 12H9",
  login: "M15 4h4v16h-4 M10 8l4 4-4 4 M14 12H3",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  send: "M4 12 20 4l-6 16-2-7z",
  check: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12 M18 6 6 18",
  pencil: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  save: "M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6",
  upload: "M12 16V4 M7 9l5-5 5 5 M5 20h14",
  wifiOff: "M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 5.2-2.8 M19 12.5a10 10 0 0 0-2.3-1.7 M12 20h.01",
  live: "M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z M7.8 16.2a6 6 0 0 1 0-8.4 M16.2 7.8a6 6 0 0 1 0 8.4",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  undo: "M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3",
  dice: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01",
  palette:
    "M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.9-.4-1.2.5-2.1 1.7-2.1H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01 M17 11h.01",
  download: "M12 4v12 M7 11l5 5 5-5 M5 20h14",
  reset: "M4 12a8 8 0 1 0 2.3-5.7L4 8.6 M4 4v4.6h4.6",
  maximize: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5",
  play: "M7 5l12 7-12 7z",
  pause: "M8 5v14 M16 5v14",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  mouth: "M5 10q7 8 14 0",
  hat: "M4 18h16 M6 18c0-6 2.5-11 6-11s6 5 6 11",
  layers: "M12 3 2 8l10 5 10-5z M2 13l10 5 10-5 M2 17.5l10 5 10-5",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  back: "M19 12H5 M11 6l-6 6 6 6",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z M3 7.5l9 4.5 9-4.5 M12 12v9",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M20 20l-4-4",
  plus: "M12 5v14 M5 12h14",
  chevron: "M9 6l6 6-6 6",
  bulb: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
