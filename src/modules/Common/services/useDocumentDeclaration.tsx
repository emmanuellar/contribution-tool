import type {
  OTAJson,
  OTAPageDeclaration,
  OTASelector,
} from 'modules/Common/services/open-terms-archive';
import useUrl from 'hooks/useUrl';

type PageArrayField = 'select' | 'remove';
type PageBooleanField = 'executeClientScripts';
type StringField = 'name' | 'documentType' | 'fetch';

const selectorsMapping = {
  name: 'name',
  documentType: 'documentType',
  fetch: 'url',
  select: 'selectedCss',
  remove: 'removedCss',
  filter: 'filter',
  executeClientScripts: 'executeClientScripts',
};

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
const buildCssSelector = (cssSelector: OTASelector) =>
  typeof cssSelector === 'string' ? cssSelector : JSON.stringify(cssSelector);

const createDeclarationFromQueryParams = (queryParams: any) => {
  const { url, selectedCss, removedCss, executeClientScripts, documentType, name } = queryParams;

  let declaration = {
    name: '?',
    documents: {},
  } as OTAJson;

  if (url) {
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
  const { queryParams, pushQueryParam, removeQueryParam, removeQueryParams } = useUrl();
  const declaration = createDeclarationFromQueryParams(queryParams);

  const [document] = Object.entries(declaration.documents) || [[]];
  const [documentType, page] = document || [];

  const updateString = (field: StringField) => (value?: string) => {
    if (value) {
      pushQueryParam(selectorsMapping[field])(value);
    } else {
      removeQueryParam(selectorsMapping[field]);
    }
  };

  const updateBoolean = (field: PageBooleanField) => (value?: boolean) => {
    if (value) {
      pushQueryParam(selectorsMapping[field])('true');
    } else {
      removeQueryParam(selectorsMapping[field]);
    }
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

      if (pageField.length === 0) {
        removeQueryParam(selectorsMapping[field]);
        return;
      }
      pushQueryParam(selectorsMapping[field])(pageField.map(buildCssSelector));
    };

  const onPageDeclarationUpdate =
    (type: 'add' | 'update' | 'delete') =>
    (field: keyof OTAPageDeclaration, index?: number) =>
    (value?: string | boolean) => {
      if (Array.isArray(page[field]) && ['select', 'remove'].includes(field)) {
        updateArray(type)(field as PageArrayField, index)(value as string);
      } else if (typeof value === 'boolean') {
        updateBoolean(field as PageBooleanField)(value as boolean);
      } else if (typeof value === 'string') {
        updateString(field as StringField)(value as string);
      }

      // Reset page declaration when url is a PDF
      if (field === 'fetch' && typeof value === 'string' && value?.endsWith('.pdf')) {
        removeQueryParams([
          selectorsMapping.select,
          selectorsMapping.remove,
          selectorsMapping.filter,
          selectorsMapping.executeClientScripts,
        ]);
      }
    };

  return {
    declaration,
    page,
    documentType,
    onDocumentDeclarationUpdate: updateString,
    onPageDeclarationUpdate,
  };
};

export default useDocumentDeclaration;
