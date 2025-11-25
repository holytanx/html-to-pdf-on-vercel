import { NextRequest, NextResponse } from "next/server";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const htmlParam = searchParams.get("html");
  if (!htmlParam) {
    return new NextResponse("Please provide the HTML.", { status: 400 });
  }

  const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar"
  let browser;
  try {
    const isVercel = !!process.env.VERCEL_ENV;
    console.log(isVercel)
    const pptr = isVercel ? puppeteer : (await import("puppeteer")) as unknown as typeof puppeteer;
    browser = await pptr.launch(isVercel ? {
      args: chromium.args,
      executablePath: await chromium.executablePath(remoteExecutablePath),
      headless: true
    } : { 
      headless: true, 
      args: puppeteer.defaultArgs()
    });
    const page = await browser.newPage();
    await page.setContent(htmlParam, { waitUntil: 'load' });
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