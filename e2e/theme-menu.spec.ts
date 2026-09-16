import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * The colour theme menu in the header (src/components/layout/theme-menu.tsx).
 *
 * It replaced a light, system and dark switch that sat in the footer and at the bottom of the
 * phone menu, where nobody found it without scrolling the whole page. It is now the one theme
 * control on both front doors, so each door gets the same checks: it is the only one, it works
 * from the keyboard as a WAI-ARIA menu button, it closes the ways a menu should, the choice
 * survives a reload, axe is clean with it open in both themes, and on a 320px phone it sits
 * beside the menu button without running into the logo.
 */

const DOORS = [
  { path: "/", name: "marketplace", home: "Rynet, home" },
  { path: "/digital", name: "agency", home: "Rynet Digital, home" },
] as const;

const themeButton = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /^Colour theme/ });

const themeMenu = (page: Page) => page.getByRole("menu", { name: "Colour theme" });

const stored = (page: Page) => page.evaluate(() => localStorage.getItem("theme"));

for (const door of DOORS) {
  test.describe(`the ${door.name} theme menu`, () => {
    test("is the only theme control, and works from the keyboard", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(door.path);

      const button = themeButton(page);
      await expect(button).toHaveAccessibleName("Colour theme: System");
      await expect(button).toHaveAttribute("aria-haspopup", "menu");
      await expect(button).toHaveAttribute("aria-expanded", "false");

      // One place. The footer switch and the one at the bottom of the phone menu are gone.
      await expect(page.getByRole("button", { name: /Colour theme/ })).toHaveCount(1);
      await expect(page.getByRole("contentinfo").getByRole("radio")).toHaveCount(0);

      // Enter opens it with focus on the current choice.
      await button.focus();
      await page.keyboard.press("Enter");
      const menu = themeMenu(page);
      await expect(menu).toBeVisible();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      const items = menu.getByRole("menuitemradio");
      await expect(items).toHaveText(["Light", "System", "Dark"]);
      await expect(menu.getByRole("menuitemradio", { name: "System" })).toBeFocused();
      await expect(menu.getByRole("menuitemradio", { name: "System" })).toHaveAttribute(
        "aria-checked",
        "true",
      );

      // Arrow Down moves, Enter chooses, closes and hands focus back to the button.
      await page.keyboard.press("ArrowDown");
      await expect(menu.getByRole("menuitemradio", { name: "Dark" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(menu).toBeHidden();
      await expect(button).toBeFocused();
      await expect(button).toHaveAccessibleName("Colour theme: Dark");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await stored(page)).toBe("dark");

      // The choice survives a reload, and the button shows it.
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(themeButton(page)).toHaveAccessibleName("Colour theme: Dark");

      // Arrow Up opens it too; Escape closes without changing anything.
      await themeButton(page).focus();
      await page.keyboard.press("ArrowUp");
      await expect(themeMenu(page)).toBeVisible();
      await expect(themeMenu(page).getByRole("menuitemradio", { name: "Dark" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(themeMenu(page)).toBeHidden();
      await expect(themeButton(page)).toBeFocused();
      expect(await stored(page)).toBe("dark");

      // A first letter jumps to that choice, and Space chooses it.
      await page.keyboard.press("Enter");
      await expect(themeMenu(page)).toBeVisible();
      await page.keyboard.press("l");
      await expect(themeMenu(page).getByRole("menuitemradio", { name: "Light" })).toBeFocused();
      await page.keyboard.press(" ");
      await expect(themeMenu(page)).toBeHidden();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(await stored(page)).toBe("light");
    });

    test("closes on a click outside and on Tab", async ({ page }) => {
      await page.goto(door.path);
      const button = themeButton(page);

      await button.click();
      await expect(themeMenu(page)).toBeVisible();
      // The top-left corner of the page content: not a link, not a control.
      await page.locator("main").click({ position: { x: 2, y: 2 } });
      await expect(themeMenu(page)).toBeHidden();
      await expect(button).toHaveAttribute("aria-expanded", "false");

      await button.focus();
      await page.keyboard.press("Enter");
      await expect(themeMenu(page)).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(themeMenu(page)).toBeHidden();
      await expect(button).not.toBeFocused();
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`has no axe violations with the menu open, ${scheme}`, async ({ page }) => {
        await page.goto(door.path);
        await page.evaluate((value) => localStorage.setItem("theme", value), scheme);
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);

        await themeButton(page).click();
        await expect(themeMenu(page)).toBeVisible();

        const results = await new AxeBuilder({ page })
          .include("header")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        if (results.violations.length > 0) {
          for (const v of results.violations) {
            console.error(`\n${v.id} (${v.impact}): ${v.help}`);
            for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
          }
        }
        expect(results.violations).toEqual([]);
      });
    }

    test("fits beside the menu button on a phone without touching the logo", async ({ page }) => {
      await page.goto(door.path);

      for (const width of [320, 360, 375, 390, 414]) {
        await page.setViewportSize({ width, height: 800 });
        const button = themeButton(page);
        await expect(button).toBeVisible();

        const logo = await page
          .getByRole("banner")
          .getByRole("link", { name: door.home, exact: true })
          .boundingBox();
        const theme = await button.boundingBox();
        const menu = await page.getByLabel("Open menu").boundingBox();
        if (!logo || !theme || !menu) throw new Error(`header controls not laid out at ${width}px`);

        // A 44px target, directly beside the menu button.
        expect(theme.width, `theme button width at ${width}px`).toBeGreaterThanOrEqual(44);
        expect(theme.height, `theme button height at ${width}px`).toBeGreaterThanOrEqual(44);
        const gapToMenu = Math.round(menu.x - (theme.x + theme.width));
        expect(gapToMenu, `gap to the menu at ${width}px`).toBe(0);

        // Every control in the bar starts clear of the logo link.
        const controls = await page
          .getByRole("banner")
          .locator(".ml-auto > *")
          .evaluateAll((nodes) =>
            nodes
              .map((node) => node.getBoundingClientRect())
              .filter((box) => box.width > 0)
              .map((box) => box.left),
          );
        const firstControl = Math.min(...controls);
        expect(
          firstControl - (logo.x + logo.width),
          `space between the logo and the first control at ${width}px`,
        ).toBeGreaterThanOrEqual(8);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  });
}

test("opening the theme menu closes the phone menu sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");

  const sheet = page.locator("header details");
  await page.getByLabel("Open menu").click();
  await expect(sheet).toHaveAttribute("open", "");

  await themeButton(page).click();
  await expect(themeMenu(page)).toBeVisible();
  await expect(sheet).not.toHaveAttribute("open", "");
});
