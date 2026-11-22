# Tailwind to Inline styles converter

Converts Tailwind CSS classes to inline styles for email-ready HTML templates.

### [Try it online](https://tailwind-to-inline.vercel.app)

### Installation

| `tailwind-to-inline` | Tailwind CSS it uses | Install |
|----------------------|----------------------|---------|
| `2.x`                | v4                   | `npm install tailwind-to-inline` |
| `1.x`                | v3                   | `npm install tailwind-to-inline@1` |

Upgrading from `1.x`? The API is the same, but Tailwind v4 changed its color palette and renamed some
utilities, so your emails may look different. See [Tailwind's upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

### Usage

#### From a file path

```js
import { makeStylesInline } from 'tailwind-to-inline';

const htmlTemplate = await makeStylesInline('templates/welcome-email.html', {
  name: 'John',
  cta_text: 'Complete Profile'
});
```

**Parameters:**

- `templatePath` — Path to the template file.
- `placeholderValues` *(optional)* — A key-value pair object to replace dynamic content in the template.

#### From a raw HTML string

```js
import { makeStylesInlineFromString } from 'tailwind-to-inline';

const html = `<div class="pt-10 text-yellow-300">Hello, {{name}}</div>`;
const htmlTemplate = await makeStylesInlineFromString(html, {
  name: 'John',
});
```

**Parameters:**

- `templateString` — A raw HTML string containing Tailwind CSS classes.
- `data` *(optional)* — A key-value pair object to replace dynamic content in the template.


### Example
#### Original template `welcome-email.html`:

```html
<html>
  <body class="bg-gray-800">
    <div class="pt-10 mb-4 pl-4 max-w-[512px] relative z-20">
      <span class="mr-5 text-yellow-300">Welcome, {{name}}</span>
    </div>
    <div>
      <a href="https://example.com/complete-profile" class="bg-blue-500">
        {{cta_text}}
      </a>
    </div>
  </body>
</html>
```

#### Converted result:

```html
<html>
  <body style="background-color: #1e2939;">
    <div style="position: relative; z-index: 20; margin-bottom: 1rem; max-width: 512px; padding-top: 2.5rem; padding-left: 1rem;">
      <span style="margin-right: 1.25rem; color: #ffdf20;">Welcome, John</span>
    </div>
    <div>
      <a href="https://example.com/complete-profile" style="background-color: #2b7fff;">
        Complete Profile
      </a>
    </div>
  </body>
</html>
```

### Email-friendly output

Tailwind v4 generates modern CSS that most email clients don't support, so the styles are simplified while inlining:

- Colors become hex, or `rgba()` when they have opacity (`bg-black/50` → `rgba(0, 0, 0, 0.5)`).
- CSS variables and `calc()` are replaced with final values (`pt-10` → `padding-top: 2.5rem`).
- Logical properties become physical ones (`px-4` → `padding-left` and `padding-right`).
- Responsive, dark mode, `hover:` and `focus:` classes can't be inlined, so they stay in a `<style>` tag with
  `!important` and email-safe class names (`md:p-4` → `.md-p-4`); other classes are removed.

Keep a `<head>` in your template: that's where the `<style>` tag goes. Without it, the tag is added at the end
of the `<body>` (or of the HTML), where many email clients ignore it.

What these classes do still depends on the email client: Outlook, for example, ignores `hover:` classes.

Tailwind's base styles (preflight) are not included.

### Contributing

Contributions, issues, and feature requests are welcome!

### Contributors

<a href="https://github.com/vardan-arm"><img src="https://github.com/vardan-arm.png" width="50" height="50" alt="vardan-arm" /></a>
<a href="https://github.com/diogomoretti"><img src="https://github.com/diogomoretti.png" width="50" height="50" alt="diogomoretti" /></a>
<a href="https://github.com/markosmk"><img src="https://github.com/markosmk.png" width="50" height="50" alt="markosmk" /></a>

### Support

If you find this package useful, you can support it on [Patreon](https://www.patreon.com/vardan_live). Thanks ❤️

### License

[MIT](LICENSE)
