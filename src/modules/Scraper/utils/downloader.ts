import 'ts-replace-all';

import {
  getHostname,
  removeCookieBanners,
  interceptCookieUrls,
} from '../i-dont-care-about-cookies';

import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import debug from 'debug';
import fse from 'fs-extra';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
const DOWNLOAD_TIMEOUT = 30 * 1000;
const logDebug = debug('ota.org:debug');

/*
 * Handle styled-components which hides the content of css Rules
 * Initially done for https://www.wish.com/privacy_policy
 * https://spectrum.chat/styled-components/help/get-css-styles-working-with-prerender-io~4483f08d-7c1f-4c51-b0c9-b3430b8b0212?m=MTU0ODYxMTE5ODM5Ng==
 * https://github.com/styled-components/styled-components/issues/2511 but window.SC_DISABLE_SPEEDY = true; did not seem to work
 */
const addMissingStyledComponents = async (page: Page) => {
  await page.evaluate(function () {
    const el = document.createElement('style');
    document.head.appendChild(el);
    const styles = document.querySelectorAll('style[data-styled]');
    for (const style of (styles as any).values()) {
      for (const rule of style.sheet.rules) {
        el.appendChild(document.createTextNode(rule.cssText));
      }
    }
  });
};

export const downloadUrl = async (
  url: string,
  {
    folderPath,
    newUrlPath,
    acceptLanguage = 'en',
  }: { folderPath: string; newUrlPath: string; acceptLanguage?: string }
) => {
  fse.ensureDirSync(folderPath);
  const parsedUrl = new URL(url);
  // extract domain name from subdomain
  const [extension, domain] = parsedUrl.hostname.split('.').reverse();
  const domainname = `${domain}.${extension}`;

  const browser = await puppeteer
    .use(RecaptchaPlugin())
    .use(StealthPlugin())
    .launch({
      executablePath: process.env.CHROME_BIN,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--headless',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
      ],
    });
  const page = await browser.newPage();
  await page.setUserAgent(new UserAgent().toString());

  // same functionnality as in OpenTermsArchive Core
  await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLanguage });

  await page.setRequestInterception(true);
  page.on('console', (consoleObj: any) => logDebug('>> in page', consoleObj.text()));

  const hostname = getHostname(url, true);

  let assets: { from: string; to: string }[] = [];

  page.on('request', (request) => {
    if (request.resourceType() === 'script' && interceptCookieUrls(request.url(), [])) {
      console.log(`Blocking`, request.url());
      request.abort();
    } else {
      request.continue();
    }
  });

  page.on('response', async (response) => {
    const resourceType = response.request().resourceType();
    const status = response.status();

    const { hostname, pathname, search } = new URL(response.url());

    if (
      (status >= 300 && status <= 399) ||
      !hostname.includes(domainname) ||
      !['image', 'stylesheet'].includes(resourceType)
    ) {
      return;
    }

    const buffer = await response.buffer();
    let targetPathname = pathname;
    if (resourceType === 'stylesheet' && !pathname.endsWith('.css')) {
      targetPathname = `${pathname}.css`;
    }
    const existingUrl = `${pathname}${search}`;
    const rewrittenUrl = `${newUrlPath}${targetPathname}`;
    const relativeUrl = existingUrl.replace(parsedUrl.pathname, '');

    // sometimes the url is relative to the root of the domain, so we need to remove both
    // and in order to prevent string to be replaced twice, we need to replace it along with the surrounding quotes
    assets.push({ from: `"${existingUrl}"`, to: `"${rewrittenUrl}"` });
    assets.push({ from: `'${existingUrl}'`, to: `'${rewrittenUrl}'` });

    // in case a relative link is present such as "libs/style.min.css" when url is "https://www.tchap.gouv.fr/faq/#_Toc4344724_04"
    assets.push({ from: `"${relativeUrl}"`, to: `"${rewrittenUrl}"` });
    assets.push({ from: `'${relativeUrl}'`, to: `'${rewrittenUrl}'` });

    assets.push({ from: response.url(), to: `${rewrittenUrl}` });

    fse.outputFile(`${folderPath}${targetPathname}`, buffer, 'base64');
  });

  let message: any;
  try {
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0', 'networkidle2'],
      timeout: DOWNLOAD_TIMEOUT,
    });

    await addMissingStyledComponents(page);

    if (parsedUrl.hash) {
      try {
        const hashLinkSelector = `[href="${parsedUrl.hash}"]`;

        await page.waitForSelector(hashLinkSelector, { timeout: 1000 });
        await page.click(hashLinkSelector);
      } catch (e) {
        // no link found, do nothing
      }
    }

    await removeCookieBanners(page, hostname);

    const html = await page.content();

    // https://stackoverflow.com/questions/6659351/removing-all-script-tags-from-html-with-js-regular-expression
    // replace all scripts with empty string
    let filteredHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim, '');

    assets.forEach(({ from, to }) => {
      filteredHtml = filteredHtml.replaceAll(from, to);
    });

    fse.writeFileSync(`${folderPath}/index.html`, filteredHtml);

    message = { status: 'ok' };
  } catch (e) {
    console.error(e.toString());
    fse.removeSync(folderPath);
    message = { status: 'ko', error: e.toString() };
  }
  await page.close();
  await browser.close();

  return message;
};
