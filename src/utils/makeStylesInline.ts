import * as fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';

type TMakeStylesInline = (
  template: string,
  placeholderValues?: { [key: string]: string }
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
    // ]).process('@tailwind base; @tailwind components; @tailwind utilities;', {
  ]).process('@tailwind components; @tailwind utilities;', {
    from: undefined,
  });

  fs.unlinkSync(tempFilePath);
  return result.css;
};

const simplifyColors = (css: string): string => {
  const generalSimplifications = css
    .replace(/rgb\(([^)]+)\) \/ var\(--tw-[^)]+\)/g, 'rgb($1)')
    .replace(/rgba\(([^,]+),([^,]+),([^,]+),var\(--tw-[^)]+\)\)/g, 'rgba($1,$2,$3,1)')
    .replace(/var\(--tw-[^)]+\)/g, '1')
    .replace(/--tw-[^:]+:[^;]+;/g, '')

  // The following is done in particular for Gmail, as it strips the inline styling when meets `rgba` colors
    const moreSimplifications = generalSimplifications
      // .replace(/\s\//, ',')
      // .replace(/(rgb[a]?)/, 'rgb')
      // .replace(/[\d]+[\s]+[\d]+[\s]+[\d]+[\s]+(\/[\s]+\d)/, ''); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      // .replace(/([\d]+[\s]+[\d]+[\s]+[\d]+[\s]+)(\/[\s]+\d)/, '$1'); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      // .replace(/([\d]+[\s]+[\d]+[\s]+[\d]+[\s]+)(\/[\s]+\d)/, '$1'); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`

      // strip the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      .replace(/rgba?\((\d+)\s+(\d+)\s+(\d+)\s*\/.*\)/, 'rgb($1 $2 $3)');

  return moreSimplifications;
};

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

export const makeStylesInline: TMakeStylesInline = async (templatePath, data) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template(data);
  return inlineStyles(html);
};
