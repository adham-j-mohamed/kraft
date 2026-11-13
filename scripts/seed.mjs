#!/usr/bin/env node
/**
 * Globala bibliotek: övningar och livsmedel. Idempotent — kör hur ofta som helst.
 * Värden för livsmedel är typvärden per 100 g och är tänkta att redigeras i appen;
 * de är inte en näringsdeklaration. Streckkoder hämtas från Open Food Facts i stället.
 */
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL saknas");
  process.exit(1);
}

const exercises = [
  // Bröst
  ["Bänkpress", "bröst", "skivstång", "weight_reps"],
  ["Sned bänkpress", "bröst", "skivstång", "weight_reps"],
  ["Hantelpress", "bröst", "hantlar", "weight_reps"],
  ["Sned hantelpress", "bröst", "hantlar", "weight_reps"],
  ["Bröstpress i maskin", "bröst", "maskin", "weight_reps"],
  ["Kabel-flyes", "bröst", "kabel", "weight_reps"],
  ["Armhävningar", "bröst", "kroppsvikt", "reps_only"],
  ["Dips", "bröst", "kroppsvikt", "reps_only"],
  // Rygg
  ["Marklyft", "rygg", "skivstång", "weight_reps"],
  ["Skivstångsrodd", "rygg", "skivstång", "weight_reps"],
  ["Hantelrodd", "rygg", "hantlar", "weight_reps"],
  ["Latsdrag", "rygg", "maskin", "weight_reps"],
  ["Sittande kabelrodd", "rygg", "kabel", "weight_reps"],
  ["Chins", "rygg", "kroppsvikt", "reps_only"],
  ["Raka marklyft", "rygg", "skivstång", "weight_reps"],
  ["Face pull", "rygg", "kabel", "weight_reps"],
  // Axlar
  ["Militärpress", "axlar", "skivstång", "weight_reps"],
  ["Axelpress med hantlar", "axlar", "hantlar", "weight_reps"],
  ["Sidolyft", "axlar", "hantlar", "weight_reps"],
  ["Omvända flyes", "axlar", "hantlar", "weight_reps"],
  ["Shrugs", "axlar", "hantlar", "weight_reps"],
  // Biceps
  ["Skivstångscurl", "biceps", "skivstång", "weight_reps"],
  ["Hantelcurl", "biceps", "hantlar", "weight_reps"],
  ["Hammercurl", "biceps", "hantlar", "weight_reps"],
  ["Preacher curl", "biceps", "skivstång", "weight_reps"],
  // Triceps
  ["Triceps pushdown", "triceps", "kabel", "weight_reps"],
  ["Skull crushers", "triceps", "skivstång", "weight_reps"],
  ["Triceps dips", "triceps", "kroppsvikt", "reps_only"],
  ["Över huvudet-extension", "triceps", "hantel", "weight_reps"],
  // Ben
  ["Knäböj", "ben", "skivstång", "weight_reps"],
  ["Frontböj", "ben", "skivstång", "weight_reps"],
  ["Benpress", "ben", "maskin", "weight_reps"],
  ["Rumänska marklyft", "ben", "skivstång", "weight_reps"],
  ["Benspark", "ben", "maskin", "weight_reps"],
  ["Lårcurl", "ben", "maskin", "weight_reps"],
  ["Utfall", "ben", "hantlar", "weight_reps"],
  ["Vadpress", "ben", "maskin", "weight_reps"],
  ["Höftabduktion", "ben", "maskin", "weight_reps"],
  // Mage
  ["Plankan", "mage", "kroppsvikt", "time"],
  ["Situps", "mage", "kroppsvikt", "reps_only"],
  ["Benlyft", "mage", "kroppsvikt", "reps_only"],
  ["Kabelcrunches", "mage", "kabel", "weight_reps"],
  ["Ab wheel", "mage", "kroppsvikt", "reps_only"],
  // Kondition
  ["Löpband", "kondition", "maskin", "distance"],
  ["Roddmaskin", "kondition", "maskin", "time"],
  ["Cykel", "kondition", "maskin", "time"],
  ["Promenad", "kondition", "ute", "distance"],
  ["Burpees", "kondition", "kroppsvikt", "reps_only"],
];

// [namn, kcal, protein, kolhydrat, fett, fiber, socker, salt] per 100 g/ml
const foods = [
  ["Ägg", 143, 12.6, 0.7, 9.5, 0, 0.4, 0.34, 55, "1 ägg"],
  ["Äggvita", 52, 10.9, 0.7, 0.2, 0, 0.7, 0.17, null, null],
  ["Havregryn", 370, 13, 60, 7, 10, 1, 0.01, 40, "1 portion"],
  ["Mjölk 3 %", 60, 3.4, 4.8, 3, 0, 4.8, 0.1, 200, "1 glas"],
  ["Mjölk 0,5 %", 42, 3.5, 4.8, 0.5, 0, 4.8, 0.1, 200, "1 glas"],
  ["Grekisk yoghurt 2 %", 73, 10, 3.6, 2, 0, 3.6, 0.1, 150, "1 portion"],
  ["Kvarg 0,2 %", 60, 11, 4, 0.2, 0, 4, 0.1, 150, "1 portion"],
  ["Kesella", 82, 11, 4, 2, 0, 4, 0.1, 150, "1 portion"],
  ["Kycklingfilé, rå", 110, 23, 0, 1.5, 0, 0, 0.15, null, null],
  ["Kycklingbröst, tillagad", 165, 31, 0, 3.6, 0, 0, 0.2, null, null],
  ["Nötfärs 10 %", 176, 20, 0, 10, 0, 0, 0.15, null, null],
  ["Lax, rå", 180, 20, 0, 11, 0, 0, 0.15, null, null],
  ["Tonfisk i vatten", 100, 23, 0, 1, 0, 0, 0.8, null, null],
  ["Ris, kokt", 130, 2.7, 28, 0.3, 0.4, 0.1, 0.01, 150, "1 portion"],
  ["Pasta, kokt", 158, 5.8, 31, 0.9, 1.8, 0.6, 0.01, 150, "1 portion"],
  ["Potatis, kokt", 87, 2, 20, 0.1, 1.8, 0.9, 0.01, 200, "1 portion"],
  ["Sötpotatis", 86, 1.6, 20, 0.1, 3, 4.2, 0.06, null, null],
  ["Fullkornsbröd", 250, 9, 43, 4, 6, 3, 1, 35, "1 skiva"],
  ["Smör", 717, 0.9, 0.1, 81, 0, 0.1, 0.02, 10, "1 klick"],
  ["Olivolja", 884, 0, 0, 100, 0, 0, 0, 10, "1 msk"],
  ["Banan", 89, 1.1, 23, 0.3, 2.6, 12, 0, 120, "1 banan"],
  ["Äpple", 52, 0.3, 14, 0.2, 2.4, 10, 0, 150, "1 äpple"],
  ["Apelsin", 47, 0.9, 12, 0.1, 2.4, 9, 0, 150, "1 apelsin"],
  ["Blåbär", 57, 0.7, 14, 0.3, 2.4, 10, 0, null, null],
  ["Jordgubbar", 32, 0.7, 7.7, 0.3, 2, 4.9, 0, null, null],
  ["Vassleprotein", 380, 78, 8, 5, 0, 4, 0.5, 30, "1 skopa"],
  ["Mandel", 579, 21, 22, 50, 12.5, 4.4, 0.01, 25, "en handfull"],
  ["Jordnötssmör", 588, 25, 20, 50, 6, 9, 0.5, 20, "1 msk"],
  ["Ost 28 %", 350, 25, 1.5, 27, 0, 1.5, 1.2, 25, "1 skiva"],
  ["Avokado", 160, 2, 9, 15, 7, 0.7, 0, 100, "½ avokado"],
  ["Broccoli", 34, 2.8, 7, 0.4, 2.6, 1.7, 0.03, null, null],
  ["Tomat", 18, 0.9, 3.9, 0.2, 1.2, 2.6, 0.01, null, null],
  ["Gurka", 15, 0.7, 3.6, 0.1, 0.5, 1.7, 0, null, null],
  ["Kaffe, svart", 2, 0.1, 0, 0, 0, 0, 0, 200, "1 kopp"],
];

const pool = new Pool({ connectionString, max: 1 });

try {
  await pool.query("begin");

  for (const [name, group, equipment, tracking] of exercises) {
    await pool.query(
      `insert into exercises (name, muscle_group, equipment, tracking)
       values ($1, $2, $3, $4)
       on conflict do nothing`,
      [name, group, equipment, tracking],
    );
  }

  for (const food of foods) {
    const [name, kcal, protein, carbs, fat, fiber, sugar, salt, servingGrams, servingLabel] =
      food;
    await pool.query(
      `insert into foods (user_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g,
                          fiber_100g, sugar_100g, salt_100g, serving_grams, serving_label, source)
       values (null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'seed')
       on conflict do nothing`,
      [name, kcal, protein, carbs, fat, fiber, sugar, salt, servingGrams, servingLabel],
    );
  }

  await pool.query("commit");

  const counts = await pool.query(
    `select
       (select count(*) from exercises where user_id is null) as exercises,
       (select count(*) from foods where user_id is null) as foods`,
  );
  console.log("seed klar:", counts.rows[0]);
} catch (error) {
  await pool.query("rollback").catch(() => {});
  console.error("seed misslyckades:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
