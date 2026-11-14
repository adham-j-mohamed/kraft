import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center gap-6 px-5 py-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">Kraft</span>
        <h1 className="text-3xl font-semibold">{t("pending.title")}</h1>
        <p className="muted text-sm">{t("pending.lead")}</p>
      </div>
      <Link className="btn btn-primary w-full" href="/login">
        {t("pending.toLogin")}
      </Link>
    </main>
  );
}
