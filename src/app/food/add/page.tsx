import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { todayInZone } from "@/lib/dates";
import { MEALS, type Meal } from "@/lib/food/types";
import { getI18n } from "@/lib/i18n/server";
import { AddFood } from "./AddFood";

export const dynamic = "force-dynamic";

/** Utan angiven måltid föreslås en efter klockslaget i användarens tidszon. */
function mealByHour(timeZone: string): Meal {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone }).format(new Date()));
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export default async function AddFoodPage({ searchParams }: { searchParams: Promise<{ meal?: string; d?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/food");
  const { t } = await getI18n();
  const params = await searchParams;
  const tz = user.settings.timezone;
  const meal = (MEALS as readonly string[]).includes(params.meal ?? "") ? (params.meal as Meal) : mealByHour(tz);
  const date = params.d && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : todayInZone(tz);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("add.title")}</h1>
        <Link className="btn px-4 py-2 text-sm" href={`/food?d=${date}`}>
          {t("add.back")}
        </Link>
      </header>
      <AddFood meal={meal} date={date} />
    </main>
  );
}
