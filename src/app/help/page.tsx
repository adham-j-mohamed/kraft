import Link from "next/link";
import { Fragment } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { HELP, type Block } from "@/lib/help/content";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** `**fet**` → <strong>. Resten är ren text. */
function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            );
          case "steps":
            return (
              <ol key={i} className="flex flex-col gap-2.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="bg-accent text-accent-ink mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {j + 1}
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={i} className="flex flex-col gap-2">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-accent mt-0.5 shrink-0">
                      ●
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "tip":
            return (
              <p key={i} className="border-accent/50 bg-surface-2 rounded-xl border-l-4 px-3 py-2">
                <Inline text={b.text} />
              </p>
            );
        }
      })}
    </div>
  );
}

/** Hjälpsidan är öppen även utloggat. Admin-avsnittet visas bara för admin. */
export default async function HelpPage() {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const c = HELP[locale];
  const isAdmin = user?.role === "admin";
  const sections = c.sections.filter((s) => !s.adminOnly || isAdmin);

  return (
    <main id="top" className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{c.title}</h1>
        <p className="muted text-sm">{c.lead}</p>
      </header>

      <section className="card border-accent/50 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{c.quickTitle}</h2>
        <Blocks blocks={[{ t: "steps", items: c.quick }]} />
        <div className="flex gap-2 pt-1">
          {user ? (
            <Link className="btn btn-primary flex-1" href="/train">
              {t("nav.training")}
            </Link>
          ) : (
            <Link className="btn btn-primary flex-1" href="/register">
              {t("login.createAccount")}
            </Link>
          )}
        </div>
      </section>

      <nav aria-label={c.contentsTitle} className="card flex flex-col gap-2">
        <p className="muted text-xs uppercase tracking-wide">{c.contentsTitle}</p>
        <ul className="flex flex-col">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex min-h-11 flex-col justify-center border-b border-line py-1.5 last:border-0">
                <span className="font-medium">{s.title}</span>
                <span className="muted text-xs">{s.summary}</span>
              </a>
            </li>
          ))}
          <li>
            <a href="#faq" className="flex min-h-11 flex-col justify-center py-1.5">
              <span className="font-medium">{c.faqTitle}</span>
            </a>
          </li>
        </ul>
      </nav>

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="card flex scroll-mt-4 flex-col gap-3">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <Blocks blocks={s.blocks} />
          {s.cta ? (
            <Link className="btn w-full" href={s.cta.href}>
              {s.cta.label}
            </Link>
          ) : null}
        </section>
      ))}

      <section id="faq" className="card flex scroll-mt-4 flex-col gap-1">
        <h2 className="mb-2 text-xl font-semibold">{c.faqTitle}</h2>
        {c.faq.map((item, i) => (
          <details key={i} className="group border-b border-line last:border-0">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 font-medium">
              <span>{item.q}</span>
              <span aria-hidden="true" className="text-accent shrink-0 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="muted pb-3 text-sm leading-relaxed">
              <Inline text={item.a} />
            </p>
          </details>
        ))}
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{c.comingTitle}</h2>
        <ul className="muted flex flex-col gap-1 text-sm">
          {c.coming.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <a href="#top" className="btn w-full">
        ↑ {c.backToTop}
      </a>
    </main>
  );
}
