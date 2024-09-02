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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var juice = require("juice");
var Handlebars = require("handlebars");
var cheerio = require("cheerio");
// import postcss from 'postcss';
var postcss = require("postcss");
var path = require("node:path");
var tailwindcss = require("tailwindcss");
var processTailwindCSS = function (html) { return __awaiter(void 0, void 0, void 0, function () {
    var $, classNames, dummyHTML, tempFilePath, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                $ = cheerio.load(html);
                classNames = new Set();
                // Extract all class names from the HTML
                $('*').each(function (_, element) {
                    var classes = $(element).attr('class');
                    if (classes) {
                        classes.split(/\s+/).forEach(function (className) { return classNames.add(className); });
                    }
                });
                dummyHTML = "\n    <html>\n      <body>\n        ".concat(Array.from(classNames).map(function (className) { return "<div class=\"".concat(className, "\"></div>"); }).join('\n'), "\n      </body>\n    </html>\n  ");
                tempFilePath = path.join(__dirname, 'temp.html');
                fs.writeFileSync(tempFilePath, dummyHTML);
                return [4 /*yield*/, postcss([
                        tailwindcss({
                            content: [tempFilePath],
                            // Add any custom Tailwind configuration here if needed
                        })
                    ]).process('@tailwind base; @tailwind components; @tailwind utilities;', {
                        from: undefined
                    })];
            case 1:
                result = _a.sent();
                // Remove the temporary file
                fs.unlinkSync(tempFilePath);
                return [2 /*return*/, result.css];
        }
    });
}); };
var inlineStyles = function (html) { return __awaiter(void 0, void 0, void 0, function () {
    var tailwindCss, htmlWithStyles;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, processTailwindCSS(html)];
            case 1:
                tailwindCss = _a.sent();
                htmlWithStyles = "<style>".concat(tailwindCss, "</style>").concat(html);
                // Use juice to inline the styles
                return [2 /*return*/, juice(htmlWithStyles, { removeStyleTags: true })];
        }
    });
}); };
var renderEmailFromTemplate = function (templatePath, data) { return __awaiter(void 0, void 0, void 0, function () {
    var templateSource, template, html;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                templateSource = fs.readFileSync(templatePath, 'utf8');
                template = Handlebars.compile(templateSource);
                html = template(data);
                return [4 /*yield*/, inlineStyles(html)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
module.exports = renderEmailFromTemplate;
