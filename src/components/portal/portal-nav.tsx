"use client";

import { Car, Gauge, ImageIcon, Inbox, LogOut, Share2, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/portal", label: "Overview", icon: Gauge },
  { href: "/portal/cars", label: "Your cars", icon: Car },
  { href: "/portal/enquiries", label: "Enquiries", icon: Inbox, counted: true },
  { href: "/portal/ads", label: "Ads", icon: ImageIcon },
  { href: "/portal/social", label: "Social", icon: Share2 },
  { href: "/portal/details", label: "Your details", icon: Store },
] as const;

export function PortalNav({ newEnquiries }: { newEnquiries: number }) {
  const path = usePathname();
  const current = (href: string) =>
    href === "/portal" ? path === "/portal" : path === href || path.startsWith(`${href}/`);

  return (
    <nav aria-label="Portal">
      <ul className="rn-portal-nav">
        {LINKS.map(({ href, label, icon: Icon, ...rest }) => (
          <li key={href}>
            <Link
              href={href}
              className="rn-portal-nav__link"
              aria-current={current(href) ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              {label}
              {"counted" in rest && newEnquiries > 0 ? (
                <span className="rn-portal-nav__count">
                  {newEnquiries}
                  <span className="sr-only"> new</span>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Payload's own logout, which ends this session on the server as well as the cookie. */
export function SignOutButton({ className }: { className: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/users/logout", { method: "POST", credentials: "include" }).catch(
          () => undefined,
        );
        window.location.assign("/portal/sign-in?reason=signed-out");
      }}
    >
      <LogOut aria-hidden="true" /> {busy ? "Signing out" : "Sign out"}
    </button>
  );
}
