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
    expect(html).toContain('padding: 1rem;');
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

describe('embedded Tailwind theme', () => {
  test('should be in sync with the installed Tailwind version (run "npm run generate:theme")', () => {
    const installedTheme = fs.readFileSync(
      require.resolve('tailwindcss/theme.css'),
      'utf8',
    );
    expect(TAILWIND_THEME_CSS).toEqual(installedTheme);
  });
});
