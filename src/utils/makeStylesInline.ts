import fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import postcss from 'postcss';
import path from 'path';
import tailwindcss from 'tailwindcss';

type TMakeStylesInline = (
  template: string,
  placeholderValues?: { [key: string]: string }
) => Promise<string>;

const processTailwindCSS = async (html: string) => {
  // Write the HTML to a temporary file
  const tempFilePath = path.join(__dirname, 'temp.html');
  fs.writeFileSync(tempFilePath, html);

  // Process the CSS with Tailwind and Autoprefixer
  const result = await postcss([
    tailwindcss({
      content: [tempFilePath],
      // Disable Preflight (Tailwind's base styles)
      corePlugins: {
        preflight: false,
      },
    }),
  ]).process('@tailwind components; @tailwind utilities;', {
    from: undefined
  });

  // Remove the temporary file
  fs.unlinkSync(tempFilePath);

  return result.css;
}

const simplifyColors = (css: string): string => {
  // Convert rgb() / var(--tw-*) format to simple rgb()
  css = css.replace(/rgb\(([^)]+)\) \/ var\(--tw-[^)]+\)/g, 'rgb($1)');

  // Convert rgba() with var(--tw-*) to simple rgba()
  css = css.replace(/rgba\(([^,]+), ([^,]+), ([^,]+), var\(--tw-[^)]+\)\)/g, 'rgba($1, $2, $3, 1)');

  // Remove all --tw-* variable declarations
  css = css.replace(/--tw-[^:]+:[^;]+;/g, '');

  return css;
}

const inlineStyles = async (html: string) => {
  let tailwindCss = await processTailwindCSS(html);
  tailwindCss = simplifyColors(tailwindCss);

  const inlinedHtml = juice.inlineContent(html, tailwindCss, {
    inlinePseudoElements: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    applyStyleTags: true,
    removeStyleTags: true,
    insertPreservedExtraCss: true,
    extraCss: tailwindCss
  });

  // Final pass to clean up any remaining complex color formats
  return inlinedHtml.replace(/style="([^"]*)"/g, (match, styles) => {
    const cleanedStyles = styles
      .split(';')
      .map((style: string) => {
        const [property, value] = style.split(':').map(s => s.trim());
        if (value && value.includes('var(--tw-')) {
          // If the value contains a Tailwind CSS variable, simplify it
          return `${property}: ${value.replace(/var\(--tw-[^)]+\)/, '1')}`;
        }
        return style;
      })
      .filter(Boolean)
      .join(';');
    return `style="${cleanedStyles}"`;
  });
}

export const makeStylesInline: TMakeStylesInline = async (templatePath, data) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template(data);
  return await inlineStyles(html);
}
