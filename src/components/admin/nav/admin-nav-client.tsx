"use client";

import { NavHamburger, NavWrapper } from "@payloadcms/next/client";
import { Link, useNav, usePreferences } from "@payloadcms/ui";
import {
  Building2,
  CarFront,
  ChevronDown,
  ExternalLink,
  House,
  Inbox,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { PREFERENCE_KEYS } from "payload/shared";
import { useEffect, useId, useRef, useState } from "react";

import { RynetLockup } from "@/components/brand/rynet-mark";

import type { AdminNavEntity, AdminNavGroup } from "./nav-groups";

export type AdminNavSection = AdminNavGroup & { open: boolean };

const PRIMARY_ICONS: Record<string, LucideIcon> = {
  vehicles: CarFront,
  dealers: Building2,
  leads: Inbox,
};

function isCurrent(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  current,
  Icon,
}: {
  href: string;
  label: string;
  current: boolean;
  Icon?: LucideIcon;
}) {
  return (
    <Link
      className={`nav__link rn-admin-nav__link${current ? " rn-admin-nav__link--current" : ""}`}
      href={href}
      prefetch={false}
      aria-current={current ? "page" : undefined}
    >
      {Icon ? <Icon className="rn-admin-nav__icon" aria-hidden="true" focusable="false" /> : null}
      <span className="nav__link-label">{label}</span>
    </Link>
  );
}

function NavSection({ section, pathname }: { section: AdminNavSection; pathname: string }) {
  const listId = useId();
  const { setPreference } = usePreferences();
  const holdsCurrentPage = section.entities.some((e) => isCurrent(pathname, e.href, false));
  // A folded group still opens when the page being shown lives inside it, so the current page
  // is never hidden from the menu.
  const [open, setOpen] = useState(section.open || holdsCurrentPage);

  // The menu stays mounted between pages, so a link from elsewhere into a folded group opens it.
  useEffect(() => {
    if (holdsCurrentPage) setOpen(true);
  }, [holdsCurrentPage]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    void setPreference(PREFERENCE_KEYS.NAV, { groups: { [section.label]: { open: next } } }, true);
  };

  return (
    <div className="rn-admin-nav__group">
      <button
        type="button"
        className="rn-admin-nav__toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span>{section.label}</span>
        <ChevronDown className="rn-admin-nav__chevron" aria-hidden="true" focusable="false" />
      </button>
      <ul id={listId} className="rn-admin-nav__list" hidden={!open}>
        {section.entities.map((entity: AdminNavEntity) => (
          <li key={entity.href}>
            <NavLink
              href={entity.href}
              label={entity.label}
              current={isCurrent(pathname, entity.href, false)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Keeps the menu open on a laptop screen.
 *
 * Payload closes its menu on every screen up to 1440px wide, which is most laptops, so the
 * owner would land on a page with no menu and a bare button in the corner. From 1200px there is
 * room for the menu beside a list of five or six columns (Payload lays it out as a column there,
 * not as a sheet), so it is reopened once, just after Payload's own first-load check has closed
 * it. Narrower screens keep Payload's behaviour, and somebody who closed the menu on a wide
 * screen keeps it closed.
 */
function useOpenOnLaptops(preferredOpen: boolean) {
  const { hydrated, setNavOpen } = useNav();
  const done = useRef(false);

  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    if (!preferredOpen) return;
    if (!window.matchMedia("(min-width: 1200px) and (max-width: 1440px)").matches) return;
    // After Payload's own effect, which runs in the same pass and closes the menu.
    window.setTimeout(() => setNavOpen(true), 0);
  }, [hydrated, preferredOpen, setNavOpen]);
}

export function AdminNavClient({
  adminRoute,
  logoutHref,
  primary,
  sections,
  navPreferredOpen,
}: {
  adminRoute: string;
  logoutHref: string;
  primary: AdminNavEntity[];
  sections: AdminNavSection[];
  navPreferredOpen: boolean;
}) {
  const pathname = usePathname() ?? "";
  useOpenOnLaptops(navPreferredOpen);

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap rn-admin-nav" aria-label="Admin menu">
        <div className="rn-admin-nav__brand">
          <RynetLockup className="rn-admin-nav__lockup" />
        </div>

        <ul className="rn-admin-nav__list rn-admin-nav__list--primary">
          <li>
            <NavLink
              href={adminRoute}
              label="Home"
              current={isCurrent(pathname, adminRoute, true)}
              Icon={House}
            />
          </li>
          {primary.map((entity) => (
            <li key={entity.href}>
              <NavLink
                href={entity.href}
                label={entity.label}
                current={isCurrent(pathname, entity.href, false)}
                Icon={PRIMARY_ICONS[entity.slug]}
              />
            </li>
          ))}
        </ul>

        {sections.map((section) => (
          <NavSection key={section.label} section={section} pathname={pathname} />
        ))}

        <div className="nav__controls rn-admin-nav__controls">
          <a className="rn-admin-nav__control" href="/" target="_blank" rel="noopener">
            <ExternalLink className="rn-admin-nav__icon" aria-hidden="true" focusable="false" />
            <span>
              View the website<span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
          <Link className="rn-admin-nav__control" href={logoutHref} prefetch={false}>
            <LogOut className="rn-admin-nav__icon" aria-hidden="true" focusable="false" />
            <span>Sign out</span>
          </Link>
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  );
}
