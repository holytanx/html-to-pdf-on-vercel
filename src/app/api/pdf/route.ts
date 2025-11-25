// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function GET(request: NextRequest) {
  let browser;
  try {
    const url = request.nextUrl;
    const params = url.searchParams;
    const html = params.get("html") ?? "";
    if (!html) {
      return new NextResponse('Missing "html" query parameter', { status: 400 });
    }
    const filename = params.get("filename") ?? "document.pdf";
    const landscape = params.get("landscape")
      ? params.get("landscape") === "true"
      : true;
    const pageSize = params.get("pageSize") ?? null;
    const width = params.get("width") ?? null;
    const height = params.get("height") ?? null;
    const marginsParam = params.get("margins");
    let margins = { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" };
    if (marginsParam) {
      try {
        margins = JSON.parse(marginsParam);
      } catch (e) {
        // ignore parse errors and keep defaults
      }
    }
    const isVercel = !!process.env.VERCEL_ENV;
    const pptr = isVercel
      ? puppeteer
      : ((await import("puppeteer")) as unknown as typeof puppeteer);
    browser = await pptr.launch(
      isVercel
        ? {
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          }
        : {
            headless: true,
            args: puppeteer.defaultArgs(),
          }
    );
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      path: undefined,
      printBackground: true,
      landscape: Boolean(landscape),
      format: pageSize ? (pageSize as any) : undefined,
      width: width || undefined,
      height: height || undefined,
      margin: margins as any,
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("An error occurred while generating the PDF.", {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
