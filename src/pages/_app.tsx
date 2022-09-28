//Import global css reset
import 'modules/Common/styles/vendor/minireset.css';
import 'modules/Common/styles/loader.css';
// NProgress
import 'nprogress/nprogress.css'; //styles of nprogress//Binding events.
import 'modules/NProgress/nprogress.theme.css';
import 'modules/NProgress'; //nprogress module

import { AppProps } from 'next/app';
import { NotifierContainer } from 'hooks/useNotifier';
import { SWRConfig } from 'swr';
import { fetcher } from 'utils/api';

function App({ Component, pageProps }: AppProps) {
  // https://stackoverflow.com/questions/71809903/next-js-component-cannot-be-used-as-a-jsx-component
  const AnyComponent = Component as any;
  return (
    <SWRConfig
      value={{
        fetcher,
      }}
    >
      <NotifierContainer />
      <AnyComponent {...pageProps} />
    </SWRConfig>
  );
}

export default App;
