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
exports.makeStylesInline = void 0;
const fs = __importStar(require("fs"));
const juice_1 = __importDefault(require("juice"));
const handlebars_1 = __importDefault(require("handlebars"));
const postcss_1 = __importDefault(require("postcss"));
const tailwindcss_1 = __importDefault(require("tailwindcss"));
const autoprefixer_1 = __importDefault(require("autoprefixer"));
const path_1 = __importDefault(require("path"));
const rgbToHex_1 = require("./rgbToHex");
const processTailwindCSS = (html) => __awaiter(void 0, void 0, void 0, function* () {
    const tempFilePath = path_1.default.join(__dirname, 'temp.html');
    fs.writeFileSync(tempFilePath, html);
    const tailwindConfig = {
        content: [tempFilePath],
        corePlugins: {
            preflight: false,
        },
    };
    const result = yield (0, postcss_1.default)([
        (0, tailwindcss_1.default)(tailwindConfig),
        autoprefixer_1.default,
    ]).process('@tailwind components; @tailwind utilities;', {
        from: undefined,
    });
    fs.unlinkSync(tempFilePath);
    return result.css;
});
const simplifyColors = (css) => {
    const generalSimplifications = css
        .replace(/rgb\(([^)]+)\) \/ var\(--tw-[^)]+\)/g, 'rgb($1)')
        .replace(/rgba\(([^,]+),([^,]+),([^,]+),var\(--tw-[^)]+\)\)/g, 'rgba($1,$2,$3,1)')
        .replace(/var\(--tw-[^)]+\)/g, '1')
        .replace(/--tw-[^:]+:[^;]+;/g, '');
    // Since email agents like Gmail don't allow using `rgb()` colors, we replace them with their `hex` counterparts
    const withRgbToHex = generalSimplifications.replaceAll(/(rgba?\(\d+\s+\d+\s+\d+\s*\/.*\))/g, match => {
        return (0, rgbToHex_1.rgbToHex)(match);
    });
    return withRgbToHex;
};
const inlineStyles = (html) => __awaiter(void 0, void 0, void 0, function* () {
    const tailwindCss = yield processTailwindCSS(html);
    const simplifiedCss = simplifyColors(tailwindCss);
    return (0, juice_1.default)(html, {
        extraCss: simplifiedCss,
        applyStyleTags: true,
        removeStyleTags: true,
        preserveMediaQueries: true,
        preserveFontFaces: true,
        preserveImportant: true,
        inlinePseudoElements: true,
    });
});
const makeStylesInline = (templatePath, data) => __awaiter(void 0, void 0, void 0, function* () {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars_1.default.compile(templateSource);
    const html = template(data);
    return inlineStyles(html);
});
exports.makeStylesInline = makeStylesInline;
