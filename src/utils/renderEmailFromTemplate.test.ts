import {makeStylesInline} from "./makeStylesInline";

describe('renderEmailFromTemplate', () => {
  const templatePath = 'src/example-template.html';
  test('should render email from template', async () => {
    const placeholderValues = {
      name: 'John Doe',
      thank_you: 'Thank you for signing up!',
      cta_link: 'https://another.example.com',
      cta_text: 'See all features'
    };
    const inlinedHtml = await makeStylesInline(templatePath); // TODO: put placeholders...
    console.log('inlinedHtml: ', inlinedHtml);

    expect(inlinedHtml).toEqual('<html></html>');
  })
  }
)
