import { getTeamCountryCode } from "@/lib/team-country-codes";

interface FlagProps {
  /** Either an ISO 3166-1 alpha-2 country code (e.g. "BR") or a team/country name. */
  code?: string;
  team?: string;
  /** Fallback emoji to render if no SVG flag is available (e.g. for "TBD"). */
  fallbackEmoji?: string;
  className?: string;
  /** Approximate height in pixels — width auto-derives from 4:3 flag aspect. */
  size?: number;
  rounded?: boolean;
  title?: string;
}

/**
 * Renders a crisp SVG flag from `country-flag-icons` (1x1 PNG-style assets via SVG sprite).
 * Falls back to the provided emoji if no ISO code can be resolved.
 */
export function Flag({
  code,
  team,
  fallbackEmoji,
  className = "",
  size = 32,
  rounded = true,
  title,
}: FlagProps) {
  const resolved = (code ?? (team ? getTeamCountryCode(team) : null))?.toUpperCase();
  const label = title ?? team ?? code ?? "Flag";

  if (!resolved) {
    return (
      <span
        className={className}
        style={{ fontSize: size }}
        role="img"
        aria-label={label}
      >
        {fallbackEmoji ?? "🏳️"}
      </span>
    );
  }

  const url = `https://purecatamphetamine.github.io/country-flag-icons/3x2/${resolved}.svg`;

  return (
    <img
      src={url}
      alt={label}
      title={label}
      width={Math.round(size * 1.5)}
      height={size}
      loading="lazy"
      className={`inline-block object-cover shadow-sm ring-1 ring-black/10 ${
        rounded ? "rounded-md" : ""
      } ${className}`}
      style={{ height: size, width: Math.round(size * 1.5) }}
    />
  );
}
