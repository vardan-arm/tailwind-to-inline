import { formatColor, parseColor } from './colors';

// Tailwind's internal variables (`--tw-*`) are renamed to these markers before inlining,
// so they can be told apart from the user's own CSS variables and resolved per element.
export const TW_PROP_PREFIX = '-tw-';
export const TW_VAR_FUNCTION = '-tw-var';

type FunctionReplacer = (name: string, args: string) => string | undefined;

const findClosingParen = (value: string, openIndex: number): number => {
  let depth = 0;
  let quote = '';

  for (let i = openIndex; i < value.length; i++) {
    const char = value[i];

    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')' && --depth === 0) {
      return i;
    }
  }

  return -1;
};

/**
 * Walks through all the function calls in a CSS value. `replacer` gets the raw arguments
 * and returns the replacement, or `undefined` to keep the function and process its arguments.
 */
export const replaceFunctions = (
  value: string,
  replacer: FunctionReplacer,
): string => {
  let result = '';
  let position = 0;

  while (position < value.length) {
    const open = value.indexOf('(', position);
    const close = open === -1 ? -1 : findClosingParen(value, open);
    if (close === -1) break;

    const before = value.slice(position, open);
    const name = (/[a-z-]+$/i.exec(before)?.[0] ?? '').toLowerCase();
    const args = value.slice(open + 1, close);

    const replacement = name === 'url' ? undefined : replacer(name, args);
    result +=
      replacement !== undefined
        ? before.slice(0, before.length - name.length) + replacement
        : `${before}(${name === 'url' ? args : replaceFunctions(args, replacer)})`;

    position = close + 1;
  }

  return result + value.slice(position);
};

export const splitTopLevel = (
  value: string,
  separator: ',' | ' ',
): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';

  for (const char of value) {
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);

  return parts.map((part) => part.trim()).filter((part) => part !== '');
};

/**
 * Replaces `functionName(--name, fallback)` calls with the variable's value.
 * `lookup` returns `undefined` for unknown variables, in which case the fallback is used.
 * Returns `null` when a variable can't be resolved at all (the declaration is invalid then).
 */
export const resolveVariables = (
  value: string,
  functionName: string,
  lookup: (name: string) => string | undefined,
  depth = 0,
): string | null => {
  if (depth > 20) return null;

  let isValid = true;

  const resolved = replaceFunctions(value, (name, args) => {
    if (name !== functionName) return undefined;

    const commaIndex = args.indexOf(',');
    const variable = (
      commaIndex === -1 ? args : args.slice(0, commaIndex)
    ).trim();
    const fallback = commaIndex === -1 ? undefined : args.slice(commaIndex + 1);

    const source = lookup(variable) ?? fallback;
    const result =
      source === undefined
        ? null
        : resolveVariables(source, functionName, lookup, depth + 1);

    if (result === null) {
      isValid = false;
      return '';
    }
    return result.trim();
  });

  return isValid ? resolved : null;
};

type CalcValue = { value: number; unit: string };

const CALC_NUMBER = /^(infinity|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([a-z%]*)/i;

const formatNumber = (value: number) => String(parseFloat(value.toFixed(4)));

// Evaluates simple `calc()` expressions like "0.25rem * 4". Returns `undefined` if it can't be reduced
// to a single value (e.g. "100% - 1rem").
const evaluateCalc = (expression: string): string | undefined => {
  let position = 0;

  const skipSpaces = () => {
    while (expression[position] === ' ') position++;
  };

  const parseFactor = (): CalcValue => {
    skipSpaces();

    if (expression[position] === '-' || expression[position] === '+') {
      const sign = expression[position++] === '-' ? -1 : 1;
      const operand = parseFactor();
      return { value: sign * operand.value, unit: operand.unit };
    }

    if (expression[position] === '(') {
      position++;
      const inner = parseSum();
      skipSpaces();
      if (expression[position++] !== ')') throw new Error('Expected ")"');
      return inner;
    }

    const match = CALC_NUMBER.exec(expression.slice(position));
    if (!match) throw new Error('Expected a number');
    position += match[0].length;

    return {
      value:
        match[1].toLowerCase() === 'infinity' ? Infinity : parseFloat(match[1]),
      unit: match[2].toLowerCase(),
    };
  };

  const parseProduct = (): CalcValue => {
    let left = parseFactor();

    for (;;) {
      skipSpaces();
      const operator = expression[position];
      if (operator !== '*' && operator !== '/') return left;
      position++;

      const right = parseFactor();
      if (right.unit && (operator === '/' || left.unit)) {
        throw new Error('Unsupported units');
      }

      left = {
        value:
          operator === '*'
            ? left.value * right.value
            : left.value / right.value,
        unit: left.unit || right.unit,
      };
    }
  };

  const parseSum = (): CalcValue => {
    let left = parseProduct();

    for (;;) {
      skipSpaces();
      const operator = expression[position];
      if (operator !== '+' && operator !== '-') return left;
      position++;

      const right = parseProduct();
      if (left.unit !== right.unit) throw new Error('Mismatched units');

      left = {
        value:
          operator === '+'
            ? left.value + right.value
            : left.value - right.value,
        unit: left.unit,
      };
    }
  };

  try {
    const result = parseSum();
    skipSpaces();
    if (position < expression.length || Number.isNaN(result.value)) {
      return undefined;
    }

    // Tailwind uses `infinity` for fully rounded corners
    if (!Number.isFinite(result.value)) {
      return `${result.value > 0 ? 9999 : -9999}${result.unit}`;
    }
    return formatNumber(result.value) + result.unit;
  } catch {
    return undefined;
  }
};

// `color-mix(in oklab, <color> 50%, transparent)` is how Tailwind applies opacity modifiers (e.g. `bg-black/50`)
const simplifyColorMix = (args: string): string | undefined => {
  const [, colorPart, transparentPart] = splitTopLevel(args, ',');
  if (!colorPart || transparentPart !== 'transparent') return undefined;

  const [colorValue, percentage] = splitTopLevel(colorPart, ' ');
  const color = parseColor(colorValue ?? '');
  if (!color || !/^[\d.]+%$/.test(percentage ?? '')) return undefined;

  return formatColor({ ...color, a: (color.a * parseFloat(percentage)) / 100 });
};

const simplifyFunctions = (value: string): string =>
  replaceFunctions(value, (name, rawArgs) => {
    const args = simplifyFunctions(rawArgs);

    switch (name) {
      case 'calc':
        return evaluateCalc(args) ?? `calc(${args})`;
      case 'rgb':
      case 'rgba':
      case 'oklch': {
        const color = parseColor(`${name}(${args})`);
        return color ? formatColor(color) : `${name}(${args})`;
      }
      case 'color-mix':
        return simplifyColorMix(args) ?? `color-mix(${args})`;
      default:
        // Email clients don't support gradient interpolation color spaces ("to right in oklab")
        return name.endsWith('-gradient')
          ? `${name}(${args.replace(/(^|\s)in\s+[a-z\d-]+(\s+(shorter|longer|increasing|decreasing)\s+hue)?/i, '').trim()})`
          : `${name}(${args})`;
    }
  });

const EMPTY_SHADOW = /^(inset\s+)?0 0 (#0000|rgba\(0, 0, 0, 0\))$/;

/**
 * Converts a declaration value to its simplest, most email-friendly form:
 * folds `calc()`, converts colors to hex / `rgba()`, and drops no-op shadows.
 */
export const simplifyValue = (property: string, value: string): string => {
  const simplified = simplifyFunctions(value.replace(/\s+/g, ' ').trim());

  if (property === 'box-shadow') {
    const shadows = splitTopLevel(simplified, ',').filter(
      (shadow) => !EMPTY_SHADOW.test(shadow),
    );
    return shadows.length ? shadows.join(', ') : 'none';
  }

  return simplified;
};
