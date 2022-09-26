import type { OTAJson, OTAPageDeclaration } from 'modules/Common/services/open-terms-archive';
import useUrl from 'hooks/useUrl';
import React from 'react';

type PageArrayField = 'select' | 'remove';
type PageBooleanField = 'executeClientScripts';
type DocumentDeclarationStringField = 'name' | 'documentType';
type PageStringField = 'fetch';

const orderJSONFields = (json: OTAJson) => {
  const documentType = Object.keys(json.documents)[0];
  const page = json.documents[documentType];

  return {
    name: json.name,
    documents: documentType
      ? {
          [documentType]: {
            fetch: page?.fetch,
            ...(page?.select && page?.select.length ? { select: page.select } : {}),
            ...(page?.remove && page?.remove.length ? { remove: page.remove } : {}),
            ...(page?.filter && page?.filter.length ? { filter: page.filter } : {}),
            ...(page?.executeClientScripts
              ? { executeClientScripts: page.executeClientScripts }
              : {}),
            ...(page?.combine ? { combine: page.combine } : {}),
          },
        }
      : {},
  };
};

const parseCssSelector = (cssSelector: string) => {
  try {
    return JSON.parse(cssSelector);
  } catch (e) {
    return cssSelector;
  }
};

const createDeclarationFromQueryParams = (queryParams: any) => {
  const { url, selectedCss, removedCss, executeClientScripts, documentType, name, json } =
    queryParams;

  let declaration = {
    name: '?',
    documents: {},
  } as OTAJson;

  if (json) {
    declaration = JSON.parse(json);
  } else if (url) {
    // Support old URLs created by Open Terms Archive in GitHub issues
    declaration = {
      name,
      documents: {
        [documentType]: {
          fetch: url,
          executeClientScripts,
          select:
            typeof selectedCss === 'string'
              ? [selectedCss]
              : (selectedCss || []).map(parseCssSelector),
          remove:
            typeof removedCss === 'string'
              ? [removedCss]
              : (removedCss || []).map(parseCssSelector),
        },
      },
    };
  }

  return orderJSONFields(declaration);
};

const useDocumentDeclaration = () => {
  const { queryParams, pushQueryParam, pushQueryParams } = useUrl();
  const declaration = createDeclarationFromQueryParams(queryParams);

  const [document] = Object.entries(declaration.documents) || [[]];
  const [documentType, page] = document || [];

  const updateString = (field: PageStringField) => (value: string) => {
    declaration.documents[documentType][field] = value;
    pushQueryParam('json')(JSON.stringify(declaration));
  };

  const updateBoolean = (field: PageBooleanField) => (value?: boolean) => {
    if (value) {
      declaration.documents[documentType][field] = value;
    } else {
      delete declaration.documents[documentType][field];
    }
    pushQueryParam('json')(JSON.stringify(declaration));
  };

  const updateArray =
    (type: 'add' | 'update' | 'delete') =>
    (field: PageArrayField, index?: number) =>
    (value?: string) => {
      let pageField = page[field];
      if (!pageField) pageField = [];
      if (typeof pageField === 'string') {
        pageField = [pageField];
      }

      if (type === 'add' && value) {
        pageField = [...pageField, value];
      }
      if (type === 'delete' && typeof index === 'number') {
        delete pageField[index];
      }
      if (type === 'update' && typeof index === 'number') {
        try {
          pageField[index] = JSON.parse(value as any);
        } catch (e) {
          if (value) {
            pageField[index] = value;
          } else {
            delete pageField[index];
          }
        }
      }

      pageField = (pageField || []).filter(Boolean);
      declaration.documents[documentType][field] = pageField;

      pushQueryParam('json')(JSON.stringify(declaration));
    };

  const onDocumentDeclarationUpdate =
    (field: DocumentDeclarationStringField) => (value?: string) => {
      if (!value) {
        return;
      }
      if (field === 'documentType') {
        declaration.documents = { [value]: page };
      } else {
        declaration[field] = value;
      }
      pushQueryParam('json')(JSON.stringify(declaration));
    };

  const onPageDeclarationUpdate =
    (type: 'add' | 'update' | 'delete') =>
    (field: keyof OTAPageDeclaration, index?: number) =>
    (value?: string | boolean) => {
      if (Array.isArray(page[field]) || ['select', 'remove'].includes(field)) {
        updateArray(type)(field as PageArrayField, index)(value as string);
      } else if (typeof value === 'boolean') {
        updateBoolean(field as PageBooleanField)(value as boolean);
      } else if (typeof value === 'string') {
        updateString(field as PageStringField)(value as string);
      }

      // Reset page declaration when url is a PDF
      if (field === 'fetch' && typeof value === 'string' && value?.endsWith('.pdf')) {
        delete declaration.documents[documentType].select;
        delete declaration.documents[documentType].remove;
        delete declaration.documents[documentType].filter;
        delete declaration.documents[documentType].executeClientScripts;
        pushQueryParam('json')(JSON.stringify(declaration));
      }
    };

  React.useEffect(() => {
    if (!queryParams.json && page?.fetch) {
      pushQueryParams({
        ...queryParams,
        json: JSON.stringify(declaration),
        selectedCss: undefined,
        removedCss: undefined,
        url: undefined,
        name: undefined,
        documentType: undefined,
      });
    }
  }, [queryParams.json]);

  return {
    declaration,
    page,
    documentType,
    onDocumentDeclarationUpdate,
    onPageDeclarationUpdate,
  };
};

export default useDocumentDeclaration;
