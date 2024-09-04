"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgbToHex = void 0;
const rgbToHex = (rgb) => {
    // const trimmedRgb = rgb.trim();
    // Regular expression to match RGB(A) values
    const rgbRegex = /rgba?\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*(?:,?\s*\/?\s*(?:\d*\.?\d+)?)?\)/i;
    const match = rgb.match(rgbRegex);
    if (!match) {
        throw new Error('Invalid RGB string format');
    }
    // Extract RGB values
    const [, r, g, b] = match.map(Number);
    // Ensure values are within 0-255 range
    const clamp = (value) => Math.max(0, Math.min(255, value));
    // Convert to hex
    const toHex = (value) => clamp(value).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
exports.rgbToHex = rgbToHex;
// Example usage:
console.log((0, exports.rgbToHex)('rgb(59, 130, 246)')); // Output: #3b82f6
console.log((0, exports.rgbToHex)('rgb(59 130 246 / 1)')); // Output: #3b82f6
console.log((0, exports.rgbToHex)('rgba(59 130 246 / 1)')); // Output: #3b82f6
