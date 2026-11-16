const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://newfeconecta.vercel.app';

export const SITE_URL = configuredSiteUrl.replace(/\/+$/, '');

