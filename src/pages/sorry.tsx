import Breadcrumb from 'components/BreadCrumb';
import Column from 'modules/Common/components/Column';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import Layout from 'modules/Common/containers/Layout';
import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
const EMAIL_SUPPORT = 'contact@opentermsarchive.org';

const SorryPage = () => {
  const router = useRouter();
  const { localPath, destination } = router.query;
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}`;
  const { t } = useTranslation();
  return (
    <Layout title={t('sorry:seo.title')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true} bgColor="#010613">
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('sorry:title')} subtitle={t('sorry:subtitle')}></Hero>
        </Container>
      </Container>

      <Container paddingY={false}>
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Column width={100}>
            <Breadcrumb
              items={[
                {
                  name: t('homepage:title'),
                  url: `/?destination=${commonUrlParams}`,
                },
                { name: t('sorry:title') },
              ]}
            />
            <TextContent>
              <p>{t('sorry:explanation')}</p>
              <p>
                {t('sorry:explanation.contact')}{' '}
                <a href={`mailto:${EMAIL_SUPPORT}`}>{EMAIL_SUPPORT}</a>
              </p>
            </TextContent>
          </Column>
        </Container>
      </Container>
    </Layout>
  );
};

export default SorryPage;
