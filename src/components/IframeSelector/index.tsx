import React from 'react';
import { useToggle } from 'react-use';
// import fs from 'fs';
import type { OTASelector } from 'modules/Common/services/open-terms-archive';

interface IframeSelectorProps {
  url: string;
  selected?: OTASelector[];
  removed?: OTASelector[];
  hidden?: string[];
  selectable: boolean;
  onSelect: (cssPath: string) => any;
  onReady: () => any;
}

// const injectedScript = fs.readFileSync('./_iframeInjectedScript');

const BASE_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}${
  process.env.NEXT_PUBLIC_BASE_PATH || ''
}`;
const CSS_PATH_FINDER_URL = `${BASE_URL}/iframe-selector/css-path-finder.js`;
const INJECTED_SCRIPT_URL = `${BASE_URL}/iframe-selector/injected-script.js`;
const GLOBAL_STYLE_TAG_ID = 'ota-global-style';
const CUSTOM_STYLE_TAG_ID = 'ota-custom-style'; // same as in /public/iframe-selector/injected-script.js
const STYLE_TAG_ID = 'ota-style'; // same as in /public/iframe-selector/injected-script.js
const STYLE_HIGHLIGHT_ID = 'ota-highlight'; // same as in /public/iframe-selector/injected-script.js
const EVENT_NAME = 'ota-event'; // same as in /public/iframe-selector/injected-script.js

// Initially done to display even fadeIn elements on https://policy.pinterest.com/fr/privacy-policy
// added `body > *` in order to let top elements like modals background untouched
// added `:not(.modal)` as we do not want modals to be displayed if they should not be
const preventFadeInRule = `
body > * *:not(#${STYLE_HIGHLIGHT_ID}):not(.modal) {
  opacity: 1!important;
}`;

// Initially done to force page to scroll after removing newsletter popups
// example https://www.comptoirdescotonniers.com/cgv-c4.html
// added class as it was conflicting with https://support.google.com/business/answer/9292476?hl=en
const forceScrollRule = `
html[class*="modal"], body[class*="modal"] {
  overflow: auto!important;
  height: auto!important;
  position: relative!important;
}`;

// Initially done to remove anti flickering from Google Opimize
// that causes blank page
// example https://www.allovoisins.com/page/conditions-generales-de-vente-et-d-utilisation
const removeGoogleOptimizeAntiFlickr = `
html.async-hide {
  opacity: inherit !important;
}
`;

const globalRules = `
${preventFadeInRule}
${forceScrollRule}
${removeGoogleOptimizeAntiFlickr}
`;

const generateColorizedCSS = (cssSelectors: string[], { bgColor, borderColor }: any) => {
  const selectors = cssSelectors.join(',');
  const childSelectors = cssSelectors.map((selector) => `${selector} *`).join(',');

  return cssSelectors.length > 0
    ? `
${selectors} { background: ${bgColor}!important; box-shadow: 0 0 0 2px ${borderColor}!important; }
${childSelectors} { background: ${bgColor}!important; }
`
    : '';
};

const generateHiddenCSS = (cssSelectors: string[]) => {
  const selectors = cssSelectors.join(',');

  return cssSelectors.length > 0
    ? `
${selectors} { display: none!important; }
`
    : '';
};

const generateBeforeAfterCSS = (
  cssSelectors: string[],
  {
    type,
    color,
    direction,
  }: { type: 'before' | 'after'; color: string; direction: 'bottom' | 'top' }
) => {
  const selectors = cssSelectors.join(',');
  const pseudoSelectors = cssSelectors.map((n) => `${n}:${type}`).join(',');

  const position =
    type === 'before' && direction === 'top'
      ? 'top:-25px;'
      : type === 'before' && direction === 'bottom'
      ? 'top:0;'
      : type === 'after' && direction === 'bottom'
      ? 'bottom:-25px;'
      : type === 'after' && direction === 'top'
      ? 'bottom:0;'
      : '';

  return cssSelectors.length > 0
    ? `
    ${selectors} { border: 2px solid ${color}; min-width: 150px; position:relative; }
    ${pseudoSelectors} { 
      content: "";
      position: absolute;
      min-width: 80px;
      left: 0;
      right: 0;
      margin: 0 auto;
      width: 0;
      height: 0;
      ${position}
      border-${direction === 'top' ? 'bottom' : 'top'}: 25px solid ${color};
      border-left: 100px solid transparent;
      border-right: 100px solid transparent;
    }
`
    : '';
};

interface FormattedSelectors {
  select: string[];
  startBefore: string[];
  endBefore: string[];
  startAfter: string[];
  endAfter: string[];
}

const getSelectorsAsArrays = (cssSelectors: OTASelector[]) => {
  return cssSelectors
    .filter((selector) => !!selector)
    .reduce(
      (acc: FormattedSelectors, value) => {
        if (typeof value === 'object') {
          const { startBefore, endBefore, startAfter, endAfter } = value;

          return {
            ...acc,
            startBefore: [...acc.startBefore, ...(startBefore ? [startBefore] : [])],
            endBefore: [...acc.endBefore, ...(endBefore ? [endBefore] : [])],
            startAfter: [...acc.startAfter, ...(startAfter ? [startAfter] : [])],
            endAfter: [...acc.endAfter, ...(endAfter ? [endAfter] : [])],
          };
        } else {
          // value is a plain selector and not an object with startBefore, endBefore, startAfter, endAfter
          return { ...acc, select: [...acc.select, value] };
        }
      },
      { select: [], startBefore: [], endBefore: [], startAfter: [], endAfter: [] }
    );
};

const IframeSelector = ({
  url,
  selectable,
  selected = [],
  removed = [],
  hidden = [],
  onSelect,
  onReady,
}: IframeSelectorProps) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, toggleIframeLoaded] = useToggle(false);
  const [initDone, toggleInitDone] = useToggle(false);

  const onSelectInIframe = React.useCallback(
    (data: any) => {
      const cssPath = data.detail?.cssPath;
      onSelect(cssPath);
    },
    [onSelect]
  );

  const hightlightSelected = React.useCallback(() => {
    const iframeDocument = iframeRef?.current?.contentDocument;
    if (!iframeDocument || !iframeDocument.querySelector(`#${CUSTOM_STYLE_TAG_ID}`)) {
      return;
    }

    const selectedCssSelectors = getSelectorsAsArrays(selected);
    const removedCssSelectors = getSelectorsAsArrays(removed);
    const hiddenCssSelectors = getSelectorsAsArrays(hidden);

    // @ts-ignore
    iframeDocument.querySelector(`#${CUSTOM_STYLE_TAG_ID}`).innerHTML = `
      /* normal selection */
      ${generateColorizedCSS(selectedCssSelectors.select, {
        bgColor: '#8acfb1',
        borderColor: '#169b62',
      })}
      ${generateColorizedCSS(removedCssSelectors.select, {
        bgColor: '#e39694',
        borderColor: '#e10600',
      })}
      ${generateHiddenCSS(hiddenCssSelectors.select)}
      
      ${generateBeforeAfterCSS(selectedCssSelectors.startBefore, {
        type: 'before',
        direction: 'bottom',
        color: '#10c434',
      })}
      ${generateBeforeAfterCSS(selectedCssSelectors.startAfter, {
        type: 'after',
        direction: 'bottom',
        color: '#10c434',
      })}
      ${generateBeforeAfterCSS(selectedCssSelectors.endBefore, {
        type: 'before',
        direction: 'top',
        color: '#10c434',
      })}
      ${generateBeforeAfterCSS(selectedCssSelectors.endAfter, {
        type: 'after',
        direction: 'top',
        color: '#10c434',
      })}
      
      ${generateBeforeAfterCSS(removedCssSelectors.startBefore, {
        type: 'before',
        direction: 'bottom',
        color: '#f01648',
      })}
      ${generateBeforeAfterCSS(removedCssSelectors.startAfter, {
        type: 'after',
        direction: 'bottom',
        color: '#f01648',
      })}
      ${generateBeforeAfterCSS(removedCssSelectors.endBefore, {
        type: 'before',
        direction: 'top',
        color: '#f01648',
      })}
      ${generateBeforeAfterCSS(removedCssSelectors.endAfter, {
        type: 'after',
        direction: 'top',
        color: '#f01648',
      })}
    `;
  }, [selected, removed, hidden]);

  React.useEffect(() => {
    if (!initDone) {
      return;
    }
    const iframeWindow = iframeRef?.current?.contentWindow;

    if (iframeWindow) {
      // use a custom key because other extensions may use this postMessage too
      iframeWindow.postMessage({ ima: selectable }, '*');
    }
  }, [selectable, initDone]);

  React.useEffect(() => {
    if (!initDone) {
      return;
    }

    hightlightSelected();
  }, [initDone, selected, removed]);

  React.useEffect(() => {
    if (!initDone) {
      return;
    }
    window.document.addEventListener(EVENT_NAME, onSelectInIframe, false);
    return () => {
      window.document.removeEventListener(EVENT_NAME, onSelectInIframe);
    };
  }, [onSelect, initDone]);

  React.useEffect(() => {
    if (!iframeLoaded) {
      return;
    }
    if (!iframeRef.current) {
      return;
    }
    const iframeDocument = iframeRef.current.contentDocument;
    if (!iframeDocument) {
      return;
    }

    const highlight = document.createElement('div');
    highlight.id = STYLE_HIGHLIGHT_ID;
    iframeDocument.body.appendChild(highlight);

    // Add a custom style we will populate after
    const customStyle = document.createElement('style');
    customStyle.id = CUSTOM_STYLE_TAG_ID;
    iframeDocument.body.appendChild(customStyle);

    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    iframeDocument.body.appendChild(style);

    const globalStyle = document.createElement('style');
    globalStyle.innerHTML = globalRules;
    globalStyle.id = GLOBAL_STYLE_TAG_ID;
    iframeDocument.body.appendChild(globalStyle);

    const finderScript = document.createElement('script');
    finderScript.src = CSS_PATH_FINDER_URL;
    iframeDocument.body.appendChild(finderScript);

    const script = document.createElement('script');
    script.src = INJECTED_SCRIPT_URL;
    iframeDocument.body.appendChild(script);

    hightlightSelected();
    toggleInitDone(true);
    onReady();
  }, [iframeLoaded]);

  return (
    <div>
      <iframe
        loading="lazy"
        ref={iframeRef}
        src={url}
        width="100%"
        style={{ height: '100vh', opacity: initDone ? 1 : 0.4 }}
        onLoad={toggleIframeLoaded}
      />
    </div>
  );
};

export default IframeSelector;
