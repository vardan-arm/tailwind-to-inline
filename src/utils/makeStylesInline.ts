import * as fs from 'fs';
import juice from 'juice';
import Handlebars from 'handlebars';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
// import rgbHex from 'rgb-hex';
import rgb2hex from 'rgb2hex';
// const rgbHex = require('rgb-hex');

import { rgbToHex } from './rgbToHex';

console.log('rgb2hex is: ', rgb2hex);
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
    /*const moreSimplifications = generalSimplifications
      // .replace(/\s\//, ',')
      // .replace(/(rgb[a]?)/, 'rgb')
      // .replace(/[\d]+[\s]+[\d]+[\s]+[\d]+[\s]+(\/[\s]+\d)/, ''); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      // .replace(/([\d]+[\s]+[\d]+[\s]+[\d]+[\s]+)(\/[\s]+\d)/, '$1'); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      // .replace(/([\d]+[\s]+[\d]+[\s]+[\d]+[\s]+)(\/[\s]+\d)/, '$1'); // return the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`

      // strip the "opacity" part from `rgb(a)` so `rgba(59 130 246 /  1)` becomes `rgb(59 130 246)`
      .replace(/rgba?\(\d+\s+\d+\s+\d+\s*\/.*\)/, 'rgb($1 $2 $3)');*/

  /*const x1 = rgb2hex(' rgb(59, 130, 246)');
  console.log('x1: ', x1);
  const x2 = rgb2hex(' rgb(59 130 246 / 1)');
  console.log('x2: ', x2);*/

  // const x3 = rgbToHex(' rgb(59, 130, 246)');
  const x3 = rgbToHex(' rgb(37 99 235)');
  console.log('x3: ', x3);


  // const xx = moreSimplifications.replace('', rgbHex('$1'))
  // const xx = moreSimplifications.replace(/rgba?\(\d+\s+\d+\s+\d+\s*\/.*\)/, rgb2hex('$1').hex)
  console.log('generalSimplifications: ', generalSimplifications);
  // TODO: make sure the regex changes it gloabbly
  // const xx = generalSimplifications.replace(/rgba?\(\d+\s+\d+\s+\d+\s*\/.*\)/, match => {
  const xx = generalSimplifications.replace(/(rgba?\(\d+\s+\d+\s+\d+\s*\/.*\))/, match => {
    console.log('match: ', match);
    // const result = rgb2hex(match);
    const result = rgbToHex(match);
    console.log('result in matcher: ', result);
    // return result.hex;
    return result;
  });
console.log('xx: ', xx);
  // return moreSimplifications;
  return xx;
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
