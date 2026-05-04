"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_HEX_ROW_COUNTS = [7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7];
export const DEFAULT_HEX_COLORS = ["#003366", "#336699", "#3366CC", "#003399", "#000099", "#0000CC", "#000066", "#006666", "#006699", "#0099CC", "#0066CC", "#0033CC", "#0000FF", "#3333FF", "#333399", "#669999", "#009999", "#33CCCC", "#00CCFF", "#0099FF", "#0066FF", "#3366FF", "#3333CC", "#666699", "#339966", "#00CC99", "#00FFCC", "#00FFFF", "#33CCFF", "#3399FF", "#6699FF", "#6666FF", "#6600FF", "#6600CC", "#339933", "#00CC66", "#00FF99", "#66FFCC", "#66FFFF", "#66CCFF", "#99CCFF", "#9999FF", "#9966FF", "#9933FF", "#9900FF", "#006600", "#00CC00", "#00FF00", "#66FF99", "#99FFCC", "#CCFFFF", "#CCCCFF", "#CC99FF", "#CC66FF", "#CC33FF", "#CC00FF", "#9900CC", "#003300", "#009933", "#33CC33", "#66FF66", "#99FF99", "#CCFFCC", "#FFFFFF", "#FFCCFF", "#FF99FF", "#FF66FF", "#FF00FF", "#CC00CC", "#660066", "#336600", "#009900", "#66FF33", "#99FF66", "#CCFF99", "#FFFFCC", "#FFCCCC", "#FF99CC", "#FF66CC", "#FF33CC", "#CC0099", "#993399", "#333300", "#669900", "#99FF33", "#CCFF66", "#FFFF99", "#FFCC99", "#FF9999", "#FF6699", "#FF3399", "#CC3399", "#990099", "#666633", "#99CC00", "#CCFF33", "#FFFF66", "#FFCC66", "#FF9966", "#FF6666", "#FF0066", "#CC6699", "#993366", "#999966", "#CCCC00", "#FFFF00", "#FFCC00", "#FF9933", "#FF6600", "#FF5050", "#CC0066", "#660033", "#996633", "#CC9900", "#FF9900", "#CC6600", "#FF3300", "#FF0000", "#CC0000", "#990033", "#663300", "#996600", "#CC3300", "#993300", "#990000", "#800000", "#993333"];

function rowsFromColors(colors: string[], rowCounts = DEFAULT_HEX_ROW_COUNTS) {
  let offset = 0;
  return rowCounts.map((count) => {
    const row = colors.slice(offset, offset + count);
    offset += count;
    return row;
  });
}

export const DEFAULT_HEX_COLOR_ROWS = rowsFromColors(DEFAULT_HEX_COLORS);

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function colorDistance(a: string, b: string) {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  if (!first || !second) return Number.POSITIVE_INFINITY;

  return (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2;
}

function replaceNearestColors(rows: string[][], replacementColors: string[]) {
  const colors = rows.flat();
  const usedIndexes = new Set<number>();

  replacementColors.forEach((replacement) => {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    colors.forEach((color, index) => {
      if (usedIndexes.has(index)) return;
      const distance = colorDistance(color, replacement);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex >= 0) {
      colors[nearestIndex] = replacement;
      usedIndexes.add(nearestIndex);
    }
  });

  return rowsFromColors(colors, rows.map((row) => row.length));
}

export function HexColorPicker({
  activeOwner,
  allowedColors = [],
  ariaLabel = "Hex color picker",
  className,
  colors = DEFAULT_HEX_COLOR_ROWS,
  getColorOwner,
  onChange,
  onColorHover,
  onUnavailableColorSelect,
  replacementColors = [],
  value,
}: {
  activeOwner?: string;
  allowedColors?: string[];
  ariaLabel?: string;
  className?: string;
  colors?: string[][];
  getColorOwner?: (color: string) => string | null;
  onChange: (color: string) => void;
  onColorHover?: (owner: string | null) => void;
  onUnavailableColorSelect?: (color: string, owner: string) => void;
  replacementColors?: string[];
  value: string;
}) {
  const selected = value.toLowerCase();
  const displayColors = replacementColors.length ? replaceNearestColors(colors, replacementColors) : colors;
  const allowed = new Set(allowedColors.map((color) => color.toLowerCase()));

  return (
    <div data-slot="hex-color-picker" className={cn("hex-color-picker", className)} role="group" aria-label={ariaLabel}>
      {displayColors.map((row, rowIndex) => (
        <div key={`hex-color-row-${rowIndex}`} className="hex-color-picker__row">
          {row.map((color, colorIndex) => {
            const active = selected === color.toLowerCase();
            const owner = getColorOwner?.(color) ?? null;
            const unavailable = Boolean(activeOwner && !allowed.has(color.toLowerCase()));
            return (
              <button
                key={`${rowIndex}-${colorIndex}-${color}`}
                type="button"
                className={cn("hex-color-picker__hex", active && "hex-color-picker__hex--active", unavailable && "hex-color-picker__hex--unavailable")}
                style={{ "--hex-color-picker-color": color } as CSSProperties}
                onClick={() => {
                  if (unavailable) {
                    if (owner) onUnavailableColorSelect?.(color, owner);
                    return;
                  }
                  onChange(color);
                }}
                onBlur={() => onColorHover?.(null)}
                onFocus={() => onColorHover?.(unavailable ? owner : null)}
                onMouseEnter={() => onColorHover?.(unavailable ? owner : null)}
                onMouseLeave={() => onColorHover?.(null)}
                aria-label={unavailable && owner ? `Switch to ${owner} and use ${color}` : unavailable ? `${color} is unavailable` : `Use ${color}`}
                aria-pressed={active}
              >
                <span aria-hidden="true">⬢</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
