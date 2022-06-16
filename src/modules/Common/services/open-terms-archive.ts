import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from 'open-terms-archive/fetch';
import filter from 'open-terms-archive/filter';

export const getVersion = async (documentDeclaration: any, config: any) => {
  await launchHeadlessBrowser();
  const { content, mimeType } = await fetch({
    url: documentDeclaration.fetch,
    executeClientScripts: documentDeclaration.executeClientScripts,
    cssSelectors: documentDeclaration.select,
    config,
  });
  await stopHeadlessBrowser();

  const version = await filter({
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
