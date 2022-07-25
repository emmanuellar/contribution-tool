import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import useSwr from 'swr';
import { GetServiceVerifyResponse } from '../interfaces';
import ReactMarkdown from 'react-markdown';
import classNames from 'classnames';
import s from './Version.module.css';

type VersionProps = {
  json: any;
} & React.HTMLAttributes<HTMLDivElement>;

const ServiceVerifyDialog: React.FC<VersionProps> = ({ json, className, ...props }) => {
  const { data } = useSwr<GetServiceVerifyResponse>(
    `/api/services/verify?json=${encodeURIComponent(JSON.stringify(json))}`
  );

  return (
    <TextContent className={classNames(s.markdown, className)} {...props}>
      {!data && 'Loading...'}
      {data && data.error && <>An error occured: {data.error}</>}
      {data && !data.error && <ReactMarkdown children={data.version || ''} />}
    </TextContent>
  );
};

export default ServiceVerifyDialog;
