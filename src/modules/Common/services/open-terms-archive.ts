import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from 'open-terms-archive/fetch';
import filter from 'open-terms-archive/filter';

export const getVersion = async (config: any) => {
  await launchHeadlessBrowser();
  const { content, mimeType } = await fetch({
    url: config.fetch,
    executeClientScripts: config.executeClientScripts,
    cssSelectors: config.select,
  });
  await stopHeadlessBrowser();

  const version = await filter({
    content,
    mimeType,
    documentDeclaration: {
      location: config.fetch,
      contentSelectors: config.select,
      noiseSelectors: config.remove,
    },
  });
  return {
    version,
    snapshot: content,
    mimeType,
  };
};
