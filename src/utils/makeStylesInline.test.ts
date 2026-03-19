import {
  makeStylesInline,
  makeStylesInlineFromString,
} from './makeStylesInline';
import * as fs from 'fs';

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
  <body style="background-color: #1f2937;">
    <div style="position: relative; z-index: 20; margin-bottom: 1rem; max-width: 512px; padding-left: 1rem; padding-top: 2.5rem;">
      <span style="margin-right: 1.25rem; color: #fde047;">Welcome, John Doe</span>
    </div>
    <div>
      <a href="https://example.com" style="background-color: #3b82f6;">See all features</a>
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
