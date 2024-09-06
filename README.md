# Tailwind to Inline styles converter

### 🚀 Problem Solved
This package addresses a common challenge in email template creation: the need for inline styles. With tailwind-to-inline, you can:

- Quickly craft your templates using Tailwind CSS
- Automatically convert Tailwind classes to inline styles
- Generate email-ready HTML templates effortlessly

No more manual inline styling - save time and reduce errors in your email template workflow!


### 🔥 Top Features

- Effortless Conversion: Transform Tailwind classes to inline styles with a single function call
- Dynamic Content Support: Easily replace placeholders in your templates
- Time-Saving: Eliminate the need for manual inline styling in email templates


### Installation
`npm install tailwind-to-inline`


### Usage

```
import { makeStylesInline } from 'tailwind-to-inline';
...
const htmlTemplate = await makeStylesInline('templates/welcome-email.html', {
  name: 'John',
  cta_text: 'Complete Profile'
}; 
```


### Parameters

`templatePath`
Path to the template file.

`placeholderValues` *(optional)*
A key-value pair object to replace dynamic content in the template.


### Example
#### Original template `welcome-email.html`:

```
<html>
  <body>
    <div class="pt-10 pl-4 max-w-[512px] relative z-20">
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

```
<html>
  <body>
    <div style="position: relative; z-index: 20; max-width: 512px; padding-left: 1rem; padding-top: 2.5rem;">
      <span style="margin-right: 1.25rem; color: #fde047;">Welcome, John</span>
    </div>
    <div>
      <a href="https://example.com/complete-profile" style="background-color: #3b82f6;">
        Complete Profile
      </a>
    </div>
  </body>
</html>
```

### 🤝 Contributing

Contributions, issues, and feature requests are welcome!

### 📄 License

This project is MIT licensed.
