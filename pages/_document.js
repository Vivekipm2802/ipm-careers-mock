import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inter (UI) + Instrument Serif (italic accent) for the redesign */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&display=swap"
          rel="stylesheet"
        />
        {/* Set theme before paint — no flash of light mode for dark users */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t = localStorage.getItem('ipm-theme');
              if (!t) {
                t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
              }
              document.documentElement.setAttribute('data-theme', t);
              if (t === 'dark') { document.documentElement.classList.add('dark'); }
            }catch(e){}})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
