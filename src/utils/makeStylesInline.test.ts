import {
  makeStylesInline,
  makeStylesInlineFromString,
} from './makeStylesInline';
import * as fs from 'fs';
import { TAILWIND_THEME_CSS } from '../generated/tailwindTheme';

describe('renderEmailFromTemplate', () => {
  const templatePath = 'src/mocks/example-template.html';
  const placeholderValues = {
    name: 'John Doe',
    thank_you: 'Thank you for signing up!',
    cta_link: 'https://example.com',
    cta_text: 'See all features',
  };
  const expectedHtml = `<html>
  <head>
    <title>Test title</title>
  </head>
  <body style="background-color: #1e2939;">
    <div style="position: relative; z-index: 20; margin-bottom: 1rem; max-width: 512px; padding-top: 2.5rem; padding-left: 1rem;">
      <span style="margin-right: 1.25rem; color: #ffdf20;">Welcome, John Doe</span>
    </div>
    <div>
      <a href="https://example.com" style="background-color: #2b7fff;">See all features</a>
      <div style="background-image: url('https://example.com/custom-image.png'); background-repeat: no-repeat;"></div>
    </div>
  </body>
</html>
`;

  test('should render email from template', async () => {
    const inlinedHtml = await makeStylesInline(templatePath, placeholderValues);
    expect(inlinedHtml).toEqual(expectedHtml);
  });

  test('should render email from raw template string', async () => {
    const rawString = fs.readFileSync(templatePath, 'utf8');
    const inlinedHtml = await makeStylesInlineFromString(
      rawString,
      placeholderValues,
    );
    expect(inlinedHtml).toEqual(expectedHtml);
  });
});

describe('Tailwind v4 output', () => {
  const convert = (html: string) => makeStylesInlineFromString(html);

  test('should convert spacing to physical properties with plain values', async () => {
    expect(
      await convert('<p class="px-4 py-2 pl-1 mx-auto w-1/2">a</p>'),
    ).toEqual(
      '<p style="margin-left: auto; margin-right: auto; width: 50%; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; padding-left: 0.25rem;">a</p>',
    );
  });

  test('should convert colors to hex, and to rgba when they have opacity', async () => {
    expect(
      await convert(
        '<p class="bg-black/50 text-[rgb(1,2,3)] border-red-500/20">a</p>',
      ),
    ).toEqual(
      '<p style="border-color: rgba(251, 44, 54, 0.2); background-color: rgba(0, 0, 0, 0.5); color: #010203;">a</p>',
    );
  });

  test('should resolve variables shared between classes', async () => {
    expect(
      await convert(
        '<p class="text-sm leading-6 font-bold shadow-md shadow-red-500">a</p>',
      ),
    ).toEqual(
      '<p style="font-size: 0.875rem; line-height: 1.5rem; font-weight: 700; box-shadow: 0 4px 6px -1px #fb2c36, 0 2px 4px -2px #fb2c36;">a</p>',
    );
  });

  test('should resolve variables to their defaults', async () => {
    expect(
      await convert('<p class="border rounded-full shadow-sm">a</p>'),
    ).toEqual(
      '<p style="border-radius: 9999px; border-style: solid; border-width: 1px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);">a</p>',
    );
  });

  test('should convert gradients', async () => {
    expect(
      await convert('<p class="bg-linear-to-r from-red-500 to-blue-500">a</p>'),
    ).toEqual(
      '<p style="background-image: linear-gradient(to right, #fb2c36 0%, #2b7fff 100%);">a</p>',
    );
  });

  test('should keep media queries in a format supported by email clients', async () => {
    const html = await convert(
      '<html><head></head><body><p class="md:max-lg:p-4 max-md:hidden">a</p></body></html>',
    );

    expect(html).toContain('@media (max-width: 47.99rem) {');
    expect(html).toContain(
      '@media (min-width: 48rem) and (max-width: 63.99rem) {',
    );
    expect(html).toContain('.md-max-lg-p-4 {\n    padding: 1rem !important;');
    expect(html).toContain('.max-md-hidden {\n    display: none !important;');
    expect(html).toContain('<p class="md-max-lg-p-4 max-md-hidden">a</p>');
    expect(html).not.toContain('var(');
  });

  test('should keep user-defined styles and variables working', async () => {
    expect(
      await convert(
        '<style>:root { --brand: #123456; } .title { color: var(--brand); }</style><p class="title mt-2">a</p>',
      ),
    ).toEqual('<p style="color: #123456; margin-top: 0.5rem;">a</p>');
  });
});

describe('classes kept for <style> rules', () => {
  const convert = (html: string) => makeStylesInlineFromString(html);
  const page = (body: string, head = '') =>
    `<html><head>${head}</head><body>${body}</body></html>`;

  test('should keep a responsive class with an email-safe name and !important', async () => {
    expect(await convert(page('<p class="p-2 md:p-4">a</p>'))).toEqual(
      page(
        '<p class="md-p-4" style="padding: 0.5rem;">a</p>',
        '<style>\n@media (min-width: 48rem) {\n  .md-p-4 {\n    padding: 1rem !important;\n  }\n}\n</style>',
      ),
    );
  });

  test('should keep only the classes used by <style> rules', async () => {
    const html = await convert(
      page(
        '<p class="p-2 md:p-4 text-red-500">a</p><p class=\'text-red-500  font-bold\'>b</p>',
      ),
    );

    expect(html).toContain(
      '<p class="md-p-4" style="padding: 0.5rem; color: #fb2c36;">a</p>',
    );
    expect(html).toContain(
      '<p style="font-weight: 700; color: #fb2c36;">b</p>',
    );
  });

  test('should keep dark mode classes', async () => {
    expect(await convert(page('<p class="dark:bg-black">a</p>'))).toEqual(
      page(
        '<p class="dark-bg-black">a</p>',
        '<style>\n@media (prefers-color-scheme: dark) {\n  .dark-bg-black {\n    background-color: #000 !important;\n  }\n}\n</style>',
      ),
    );
  });

  test('should rename classes with special characters in all places', async () => {
    const html = await convert(
      page(
        '<p class="w-full md:w-1/2">a</p><div class="md:max-w-[512px] md:text-[rgb(1,2,3)] 2xl:p-4"></div><p class="md:w-1/2">b</p>',
      ),
    );

    expect(html).toContain('.md-w-1-2 {\n    width: 50% !important;');
    expect(html).toContain(
      '.md-max-w-512px {\n    max-width: 512px !important;',
    );
    expect(html).toContain(
      '.md-text-rgb1_2_3 {\n    color: #010203 !important;',
    );
    expect(html).toContain('._2xl-p-4 {\n    padding: 1rem !important;');
    expect(html).toContain('<p class="md-w-1-2" style="width: 100%;">a</p>');
    expect(html).toContain(
      '<div class="md-max-w-512px md-text-rgb1_2_3 _2xl-p-4"></div>',
    );
    expect(html).toContain('<p class="md-w-1-2">b</p>');
    expect(html).not.toContain('\\');
  });

  test('should give distinct names to classes that would get the same name', async () => {
    const html = await convert(
      page(
        '<p class="md:p-4 md-p-4">a</p>',
        '<style>@media (max-width: 600px) { .md-p-4 { color: red; } }</style>',
      ),
    );

    expect(html).toContain('.md-p-4 {\n    color: red;');
    expect(html).toContain('.md-p-4-2 {\n    padding: 1rem !important;');
    expect(html).toContain('<p class="md-p-4-2 md-p-4">a</p>');
  });

  test('should keep classes of user-defined rules without adding !important', async () => {
    const html = await convert(
      page(
        '<a class="btn stack x:y text-red-500">a</a>',
        '<style>@media (max-width: 600px) { .stack { display: block; } .x\\:y { color: blue; } } .btn:hover { color: red; }</style>',
      ),
    );

    expect(html).toContain('.stack {\n    display: block;\n  }');
    expect(html).toContain('.x-y {\n    color: blue;\n  }');
    expect(html).toContain('.btn:hover {\n  color: red;\n}');
    expect(html).toContain(
      '<a class="btn stack x-y" style="color: #fb2c36;">a</a>',
    );
    expect(html).not.toContain('!important');
  });

  test('should keep Tailwind :focus rules', async () => {
    expect(
      await convert(page('<input class="border focus:border-red-500">')),
    ).toEqual(
      page(
        '<input class="focus-border-red-500" style="border-style: solid; border-width: 1px;">',
        '<style>\n.focus-border-red-500:focus {\n  border-color: #fb2c36 !important;\n}\n</style>',
      ),
    );
  });

  test('should not leave Tailwind internals or empty style tags', async () => {
    const html = await convert(
      page('<p class="md:shadow-red-500">a</p><p class="md:shadow-lg">b</p>'),
    );

    expect(html).not.toMatch(/-tw-|@supports|\\/);
    expect(html).toContain('<p>a</p><p class="md-shadow-lg">b</p>');
    expect(await convert(page('<p class="md:shadow-red-500">a</p>'))).toEqual(
      page('<p>a</p>'),
    );
  });
  test('should drop @supports fallbacks nested in media queries', async () => {
    expect(await convert(page('<p class="md:bg-red-500/50">a</p>'))).toEqual(
      page(
        '<p class="md-bg-red-500-50">a</p>',
        '<style>\n@media (min-width: 48rem) {\n  .md-bg-red-500-50 {\n    background-color: rgba(251, 44, 54, 0.5) !important;\n  }\n}\n</style>',
      ),
    );
  });
});

describe('embedded Tailwind theme', () => {
  test('should be in sync with the installed Tailwind version (run "npm run generate:theme")', () => {
    const installedTheme = fs.readFileSync(
      require.resolve('tailwindcss/theme.css'),
      'utf8',
    );
    expect(TAILWIND_THEME_CSS).toEqual(installedTheme);
  });
});
