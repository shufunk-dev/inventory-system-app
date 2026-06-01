import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export async function POST(req) {
  try {
    const user = await getUser();
    if (!user || user.isRoot !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { filename } = body;

    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const blogDir = path.resolve(process.cwd(), 'blog');
    const filePath = path.join(blogDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const WP_URL = process.env.WP_URL;
    const WP_USER = process.env.WP_USER;
    const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

    if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
      return NextResponse.json({ error: 'Missing WordPress credentials in .env.local' }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract title (assume first line is an h1)
    let title = filename.replace('.md', '').replace(/-/g, ' '); // fallback
    const lines = content.split('\n');
    if (lines[0].startsWith('# ')) {
      title = lines[0].replace('# ', '').trim();
    }

    const htmlContent = marked.parse(content);

    const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        title: title,
        content: htmlContent,
        status: 'publish' // Change to 'draft' if we want to review first
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Rename the file to mark it as published
      const newPath = filePath.replace('.md', '.published.md');
      fs.renameSync(filePath, newPath);

      return NextResponse.json({ success: true, link: data.link });
    } else {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message }, { status: response.status });
    }
  } catch (err) {
    console.error('Failed to publish post:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
