import { NotFoundBody } from "@/components/layout/not-found-body";

/**
 * The marketplace 404, inside the marketplace layout's header and footer. The global 404
 * (src/app/not-found.tsx) renders the same body inside the same chrome.
 */
export default function NotFound() {
  return <NotFoundBody />;
}
