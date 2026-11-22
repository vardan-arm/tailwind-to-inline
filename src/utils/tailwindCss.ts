import postcss, {
  AtRule,
  ChildNode,
  Container,
  Declaration,
  Rule,
} from 'postcss';

import {
  replaceFunctions,
  resolveVariables,
  simplifyValue,
  splitTopLevel,
  TW_PROP_PREFIX,
  TW_RULE_MARKER,
  TW_VAR_FUNCTION,
} from './cssValues';

type Variables = Map<string, string>;

const TW_VARIABLE = /^--tw-/;

const PHYSICAL_SIDES = {
  inline: ['left', 'right'],
  block: ['top', 'bottom'],
} as const;

const LOGICAL_PROPERTY =
  /^(margin|padding|inset|border)-(inline|block)(?:-(start|end))?(?:-(width|style|color))?$/;

const LOGICAL_RADIUS: Record<string, string> = {
  'border-start-start-radius': 'border-top-left-radius',
  'border-start-end-radius': 'border-top-right-radius',
  'border-end-start-radius': 'border-bottom-left-radius',
  'border-end-end-radius': 'border-bottom-right-radius',
};

// Tailwind v4 uses logical properties (e.g. `padding-inline` for `px-4`), which have poor support
// in email clients. Left-to-right direction is assumed.
const toPhysicalDeclarations = (
  property: string,
  value: string,
): [string, string][] => {
  if (LOGICAL_RADIUS[property]) return [[LOGICAL_RADIUS[property], value]];

  const match = LOGICAL_PROPERTY.exec(property);
  if (!match) return [[property, value]];

  const [, base, axis, edge, suffix] = match;
  const [start, end] = PHYSICAL_SIDES[axis as keyof typeof PHYSICAL_SIDES];
  const toProperty = (side: string) =>
    [base === 'inset' ? '' : base, side, suffix].filter(Boolean).join('-');

  if (edge) return [[toProperty(edge === 'start' ? start : end), value]];

  const values = splitTopLevel(value, ' ');
  const [startValue, endValue] = values.length === 2 ? values : [value, value];

  return [
    [toProperty(start), startValue],
    [toProperty(end), endValue],
  ];
};

// "(width >= 48rem)" -> "(min-width: 48rem)", as email clients don't support the range syntax
const toLegacyMediaQuery = (params: string): string =>
  params.replace(
    /\(\s*(width|height)\s*(>=|<=|>|<)\s*([\d.]+)([a-z]+)\s*\)/g,
    (_match, dimension, operator, rawValue, unit) => {
      const isExclusive = operator === '>' || operator === '<';
      const isMin = operator.startsWith('>');
      const step = !isExclusive ? 0 : unit === 'px' ? 0.02 : 0.01;
      const value = parseFloat(
        (parseFloat(rawValue) + (isMin ? step : -step)).toFixed(4),
      );

      return `(${isMin ? 'min' : 'max'}-${dimension}: ${value}${unit})`;
    },
  );

const HOVER_MEDIA_FEATURE = /^\(\s*hover\s*:\s*hover\s*\)$/;

const splitMediaConditions = (params: string): string[] =>
  params.split(/\s+and\s+/).map((condition) => condition.trim());

// Turns nested `@media` rules into a flat list with combined conditions
const flattenMedia = (media: AtRule): AtRule[] => {
  const flattened: AtRule[] = [];
  let current: AtRule | undefined;

  media.each((child) => {
    if (child.type === 'atrule' && child.name === 'media') {
      current = undefined;
      for (const nested of flattenMedia(child)) {
        nested.params = `${media.params} and ${nested.params}`;
        flattened.push(nested);
      }
      return;
    }

    if (!current) {
      current = media.clone({ nodes: [] });
      flattened.push(current);
    }
    current.append(child.clone());
  });

  return flattened;
};

const isKeyframe = (rule: Rule) =>
  rule.parent?.type === 'atrule' &&
  /keyframes$/i.test((rule.parent as AtRule).name);

const collectDeclarations = (container: Container): Variables => {
  const variables: Variables = new Map();
  container.walkDecls((declaration) => {
    variables.set(declaration.prop, declaration.value);
  });
  return variables;
};

const flattenStructure = (root: postcss.Root) => {
  const theme: Variables = new Map();
  const initialValues: Variables = new Map();

  root.walkAtRules('property', (property) => {
    const initialValue = collectDeclarations(property).get('initial-value');
    if (initialValue !== undefined) {
      initialValues.set(property.params.trim(), initialValue);
    }
    property.remove();
  });

  root.each((node) => {
    if (node.type !== 'atrule' || node.name !== 'layer') return;
    const layer = node.params.trim();

    if (layer === 'theme') {
      collectDeclarations(node).forEach((value, name) =>
        theme.set(name, value),
      );
    }

    // The "properties" layer only has fallbacks for browsers without `@property` support
    if (!node.nodes || layer === 'theme' || layer === 'properties') {
      node.remove();
    } else {
      node.replaceWith(node.nodes);
    }
  });

  // Progressive enhancements nested in a rule or a media query (e.g. `@supports (color: color-mix(...))`):
  // the rule itself, or the one before it in the media query, already has the widely supported version.
  // juice can't parse `@supports` nested in `@media` either, and breaks the whole `<style>` tag.
  root.walkAtRules((atRule) => {
    const isNestedSupports =
      atRule.name === 'supports' && atRule.parent?.type === 'atrule';
    if (atRule.parent?.type === 'rule' || isNestedSupports) atRule.remove();
  });

  root.each((node) => {
    if (node.type === 'atrule' && node.name === 'media') {
      node.replaceWith(flattenMedia(node));
    }
  });

  root.walkAtRules('media', (media) => {
    // Tailwind wraps `hover:` rules in `@media (hover: hover)`, which Gmail drops together with the rules in it
    const params = splitMediaConditions(media.params).filter(
      (condition) => !HOVER_MEDIA_FEATURE.test(condition),
    );

    if (params.length === 0) {
      media.replaceWith(media.nodes ?? []);
    } else {
      media.params = toLegacyMediaQuery(params.join(' and '));
    }
  });

  return { theme, initialValues };
};

// Replaces theme variables with their values and marks Tailwind's internal ones.
// Other variables (i.e. user-defined ones) are left untouched.
const resolveThemeVariables = (
  value: string,
  theme: Variables,
  depth = 0,
): string =>
  replaceFunctions(value, (name, args) => {
    if (name !== 'var') return undefined;

    const commaIndex = args.indexOf(',');
    const variable = (
      commaIndex === -1 ? args : args.slice(0, commaIndex)
    ).trim();

    const themeValue = theme.get(variable);
    if (themeValue !== undefined && depth < 20) {
      return resolveThemeVariables(themeValue, theme, depth + 1);
    }

    const fallback =
      commaIndex === -1
        ? ''
        : `,${resolveThemeVariables(args.slice(commaIndex + 1), theme, depth)}`;

    return `${TW_VARIABLE.test(variable) ? TW_VAR_FUNCTION : 'var'}(${variable}${fallback})`;
  });

/**
 * Converts the CSS generated by Tailwind v4 (cascade layers, theme variables, `oklch()` colors, logical properties)
 * to flat CSS that can be inlined. Theme variables are resolved here. Tailwind's internal `--tw-*` variables
 * depend on the combination of classes an element has, so they're kept as markers for `resolveTailwindVariables`.
 */
export const flattenTailwindCss = (css: string) => {
  const root = postcss.parse(css);
  const { theme, initialValues } = flattenStructure(root);

  // juice treats escaped commas (e.g. in `text-[rgb(1,2,3)]`) as selector separators
  root.walkRules((rule) => {
    rule.selector = rule.selector.replace(/\\,/g, '\\2c ');
  });

  root.walkDecls((declaration) => {
    const value = resolveThemeVariables(declaration.value, theme);

    if (TW_VARIABLE.test(declaration.prop)) {
      declaration.prop = declaration.prop.replace('--tw-', TW_PROP_PREFIX);
      declaration.value = value;
      return;
    }

    declaration.replaceWith(
      toPhysicalDeclarations(declaration.prop, value).map(
        ([prop, physicalValue]) =>
          declaration.clone({
            prop,
            value: simplifyValue(prop, physicalValue),
          }),
      ),
    );
  });

  root.walkRules((rule) => {
    if (!isKeyframe(rule)) rule.append({ prop: TW_RULE_MARKER, value: '1' });
  });

  return { css: root.toString(), initialValues };
};

const resolveDeclarations = (
  container: Container<ChildNode>,
  initialValues: Variables,
) => {
  const declarations = (container.nodes ?? []).filter(
    (node): node is Declaration => node.type === 'decl',
  );

  const variables: Variables = new Map(initialValues);
  for (const { prop, value } of declarations) {
    if (prop.startsWith(TW_PROP_PREFIX)) {
      variables.set(prop.replace(TW_PROP_PREFIX, '--tw-'), value);
    }
  }

  for (const declaration of declarations) {
    const value = declaration.prop.startsWith(TW_PROP_PREFIX)
      ? null
      : resolveVariables(declaration.value, TW_VAR_FUNCTION, (name) =>
          variables.get(name),
        );

    if (value === null || value.trim() === '') {
      declaration.remove();
    } else {
      declaration.value = simplifyValue(declaration.prop, value);
    }
  }
};

// Inline styles win over `<style>` rules, so the Tailwind rules left there (media queries, `:focus`, etc.)
// need `!important`. Gmail only accepts it in lowercase, and Outlook needs the space before it.
const markImportant = (rule: Rule) => {
  rule.walkDecls((declaration) => {
    declaration.important = true;
    declaration.raws.important = ' !important';
  });
};

// Rules that only set `--tw-*` variables end up empty, and so may the at-rules containing them
const removeEmptyBlocks = (container: Container) => {
  container.each((node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    if (node.nodes) removeEmptyBlocks(node);
    if (node.nodes?.length === 0) node.remove();
  });
};

/**
 * Resolves the `--tw-*` variable markers in the inlined HTML: for each element (and each rule left in `<style>` tags)
 * the values come from the element's own declarations, falling back to the variable's initial value.
 */
export const resolveTailwindVariables = (
  html: string,
  initialValues: Variables,
): string => {
  const process = (css: string, transform: (root: postcss.Root) => string) => {
    if (!css.includes(TW_PROP_PREFIX)) return css;

    try {
      return transform(postcss.parse(css));
    } catch {
      return css;
    }
  };

  return html
    .replace(
      /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_match, open, css, close) => {
        const resolved = process(css, (root) => {
          root.walkRules((rule) => {
            const isTailwindRule = rule.some(
              (node) => node.type === 'decl' && node.prop === TW_RULE_MARKER,
            );
            resolveDeclarations(rule, initialValues);
            if (isTailwindRule) markImportant(rule);
          });
          removeEmptyBlocks(root);
          return root.toString();
        });
        return resolved.trim() ? open + resolved + close : '';
      },
    )
    .replace(/(\sstyle=")([^"]*)(")/g, (_match, open, css, close) => {
      const resolved = process(css, (root) => {
        resolveDeclarations(root, initialValues);
        return root.nodes
          .filter((node): node is Declaration => node.type === 'decl')
          .map(
            ({ prop, value, important }) =>
              `${prop}: ${value}${important ? ' !important' : ''};`,
          )
          .join(' ');
      });
      return open + resolved + close;
    });
};
