import withMdx, { WithMdxResult } from 'modules/I18n/hoc/withMdx';

import Breadcrumb from 'components/BreadCrumb';
import Button from 'modules/Common/components/Button';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import Layout from 'modules/Common/containers/Layout';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote';
import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import useTranslation from 'next-translate/useTranslation';
import useUrl from 'hooks/useUrl';

export default function ThanksPage({ mdxContent }: WithMdxResult) {
  const { t } = useTranslation();
  const {
    queryParams: { url, destination, localPath },
  } = useUrl();
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}`;

  return (
    <Layout title={t('thanks:seo.title')} desc={t('thanks:seo.desc')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true} bgColor="#010613">
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('thanks:title')}></Hero>
        </Container>
      </Container>

      <Container gridCols="12" gridGutters="11" paddingYSmall={true}>
        <Breadcrumb
          items={[
            { name: t('homepage:title'), url: `/?${commonUrlParams}` },
            { name: t('common:breadcrumb.thanks.name') },
          ]}
        />
      </Container>

      <Container gridCols="9" gridGutters="8" paddingY={false}>
        <TextContent>{mdxContent && <MDXRemote {...mdxContent} scope={{ url }} />}</TextContent>
      </Container>

      <Container gridCols="9" gridGutters="8">
        <TextContent className="text__center">
          <Link href={`/?${commonUrlParams}`}>
            <Button>{t('thanks:cta')}</Button>
          </Link>
        </TextContent>
      </Container>
    </Layout>
  );
}
export const getStaticProps = withMdx({ load: 'mdx', filename: 'thanks', folder: 'static' })();
