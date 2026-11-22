export type Rgba = { r: number; g: number; b: number; a: number };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

// Parses "50%" or "0.5" into a 0..1 number
const parseAlpha = (raw: string | undefined): number | null => {
  if (raw === undefined) return 1;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return null;
  return clamp(raw.trim().endsWith('%') ? value / 100 : value, 0, 1);
};

// Splits "62.3% 0.214 259.815 / 50%" or "59, 130, 246, 0.5" into channels and alpha
const splitChannels = (args: string): string[] | null => {
  const parts = args
    .replace(/[,/]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => (part === 'none' ? '0' : part));

  const isNumeric = parts.every((part) =>
    /^[-+]?(\d+\.?\d*|\.\d+)(%|deg)?$/.test(part),
  );
  return isNumeric && (parts.length === 3 || parts.length === 4) ? parts : null;
};

const parseHex = (hex: string): Rgba | null => {
  if (!/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return null;

  let digits = hex.slice(1);
  if (digits.length <= 4) {
    digits = digits.replace(/./g, (char) => char + char);
  }

  const channel = (index: number) =>
    parseInt(digits.slice(index, index + 2), 16);
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: digits.length === 8 ? channel(6) / 255 : 1,
  };
};

const parseRgb = (args: string): Rgba | null => {
  const parts = splitChannels(args);
  if (!parts) return null;

  const [r, g, b] = parts.slice(0, 3).map((part) => {
    const value = parseFloat(part);
    return clamp(Math.round(part.endsWith('%') ? value * 2.55 : value), 0, 255);
  });
  const a = parseAlpha(parts[3]);

  return a === null ? null : { r, g, b, a };
};

// Tailwind v4 defines its palette in OKLCH, which email clients don't understand.
// Out-of-gamut channels are clipped, the same way browsers render them.
const parseOklch = (args: string): Rgba | null => {
  const parts = splitChannels(args);
  if (!parts) return null;

  const lightness = parseFloat(parts[0]) / (parts[0].endsWith('%') ? 100 : 1);
  const chroma = parseFloat(parts[1]) * (parts[1].endsWith('%') ? 0.004 : 1);
  const hue = (parseFloat(parts[2]) * Math.PI) / 180;
  const alpha = parseAlpha(parts[3]);
  if (alpha === null) return null;

  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const [red, green, blue] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((linear) => {
    const clipped = clamp(linear, 0, 1);
    const encoded =
      clipped <= 0.0031308
        ? 12.92 * clipped
        : 1.055 * clipped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  });

  return { r: red, g: green, b: blue, a: alpha };
};

export const parseColor = (color: string): Rgba | null => {
  const value = color.trim();
  if (value.startsWith('#')) return parseHex(value);

  const match = /^(rgba?|oklch)\(([\s\S]*)\)$/i.exec(value);
  if (!match) return null;

  return match[1].toLowerCase() === 'oklch'
    ? parseOklch(match[2])
    : parseRgb(match[2]);
};

// Opaque colors become hex and translucent ones become legacy `rgba()`,
// as these are the notations email clients support best.
export const formatColor = ({ r, g, b, a }: Rgba): string => {
  if (a >= 1) {
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(3))})`;
};
