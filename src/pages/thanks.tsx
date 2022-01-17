import { WithI18nResult, withI18n } from 'modules/I18n';

import Breadcrumb from 'components/BreadCrumb';
import Button from 'modules/Common/components/Button';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import Layout from 'modules/Common/containers/Layout';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote';
import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import { useTranslation } from 'react-i18next';
import useUrl from 'hooks/useUrl';

export default function ThanksPage({ mdxContent }: WithI18nResult) {
  const { t } = useTranslation();
  const {
    queryParams: { url, destination, localPath, versionsRepo },
  } = useUrl();
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}${
    versionsRepo ? `&versionsRepo=${versionsRepo}` : ''
  }`;

  return (
    <Layout title={t('contribute/thanks:seo.title')} desc={t('contribute/thanks:seo.desc')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true} bgColor="#010613">
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('contribute/thanks:title')}></Hero>
        </Container>
      </Container>

      <Container gridCols="12" gridGutters="11" paddingYSmall={true}>
        <Breadcrumb
          items={[
            { name: t('contribute/home:title'), url: `/?${commonUrlParams}` },
            { name: t('contribute:breadcrumb.thanks.name') },
          ]}
        />
      </Container>

      <Container gridCols="9" gridGutters="8" paddingY={false}>
        <TextContent>
          <MDXRemote {...(mdxContent as any)} scope={{ url }} />
        </TextContent>
      </Container>

      <Container gridCols="9" gridGutters="8">
        <TextContent className="text__center">
          <Link href={`/?${commonUrlParams}`}>
            <Button>{t('contribute/thanks:cta')}</Button>
          </Link>
        </TextContent>
      </Container>
    </Layout>
  );
}
export const getStaticProps = withI18n({ load: 'mdx', filename: 'contribute/thanks' })();
