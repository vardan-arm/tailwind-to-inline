import { makeStylesInline } from './makeStylesInline';

describe('renderEmailFromTemplate', () => {
  const templatePath = 'src/mocks/example-template.html';

  test('should render email from template', async () => {
    const placeholderValues = {
      name: 'John Doe',
      thank_you: 'Thank you for signing up!',
      cta_link: 'https://example.com',
      cta_text: 'See all features',
    };

    const inlinedHtml = await makeStylesInline(templatePath, placeholderValues);

    expect(inlinedHtml).toEqual(`<html>
  <head>
    <title>Test title</title>
  </head>
  <body>
    <div style="position: relative; z-index: 20; max-width: 512px; padding-left: 1rem; padding-top: 2.5rem;">
      <span style="margin-right: 1.25rem; color: #fde047;">Welcome, John Doe</span>
    </div>
    <div>
      <a href="https://example.com" style="background-color: #3b82f6;">See all features</a>
    </div>
  </body>
</html>
`);
  });
});
