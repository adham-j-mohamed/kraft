import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { todayInZone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { FoodForm } from "../FoodForm";

export const dynamic = "force-dynamic";

export default async function NewFoodPage({ searchParams }: { searchParams: Promise<{ meal?: string; d?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/food");
  const { t } = await getI18n();
  const p = await searchParams;
  const date = p.d && /^\d{4}-\d{2}-\d{2}$/.test(p.d) ? p.d : todayInZone(user.settings.timezone);
  const back = `/food/add?meal=${/^[a-z]+$/.test(p.meal ?? "") ? p.meal : "lunch"}&d=${date}`;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("foodform.new")}</h1>
        <Link className="btn px-4 py-2 text-sm" href={back}>
          {t("common.back")}
        </Link>
      </header>
      <FoodForm back={back} />
    </main>
  );
}
