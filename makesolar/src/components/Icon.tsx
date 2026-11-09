const PATHS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  undo: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  clear: "M6 6l12 12M18 6L6 18",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  warn: "M12 4l9 16H3zM12 10v4M12 17.5v.01",
  download: "M12 4v11M7 10.5l5 5 5-5M5 20h14",
  upload: "M12 16V5M7 9.5l5-5 5 5M5 20h14",
  print: "M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-6a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1h-2M7 14h10v6H7z",
  chevron: "M6 9l6 6 6-6",
  hide: "M3 3l18 18M10.6 5.1A10 10 0 0112 5c5 0 9 4.5 10 7a13 13 0 01-2.6 3.6M6.3 6.4C4 7.8 2.6 10 2 12c1 2.5 5 7 10 7a9.6 9.6 0 004.6-1.2M9.9 9.9a3 3 0 004.2 4.2",
  menu: "M4 7h16M4 12h16M4 17h16",
} as const;

export type IconName = keyof typeof PATHS;

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export default Icon;
