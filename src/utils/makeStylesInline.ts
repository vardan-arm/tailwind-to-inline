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

const inlineStyles = async (html: string) => {
  // Process Tailwind CSS
  const tailwindCss = await processTailwindCSS(html);

  // Use juice to inline the styles
  const inlinedHtml = juice.inlineContent(html, tailwindCss, {
    inlinePseudoElements: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    applyStyleTags: true,
    removeStyleTags: true,
    insertPreservedExtraCss: true,
    extraCss: tailwindCss
  });

  return inlinedHtml;
}

export const makeStylesInline: TMakeStylesInline = async (templatePath, data) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template(data);
  return await inlineStyles(html);
}
