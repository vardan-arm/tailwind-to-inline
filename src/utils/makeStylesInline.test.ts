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

    expect(inlinedHtml).toEqual(`
    <div>
      <a href="https://example.com" class="bg-blue-500" style="background-color: #3b82f6;">See all features</a>
    </div>`);
  });
});
