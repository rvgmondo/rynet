import { STAGES } from "@/components/agency/agency-content";

/**
 * The five stages of an engagement as numbered steps: a row of five from 1024px with a line
 * joining the numbers, two columns on a tablet, a single column on a phone.
 *
 * Used on the home page and on every service page, so the sequence is described one way.
 * The ordered list carries the order for assistive technology; the drawn numbers are hidden.
 * Every number is the same navy disc, the one step-number style on the site.
 */
export function StageSteps({ headingLevel = 3 }: { headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
      {STAGES.map((stage, index) => (
        <li key={stage.name} className="relative flex gap-4 lg:flex-col lg:gap-0">
          {index < STAGES.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-5 left-12 hidden h-px w-[calc(100%-2.25rem)] bg-line-strong lg:block"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
          >
            {index + 1}
          </span>
          <div className="min-w-0 lg:mt-5">
            <Heading className="text-base font-semibold text-heading">{stage.name}</Heading>
            {stage.duration ? (
              <p className="mt-0.5 text-sm font-medium text-muted">{stage.duration}</p>
            ) : null}
            <p className="mt-2 text-sm text-body">{stage.short}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
