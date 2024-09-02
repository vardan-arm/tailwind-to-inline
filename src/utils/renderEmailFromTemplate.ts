import * as fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import cheerio from 'cheerio';
// import postcss from 'postcss';
import postcss from 'postcss';
import path from "node:path";
import tailwindcss from "tailwindcss";

type TRenderEmailFromTemplate = (
  template: string,
  placeholderValues?: { [key: string]: string }
) => Promise<string>;

const processTailwindCSS = async (html: string) => {
  const $ = cheerio.load(html);
  const classNames = new Set();

  // Extract all class names from the HTML
  $('*').each((_, element) => {
    const classes = $(element).attr('class');
    if (classes) {
      classes.split(/\s+/).forEach(className => classNames.add(className));
    }
  });

  // Create a dummy HTML file with all the used classes
  const dummyHTML = `
    <html>
      <body>
        ${Array.from(classNames).map(className => `<div class="${className}"></div>`).join('\n')}
      </body>
    </html>
  `;

  // Write the dummy HTML to a temporary file
  const tempFilePath = path.join(__dirname, 'temp.html');
  fs.writeFileSync(tempFilePath, dummyHTML);

  // Process the CSS with Tailwind
  const result = await postcss([
    tailwindcss({
      content: [tempFilePath],
      // Add any custom Tailwind configuration here if needed
    })
  ]).process('@tailwind base; @tailwind components; @tailwind utilities;', {
    from: undefined
  });

  // Remove the temporary file
  fs.unlinkSync(tempFilePath);

  return result.css;
}

const inlineStyles = async (html: string) => {
  // Process Tailwind CSS
  const tailwindCss = await processTailwindCSS(html);

  // Add processed Tailwind CSS to the HTML
  const htmlWithStyles = `<style>${tailwindCss}</style>${html}`;

  // Use juice to inline the styles
  return juice(htmlWithStyles, {removeStyleTags: true});
}

export const renderEmailFromTemplate: TRenderEmailFromTemplate = async (templatePath, data) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template(data);
  return await inlineStyles(html);
}

// module.exports = renderEmailFromTemplate;
// export renderEmailFromTemplate;
