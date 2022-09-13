import 'ts-replace-all';

import {
  getHostname,
  removeCookieBanners,
  interceptCookieUrls,
} from '../i-dont-care-about-cookies';

import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import debug from 'debug';
import path from 'path';
import fse from 'fs-extra';
import type { Page, Browser } from 'puppeteer'; // from open-terms-archive
import puppeteer from 'puppeteer-extra'; // from open-terms-archive
const logDebug = debug('ota.org:debug');
import {
  getSnapshot,
  Snapshot,
  stopBrowser,
  launchBrowser,
  generateFolderName,
} from 'modules/Common/services/open-terms-archive';

puppeteer.use(RecaptchaPlugin());

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

/*
 * Base tag is sometimes used to specify a default URL and a default target for all links on a page
 * https://www.w3schools.com/tags/tag_base.asp
 *
 * As we download all files, we do not want to keep this tag
 * Initially done for https://fr.aegeanair.com/conditions-et-avis/conditions-generales-de-transport/
 */
const removeBaseTag = async (page: Page) => {
  await page.evaluate(() => {
    document.querySelector('base')?.remove();
  });
};
/*
 * Some sites have a protection against headless browsers
 * The only fact to put a user agent will bypass this protection
 *
 * Initially done for https://napoveda.seznam.cz/cz/sreality/pravidla-sreality/smluvni-podminky-sluzby-sreality.cz/smluvni-podminky-pro-vkladani-inzerce-do-databaze-serveru-sreality.ct-platne-13.12.2021
 */
const setCustomUserAgent = async (page: Page) => {
  await page.setUserAgent('OpenTermsArchive/contribution-tool');
};

const outputPageLogs = (page: Page) => {
  if (process.env.NODE_ENV !== 'production') {
    page.on('console', (consoleObj: any) => logDebug('>> in page', consoleObj.text()));
  }
};

const waitForHashIfExists = async (page: Page, hash?: string) => {
  if (!hash) {
    return;
  }
  try {
    const hashLinkSelector = `[href="${hash}"]`;

    await page.waitForSelector(hashLinkSelector, { timeout: 1000 });
    await page.click(hashLinkSelector);
  } catch (e) {
    // no link found, do nothing
  }
};

/*
 * Replace all asset urls by ones from this server and prevent scripts from loading
 */
const cleanHtml = (html: string, assets: { from: string; to: string }[]) => {
  // https://stackoverflow.com/questions/6659351/removing-all-script-tags-from-html-with-js-regular-expression
  // replace all scripts with empty string
  let filteredHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim, '');

  assets.forEach(({ from, to }) => {
    filteredHtml = filteredHtml.replaceAll(from, to);
    // URL are sometimes encoded differently and thus we try to replace strings
    // which do not exist in the document
    // Initially done for https://www.realestate-slovenia.info/pogoji-uporabe.html
    filteredHtml = filteredHtml.replaceAll(from.replaceAll('&', '&amp;'), to);
  });

  return filteredHtml;
};

type DownloadResult = {
  url: string;
  isPDF?: boolean;
};

export const downloadUrl = async (
  json: any,
  {
    folderDirPath,
    newUrlDirPath,
    acceptLanguage = 'en',
  }: { folderDirPath: string; newUrlDirPath: string; acceptLanguage?: string }
): Promise<DownloadResult> => {
  const folderName = generateFolderName(json, acceptLanguage);
  const folderPath = path.join(folderDirPath, folderName);
  const newUrlPath = path.join(newUrlDirPath, folderName);

  const url = json.fetch;
  const snapshotFilePath = `${folderPath}/snapshot.html`;
  const indexFilePath = `${folderPath}/index.html`;
  const newUrl = `${newUrlPath}/index.html`;

  const snapshotPDFFilePath = `${folderPath}/snapshot.pdf`;
  const newPDFUrl = `${newUrlPath}/snapshot.pdf`;

  if (fse.existsSync(folderPath)) {
    const existingFiles = fse.readdirSync(folderPath);
    if (existingFiles.includes('snapshot.pdf')) {
      return { url: newPDFUrl, isPDF: true };
    }
    return { url: newUrl };
  }

  fse.ensureDirSync(folderPath);
  const timerLabel = `downloading ${url} into ${folderPath}`;
  console.log(timerLabel);
  console.time(timerLabel);

  const parsedUrl = new URL(url);
  // extract domain name from subdomain
  const [extension, domain] = parsedUrl.hostname.split('.').reverse();
  const domainname = `${domain}.${extension}`;
  const hostname = getHostname(url, true);

  if (!json.select) {
    json.select = ['html'];
  }

  let snapshot: Snapshot;

  try {
    snapshot = await getSnapshot(json, { language: acceptLanguage });
  } catch (e: any) {
    console.error(e.toString());
    fse.removeSync(folderPath);
    throw e;
  }

  if (snapshot.mimeType === 'application/pdf') {
    fse.ensureFileSync(snapshotPDFFilePath);
    fse.writeFileSync(snapshotPDFFilePath, snapshot.content);
    return { isPDF: true, url: newPDFUrl };
  }

  fse.ensureFileSync(indexFilePath);
  fse.writeFileSync(snapshotFilePath, snapshot.content);
  const browser: Browser = await launchBrowser();

  const page = await browser.newPage();

  await setCustomUserAgent(page);

  await page.setRequestInterception(true);
  outputPageLogs(page);

  let assets: { from: string; to: string }[] = [];

  page.on('request', (request) => {
    if (request.resourceType() === 'script' && interceptCookieUrls(request.url(), [])) {
      console.log(`Blocking cookie url`, request.url());
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
      // add random string in case url is of type /static/?e=something
      // initially done for https://unternehmen.geizhals.at/allgemeine-geschaeftsbedingungen/
      targetPathname = `${pathname}_${Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')}.css`;
    }
    const existingUrl = `${pathname}${search}`;
    let rewrittenUrl = `${newUrlPath}${targetPathname}`;
    const relativeUrl = existingUrl.replace(parsedUrl.pathname, '');
    try {
      fse.outputFileSync(`${folderPath}${targetPathname}`, buffer, 'base64');
    } catch (e: any) {
      if (e.code !== 'ENAMETOOLONG') {
        throw e;
      }
      // file name is too long, try to shorten it
      const shorterPathname = `/name-too-long-${Math.random().toString(36).substring(2)}${
        resourceType === 'stylesheet' ? '.css' : '.js'
      }`;

      rewrittenUrl = `${newUrlPath}${shorterPathname}`;

      fse.outputFileSync(`${folderPath}${shorterPathname}`, buffer, 'base64');
    }

    // sometimes the url is relative to the root of the domain, so we need to remove both
    // and in order to prevent string to be replaced twice, we need to replace it along with the surrounding quotes
    assets.push({ from: `"${existingUrl}"`, to: `"${rewrittenUrl}"` });
    assets.push({ from: `'${existingUrl}'`, to: `'${rewrittenUrl}'` });

    // in case a relative link is present such as "libs/style.min.css" when url is "https://www.tchap.gouv.fr/faq/#_Toc4344724_04"
    assets.push({ from: `"${relativeUrl}"`, to: `"${rewrittenUrl}"` });
    assets.push({ from: `'${relativeUrl}'`, to: `'${rewrittenUrl}'` });

    assets.push({ from: response.url(), to: `${rewrittenUrl}` });
  });

  try {
    // Needed because setContent does not wait for resource to be loaded
    // https://github.com/puppeteer/puppeteer/issues/728#issuecomment-524884442
    // and page.goto(`file://${process.cwd()}/${snapshotFilePath}`) causes unexpected problems
    await page.goto(url, {
      waitUntil: 'networkidle0', // same as in OTA Core
      timeout: 30000,
    });
    await page.setContent(snapshot.content);

    await addMissingStyledComponents(page);
    await removeBaseTag(page);
    await waitForHashIfExists(page, parsedUrl.hash);
    await removeCookieBanners(page, hostname);

    const html = await page.content();

    fse.writeFileSync(indexFilePath, cleanHtml(html, assets));
  } catch (e: any) {
    console.error(e.toString());
    fse.removeSync(folderPath);
    throw e;
  }

  await page.close();

  await stopBrowser();

  console.timeEnd(timerLabel);
  return { url: newUrl };
};
