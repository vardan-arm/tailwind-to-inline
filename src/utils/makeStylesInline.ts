import * as fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import { compile } from 'tailwindcss';

import { TAILWIND_THEME_CSS } from '../generated/tailwindTheme';
import { applySafeClasses } from './safeClasses';
import { flattenTailwindCss, resolveTailwindVariables } from './tailwindCss';
import type {
  PlaceholderValues,
  TMakeStylesInline,
  TMakeStylesInlineFromString,
} from './types';

// Theme variables and utilities only: Tailwind's base styles (preflight) are not needed for emails
const TAILWIND_ENTRY = `
  @layer theme, utilities;
  @layer theme { ${TAILWIND_THEME_CSS} }
  @layer utilities { @tailwind utilities; }
`;

const extractClassNames = (html: string): string[] => {
  const classNames = new Set<string>();
  const regex = /\sclass=(['"])([\s\S]*?)\1/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    match[2].split(/\s+/).forEach((className) => classNames.add(className));
  }
  classNames.delete('');

  return Array.from(classNames);
};

const processTailwindCSS = async (html: string): Promise<string> => {
  const compiler = await compile(TAILWIND_ENTRY);

  return compiler.build(extractClassNames(html));
};

const inlineStyles = async (html: string): Promise<string> => {
  const tailwindCss = await processTailwindCSS(html);
  const { css, initialValues } = flattenTailwindCss(tailwindCss);

  const inlinedHtml = juice(html, {
    extraCss: css,
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    preserveImportant: true,
    inlinePseudoElements: true,
    // juice keeps `:hover`/`:focus` rules from `<style>` tags, but drops them from `extraCss`
    preservedSelectors: juice.ignoredPseudos.map((pseudo) => `:${pseudo}`),
  });

  return resolveTailwindVariables(inlinedHtml, initialValues);
};

const processTemplate = async (
  templateSource: string,
  data?: PlaceholderValues,
): Promise<string> => {
  const template = Handlebars.compile(templateSource);
  const html = template(data);

  const inlinedStyles = await inlineStyles(html);

  return applySafeClasses(inlinedStyles);
};

export const makeStylesInline: TMakeStylesInline = async (
  templatePath,
  data,
) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  return processTemplate(templateSource, data);
};

export const makeStylesInlineFromString: TMakeStylesInlineFromString = async (
  templateString,
  data,
) => {
  return processTemplate(templateString, data);
};
