import postcss from 'postcss';

type RenameMap = Map<string, string>;

// Maizzle's default "safe class names" map. Gmail drops the whole `<style>` tag
// when a selector has escaped characters (e.g. `.md\:p-4`), so these are renamed.
const SAFE_REPLACEMENTS: Record<string, string> = {
  ':': '-',
  '/': '-',
  '\\': '-',
  '%': 'pc',
  '.': '_',
  ',': '_',
  '#': '_',
  '[': '',
  ']': '',
  '(': '',
  ')': '',
  '{': '',
  '}': '',
  '!': '-i',
  '&': 'and-',
  '|': 'or-',
  '@': 'at-',
  '?': 'q-',
  '<': 'lt-',
  '=': 'eq-',
  '>': 'gt-',
  '"': '-',
  "'": '-',
  '*': '-',
  '+': '-',
  ';': '-',
  '^': '-',
  '`': '-',
  '~': '-',
  $: '-',
};

const STYLE_TAG = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi;

// Quoted strings (e.g. in attribute selectors) are matched only to be skipped
const SELECTOR_CLASS =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\.((?:[\w-]|[^\x00-\x7f]|\\[\da-f]{1,6}[ \t\r\n\f]?|\\[^\da-f\r\n\f])+)/gi;

// An opening tag, allowing `>` inside quoted attribute values
const OPENING_TAG = /<[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;

const CLASS_ATTRIBUTE = /\s+class=(["'])([\s\S]*?)\1/i;

const HTML_ENTITY = /&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const fromCodePoint = (codePoint: number) =>
  codePoint > 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : '\ufffd';

// `md\:p-4` -> `md:p-4`, `rgb\(1\2c 2\)` -> `rgb(1,2)`
const unescapeIdentifier = (identifier: string): string =>
  identifier.replace(
    /\\([\da-f]{1,6})[ \t\r\n\f]?|\\([\s\S])/gi,
    (_match, hex, char) => (hex ? fromCodePoint(parseInt(hex, 16)) : char),
  );

const decodeEntities = (value: string): string =>
  value.replace(HTML_ENTITY, (_match, hex, decimal, name) =>
    name
      ? NAMED_ENTITIES[name.toLowerCase()]
      : fromCodePoint(parseInt(hex ?? decimal, hex ? 16 : 10)),
  );

const toSafeClassName = (className: string): string => {
  const safe = className.replace(
    /[^\w-]/g,
    (char) => SAFE_REPLACEMENTS[char] ?? char,
  );

  // Class selectors can't start with a digit (e.g. `2xl:p-4`)
  return /^-?\d/.test(safe) || /^-?$/.test(safe) ? `_${safe}` : safe;
};

const replaceClassSelectors = (
  selector: string,
  replacer: (className: string) => string,
): string =>
  selector.replace(SELECTOR_CLASS, (match, quoted, escaped) =>
    quoted ? match : `.${replacer(unescapeIdentifier(escaped))}`,
  );

const walkStyleRules = (
  html: string,
  callback: (rule: postcss.Rule) => void,
): string =>
  html.replace(STYLE_TAG, (match, open, css, close) => {
    try {
      const root = postcss.parse(css);
      root.walkRules(callback);
      return open + root.toString() + close;
    } catch {
      return match;
    }
  });

const collectStyleClasses = (html: string): string[] => {
  const classNames = new Set<string>();
  walkStyleRules(html, (rule) => {
    replaceClassSelectors(rule.selector, (className) => {
      classNames.add(className);
      return className;
    });
  });
  return Array.from(classNames);
};

// Classes that are already safe keep their names; renamed ones get a suffix on collisions
const buildRenameMap = (classNames: string[]): RenameMap => {
  const renames: RenameMap = new Map();
  const usedNames = new Set(
    classNames.filter((className) => toSafeClassName(className) === className),
  );

  for (const className of classNames) {
    const safeName = toSafeClassName(className);
    if (safeName === className) {
      renames.set(className, className);
      continue;
    }

    let name = safeName;
    for (let index = 2; usedNames.has(name); index++) {
      name = `${safeName}-${index}`;
    }
    usedNames.add(name);
    renames.set(className, name);
  }

  return renames;
};

const updateClassAttributes = (html: string, renames: RenameMap): string =>
  html.replace(OPENING_TAG, (tag) =>
    tag.replace(CLASS_ATTRIBUTE, (_match, _quote, value: string) => {
      const classNames = decodeEntities(value)
        .split(/\s+/)
        .filter((className) => renames.has(className))
        .map((className) => renames.get(className));
      const unique = Array.from(new Set(classNames));

      return unique.length ? ` class="${unique.join(' ')}"` : '';
    }),
  );

/**
 * Keeps only the classes that rules left in `<style>` tags (media queries, `:hover`, etc.) still need,
 * renamed to email-safe names in both the selectors and the `class` attributes. Other classes are removed.
 */
export const applySafeClasses = (html: string): string => {
  const renames = buildRenameMap(collectStyleClasses(html));

  const renamedHtml = renames.size
    ? walkStyleRules(html, (rule) => {
        rule.selector = replaceClassSelectors(
          rule.selector,
          (className) => renames.get(className) ?? className,
        );
      })
    : html;

  return updateClassAttributes(renamedHtml, renames);
};
