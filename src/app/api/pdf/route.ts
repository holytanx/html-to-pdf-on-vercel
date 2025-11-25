// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function POST(request: NextRequest) {
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

    // Determine if we're in production (Vercel) or local development
    const isVercel = !!process.env.VERCEL
    const pptr = isVercel ? puppeteer : (await import("puppeteer")) as unknown as typeof puppeteer;

    let browser

    browser = await pptr.launch(isVercel ? {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    } : { 
      headless: true, 
      args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage()

    // Set content and wait for everything to load
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    })

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready')

    // Build PDF options
    const pdfOptions: any = {
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.9,
    }

    // Set margins
    if (margins && (margins.top || margins.right || margins.bottom || margins.left)) {
      pdfOptions.margin = {
        top: margins.top || '0',
        right: margins.right || '0',
        bottom: margins.bottom || '0',
        left: margins.left || '0',
      }
    } else {
      pdfOptions.margin = {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      }
    }

    // If custom dimensions are provided, use them
    if (width && height) {
      pdfOptions.width = width
      pdfOptions.height = height
    } else if (pageSize) {
      pdfOptions.format = pageSize
      pdfOptions.landscape = landscape
      pdfOptions.preferCSSPageSize = true
    } else {
      pdfOptions.format = 'A4'
      pdfOptions.landscape = landscape
      pdfOptions.preferCSSPageSize = true
    }

    const pdfBuffer = await page.pdf(pdfOptions)

    await browser.close()

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Increase timeout for Vercel serverless function
export const maxDuration = 60 // 60 seconds (adjust based on your Vercel plan)