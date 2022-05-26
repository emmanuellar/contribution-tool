import React from 'react';
import classNames from 'classnames';
import sDialog from 'modules/Common/components/Dialog.module.css';
import { Dialog } from '@headlessui/react';
import TextContent from 'modules/Common/components/TextContent';
import Button from 'modules/Common/components/Button';
import { useTranslation } from 'next-i18next';
import useSwr from 'swr';
import { GetServiceVerifyResponse } from '../interfaces';
import ReactMarkdown from 'react-markdown';
import Column from 'modules/Common/components/Column';
import Container from 'modules/Common/containers/Container';

type ServiceVerifyDialogProps = {
  open: boolean;
  onClose: any;
  json: any;
} & React.HTMLAttributes<HTMLDivElement>;

const ServiceVerifyDialog: React.FC<ServiceVerifyDialogProps> = ({
  onClose,
  open,
  json,
  ...props
}) => {
  const { t } = useTranslation();
  const { data } = useSwr<GetServiceVerifyResponse>(
    open ? `/api/services/verify?json=${encodeURIComponent(JSON.stringify(json))}` : null
  );

  return (
    <Dialog open={open} as="div" className={classNames(sDialog.dialog)} onClose={onClose}>
      <Dialog.Overlay className={classNames(sDialog.dialog_overlay)} />

      {/* TODO Make dialog scrollable */}
      <div
        className={classNames(sDialog.dialog_content, sDialog['dialog_content--full-page'])}
        {...props}
      >
        <Dialog.Title as="h3">{t('service:dialog.verify.title')}</Dialog.Title>
        <Dialog.Description>
          <TextContent>
            {!data && 'Loading...'}
            {data && data.error && <>An error occured: {data.error}</>}
            {data && !data.error && (
              <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
                <Column width={100} title={'Snapshot'} style={{ overflow: 'auto' }}>
                  <pre style={{ background: '#F7F7F7' }}>{data.snapshot}</pre>
                </Column>
                <Column width={100} title={'Version'}>
                  <ReactMarkdown children={data.version || ''} />
                </Column>
              </Container>
            )}
          </TextContent>
        </Dialog.Description>
        <div className="mt__L text__right">
          {/* <Button onClick={toggleDialogOpen}>{t('service:dialog.verify.cta')}</Button> */}
          <Button onClick={onClose}>{t('service:dialog.verify.cta')}</Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ServiceVerifyDialog;
