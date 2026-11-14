import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/config";
import { assertSameOrigin } from "@/lib/auth/origin";
import { getCurrentUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const ACTIVITY = ["sedentary", "light", "moderate", "high", "athlete"];
const SEX = ["male", "female", "other"];

function back(code: string) {
  const url = new URL("/settings/goals", appUrl());
  url.searchParams.set(code, "1");
  return NextResponse.redirect(url, { status: 303 });
}

/** Tomt fält → null; annars ett tal inom gränserna, annars `undefined` (ogiltigt). */
function intIn(raw: FormDataEntryValue | null, min: number, max: number): number | null | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : undefined;
}

export async function POST(request: Request) {
  const wrongOrigin = assertSameOrigin(request);
  if (wrongOrigin) return wrongOrigin;
  const session = await getCurrentUser();
  if (!session) return NextResponse.redirect(new URL("/login", appUrl()), { status: 303 });

  const f = await request.formData();
  const mode = String(f.get("mode")) === "manual" ? "manual" : "auto";
  const sex = String(f.get("sex") ?? "");
  const activity = String(f.get("activity") ?? "moderate");
  const rate = Number(String(f.get("rate") ?? "-0.25").replace(",", "."));
  const weight = String(f.get("weight") ?? "").trim().replace(",", ".");
  const weightNum = weight === "" ? null : Number(weight);

  const height = intIn(f.get("height"), 100, 250);
  const birthYear = intIn(f.get("birthYear"), 1920, new Date().getFullYear() - 10);
  const kcal = intIn(f.get("kcal"), 800, 10000);
  const protein = intIn(f.get("protein"), 0, 500);
  const carbs = intIn(f.get("carbs"), 0, 1500);
  const fat = intIn(f.get("fat"), 0, 500);
  const water = intIn(f.get("water"), 500, 8000);

  if (height === undefined || birthYear === undefined || water === undefined) return back("error_value");
  if (weightNum !== null && !(Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 300)) return back("error_value");
  if (sex && !SEX.includes(sex)) return back("error_value");
  if (!ACTIVITY.includes(activity)) return back("error_value");
  if (!Number.isFinite(rate) || rate < -1 || rate > 1) return back("error_value");
  if (mode === "manual") {
    if (kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) return back("error_value");
    if (kcal === null) return back("error_manual");
  }

  await getDb()
    .update(userSettings)
    .set({
      goalMode: mode,
      heightCm: height,
      birthYear,
      sex: sex || null,
      activityLevel: activity,
      goalRateKgWeek: String(Math.round(rate * 20) / 20),
      ...(weightNum !== null ? { weightKg: String(Math.round(weightNum * 10) / 10) } : {}),
      waterTargetMl: water ?? 2000,
      ...(mode === "manual"
        ? { kcalTarget: kcal ?? null, proteinTarget: protein ?? null, carbsTarget: carbs ?? null, fatTarget: fat ?? null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, session.id));
  return back("ok");
}
