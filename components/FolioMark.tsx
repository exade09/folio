export function FolioMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="9" width="26" height="19" rx="2.5" className="fill-[var(--cabinet-blue)]" />
      <path
        d="M3 11.5C3 10.1193 4.11929 9 5.5 9H12.5L15 12H26.5C27.8807 12 29 13.1193 29 14.5V25.5C29 26.8807 27.8807 28 26.5 28H5.5C4.11929 28 3 26.8807 3 25.5V11.5Z"
        className="fill-[var(--brass)]"
        fillOpacity="0.9"
      />
      <line x1="8" y1="17" x2="24" y2="17" stroke="var(--paper)" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="8" y1="21" x2="20" y2="21" stroke="var(--paper)" strokeWidth="1.4" strokeOpacity="0.5" />
    </svg>
  );
}
