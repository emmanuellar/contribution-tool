import { FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from '../modules/Contribute/interfaces';
import { useEvent, useLocalStorage } from 'react-use';
import { MdClose as IconClose } from 'react-icons/md';

import Button from 'modules/Common/components/Button';
import Drawer from 'components/Drawer';
import { FiAlertTriangle as IconAlert } from 'react-icons/fi';
import IframeSelector from 'components/IframeSelector';
import LinkIcon from 'modules/Common/components/LinkIcon';
import Loading from 'components/Loading';
import React from 'react';
import api from 'utils/api';
import classNames from 'classnames';
import debounce from 'lodash/debounce';
import { getDocumentTypes } from 'modules/Github/api';
import s from './service.module.css';
import useNotifier from 'hooks/useNotifier';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useToggle } from 'react-use';
import { useTranslation } from 'next-i18next';
import useUrl from 'hooks/useUrl';
import { withI18n } from 'modules/I18n';
import ServiceHelpDialog from 'modules/Common/components/ServiceHelpDialog';
import Version from 'modules/Common/data-components/Version';

const EMAIL_SUPPORT = 'contribute@opentermsarchive.org';

const significantCssClass = 'selectedCss';
const insignificantCssClass = 'removedCss';
const hiddenCssClass = 'hiddenCss';
type CssRuleChange = 'selectedCss' | 'removedCss' | 'hiddenCss';

const ServicePage = ({ documentTypes }: { documentTypes: string[] }) => {
  let [isServiceHelpViewed, setServiceHelpViewed] = useLocalStorage(
    'serviceHelpDialogViewed',
    false
  );
  const [isServiceVerifyDisplayed, toggleServiceVerifyDisplayed] = useToggle(false);

  const router = useRouter();
  const { t } = useTranslation();
  const { notify } = useNotifier();
  const {
    queryParams: {
      destination,
      localPath,
      versionsRepo,
      url,
      [significantCssClass]: initialSignificantCss,
      [insignificantCssClass]: initialInsignificantCss,
      [hiddenCssClass]: initialHiddenCss,
      acceptLanguage,
      executeClientScripts,
      documentType: initialDocumentType,
      name: initialName,
      expertMode,
    },
    pushQueryParam,
    removeQueryParams,
    removeQueryParam,
  } = useUrl();

  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}${
    versionsRepo ? `&versionsRepo=${versionsRepo}` : ''
  }`;
  useEvent('touchstart', () => {
    router.push(`/sorry?${commonUrlParams}`);
  });

  if (!destination && typeof window !== 'undefined') {
    // This is here as previously created issues still point at a url that has no `destination` param
    pushQueryParam('destination')('OpenTermsArchive/contrib-declarations');
  }

  const json = {
    name: initialName || '???',
    documents: {
      [initialDocumentType || '???']: {
        fetch: url,
        select: initialSignificantCss,
        remove: initialInsignificantCss,
        ...(executeClientScripts ? { executeClientScripts: true } : {}),
      },
    },
  };

  const [isPdf, toggleIsPdf] = useToggle(/\.pdf$/gi.test(url));

  const [selectable, toggleSelectable] = React.useState('');
  const [iframeReady, toggleIframeReady] = useToggle(false);
  const [loading, toggleLoading] = useToggle(false);

  const significantCss = !initialSignificantCss
    ? []
    : Array.isArray(initialSignificantCss)
    ? initialSignificantCss
    : [initialSignificantCss];

  const insignificantCss = !initialInsignificantCss
    ? []
    : Array.isArray(initialInsignificantCss)
    ? initialInsignificantCss
    : [initialInsignificantCss];

  const hiddenCss = !initialHiddenCss
    ? []
    : Array.isArray(initialHiddenCss)
    ? initialHiddenCss
    : [initialHiddenCss];

  const documentDeclaration = Object.values(json.documents)[0];
  let apiUrlParams = `json=${encodeURIComponent(JSON.stringify(documentDeclaration))}`;

  if (acceptLanguage) {
    apiUrlParams = `${apiUrlParams}&acceptLanguage=${encodeURIComponent(acceptLanguage)}`;
  }

  const shouldNotRefetchDocument = isPdf || !documentDeclaration.fetch;
  const apiUrl = `/api/services?${apiUrlParams}`;

  const { data } = useSWR<GetContributeServiceResponse>(shouldNotRefetchDocument ? null : apiUrl, {
    revalidateOnMount: true,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  if (!url) {
    return null;
  }

  const selectInIframe = (queryparam: CssRuleChange) => () => {
    toggleSelectable(queryparam);
  };

  const onSelect = React.useCallback(
    (cssPath: string) => {
      let cssRules = [];
      switch (true) {
        case selectable === significantCssClass:
          cssRules = significantCss;
          break;
        case selectable === insignificantCssClass:
          cssRules = insignificantCss;
          break;
        case selectable === hiddenCssClass:
          cssRules = hiddenCss;
          break;
      }

      if (!cssRules.includes(cssPath)) {
        pushQueryParam(selectable)([...cssRules, cssPath]);
      }
      toggleSelectable('');
    },
    [url, hiddenCss, insignificantCss, significantCss, pushQueryParam, selectable, toggleSelectable]
  );

  const onChangeCssRule = (queryparam: CssRuleChange, index: number) => (e: any) => {
    const value = e.target?.value;
    if (!value) {
      onRemoveCssRule(queryparam, index)();
      return;
    }

    let cssRules = [];
    switch (true) {
      case queryparam === significantCssClass:
        cssRules = significantCss;
        break;
      case queryparam === insignificantCssClass:
        cssRules = insignificantCss;
        break;
      case queryparam === hiddenCssClass:
        cssRules = hiddenCss;
        break;
    }

    const newCss = [...cssRules];
    newCss[index] = value;
    pushQueryParam(queryparam)(newCss);
  };

  const onRemoveCssRule = (queryparam: CssRuleChange, index: number) => () => {
    let cssRules = [];

    switch (true) {
      case queryparam === significantCssClass:
        cssRules = significantCss;
        break;
      case queryparam === insignificantCssClass:
        cssRules = insignificantCss;
        break;
      case queryparam === hiddenCssClass:
        cssRules = hiddenCss;
        break;
    }
    const newCss = [...cssRules];
    delete newCss[index];
    pushQueryParam(queryparam)(newCss);
  };

  const onInputChange = (fieldName: string) =>
    debounce((event: any) => {
      pushQueryParam(fieldName)(event.target.value);
    }, 500);

  const onCheckboxChange = (fieldName: string) => (event: any) => {
    if (event.target.checked) {
      pushQueryParam(fieldName)('true');
    } else {
      removeQueryParam(fieldName);
    }
  };

  const toggleExpertMode = () => {
    pushQueryParam('expertMode')(!!expertMode ? '' : 'true');
  };

  const onVerify = async () => {
    toggleServiceVerifyDisplayed(true);
  };

  const onValidate = async () => {
    toggleLoading(true);
    try {
      const {
        data: { url, message },
      } = await api.post<PostContributeServiceResponse>('/api/services', {
        destination,
        json,
        name: initialName,
        documentType: initialDocumentType,
        url: `${window.location.href}&expertMode=true`,
      });

      if (!url) {
        const subject = 'Here is a new service to track in Open Terms Archive';
        const body = `Hi,

  I need you to track "${initialDocumentType}" of "${initialName}" for me.

  Here is the url ${window.location.href}&expertMode=true

  Thank you very much`;
        notify(
          'error',
          <>
            {t('service:could_not_create_issue')} <em>({message})</em>
            <br />
            <Button
              onClick={() => {
                window.open(
                  `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
                  '_blank'
                );
              }}
            >
              {t('service:send_email')}
            </Button>
          </>,
          { autoClose: 10000 }
        );
        toggleLoading(false);
        return;
      }
      router.push(`/thanks?${commonUrlParams}&url=${encodeURIComponent(url)}`);
    } catch (e: any) {
      notify('error', e.toString());
      toggleLoading(false);
    }
  };

  const onErrorClick = () => {
    const subject = 'I tried to add this service but it did not work';
    const body = `Hi,

I need you to track "${initialDocumentType}" of "${initialName}" for me but I had a failure with.

-----
${data?.error}
-----

Here is the url ${window.location.href}&expertMode=true

Thank you very much`;

    window.open(
      `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  const saveOnLocal = async () => {
    await api.post('/api/services', {
      versionsRepo,
      path: localPath,
      data: JSON.stringify(json),
    });
  };

  const submitDisabled = (!initialSignificantCss && !isPdf) || (!iframeReady && !isPdf) || loading;
  const isLoadingIframe = !data && !isPdf;

  React.useEffect(() => {
    if (!!data?.isPdf) {
      toggleIsPdf(true);
      removeQueryParams([hiddenCssClass, insignificantCssClass, significantCssClass]);
    }
  }, [data?.isPdf, removeQueryParams]);

  React.useEffect(() => {
    if (data?.url !== url) {
      toggleIframeReady(false);
    }
  }, [url, data?.url]);

  return (
    <div className={s.wrapper}>
      {!isServiceHelpViewed && (
        <ServiceHelpDialog open={!isServiceHelpViewed} onClose={() => setServiceHelpViewed(true)} />
      )}
      <Drawer className={s.drawer}>
        <>
          <nav className={s.drawerNav}>
            <LinkIcon
              className={s.backButton}
              iconColor="var(--colorBlack400)"
              href={`/?${commonUrlParams}`}
              direction="left"
              small={true}
            >
              {t('service:back')}
            </LinkIcon>
          </nav>
          <div className={s.formWrapper}>
            <form>
              <div>
                <div className={classNames('formfield')}>
                  <label>{t('service:form.url')}</label>
                  <div className={classNames('select')}>
                    <input defaultValue={url} onChange={onInputChange('url')} />
                  </div>
                </div>
                <div className={classNames('formfield')}>
                  <label>{t('service:form.documentType')}</label>
                  <div className={classNames('select')}>
                    <select
                      onChange={onInputChange('documentType')}
                      defaultValue={initialDocumentType}
                    >
                      <option value="">{t('service:form.select')}</option>
                      {documentTypes.map((documentType) => (
                        <option key={documentType} value={documentType}>
                          {documentType}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown color="333333"></FiChevronDown>
                  </div>
                </div>
                <div className={classNames('formfield')}>
                  <label>{t('service:form.serviceName')}</label>
                  <input defaultValue={initialName} onChange={onInputChange('name')} />
                </div>
                {!isPdf && (
                  <>
                    <div className={classNames('formfield')}>
                      <label>{t('service:form.significantPart')}</label>
                      {significantCss.map((selected, i) => (
                        <div key={selected} className={s.selectionItem}>
                          <input
                            defaultValue={selected}
                            onChange={onChangeCssRule(significantCssClass, i)}
                          />

                          <Button
                            onClick={onRemoveCssRule(significantCssClass, i)}
                            type="secondary"
                            size="sm"
                            onlyIcon={true}
                          >
                            <FiTrash2></FiTrash2>
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={selectInIframe(significantCssClass)}
                        disabled={!!selectable || !iframeReady}
                        type="secondary"
                        size="sm"
                      >
                        {t('service:form.significantPart.cta')}
                      </Button>
                    </div>

                    {(significantCss.length > 0 || insignificantCss.length > 0) && (
                      <div className={classNames('formfield')}>
                        <label>{t('service:form.insignificantPart')}</label>

                        {insignificantCss.map((selected, i) => (
                          <div key={selected} className={s.selectionItem}>
                            <input
                              defaultValue={selected}
                              onChange={onChangeCssRule(insignificantCssClass, i)}
                            />

                            <Button
                              onClick={onRemoveCssRule(insignificantCssClass, i)}
                              type="secondary"
                              size="sm"
                              onlyIcon={true}
                            >
                              <FiTrash2></FiTrash2>
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={selectInIframe(insignificantCssClass)}
                          disabled={!!selectable || !iframeReady}
                          type="secondary"
                          size="sm"
                        >
                          {t('service:form.insignificantPart.cta')}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                <div className={classNames('formfield', s.toggleExpertMode)}>
                  <a onClick={toggleExpertMode}>{t('service:expertMode')}</a>

                  {expertMode ? (
                    <FiChevronUp color="333333"></FiChevronUp>
                  ) : (
                    <FiChevronDown color="333333"></FiChevronDown>
                  )}
                </div>
                {expertMode && (
                  <>
                    <div className={classNames('formfield')}>
                      <label>{t('service:form.executeClientScripts')}</label>
                      <small className={s.moreinfo}>
                        {t('service:form.executeClientScripts.more')}
                      </small>
                      <div className={classNames('select')}>
                        <input
                          type="checkbox"
                          defaultChecked={!!executeClientScripts}
                          onChange={onCheckboxChange('executeClientScripts')}
                          disabled={isPdf}
                        />
                      </div>
                    </div>
                    {!isPdf && (
                      <div className={classNames('formfield')}>
                        <label>{t('service:form.hiddenPart')}</label>
                        <small className={s.moreinfo}>{t('service:form.hiddenPart.more')}</small>
                        {hiddenCss.map((hidden, i) => (
                          <div key={hidden} className={s.selectionItem}>
                            <input
                              defaultValue={hidden}
                              onChange={onChangeCssRule(hiddenCssClass, i)}
                            />

                            <Button
                              onClick={onRemoveCssRule(hiddenCssClass, i)}
                              type="secondary"
                              size="sm"
                              onlyIcon={true}
                            >
                              <FiTrash2></FiTrash2>
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={selectInIframe(hiddenCssClass)}
                          disabled={!!selectable || !iframeReady}
                          type="secondary"
                          size="sm"
                        >
                          {t('service:form.hiddenPart.cta')}
                        </Button>
                      </div>
                    )}
                    <div className={classNames('formfield')}>
                      <label>{t('service:form.acceptLanguage')}</label>
                      <small className={s.moreinfo}>{t('service:form.acceptLanguage.more')}</small>
                      <div className={classNames('select')}>
                        <input
                          defaultValue={acceptLanguage}
                          onChange={onInputChange('acceptLanguage')}
                          minLength={2}
                        />
                      </div>
                    </div>
                    <div className={classNames('formfield', s.expert)}>
                      <label>{t('service:form.label.json')}</label>
                      <pre className={classNames(s.json)}>{JSON.stringify(json, null, 2)}</pre>
                      <div className={classNames(s.expertButtons)}>
                        {localPath && (
                          <Button
                            onClick={saveOnLocal}
                            size="sm"
                            type="secondary"
                            title={`Save on ${localPath}`}
                          >
                            {t('service:expertMode.button.label')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          <div className={s.formBottom}>
            {!executeClientScripts && iframeReady && !isPdf && (
              <div
                className={classNames(s.formInfos, 'text__light', 'text__error', 'text__center')}
              >
                <IconAlert /> {t('service:pageNotAccurate.desc')}
                <br />
                <a
                  className={classNames('text__error')}
                  onClick={() => pushQueryParam('executeClientScripts')('true')}
                >
                  {t('service:pageNotAccurate.cta')}
                </a>
              </div>
            )}

            <nav className={s.formActions}>
              <Button disabled={submitDisabled} type="secondary" onClick={onVerify}>
                {loading ? '...' : t('service:verify')}
              </Button>
              <Button disabled={submitDisabled} onClick={onValidate}>
                {loading ? '...' : t('service:submit')}
              </Button>
            </nav>
          </div>
        </>
      </Drawer>
      <div className={s.main}>
        {isLoadingIframe && (
          <div className={s.fullPage}>
            <h1>{t('service:loading.title')}</h1>
            <p>{t('service:loading.subtitle')}</p>
            <Loading />
          </div>
        )}
        {!isLoadingIframe && data?.error && (
          <div className={s.fullPage}>
            <h1>{t('service:error.title')}</h1>
            <p>{data?.error}</p>
            <Button onClick={onErrorClick}>{t('service:error.cta')}</Button>
          </div>
        )}
        {isServiceVerifyDisplayed && (
          <div className={classNames(s.fullPageAbove)}>
            <Version json={json} />
            <button onClick={toggleServiceVerifyDisplayed}>
              <IconClose />
            </button>
          </div>
        )}
        {!isLoadingIframe && !data?.error && isPdf && (
          <iframe src={url} width="100%" style={{ height: '100vh' }} />
        )}
        {!isLoadingIframe && !data?.error && !isPdf && (
          <IframeSelector
            selectable={!!selectable}
            url={isPdf ? url : data?.url}
            selected={significantCss}
            removed={insignificantCss}
            hidden={hiddenCss}
            onSelect={onSelect}
            onReady={toggleIframeReady}
          />
        )}
      </div>
    </div>
  );
};

export const getStaticProps = withI18n()(async (props: any) =>
  JSON.parse(
    JSON.stringify({
      props: { ...props, documentTypes: await getDocumentTypes() },
    })
  )
);

export default ServicePage;
