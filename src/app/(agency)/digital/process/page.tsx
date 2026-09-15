import { CircleUser, Clock } from "lucide-react";
import type { Metadata } from "next";

import { AgencyClose } from "@/components/agency/agency-close";
import { STAGES } from "@/components/agency/agency-content";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";

export const metadata: Metadata = {
  title: "How we work",
  description:
    "The five stages of a Rynet Digital engagement, what you do at each one, how long it takes, and the two ways it usually goes wrong.",
  alternates: { canonical: "/digital/process" },
};

const RISKS = [
  {
    title: "Approvals stall",
    whose: "Usually on your side, and understandably",
    cause:
      "A question sits for two weeks because the person who can answer it is on the floor selling cars, which is where they should be. The build waits, the momentum goes, and the launch lands in a month nobody planned for.",
    fix: "One named contact, questions batched rather than trickled, and a default. If we do not hear back in three working days we take the sensible option and tell you what we chose, so the work keeps moving and you can still change it.",
  },
  {
    title: "The stock feed is worse than it looked",
    whose: "Ours to manage",
    cause:
      "The export is missing a field that matters, or runs derivative and variant together in one string, or the photographs arrive in an order nobody controls. In South Africa that is the normal case, not the unlucky one, and it is where estimates break.",
    fix: "We ask for a real export before quoting, not a description of one. If we quote without seeing it and it turns out worse, that is our risk and our cost, not a variation order.",
  },
] as const;

/**
 * How we work.
 *
 * The five stages as a numbered timeline of cards, each with how long it takes and what the
 * dealership has to do, because that half is the part nobody mentions until it is late. Then the
 * two ways an engagement actually goes wrong, and whose side each one is on.
 */
export default function ProcessPage() {
  return (
    <>
      <AgencyPageHead
        trail={[{ href: "/digital/process", label: "How we work" }]}
        eyebrow="How we work"
        title="Five stages, and you know your part in each"
        lead="The first stage is free and the second ends with a figure in writing. What you have to do at each stage is listed too, because that is usually the part nobody mentions until it is late."
        aside={
          <ol aria-label="The five stages at a glance" className="relative grid gap-4">
            {STAGES.map((stage, index) => (
              <li key={stage.name} className="relative flex items-start gap-4">
                {index < STAGES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-[-1rem] left-[1.0625rem] w-px bg-line-strong"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="relative grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 pt-1.5">
                  <span className="block font-semibold text-heading">{stage.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{stage.short}</span>
                </span>
              </li>
            ))}
          </ol>
        }
      />

      <section aria-labelledby="stages-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <h2 id="stages-heading" className="sr-only">
            The five stages
          </h2>
          <ol className="relative mx-auto max-w-4xl space-y-5">
            {STAGES.map((stage, index) => (
              <li key={stage.name} className="relative flex gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-on-secondary tabular"
                  >
                    {index + 1}
                  </span>
                  {index < STAGES.length - 1 ? (
                    <span aria-hidden="true" className="-mb-5 mt-2 w-px flex-1 bg-line-strong" />
                  ) : null}
                </div>

                <article className="rn-card min-w-0 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="rn-h3">{stage.name}</h3>
                    {stage.duration ? (
                      <Badge
                        icon={<Clock aria-hidden="true" />}
                        className="max-w-full whitespace-normal"
                      >
                        {stage.duration}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-body">{stage.what}</p>
                  <div className="mt-5 flex gap-3 rounded-md bg-subtle p-4">
                    <CircleUser aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">What you do</p>
                      <p className="mt-1 text-sm text-body">{stage.you}</p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="wrong-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="wrong-heading"
            eyebrow="Said before you commit"
            title="The two ways this goes wrong"
            lead="You have probably had at least one of these happen before, so here is what we do about each."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {RISKS.map((risk) => (
              <article key={risk.title} className="rn-card bg-page p-6 sm:p-8 dark:bg-subtle">
                <Badge className="max-w-full self-start whitespace-normal">{risk.whose}</Badge>
                <h3 className="rn-h3 mt-4">{risk.title}</h3>
                <p className="mt-3 text-body">{risk.cause}</p>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-sm font-semibold text-heading">What we do about it</p>
                  <p className="mt-1 text-body">{risk.fix}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="pt-[var(--section-base)]">
        <AgencyClose id="process-close" title="Stage one is free">
          Send us your site and you get the written review whether or not anything comes of it.
        </AgencyClose>
      </div>
    </>
  );
}
