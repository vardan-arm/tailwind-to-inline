import {makeStylesInline} from "./makeStylesInline";

describe('renderEmailFromTemplate', () => {
  const templatePath = 'src/mocks/example-template.html';

  test('should render email from template', async () => {
    const placeholderValues = {
      name: 'John Doe',
      thank_you: 'Thank you for signing up!',
      cta_link: 'https://example.com',
      cta_text: 'See all features'
    };
    const inlinedHtml = await makeStylesInline(templatePath, placeholderValues);

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
    <div class="pt-10 pl-4 max-w-[512px] relative z-20" style="position: relative; z-index: 20; max-width: 512px; padding-left: 1rem; padding-top: 2.5rem">
      <span class="mr-5" style="margin-right: 1.25rem">Welcome, John Doe</span>
    </div>
    <div>
      <a href="https://example.com" class="bg-blue-500" style="background-color: rgb(59 130 246 / 1)">See all features</a>
    </div>
  </body>
</html>
`);
  })
  }
)
