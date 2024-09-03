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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeStylesInline = void 0;
const fs_1 = __importDefault(require("fs"));
const juice_1 = __importDefault(require("juice"));
const handlebars_1 = __importDefault(require("handlebars"));
const postcss_1 = __importDefault(require("postcss"));
const path_1 = __importDefault(require("path"));
const tailwindcss_1 = __importDefault(require("tailwindcss"));
const processTailwindCSS = (html) => __awaiter(void 0, void 0, void 0, function* () {
    // Write the HTML to a temporary file
    const tempFilePath = path_1.default.join(__dirname, 'temp.html');
    fs_1.default.writeFileSync(tempFilePath, html);
    // Process the CSS with Tailwind and Autoprefixer
    const result = yield (0, postcss_1.default)([
        (0, tailwindcss_1.default)({
            content: [tempFilePath],
            // Disable Preflight (Tailwind's base styles)
            corePlugins: {
                preflight: false,
            },
        }),
    ]).process('@tailwind components; @tailwind utilities;', {
        from: undefined
    });
    // Remove the temporary file
    fs_1.default.unlinkSync(tempFilePath);
    return result.css;
});
const inlineStyles = (html) => __awaiter(void 0, void 0, void 0, function* () {
    // Process Tailwind CSS
    const tailwindCss = yield processTailwindCSS(html);
    // Use juice to inline the styles
    const inlinedHtml = juice_1.default.inlineContent(html, tailwindCss, {
        inlinePseudoElements: true,
        preserveMediaQueries: true,
        preserveFontFaces: true,
        applyStyleTags: true,
        removeStyleTags: true,
        insertPreservedExtraCss: true,
        extraCss: tailwindCss
    });
    return inlinedHtml;
});
const makeStylesInline = (templatePath, data) => __awaiter(void 0, void 0, void 0, function* () {
    const templateSource = fs_1.default.readFileSync(templatePath, 'utf8');
    const template = handlebars_1.default.compile(templateSource);
    const html = template(data);
    return yield inlineStyles(html);
});
exports.makeStylesInline = makeStylesInline;
