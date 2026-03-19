'use client';

import { useState, useCallback } from 'react';

const DEFAULT_HTML = `<html>
  <head>
    <title>Email Template</title>
  </head>
  <body>
    <div class="pt-10 pl-4 max-w-[512px]">
      <span class="mr-5 text-yellow-300">Welcome, {{name}}</span>
    </div>
    <div>
      <a href="{{cta_link}}" class="bg-blue-500 text-white px-6 py-3 rounded-lg inline-block font-semibold">
        {{cta_text}}
      </a>
    </div>
  </body>
</html>`;

const DEFAULT_PLACEHOLDERS = JSON.stringify(
  {
    name: 'John',
    cta_link: 'https://example.com',
    cta_text: 'Get Started',
  },
  null,
  2
);

export default function Playground() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [placeholders, setPlaceholders] = useState(DEFAULT_PLACEHOLDERS);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const convert = useCallback(async () => {
    setLoading(true);
    setError('');
    setOutput('');

    try {
      let parsedPlaceholders: Record<string, string> | undefined;
      const trimmed = placeholders.trim();
      if (trimmed) {
        try {
          parsedPlaceholders = JSON.parse(trimmed);
        } catch {
          setError('Invalid JSON in placeholders. Please check the syntax.');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, placeholders: parsedPlaceholders }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Conversion failed');
      } else {
        setOutput(data.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [html, placeholders]);

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">tailwind-to-inline</h1>
          <span className="header-badge">playground</span>
        </div>
        <div className="header-links">
          <a
            href="https://www.npmjs.com/package/tailwind-to-inline"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            npm
          </a>
          <a
            href="https://github.com/vardan-arm/tailwind-to-inline"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="main">
        {/* Left: Input */}
        <div className="panel-left">
          <div className="panel-header">
            <span className="panel-label">Input HTML</span>
            <button
              onClick={convert}
              disabled={loading}
              className="convert-btn"
            >
              {loading ? 'Converting...' : 'Convert'}
            </button>
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="editor"
            spellCheck={false}
            placeholder="Paste your HTML with Tailwind classes here..."
          />
          <div className="placeholders-section">
            <div className="panel-header">
              <span className="panel-label">
                Placeholders (JSON, optional)
              </span>
            </div>
            <textarea
              value={placeholders}
              onChange={(e) => setPlaceholders(e.target.value)}
              className="placeholders-editor"
              spellCheck={false}
              placeholder='{"name": "John"}'
            />
          </div>
        </div>

        {/* Right: Output */}
        <div className="panel-right">
          <div className="panel-header">
            <div className="tabs">
              <button
                onClick={() => setViewMode('code')}
                className={`tab ${viewMode === 'code' ? 'tab-active' : ''}`}
              >
                Code
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`tab ${viewMode === 'preview' ? 'tab-active' : ''}`}
              >
                Preview
              </button>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          {viewMode === 'code' ? (
            <pre className="output">
              {output || (
                <span className="output-placeholder">
                  Click &quot;Convert&quot; to see the output...
                </span>
              )}
            </pre>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
              {output ? (
                <iframe
                  srcDoc={output}
                  className="preview-frame"
                  title="Preview"
                  sandbox=""
                />
              ) : (
                <div className="preview-empty">
                  Click &quot;Convert&quot; to see the preview...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
