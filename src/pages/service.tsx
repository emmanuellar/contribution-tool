import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
import SelectorButton from 'components/IframeSelector/SelectorButton';
import LinkIcon from 'modules/Common/components/LinkIcon';
import Loading from 'components/Loading';
import React from 'react';
import pick from 'lodash/fp/pick';
import api from 'utils/api';
import classNames from 'classnames';
import { getDocumentTypes, DocumentTypes } from 'modules/Github/api';
import s from './service.module.css';
import useNotifier from 'hooks/useNotifier';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useToggle, useKeyPressEvent } from 'react-use';
import useTranslation from 'next-translate/useTranslation';
import ServiceHelpDialog from 'modules/Common/components/ServiceHelpDialog';
import Version from 'modules/Common/data-components/Version';
import useDocumentDeclaration from 'modules/Common/services/useDocumentDeclaration';
import useConfigDeclaration from 'modules/Common/hooks/useConfigDeclaration';

const EMAIL_SUPPORT = 'contribute@opentermsarchive.org';

type DocumentSelectableField = 'select' | 'remove';
type ConfigSelectableField = 'hidden';
type SelectableField = DocumentSelectableField | ConfigSelectableField;

const ServicePage = ({ documentTypes }: { documentTypes: DocumentTypes }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { notify } = useNotifier();
  // Version Modal
  const [isServiceHelpViewed, setServiceHelpViewed] = useLocalStorage(
    'serviceHelpDialogViewed',
    false
  );
  const [isServiceVerifyDisplayed, toggleServiceVerifyDisplayed] = useToggle(false);

  // UI interaction
  const [iframeSelectionField, toggleIframeSelectionField] = React.useState<SelectableField | ''>(
    ''
  );

  const [iframeReady, toggleIframeReady] = useToggle(false);
  const selectInIframe = (field: SelectableField) => () => toggleIframeSelectionField(field);
  const [loading, toggleLoading] = useToggle(false);

  // Declaration
  const {
    loading: loadingDocumentDeclaration,
    loadedFromSource,
    page,
    declaration,
    documentType,
    onPageDeclarationUpdate,
    onDocumentDeclarationUpdate,
  } = useDocumentDeclaration();

  const {
    destination,
    localPath,
    hiddenCssSelectors,
    onConfigInputChange,
    onHiddenCssSelectorsUpdate,
    expertMode,
    acceptLanguage,
  } = useConfigDeclaration();

  const { fetch: url, executeClientScripts } = page || {};
  const selectCssSelectors = typeof page?.select === 'string' ? [page?.select] : page?.select || [];
  const removeCssSelectors = typeof page?.remove === 'string' ? [page?.remove] : page?.remove || [];

  // URL
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}`;
  let apiUrlParams = `json=${encodeURIComponent(
    JSON.stringify(
      executeClientScripts
        ? pick(['executeClientScripts', 'fetch', 'select', 'combine'])(page)
        : pick(['fetch', 'combine'])(page)
    )
  )}`;

  if (acceptLanguage) {
    apiUrlParams = `${apiUrlParams}&acceptLanguage=${encodeURIComponent(acceptLanguage)}`;
  }

  const { data, error: apiError } = useSWR<GetContributeServiceResponse>(
    `/api/services?${apiUrlParams}`,
    {
      revalidateOnMount: true,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Events
  useEvent('touchstart', () => router.push(`/sorry?${commonUrlParams}`));
  useKeyPressEvent('Escape', () => {
    toggleServiceVerifyDisplayed(false);
    toggleIframeSelectionField('');
  });

  const isPDF = url?.endsWith('.pdf') || data?.isPDF;
  const submitDisabled =
    (selectCssSelectors?.length === 0 && !isPDF) || (!iframeReady && !isPDF) || loading;
  const isLoadingIframe = !data && !apiError;
  const error = data?.error || apiError?.toString();
  const documentTypeCommitment = documentTypes[documentType]?.commitment || {};
  const versionsRepository = `https://github.com/${destination?.replace(
    '-declarations',
    '-versions'
  )}`;
  const snapshotsRepository = `https://github.com/${destination?.replace(
    '-declarations',
    '-snapshots'
  )}`;

  const onSelectInIframe = React.useCallback(
    (field: SelectableField) =>
      (cssPath: string = 'Unknown Selector') => {
        if (['select', 'remove'].includes(field)) {
          onPageDeclarationUpdate('add')(field as DocumentSelectableField)(cssPath);
        }
        if (field === 'hidden') {
          onHiddenCssSelectorsUpdate('add')()(cssPath);
        }
        toggleIframeSelectionField('');
      },
    [url, iframeSelectionField, toggleIframeSelectionField]
  );

  const onChangeCssRule = (field: SelectableField, i: number) => (newCssPath: string) => {
    if (['select', 'remove'].includes(field)) {
      onPageDeclarationUpdate('update')(field as DocumentSelectableField, i)(newCssPath);
    }
    if (field === 'hidden') {
      onHiddenCssSelectorsUpdate('update')(i)(newCssPath);
    }
  };

  const onDeleteCssRule = (field: SelectableField, i: number) => () => {
    if (['select', 'remove'].includes(field)) {
      onPageDeclarationUpdate('delete')(field as DocumentSelectableField, i)();
    }
    if (field === 'hidden') {
      onHiddenCssSelectorsUpdate('delete')(i)();
    }
  };

  const onVerify = async () => toggleServiceVerifyDisplayed(true);

  const onValidate = async () => {
    toggleLoading(true);
    try {
      const {
        data: { url, message },
      } = await api.post<PostContributeServiceResponse>('/api/services', {
        destination,
        json: declaration,
        name: declaration.name,
        documentType: documentType,
        url: `${window.location.href}&expertMode=true`,
      });

      if (!url) {
        const subject = 'Here is a new service to track in Open Terms Archive';
        const body = `Hi,

  I need you to track "${documentType}" of "${declaration.name}" for me.

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

I need you to track "${documentType}" of "${declaration.name}" for me but I had a failure with.

-----
${error}
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
      destination,
      path: localPath,
      data: JSON.stringify(declaration),
    });
  };

  if (loadingDocumentDeclaration) {
    return 'Loading declaration from source...';
  }

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
          {loadedFromSource && <div key="loaded-from-source">Loaded from source</div>}
          <div className={s.formWrapper}>
            <form>
              <div className={classNames('formfield')}>
                <label>{t('service:form.url')}</label>
                <div className={classNames('select')}>
                  <SelectorButton
                    key={'fetch'}
                    value={url}
                    onInputChange={onPageDeclarationUpdate('update')('fetch')}
                    withSwitch={false}
                  />
                </div>
              </div>
              <div className={classNames('formfield')}>
                <label>{t('service:form.documentType')}</label>
                <div className={classNames('select')}>
                  <select
                    onChange={(event) =>
                      onDocumentDeclarationUpdate('documentType')(event.target.value)
                    }
                    value={documentType}
                  >
                    <option key="documentType_none" value="">
                      {t('service:form.select')}
                    </option>
                    {Object.keys(documentTypes)
                      .sort()
                      .map((documentTypeOption) => (
                        <option
                          key={`documentType_${documentTypeOption}`}
                          value={documentTypeOption}
                        >
                          {documentTypeOption}
                        </option>
                      ))}
                  </select>
                  <FiChevronDown color="333333"></FiChevronDown>
                  {documentType && (
                    <dl>
                      {Object.entries(documentTypeCommitment).map(
                        ([tryptichKey, tryptichValue]) => (
                          <React.Fragment key={`tryptich_${tryptichKey}`}>
                            <dt>{tryptichKey}</dt>
                            <dd>{tryptichValue}</dd>
                          </React.Fragment>
                        )
                      )}
                    </dl>
                  )}
                </div>
              </div>
              <div className={classNames('formfield')}>
                <label>{t('service:form.serviceName')}</label>
                <SelectorButton
                  key={'name'}
                  value={declaration.name}
                  onInputChange={onDocumentDeclarationUpdate('name')}
                  withSwitch={false}
                />
              </div>
              {!isPDF && (
                <>
                  <div key="significantPart" className={classNames('formfield')}>
                    <label>{t('service:form.significantPart')}</label>
                    {selectCssSelectors.map((selected, i) => (
                      <SelectorButton
                        className={s.selectionItem}
                        key={typeof selected === 'string' ? selected : JSON.stringify(selected)}
                        value={selected}
                        onInputChange={onChangeCssRule('select', i)}
                        onRemove={onDeleteCssRule('select', i)}
                      />
                    ))}
                    <Button
                      onClick={selectInIframe('select')}
                      disabled={!!iframeSelectionField || !iframeReady}
                      type="secondary"
                      size="sm"
                    >
                      {t('service:form.significantPart.cta')}
                    </Button>
                  </div>

                  {(selectCssSelectors?.length > 0 || removeCssSelectors?.length > 0) && (
                    <div key="insignificantPart" className={classNames('formfield')}>
                      <label>{t('service:form.insignificantPart')}</label>

                      {removeCssSelectors.map((removed, i) => (
                        <SelectorButton
                          className={s.selectionItem}
                          key={typeof removed === 'string' ? removed : JSON.stringify(removed)}
                          value={removed}
                          onInputChange={onChangeCssRule('remove', i)}
                          onRemove={onDeleteCssRule('remove', i)}
                        />
                      ))}
                      <Button
                        onClick={selectInIframe('remove')}
                        disabled={!!iframeSelectionField || !iframeReady}
                        type="secondary"
                        size="sm"
                      >
                        {t('service:form.insignificantPart.cta')}
                      </Button>
                    </div>
                  )}
                </>
              )}

              <nav key="expertMode" className={classNames('formfield', s.toggleExpertMode)}>
                <a onClick={() => onConfigInputChange('expertMode')(!expertMode)}>
                  {t('service:expertMode')}
                </a>

                {expertMode ? (
                  <FiChevronUp color="333333"></FiChevronUp>
                ) : (
                  <FiChevronDown color="333333"></FiChevronDown>
                )}
              </nav>
              {expertMode && (
                <>
                  <div className={classNames('formfield')}>
                    <label>{t('service:form.links-snapshots-versions')}</label>
                    <small className={s.expertButtons}>
                      <a
                        target="_blank"
                        href={`https://github.com/${destination}/blob/main/declarations/${encodeURIComponent(
                          declaration.name
                        )}.json`}
                      >
                        Current JSON
                      </a>

                      <a
                        target="_blank"
                        href={`${versionsRepository}/blob/main/${encodeURIComponent(
                          declaration.name
                        )}/${encodeURIComponent(documentType)}.md`}
                      >
                        Latest version
                      </a>
                      <a
                        target="_blank"
                        href={`${versionsRepository}/commits/main/${encodeURIComponent(
                          declaration.name
                        )}/${encodeURIComponent(documentType)}.md`}
                      >
                        All versions
                      </a>
                      <a
                        target="_blank"
                        href={`${snapshotsRepository}/blob/main/${encodeURIComponent(
                          declaration.name
                        )}/${encodeURIComponent(documentType)}.html`}
                      >
                        Latest snapshot
                      </a>
                    </small>
                  </div>
                  <div className={classNames('formfield')}>
                    <label>{t('service:form.executeClientScripts')}</label>
                    <small className={s.moreinfo}>
                      {t('service:form.executeClientScripts.more')}
                    </small>
                    <div className={classNames('select')}>
                      <input
                        type="checkbox"
                        defaultChecked={!!page?.executeClientScripts}
                        onChange={(event) =>
                          onPageDeclarationUpdate('update')('executeClientScripts')(
                            event.target.checked
                          )
                        }
                        disabled={isPDF}
                      />
                    </div>
                  </div>
                  {!isPDF && (
                    <div className={classNames('formfield')}>
                      <label>{t('service:form.hiddenPart')}</label>
                      <small className={s.moreinfo}>{t('service:form.hiddenPart.more')}</small>
                      {hiddenCssSelectors.map((hidden, i) => (
                        <SelectorButton
                          className={s.selectionItem}
                          key={hidden}
                          value={hidden}
                          onInputChange={onChangeCssRule('hidden', i)}
                          onRemove={onDeleteCssRule('hidden', i)}
                          withSwitch={false}
                        />
                      ))}
                      <Button
                        onClick={selectInIframe('hidden')}
                        disabled={!!iframeSelectionField || !iframeReady}
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
                      <SelectorButton
                        key={'acceptLanguage'}
                        value={acceptLanguage}
                        onInputChange={onConfigInputChange('acceptLanguage')}
                        withSwitch={false}
                      />
                    </div>
                  </div>
                  <div className={classNames('formfield', s.expert)}>
                    <label>{t('service:form.label.json')}</label>
                    <pre className={classNames(s.json)}>{JSON.stringify(declaration, null, 2)}</pre>
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
            </form>
          </div>

          <div className={s.formBottom}>
            {!executeClientScripts && iframeReady && !isPDF && (
              <div
                className={classNames(s.formInfos, 'text__light', 'text__error', 'text__center')}
              >
                <IconAlert /> {t('service:pageNotAccurate.desc')}
                <br />
                <a
                  className={classNames('text__error')}
                  onClick={() => onPageDeclarationUpdate('update')('executeClientScripts')(true)}
                >
                  {t('service:pageNotAccurate.cta')}
                </a>
              </div>
            )}

            <nav className={s.formActions}>
              <Button disabled={submitDisabled} type="secondary" onClick={onVerify}>
                {t('service:verify')}
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
        {!isLoadingIframe && error && (
          <div className={s.fullPage}>
            <h1>{t('service:error.title')}</h1>
            <p>{error}</p>
            <Button onClick={onErrorClick}>{t('service:error.cta')}</Button>
            <a onClick={() => window.location.reload()}>{t('service:error.cta.refresh')}</a>
          </div>
        )}
        {isServiceVerifyDisplayed && (
          <div className={classNames(s.fullPageAbove)}>
            <Version json={declaration} />
            <button onClick={toggleServiceVerifyDisplayed}>
              <IconClose />
            </button>
          </div>
        )}
        {!isLoadingIframe && !error && data?.url && isPDF && (
          <iframe src={data?.url} width="100%" style={{ height: '100vh' }} />
        )}
        {!isLoadingIframe && !error && data?.url && !isPDF && (
          <IframeSelector
            selectable={!!iframeSelectionField}
            url={data?.url}
            selected={selectCssSelectors}
            removed={removeCssSelectors}
            hidden={hiddenCssSelectors}
            onSelect={iframeSelectionField ? onSelectInIframe(iframeSelectionField) : () => {}}
            onReady={() => toggleIframeReady(true)}
          />
        )}
      </div>
    </div>
  );
};

export const getStaticProps = async (props: any) =>
  JSON.parse(
    JSON.stringify({
      props: { ...props, documentTypes: await getDocumentTypes() },
      revalidate: 60 * 5,
    })
  );

export default ServicePage;
