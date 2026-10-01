import { resolveBaseUrl } from "../../scripts/base-url.mjs";

/**
 * The site's own address, resolved once at build (see scripts/base-url.mjs):
 * the Open Graph tags, the shadcn command and /llms.txt all need it absolute.
 */
export default {
  env: { NEXT_PUBLIC_SITE_URL: resolveBaseUrl() },
};
