import { makeStylesInlineFromString } from 'tailwind-to-inline';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { html, placeholders } = await req.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "html" field' },
        { status: 400 }
      );
    }

    const result = await makeStylesInlineFromString(html, placeholders);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
