import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from 'open-terms-archive/fetch';
import filter from 'open-terms-archive/filter';
import PageDeclaration from 'open-terms-archive/page-declaration';
import { cleanStringForFileSystem } from 'utils/filesystem';

export interface OTAJson {
  name: string;
  documents: {
    [key: string]: OTAPageDeclaration;
  };
}
interface OTASnapshot {
  content: string;
  mimeType: string;
}
interface OTAPageDeclaration {
  fetch: string;
  select?: any;
  remove?: any;
  executeClientScripts?: boolean;
}

type OTAVersion = string;

export interface Snapshot {
  content: string;
  mimeType: string;
  pageDeclaration: OTAPageDeclaration;
}

export const getSnapshot = async (
  pageDeclaration: OTAPageDeclaration,
  config: any
): Promise<Snapshot> => {
  await launchHeadlessBrowser();
  const { content, mimeType }: OTASnapshot = await fetch({
    url: pageDeclaration.fetch,
    executeClientScripts: pageDeclaration.executeClientScripts,
    cssSelectors: [
      ...PageDeclaration.extractCssSelectorsFromProperty(pageDeclaration.select),
      ...PageDeclaration.extractCssSelectorsFromProperty(pageDeclaration.remove),
    ].filter(Boolean),
    config,
  });
  await stopHeadlessBrowser();

  return {
    content,
    mimeType,
    pageDeclaration,
  };
};

export const getVersionFromSnapshot = async ({ content, mimeType, pageDeclaration }: Snapshot) => {
  const version: OTAVersion = await filter({
    content,
    mimeType,
    pageDeclaration: {
      location: pageDeclaration.fetch,
      contentSelectors: pageDeclaration.select,
      noiseSelectors: pageDeclaration.remove,
    },
  });

  return {
    version,
    snapshot: content,
    mimeType,
  };
};

export const getVersion = async (pageDeclaration: OTAPageDeclaration, config: any) => {
  const snapshot = await getSnapshot(pageDeclaration, config);

  return getVersionFromSnapshot(snapshot);
};

// In case executeClientScripts is true, ota snapshot fetcher will wait
// for selector to be found on the page. The resulting snapshot will be
// different each time a new selector is added.
// This is the same if language changes
export const generateFolderName = (
  { fetch, select, executeClientScripts }: OTAPageDeclaration,
  additionalParameter?: string
) => {
  const MAX_FOLDER_CHARACTERS = 256;
  const urlString = cleanStringForFileSystem(fetch.replace(/http?s:\/\//, ''));
  const selectString = select
    ? `_${PageDeclaration.extractCssSelectorsFromProperty(select).filter(Boolean)}`
    : '';
  const fullDomParameters = executeClientScripts ? `1_${selectString}` : '0';
  const additionalParameters = additionalParameter || '';

  const downloadParameters = `_${[fullDomParameters, additionalParameters]
    .filter(Boolean)
    .map(cleanStringForFileSystem)
    .join('_')}`;

  const leftCharactersForUrl = MAX_FOLDER_CHARACTERS - downloadParameters.length;

  return `${urlString.substring(0, leftCharactersForUrl - 1)}${downloadParameters}`;
};

export const launchBrowser = launchHeadlessBrowser;
export const stopBrowser = stopHeadlessBrowser;
