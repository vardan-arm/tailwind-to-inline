import * as fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';

import { rgbToHex } from './rgbToHex';

type TMakeStylesInline = (
  templatePath: string,
  placeholderValues?: { [key: string]: string },
) => Promise<string>;

const processTailwindCSS = async (html: string): Promise<string> => {
  const tempFilePath = path.join(__dirname, 'temp.html');
  fs.writeFileSync(tempFilePath, html);

  const tailwindConfig = {
    content: [tempFilePath],
    corePlugins: {
      preflight: false,
    },
  };

  const result = await postcss([
    tailwindcss(tailwindConfig),
    autoprefixer,
  ]).process('@tailwind components; @tailwind utilities;', {
    from: undefined,
  });

  fs.unlinkSync(tempFilePath);
  return result.css;
};

const simplifyColors = (css: string): string => {
  // Remove CSS variables coming from Tailwind (starting with "--tw-...")
  const generalSimplifications = css
    .replace(/rgb\(([^)]+)\) \/ var\(--tw-[^)]+\)/g, 'rgb($1)')
    .replace(
      /rgba\(([^,]+),([^,]+),([^,]+),var\(--tw-[^)]+\)\)/g,
      'rgba($1,$2,$3,1)',
    )
    .replace(/var\(--tw-[^)]+\)/g, '1')
    .replace(/--tw-[^:]+:[^;]+;/g, '');

  // Since email agents like Gmail don't allow using `rgb()` colors, we replace them with their `hex` counterparts
  const hexColorsInsteadOfRgb = generalSimplifications.replaceAll(
    /(rgba?\(\d+\s+\d+\s+\d+\s*\/.*\))/g,
    (match) => {
      return rgbToHex(match);
    },
  );

  return hexColorsInsteadOfRgb;
};

const removeCssClasses = (css: string) => {
  return css.replaceAll(/\s*class=["'][^"']*["']/g, '');
}

const inlineStyles = async (html: string): Promise<string> => {
  const tailwindCss = await processTailwindCSS(html);
  const simplifiedCss = simplifyColors(tailwindCss);

  return juice(html, {
    extraCss: simplifiedCss,
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    preserveImportant: true,
    inlinePseudoElements: true,
  });
};

export const makeStylesInline: TMakeStylesInline = async (
  templatePath,
  data,
) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template(data);

  const inlinedStyles = await inlineStyles(html);

  return removeCssClasses(inlinedStyles);
};
