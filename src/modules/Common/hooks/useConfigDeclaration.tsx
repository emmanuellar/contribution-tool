import useUrl from 'hooks/useUrl';

const useConfigDeclaration = () => {
  const {
    queryParams: { destination, localPath, acceptLanguage, hiddenCss, expertMode },
    pushQueryParam,
    removeQueryParam,
  } = useUrl();

  if (!destination && typeof window !== 'undefined') {
    // This is here as previously created issues still point at a url that has no `destination` param
    pushQueryParam('destination')('OpenTermsArchive/contrib-declarations');
  }

  const hiddenCssSelectors: string[] = !hiddenCss
    ? []
    : Array.isArray(hiddenCss)
    ? hiddenCss
    : [hiddenCss];

  const onHiddenCssSelectorsUpdate =
    (type: 'add' | 'update' | 'delete') => (index?: number) => (value?: string) => {
      const newCssSelectors = [...hiddenCssSelectors];
      if (type === 'add' && value) newCssSelectors.push(value);
      if (type === 'update' && value) newCssSelectors[index as number] = value;
      if (type === 'delete') delete newCssSelectors[index as number];

      pushQueryParam('hiddenCss')(newCssSelectors);
    };

  const onConfigInputChange =
    (field: 'acceptLanguage' | 'expertMode') => (value: boolean | string) => {
      if (value) {
        pushQueryParam(field)(typeof value === 'boolean' ? 'true' : value);
      } else {
        removeQueryParam(field);
      }
    };

  return {
    acceptLanguage,
    destination,
    localPath,
    onHiddenCssSelectorsUpdate,
    hiddenCssSelectors,
    onConfigInputChange,
    expertMode,
  };
};

export default useConfigDeclaration;
