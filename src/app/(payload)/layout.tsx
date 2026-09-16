/* Payload's own admin shell. Generated boundary; the Rynet look is layered on in custom.scss. */

import config from "@payload-config";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import { archivo } from "@/lib/fonts";
import { importMap } from "./admin/importMap";
import "@payloadcms/next/css";
// Custom properties only, the same SHOWROOM tokens the public site uses. Payload stamps
// data-theme on <html>, which is what the token file's dark block answers to.
import "@/styles/tokens.css";
import "./custom.scss";

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async (args) => {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function Layout({ children }: Args) {
  return (
    <RootLayout
      config={config}
      // className only: Payload sets lang, dir and data-theme itself, and a value here would
      // replace them.
      htmlProps={{ className: archivo.variable }}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  );
}
