// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function POST(request: NextRequest) {
  let browser;
  try {
    const {
      html,
      filename = 'document.pdf',
      landscape = true,
      pageSize = null,
      width = null,
      height = null,
      margins = { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
    } = await request.json()
    const isVercel = !!process.env.VERCEL_ENV;
    const pptr = isVercel ? puppeteer : (await import("puppeteer")) as unknown as typeof puppeteer;
    browser = await pptr.launch(isVercel ? {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    } : { 
      headless: true, 
      args: puppeteer.defaultArgs()
    });
    const page = await browser.newPage();
   await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ 
        path: undefined,
        printBackground: true
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="page-output.pdf"',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse(
      "An error occurred while generating the PDF.",
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Increase timeout for Vercel serverless function
export const maxDuration = 60 // 60 seconds (adjust based on your Vercel plan)