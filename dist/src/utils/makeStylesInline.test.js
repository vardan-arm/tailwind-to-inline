"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const makeStylesInline_1 = require("./makeStylesInline");
describe('renderEmailFromTemplate', () => {
    const templatePath = 'src/mocks/example-template.html';
    test('should render email from template', () => __awaiter(void 0, void 0, void 0, function* () {
        const placeholderValues = {
            name: 'John Doe',
            thank_you: 'Thank you for signing up!',
            cta_link: 'https://example.com',
            cta_text: 'See all features',
        };
        const inlinedHtml = yield (0, makeStylesInline_1.makeStylesInline)(templatePath, placeholderValues);
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
    }));
});
