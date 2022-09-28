import React from 'react';
import classNames from 'classnames';
import sDialog from './Dialog.module.css';
import { Dialog } from '@headlessui/react';
import TextContent from 'modules/Common/components/TextContent';
import Trans from 'next-translate/Trans';
import Button from 'modules/Common/components/Button';
import useTranslation from 'next-translate/useTranslation';

type ServiceHelpDialogProps = {
  open: boolean;
  onClose: any;
} & React.HTMLAttributes<HTMLDivElement>;

const ServiceHelpDialog: React.FC<ServiceHelpDialogProps> = ({ onClose, open }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} as="div" className={classNames(sDialog.dialog)} onClose={onClose}>
      <Dialog.Overlay className={classNames(sDialog.dialog_overlay)} />

      <div className={classNames(sDialog.dialog_content)}>
        <Dialog.Title as="h3">{t('service:dialog.help.title')}</Dialog.Title>
        <Dialog.Description>
          <TextContent>
            <p>
              <Trans i18nKey="service:dialog.help.p1" components={{ strong: <strong /> }} />
            </p>
            <p>
              <Trans i18nKey="service:dialog.help.p2" />
            </p>
          </TextContent>
        </Dialog.Description>
        <div className="mt__L text__right">
          {/* <Button onClick={toggleDialogOpen}>{t('service:dialog.help.cta')}</Button> */}
          <Button onClick={onClose}>{t('service:dialog.help.cta')}</Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ServiceHelpDialog;
