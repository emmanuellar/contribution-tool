import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from 'open-terms-archive/fetch';
import filter from 'open-terms-archive/filter';

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
    cssSelectors: documentDeclaration.select,
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

export const launchBrowser = launchHeadlessBrowser;
export const stopBrowser = stopHeadlessBrowser;
