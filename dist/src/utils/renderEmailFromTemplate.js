"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEmailFromTemplate = void 0;
const fs = __importStar(require("fs"));
const juice_1 = __importDefault(require("juice"));
const handlebars_1 = __importDefault(require("handlebars"));
const cheerio_1 = __importDefault(require("cheerio"));
// import postcss from 'postcss';
const postcss_1 = __importDefault(require("postcss"));
const node_path_1 = __importDefault(require("node:path"));
const tailwindcss_1 = __importDefault(require("tailwindcss"));
const processTailwindCSS = (html) => __awaiter(void 0, void 0, void 0, function* () {
    const $ = cheerio_1.default.load(html);
    const classNames = new Set();
    // Extract all class names from the HTML
    $('*').each((_, element) => {
        const classes = $(element).attr('class');
        if (classes) {
            classes.split(/\s+/).forEach(className => classNames.add(className));
        }
    });
    // Create a dummy HTML file with all the used classes
    const dummyHTML = `
    <html>
      <body>
        ${Array.from(classNames).map(className => `<div class="${className}"></div>`).join('\n')}
      </body>
    </html>
  `;
    // Write the dummy HTML to a temporary file
    const tempFilePath = node_path_1.default.join(__dirname, 'temp.html');
    fs.writeFileSync(tempFilePath, dummyHTML);
    // Process the CSS with Tailwind
    const result = yield (0, postcss_1.default)([
        (0, tailwindcss_1.default)({
            content: [tempFilePath],
            // Add any custom Tailwind configuration here if needed
        })
    ]).process('@tailwind base; @tailwind components; @tailwind utilities;', {
        from: undefined
    });
    // Remove the temporary file
    fs.unlinkSync(tempFilePath);
    return result.css;
});
const inlineStyles = (html) => __awaiter(void 0, void 0, void 0, function* () {
    // Process Tailwind CSS
    const tailwindCss = yield processTailwindCSS(html);
    // Add processed Tailwind CSS to the HTML
    const htmlWithStyles = `<style>${tailwindCss}</style>${html}`;
    // Use juice to inline the styles
    return (0, juice_1.default)(htmlWithStyles, { removeStyleTags: true });
});
const renderEmailFromTemplate = (templatePath, data) => __awaiter(void 0, void 0, void 0, function* () {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars_1.default.compile(templateSource);
    const html = template(data);
    return yield inlineStyles(html);
});
exports.renderEmailFromTemplate = renderEmailFromTemplate;
// module.exports = renderEmailFromTemplate;
// export renderEmailFromTemplate;
