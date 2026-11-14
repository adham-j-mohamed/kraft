import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { todayInZone } from "@/lib/dates";
import { getFood } from "@/lib/food/queries";
import { getI18n } from "@/lib/i18n/server";
import { FoodForm } from "../FoodForm";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditFoodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ meal?: string; d?: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/food");
  if (!UUID.test(id)) notFound();
  const food = await getFood(user.id, id);
  // Bara egna livsmedel går att ändra; delade finns bara att läsa.
  if (!food || !food.own) notFound();

  const { t } = await getI18n();
  const p = await searchParams;
  const date = p.d && /^\d{4}-\d{2}-\d{2}$/.test(p.d) ? p.d : todayInZone(user.settings.timezone);
  const back = `/food/add?meal=${/^[a-z]+$/.test(p.meal ?? "") ? p.meal : "lunch"}&d=${date}`;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("foodform.edit")}</h1>
        <Link className="btn px-4 py-2 text-sm" href={back}>
          {t("common.back")}
        </Link>
      </header>
      <FoodForm food={food} back={back} />
    </main>
  );
}
