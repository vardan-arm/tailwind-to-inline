import {makeStylesInline} from "./makeStylesInline";

describe('renderEmailFromTemplate', () => {
  const templatePath = 'src/example-template-minimal-with-html-tag.html';

  test('should render email from template', async () => {
    const placeholderValues = {
      name: 'John Doe',
      thank_you: 'Thank you for signing up!',
      cta_link: 'https://another.example.com',
      cta_text: 'See all features'
    };
    const inlinedHtml = await makeStylesInline(templatePath); // TODO: put placeholders...

    expect(inlinedHtml).toEqual(`<html>
  <head>
    <style>
        body {
            color: white;
        }
    </style>
    <title>Test title</title>
  </head>
  <body>
    <div class="pt-10 pl-4 max-w-[512px] relative z-20" style="position: relative; z-index: 20; max-width: 512px; padding-left: 1rem; padding-top: 2.5rem;">
      <span class="mr-5" style="margin-right: 1.25rem;">Test</span>
    </div>
  </body>
</html>
`);
  })
  }
)
