import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from 'open-terms-archive/fetch';
import filter from 'open-terms-archive/filter';
import DocumentDeclaration from 'open-terms-archive/document-declaration';
import { cleanStringForFileSystem } from 'utils/filesystem';

export interface OTAJson {
  name: string;
  documents: {
    [key: string]: OTADocumentDeclaration;
  };
}
interface OTASnapshot {
  content: string;
  mimeType: string;
}
interface OTADocumentDeclaration {
  fetch: string;
  select?: any;
  remove?: any;
  executeClientScripts?: boolean;
}

type OTAVersion = string;

export interface Snapshot {
  content: string;
  mimeType: string;
  documentDeclaration: OTADocumentDeclaration;
}

export const getSnapshot = async (
  documentDeclaration: OTADocumentDeclaration,
  config: any
): Promise<Snapshot> => {
  await launchHeadlessBrowser();
  const { content, mimeType }: OTASnapshot = await fetch({
    url: documentDeclaration.fetch,
    executeClientScripts: documentDeclaration.executeClientScripts,
    cssSelectors: [
      ...DocumentDeclaration.extractCssSelectorsFromProperty(documentDeclaration.select),
      ...DocumentDeclaration.extractCssSelectorsFromProperty(documentDeclaration.remove),
    ].filter(Boolean),
    config,
  });
  await stopHeadlessBrowser();

  return {
    content,
    mimeType,
    documentDeclaration,
  };
};

export const getVersionFromSnapshot = async ({
  content,
  mimeType,
  documentDeclaration,
}: Snapshot) => {
  const version: OTAVersion = await filter({
    content,
    mimeType,
    documentDeclaration: {
      location: documentDeclaration.fetch,
      contentSelectors: documentDeclaration.select,
      noiseSelectors: documentDeclaration.remove,
    },
  });

  return {
    version,
    snapshot: content,
    mimeType,
  };
};

export const getVersion = async (documentDeclaration: OTADocumentDeclaration, config: any) => {
  const snapshot = await getSnapshot(documentDeclaration, config);

  return getVersionFromSnapshot(snapshot);
};

// In case executeClientScripts is true, ota snapshot fetcher will wait
// for selector to be found on the page. The resulting snapshot will be
// different each time a new selector is added.
// This is the same if language changes
export const generateFolderName = (
  { fetch, select, executeClientScripts }: OTADocumentDeclaration,
  additionalParameter?: string
) => {
  const MAX_FOLDER_CHARACTERS = 256;
  const urlString = cleanStringForFileSystem(fetch.replace(/http?s:\/\//, ''));
  const selectString = select
    ? `_${DocumentDeclaration.extractCssSelectorsFromProperty(select).filter(Boolean)}`
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
