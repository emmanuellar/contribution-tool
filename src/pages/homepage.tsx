import Search, { SearchProps } from 'components/Search/Search';

import Column from 'modules/Common/components/Column';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import Layout from 'modules/Common/containers/Layout';
import TextContent from 'modules/Common/components/TextContent';
import { useEvent } from 'react-use';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { withI18n } from 'modules/I18n';

const HomePage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { localPath, destination, versionsRepo } = router.query;
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}${
    versionsRepo ? `&versionsRepo=${versionsRepo}` : ''
  }`;

  useEvent('touchstart', () => {
    router.push(`/sorry?${commonUrlParams}`);
  });

  const onSubmit: SearchProps['onSearchSubmit'] = async (url) => {
    try {
      router.push(`/service?${commonUrlParams}&url=${encodeURIComponent(url)}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Layout title={t('homepage:seo.title')} desc={t('homepage:seo.desc')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true}>
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('homepage:title')}></Hero>
        </Container>
      </Container>

      <Container paddingY={false}>
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Column width={100}>
            {!destination && <TextContent>{t('homepage:no-destination')}</TextContent>}
            {destination && (
              <>
                <TextContent>
                  <p>{t('homepage:content.p1')}</p>
                </TextContent>
                <Search
                  label={t('homepage:search.label')}
                  buttonLabel={t('homepage:search.button')}
                  placeholder="https://www.amazon.com/gp/help/customer/display.html?nodeId=13819201"
                  onSearchSubmit={onSubmit}
                />
              </>
            )}
          </Column>
        </Container>
      </Container>
    </Layout>
  );
};

export const getStaticProps = withI18n()(async (props: any) => {
  return JSON.parse(JSON.stringify({ props: { ...props }, revalidate: 10 }));
});

export default HomePage;
