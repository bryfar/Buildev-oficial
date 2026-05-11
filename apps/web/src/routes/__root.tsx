import { useEffect } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { detectLanguagePostHydration } from '@/i18n';
import { OAuthHashSessionHandler } from '@/components/auth/oauth-hash-session-handler';
import { initAppStorage } from '@/utils/app-storage';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Buildev',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: 'any',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  shellComponent: RootDocument,
});

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <p>{t('notFound.message')}</p>
    </div>
  );
}

function RootComponent() {
  useEffect(() => {
    void initAppStorage();
  }, []);

  return (
    <>
      <OAuthHashSessionHandler />
      <Outlet />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    void detectLanguagePostHydration();
  }, []);

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
