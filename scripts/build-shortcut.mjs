#!/usr/bin/env node
/**
 * Bygger och signerar genvägen som skickar vikt från Hälsa till Kraft.
 *
 *   KRAFT_URL=https://kraft.example.org node scripts/build-shortcut.mjs
 *
 * Kräver macOS: iOS importerar bara signerade genvägar, och signeringen
 * (`shortcuts sign`) finns bara där. Resultatet hamnar i public/shortcuts/ och
 * checkas inte in (adressen är instansens egen); scripts/deploy.sh bygger filen om den saknas.
 *
 * Genvägen har fyra åtgärder: nyckeln (frågas vid import), senaste vikten ur Hälsa,
 * värdet, och ett POST mot /api/health/ingest. Servern tar även emot vatten
 * (`water`, dagssumma) men genvägen skickar det inte än — se docs/halsosynk.md.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const base = (process.env.KRAFT_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\/[^/\s]+$/.test(base)) {
  console.error("Sätt KRAFT_URL till appens publika adress, t.ex. KRAFT_URL=https://kraft.example.org");
  process.exit(1);
}
if (process.platform !== "darwin") {
  console.error("Signering kräver macOS (`shortcuts sign`).");
  process.exit(1);
}

const OUT = "public/shortcuts/kraft-halsosynk.shortcut";
const OBJ = "￼"; // platshållartecken där en variabel sätts in i en text

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const str = (s) => `<string>${esc(s)}</string>`;
const key = (k) => `<key>${k}</key>`;
const dict = (body) => `<dict>${body}</dict>`;

const tokenId = randomUUID().toUpperCase();
const samplesId = randomUUID().toUpperCase();
const valueId = randomUUID().toUpperCase();

/** En text med en variabel inbakad: textStr är t.ex. "Bearer " + OBJ. */
function tokenString(text, attachments) {
  const ranges = attachments
    .map(({ at, uuid, name }) =>
      key(`{${at}, 1}`) + dict(key("OutputName") + str(name) + key("OutputUUID") + str(uuid) + key("Type") + str("ActionOutput")),
    )
    .join("");
  return dict(
    key("Value") + dict(key("attachmentsByRange") + dict(ranges) + key("string") + str(text)) +
      key("WFSerializationType") + str("WFTextTokenString"),
  );
}

const field = (name, valueXml) =>
  dict(key("WFItemType") + "<integer>0</integer>" + key("WFKey") + tokenString(name, []) + key("WFValue") + valueXml);

const action = (id, params) =>
  dict(key("WFWorkflowActionIdentifier") + str(id) + key("WFWorkflowActionParameters") + dict(params));

const actions = [
  // 0: nyckeln. Import-frågan nedan fyller i texten.
  action(
    "is.workflow.actions.gettext",
    key("UUID") + str(tokenId) + key("WFTextActionText") + str(""),
  ),
  // 1: senaste vägningen i Hälsa.
  action(
    "is.workflow.actions.filter.health.quantity",
    key("UUID") + str(samplesId) +
      key("WFContentItemFilter") +
      dict(
        key("Value") +
          dict(
            key("WFActionParameterFilterPrefix") + "<integer>1</integer>" +
              key("WFContentPredicateBoundedDate") + "<false/>" +
              key("WFActionParameterFilterTemplates") +
              "<array>" +
              dict(
                key("Operator") + "<integer>4</integer>" +
                  key("Property") + str("Type") +
                  key("Removable") + "<false/>" +
                  key("Values") +
                  dict(
                    key("Enumeration") +
                      dict(key("Value") + str("Weight") + key("WFSerializationType") + str("WFStringSubstitutableState")),
                  ),
              ) +
              "</array>",
          ) +
          key("WFSerializationType") + str("WFContentPredicateTableTemplate"),
      ) +
      key("WFContentItemSortProperty") + str("Start Date") +
      key("WFContentItemSortOrder") + str("Latest First") +
      key("WFContentItemLimitEnabled") + "<true/>" +
      key("WFContentItemLimitNumber") + "<real>1</real>",
  ),
  // 2: värdet (kilo) ur vägningen.
  action(
    "is.workflow.actions.properties.health.quantity",
    key("UUID") + str(valueId) +
      key("WFContentItemPropertyName") + str("Value") +
      key("WFInput") +
      dict(
        key("Value") + dict(key("OutputName") + str("Health Samples") + key("OutputUUID") + str(samplesId) + key("Type") + str("ActionOutput")) +
          key("WFSerializationType") + str("WFTextTokenAttachment"),
      ),
  ),
  // 3: POST till servern.
  action(
    "is.workflow.actions.downloadurl",
    key("WFURL") + str(`${base}/api/health/ingest`) +
      key("WFHTTPMethod") + str("POST") +
      key("WFHTTPBodyType") + str("JSON") +
      key("WFHTTPHeaders") +
      dict(
        key("Value") +
          dict(
            key("WFDictionaryFieldValueItems") +
              "<array>" +
              field("Authorization", tokenString(`Bearer ${OBJ}`, [{ at: 7, uuid: tokenId, name: "Text" }])) +
              "</array>",
          ) +
          key("WFSerializationType") + str("WFDictionaryFieldValue"),
      ) +
      key("WFJSONValues") +
      dict(
        key("Value") +
          dict(
            key("WFDictionaryFieldValueItems") +
              "<array>" +
              field("weight", tokenString(OBJ, [{ at: 0, uuid: valueId, name: "Value" }])) +
              "</array>",
          ) +
          key("WFSerializationType") + str("WFDictionaryFieldValue"),
      ),
  ),
];

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">${dict(
  key("WFWorkflowClientVersion") + str("2900") +
    key("WFWorkflowMinimumClientVersion") + "<integer>900</integer>" +
    key("WFWorkflowMinimumClientVersionString") + str("900") +
    key("WFWorkflowIcon") +
    dict(key("WFWorkflowIconStartColor") + "<integer>431817727</integer>" + key("WFWorkflowIconGlyphNumber") + "<integer>59511</integer>") +
    key("WFWorkflowImportQuestions") +
    "<array>" +
    dict(
      key("ActionIndex") + "<integer>0</integer>" +
        key("Category") + str("Parameter") +
        key("ParameterKey") + str("WFTextActionText") +
        key("Text") + str("Klistra in din Kraft-nyckel (Inställningar → Hälsosynk)") +
        key("DefaultValue") + str(""),
    ) +
    "</array>" +
    key("WFWorkflowTypes") + "<array/>" +
    key("WFWorkflowInputContentItemClasses") + "<array/>" +
    key("WFWorkflowActions") + `<array>${actions.join("")}</array>`,
)}</plist>
`;

const tmp = mkdtempSync(join(tmpdir(), "kraft-shortcut-"));
try {
  const xml = join(tmp, "in.plist");
  const bin = join(tmp, "in.shortcut");
  writeFileSync(xml, plist);
  execFileSync("plutil", ["-lint", xml], { stdio: "inherit" });
  execFileSync("plutil", ["-convert", "binary1", xml, "-o", bin]);
  mkdirSync("public/shortcuts", { recursive: true });
  execFileSync("shortcuts", ["sign", "-m", "anyone", "-i", bin, "-o", OUT], { stdio: "inherit" });
  chmodSync(OUT, 0o644); // containerns användare måste kunna läsa filen
  console.log(`signerad genväg: ${OUT} (mot ${base})`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
