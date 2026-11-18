/**
 * Texten på hjälpsidan, på båda språken. Lång löptext hör inte hemma i ordlistan, men samma
 * regel gäller: båda språken måste finnas och ha samma form (typen `HelpContent` tvingar det).
 *
 * `**fet**` blir fetstil. Varje påstående ska stämma med koden — ändrar du beteendet i appen,
 * ändra texten här i samma commit.
 */
import type { Locale } from "@/lib/i18n/locales";

export type Block =
  | { t: "p"; text: string }
  | { t: "steps"; items: string[] }
  | { t: "list"; items: string[] }
  | { t: "tip"; text: string };

export interface Section {
  id: string;
  title: string;
  summary: string;
  blocks: Block[];
  cta?: { href: string; label: string };
  adminOnly?: boolean;
}

export interface HelpContent {
  title: string;
  lead: string;
  quickTitle: string;
  quick: string[];
  contentsTitle: string;
  sections: Section[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  comingTitle: string;
  coming: string[];
  backToTop: string;
}

const sv: HelpContent = {
  title: "Hjälp",
  lead: "Så använder du Kraft: från första inloggningen till att följa dina framsteg pass för pass.",
  quickTitle: "Kom igång på fem minuter",
  quick: [
    "**Skapa konto** på inloggningssidan och vänta tills en admin godkänt dig. Sedan loggar du in.",
    "Öppna **Träning → Skapa program**. Välj hur många pass du roterar mellan (t.ex. A, B och C) och lägg till övningar med set och reps.",
    "Tryck **Starta** på passet som står på tur.",
    "Fyll i kilo och reps och tryck **Klart set**. Vilotimern startar av sig själv.",
    "När du är klar: **Avsluta pass**. Då flyttas rotationen till nästa pass.",
    "Nästa gång du kör samma pass ser du **vad du gjorde förra gången** vid varje övning. Slå det.",
  ],
  contentsTitle: "Innehåll",
  sections: [
    {
      id: "installera",
      title: "Lägg till på hemskärmen",
      summary: "Så får du Kraft som en app på telefonen",
      blocks: [
        {
          t: "p",
          text: "Kraft är en webbapp. Du hämtar den inte i App Store, utan lägger den på hemskärmen så att den öppnas som en vanlig app.",
        },
        {
          t: "steps",
          items: [
            "**iPhone:** öppna Kraft i **Safari** (inte inuti en annan app).",
            "Tryck på **Dela**-knappen (rutan med pilen uppåt).",
            "Välj **Lägg till på hemskärmen** och tryck **Lägg till**.",
          ],
        },
        { t: "p", text: "**Android:** öppna menyn (⋮) i Chrome och välj **Installera app** eller **Lägg till på startskärmen**." },
        {
          t: "tip",
          text: "Öppna appen från ikonen. Du är inloggad i 60 dagar. Byter du tema ändras färgen på iPhones statusfält först nästa gång du öppnar appen.",
        },
      ],
    },
    {
      id: "konto",
      title: "Konto och inloggning",
      summary: "Skapa konto, bli godkänd, byta lösenord",
      blocks: [
        {
          t: "list",
          items: [
            "**Skapa konto:** tryck **Skapa konto** på inloggningssidan. Användarnamn: 3–32 tecken, a–z, 0–9, punkt, bindestreck eller understreck. Lösenord: minst 8 tecken.",
            "**Vem är du?** Skriv vem du är. Det är det administratören ser när hen ska godkänna dig.",
            "**Godkännande:** en admin måste godkänna kontot innan du kan logga in. Du får inget mejl, så försök logga in igen senare.",
            "**Byta lösenord:** Inställningar → Byt lösenord. Då loggas dina andra enheter ut.",
            "**Glömt lösenord:** be en admin sätta ett nytt. Det finns ingen glömt-länk eftersom appen inte skickar mejl.",
          ],
        },
      ],
      cta: { href: "/settings", label: "Öppna inställningar" },
    },
    {
      id: "program",
      title: "Program och rotation",
      summary: "Skapa pass, ställ in set och reps, superset",
      blocks: [
        {
          t: "p",
          text: "Ett **program** är de pass du roterar mellan, till exempel Pass A, B och C. Varje pass har övningar. Appen föreslår passet som står på tur, men du kan alltid välja ett annat.",
        },
        {
          t: "steps",
          items: [
            "Gå till **Träning → Skapa program** (eller **Redigera program**).",
            "Välj **antal pass** med − och +, och döp dem.",
            "Tryck **+ Lägg till övning** i varje pass. Sök i listan (på svenska eller engelska) eller välj **Skapa egen övning**.",
            "Ställ in **set**, **reps från/till** (till exempel 8–10) och **vila** i sekunder. Tidsövningar har sekunder och konditionsövningar meter.",
            "Kryssa **Superset med övningen ovanför** för att köra två övningar växelvis.",
            "Tryck **Spara program**.",
          ],
        },
        {
          t: "tip",
          text: "Rotationen flyttas **först när du avslutar** ett pass. Avbryter du ett pass, eller väljer ett annat, står samma pass kvar på tur. Du kan ändra programmet när som helst; pass du redan kört påverkas inte.",
        },
      ],
      cta: { href: "/train/program", label: "Öppna programmet" },
    },
    {
      id: "pass",
      title: "Köra ett pass",
      summary: "Logga set, vila, rätta fel, avsluta",
      blocks: [
        {
          t: "steps",
          items: [
            "Tryck **Starta** på sidan **Träning**.",
            "Fyll i **Kilo** och **Reps** för varje set (− och + justerar) och tryck **Klart set**. Fälten fylls med dina senaste siffror, så du ändrar bara det som skiljer.",
            "Efter ett set startar **vilotimern** längst ner. Tryck **+15 s** för mer tid eller **Hoppa över**. Det låter (och vibrerar där telefonen kan) när vilan är slut.",
            "Klart? Tryck **Avsluta pass**. Du ser tid, antal set, volym och framsteg per övning.",
          ],
        },
        {
          t: "list",
          items: [
            "**Mer: typ av set och RPE** (fäll ut under fälten): **Uppvärmning** räknas inte i volym eller bästa set och startar ingen vila. **Dropset** markerar ett set där du sänkt vikten. **RPE** 1–10 är hur tungt det kändes; 10 betyder att det inte fanns något kvar.",
            "**Superset:** vilan startar först när du loggat sista övningen i supersetet.",
            "**Rätta fel:** tryck på ett loggat set för att ändra eller ta bort det.",
            "**Avbryta:** **Avbryt passet** sparar ingenting i historiken och rotationen står kvar.",
          ],
        },
        {
          t: "tip",
          text: "Varje set sparas direkt på servern, så inget försvinner om du stänger appen. Öppna Kraft igen och tryck **Fortsätt passet**. Appen försöker hålla skärmen tänd under passet.",
        },
      ],
      cta: { href: "/train", label: "Öppna träningen" },
    },
    {
      id: "framsteg",
      title: "Förra passet och framsteg",
      summary: "Pilar, tips och vad siffrorna betyder",
      blocks: [
        {
          t: "list",
          items: [
            "**Förra passet** står ovanför varje övning: dina set förra gången och bästa set.",
            "**Pilarna ↑ = ↓** efter varje set jämför med samma set förra gången (på uppskattat 1RM): bättre, lika eller sämre.",
            "**Tips:** når alla dina set övre gränsen för reps (till exempel 10 av 8–10) föreslår appen att du **höjer vikten** med 2,5 kg. Är något set under nedre gränsen står det att du ska **behålla vikten**. Däremellan: **sikta på en rep till** per set. Tipsen gäller övningar med vikt och reps.",
            "**Historik:** tryck på en övnings namn för **bästa set**, en **trendlinje** och alla pass.",
          ],
        },
        {
          t: "p",
          text: "**Uppskattat 1RM** räknas med Epleys formel: kilo × (1 + reps ÷ 30). Det är en uppskattning av den tyngsta vikt du klarar en gång och ett jämförelsetal mellan pass, inte ett mål. **Volym** är kilo × reps, summerat över alla arbetsset (uppvärmning räknas inte).",
        },
      ],
    },
    {
      id: "mat",
      title: "Mat och kalorier",
      summary: "Logga mat, mål, vatten och vikt",
      blocks: [
        {
          t: "steps",
          items: [
            "Tryck **Mat** på startsidan och sedan **+ Lägg till** vid måltiden.",
            "Sök livsmedel (på svenska eller engelska), eller välj under **Senast använda** och **Favoriter** (stjärnan).",
            "Välj mängd i **gram** eller **portioner**. Kalorier och makron räknas ut medan du skriver.",
            "Tryck **Lägg till**. Du hamnar tillbaka på dagen.",
          ],
        },
        {
          t: "list",
          items: [
            "**Hittar du inte maten?** Skapa ett **eget livsmedel** (värden per 100 g; det syns bara för dig) eller använd **Snabblogga kalorier**, till exempel för en lunch ute.",
            "**Streckkod:** tryck **Skanna streckkod** och rikta kameran mot koden. Produkten slås upp hos Open Food Facts, en öppen databas där vem som helst kan lägga in data, så kontrollera värdena. Hittad produkt sparas så nästa skanning går fort. Fungerar inte kameran kan du skriva in siffrorna under streckkoden.",
            "**Saknas produkten eller är värdena fel?** Skapa ett eget livsmedel med samma streckkod. Ditt eget går alltid före databasens.",
            "**Ändra eller ta bort:** tryck på en loggad post. Ändrar du mängden skalas kalorier och makron med.",
            "**Bläddra:** pilarna ‹ › byter dag. **Veckan** visar kalorier mot mål, protein, träningspass och vikt per dag.",
            "**Vatten:** knapparna +250 och +500 ml. **Vikt:** skriv in dagens vikt; appen visar sjudagarssnitt, eftersom enstaka vägningar svänger.",
          ],
        },
        {
          t: "p",
          text: "**Mål:** Mat → Mål (eller Inställningar). Välj att få dem uträknade ur längd, vikt, ålder, kön och aktivitetsnivå, eller skriv in egna. Uträkningen använder Mifflin–St Jeor och din veckotakt för vikten (1 kg kroppsfett ≈ 7 700 kcal). Protein sätts till 1,8 g per kilo, fett till 25 % av energin (minst 0,6 g per kilo) och resten blir kolhydrater. Målet går aldrig under 1 200 kcal, och det räknas om direkt när du loggar en ny vikt.",
        },
        {
          t: "tip",
          text: "Alla siffror är ungefärliga. Näringsdata och portioner varierar, och appen kan inte veta exakt vad du åt. Använd målet som riktning och titta på veckotrenden snarare än en enskild dag. Vid sjukdom, graviditet eller extrema mål: fråga vården.",
        },
      ],
      cta: { href: "/food", label: "Öppna matloggen" },
    },
    {
      id: "halsosynk",
      title: "Hälsosynk från iPhone",
      summary: "Vikt från Hälsa-appen hamnar i Kraft av sig själv",
      blocks: [
        {
          t: "p",
          text: "En genväg i Genvägar-appen kan skicka din senaste vikt från Hälsa till Kraft varje kväll. Du installerar ingen app, men en genväg och en automation måste du lägga till en gång.",
        },
        {
          t: "steps",
          items: [
            "Öppna **Inställningar → Hälsosynk** i Safari på iPhone och tryck **Skapa nyckel**. Tryck **Kopiera nyckeln**.",
            "Tryck **Lägg till genvägen**. Genvägar frågar efter nyckeln — klistra in den.",
            "I Genvägar: **Automatisering → Ny automatisering → Tid på dagen**, välj klockslag, välj genvägen **kraft-halsosynk** och **Kör direkt**.",
            "Tillåt åtkomst till vikt i Hälsa när iOS frågar. Kör genvägen en gång för hand — sidan visar sedan **Senaste synk** med vad som kom fram.",
          ],
        },
        {
          t: "list",
          items: [
            "**Vikt:** den senaste vägningen i Hälsa ersätter dagens vägning i Kraft. Genvägen räknar med kilo.",
            "**Nyckeln** är ett lösenord till bara den här synken. Du kan skapa en ny (den gamla slutar fungera) eller ta bort den under Inställningar → Hälsosynk.",
            "**Vatten** kan Kraft ta emot som dagssumma, men den färdiga genvägen skickar det inte än.",
          ],
        },
        {
          t: "tip",
          text: "Visar sidan ingen synk efter att du kört genvägen? Då har inget kommit fram till Kraft, och felet sitter i genvägen eller i åtkomsten till Hälsa.",
        },
      ],
      cta: { href: "/settings/health", label: "Öppna hälsosynk" },
    },
    {
      id: "utseende",
      title: "Språk och tema",
      summary: "Svenska/engelska och mörkt/ljust",
      blocks: [
        {
          t: "list",
          items: [
            "**Språk:** Kraft följer enhetens språk. Tryck på språkknappen (SV/EN) högst upp för att välja själv; **Auto** följer enheten igen.",
            "**Tema:** knappen med sol eller måne högst upp växlar mellan mörkt och ljust. Valet följer med ditt konto till nya enheter.",
            "**Loggan** högst upp tar dig alltid till startsidan.",
          ],
        },
      ],
    },
    {
      id: "admin",
      title: "För administratörer",
      summary: "Godkänna konton och sköta användare",
      adminOnly: true,
      blocks: [
        {
          t: "list",
          items: [
            "**Ringklockan** högst upp visar hur många som väntar på godkännande. Tryck på den för listan (Admin → Användare).",
            "**Godkänn** gör att personen kan logga in. **Avslå** raderar förfrågan så att användarnamnet blir ledigt.",
            "**Nytt konto** på samma sida skapar ett konto som är godkänt direkt. Ge personen användarnamn och lösenord.",
            "Per konto kan du **sätta nytt lösenord**, göra till **admin** eller **medlem**, eller **ta bort** kontot (all data raderas). Du kan inte ta bort dig själv, och minst en admin måste finnas.",
            "**Statuskortet** på startsidan visas bara för admin.",
          ],
        },
      ],
      cta: { href: "/admin/users", label: "Öppna användare" },
    },
    {
      id: "uppgifter",
      title: "Dina uppgifter",
      summary: "Vad som sparas och var",
      blocks: [
        {
          t: "p",
          text: "Kraft körs på en egen server hemma, inte hos ett molnbolag. Det som sparas är användarnamn, ett hashat lösenord (aldrig i klartext), dina program, pass och set, loggad mat, vikt och vatten, samt inställningar som språk, tema, mål och tidszon. Det finns ingen reklam och ingen spårning. Skannar du en streckkod skickas bara själva koden från servern till Open Food Facts, inte vem du är. Andra användare kan inte se din träning. Administratören driver servern och kan tekniskt komma åt databasen.",
        },
        { t: "p", text: "Vill du bort? Be en admin ta bort ditt konto. Då raderas allt som hör till det." },
      ],
    },
  ],
  faqTitle: "Vanliga frågor",
  faq: [
    {
      q: "Det står att mitt konto väntar på godkännande",
      a: "Kontot är skapat men en admin har inte godkänt det än. Be den som driver appen titta på ringklockan. Därefter kan du logga in som vanligt.",
    },
    {
      q: "Appen föreslår fel pass",
      a: "Rotationen flyttas bara när du avslutar ett pass. Under **Träning** ligger alla pass i en lista, och du kan trycka **Starta** på vilket som helst.",
    },
    { q: "Jag skrev in fel vikt eller reps", a: "Tryck på setet i listan under övningen. Då kan du ändra det eller ta bort det." },
    {
      q: "Jag stängde appen mitt i passet",
      a: "Passet ligger kvar. Öppna Kraft och tryck **Fortsätt passet** på startsidan eller under Träning.",
    },
    {
      q: "Jag har ingen uppkoppling på gymmet",
      a: "Just nu behövs uppkoppling för att spara ett set. Misslyckas det står det i rött och dina siffror ligger kvar, så du kan trycka igen när du har täckning. Ett riktigt offline-läge är planerat.",
    },
    {
      q: "Skärmen släcks under passet",
      a: "Appen ber om att få hålla skärmen tänd, men det fungerar bara på iOS 16.4 eller nyare. I energisparläge kan telefonen släcka den ändå.",
    },
    {
      q: "Kan jag använda appen på flera enheter?",
      a: "Ja. Logga in med samma konto. Allt ligger på servern, så ett nytt pass syns direkt på den andra enheten.",
    },
    {
      q: "Hur räknas mitt kalorimål ut?",
      a: "Av längd, vikt, ålder, kön, aktivitetsnivå och vilken veckotakt du vill ha för vikten, med Mifflin–St Jeor. Du ser siffrorna under **Mat → Mål** och kan skriva in egna i stället.",
    },
    {
      q: "Varför stämmer kalorierna inte exakt?",
      a: "Näringsdata och portioner varierar, och appen vet inte exakt vad du åt. Räkna med flera tiotals procents osäkerhet på en enskild dag. Trenden över veckor säger mer.",
    },
    {
      q: "Kameran startar inte när jag skannar",
      a: "Kraft behöver tillåtelse att använda kameran: på iPhone under **Inställningar → Safari → Kamera** (eller Kraft, om appen ligger på hemskärmen). Kameran kräver också en säker anslutning (https) och en aktuell iOS-version. Du kan alltid skriva in siffrorna under streckkoden i stället.",
    },
    { q: "Det livsmedel jag äter finns inte", a: "Skapa ett eget livsmedel under **+ Lägg till → Skapa eget livsmedel**, eller använd **Snabblogga kalorier**." },
  ],
  comingTitle: "På väg",
  coming: [
    "Måltidsmallar",
    "Påminnelse när det kan vara dags att höja vikten",
    "Ungefärlig kaloribalans och steg",
    "Offline-läge",
  ],
  backToTop: "Till toppen",
};

const en: HelpContent = {
  title: "Help",
  lead: "How to use Kraft: from your first login to following your progress workout by workout.",
  quickTitle: "Get started in five minutes",
  quick: [
    "**Create an account** on the login page and wait for an admin to approve you. Then log in.",
    "Open **Training → Create program**. Pick how many workouts you rotate between (e.g. A, B and C) and add exercises with sets and reps.",
    "Tap **Start** on the workout that's up next.",
    "Enter weight and reps and tap **Log set**. The rest timer starts by itself.",
    "When you're done: **Finish workout**. The rotation then moves on to the next workout.",
    "Next time you do the same workout you'll see **what you did last time** on every exercise. Beat it.",
  ],
  contentsTitle: "Contents",
  sections: [
    {
      id: "install",
      title: "Add to your home screen",
      summary: "How to get Kraft as an app on your phone",
      blocks: [
        {
          t: "p",
          text: "Kraft is a web app. You don't get it from the App Store; you add it to your home screen so it opens like a regular app.",
        },
        {
          t: "steps",
          items: [
            "**iPhone:** open Kraft in **Safari** (not inside another app).",
            "Tap the **Share** button (the square with an arrow pointing up).",
            "Choose **Add to Home Screen** and tap **Add**.",
          ],
        },
        { t: "p", text: "**Android:** open the menu (⋮) in Chrome and choose **Install app** or **Add to Home screen**." },
        {
          t: "tip",
          text: "Open the app from its icon. You stay logged in for 60 days. If you switch theme, the colour of the iPhone status bar only changes the next time you open the app.",
        },
      ],
    },
    {
      id: "account",
      title: "Account and login",
      summary: "Create an account, get approved, change password",
      blocks: [
        {
          t: "list",
          items: [
            "**Create an account:** tap **Create account** on the login page. Username: 3–32 characters, a–z, 0–9, dot, hyphen or underscore. Password: at least 8 characters.",
            "**Who are you?** Say who you are. That's what the administrator sees when deciding whether to approve you.",
            "**Approval:** an admin has to approve the account before you can log in. You won't get an email, so try logging in again later.",
            "**Change password:** Settings → Change password. Your other devices are logged out.",
            "**Forgot your password:** ask an admin to set a new one. There's no reset link because the app doesn't send email.",
          ],
        },
      ],
      cta: { href: "/settings", label: "Open settings" },
    },
    {
      id: "program",
      title: "Programs and rotation",
      summary: "Create workouts, set sets and reps, supersets",
      blocks: [
        {
          t: "p",
          text: "A **program** is the set of workouts you rotate between, for example Workout A, B and C. Each workout has exercises. The app suggests the workout that's up next, but you can always pick another one.",
        },
        {
          t: "steps",
          items: [
            "Go to **Training → Create program** (or **Edit program**).",
            "Choose the **number of workouts** with − and +, and name them.",
            "Tap **+ Add exercise** in each workout. Search the list (in Swedish or English) or choose **Create custom exercise**.",
            "Set **sets**, **reps from/to** (for example 8–10) and **rest** in seconds. Timed exercises use seconds and cardio uses meters.",
            "Tick **Superset with the exercise above** to alternate two exercises.",
            "Tap **Save program**.",
          ],
        },
        {
          t: "tip",
          text: "The rotation only moves **when you finish** a workout. If you cancel a workout, or pick a different one, the same workout stays up next. You can change the program at any time; workouts you've already done are not affected.",
        },
      ],
      cta: { href: "/train/program", label: "Open the program" },
    },
    {
      id: "workout",
      title: "Doing a workout",
      summary: "Log sets, rest, fix mistakes, finish",
      blocks: [
        {
          t: "steps",
          items: [
            "Tap **Start** on the **Training** page.",
            "Enter **Kilos** and **Reps** for each set (− and + adjust) and tap **Log set**. The fields are pre-filled with your latest numbers, so you only change what's different.",
            "After a set the **rest timer** starts at the bottom. Tap **+15 s** for more time or **Skip**. It beeps (and vibrates where the phone can) when the rest is over.",
            "Done? Tap **Finish workout**. You'll see time, number of sets, volume and progress per exercise.",
          ],
        },
        {
          t: "list",
          items: [
            "**More: set type and RPE** (expand under the fields): **Warm-up** doesn't count towards volume or best set and doesn't start a rest. **Drop set** marks a set where you lowered the weight. **RPE** 1–10 is how hard it felt; 10 means nothing was left.",
            "**Superset:** the rest only starts once you've logged the last exercise in the superset.",
            "**Fix mistakes:** tap a logged set to edit or delete it.",
            "**Cancel:** **Cancel workout** saves nothing to your history and the rotation stays put.",
          ],
        },
        {
          t: "tip",
          text: "Every set is saved straight to the server, so nothing is lost if you close the app. Open Kraft again and tap **Continue workout**. The app tries to keep the screen on during a workout.",
        },
      ],
      cta: { href: "/train", label: "Open training" },
    },
    {
      id: "progress",
      title: "Last time and progress",
      summary: "Arrows, tips and what the numbers mean",
      blocks: [
        {
          t: "list",
          items: [
            "**Last time** is shown above each exercise: your sets from the previous time and your best set.",
            "**The arrows ↑ = ↓** after each set compare with the same set last time (by estimated 1RM): better, equal or worse.",
            "**Tips:** if all your sets reach the upper rep limit (for example 10 of 8–10), the app suggests you **increase the weight** by 2.5 kg. If any set is below the lower limit, it tells you to **stay at the same weight**. In between: **aim for one more rep** per set. Tips apply to exercises with weight and reps.",
            "**History:** tap an exercise name for your **best set**, a **trend line** and every workout.",
          ],
        },
        {
          t: "p",
          text: "**Estimated 1RM** uses the Epley formula: kilos × (1 + reps ÷ 30). It estimates the heaviest weight you could lift once and is a number for comparing workouts, not a goal. **Volume** is kilos × reps, summed over all working sets (warm-ups don't count).",
        },
      ],
    },
    {
      id: "food",
      title: "Food and calories",
      summary: "Log food, goals, water and weight",
      blocks: [
        {
          t: "steps",
          items: [
            "Tap **Food** on the home page and then **+ Add** next to the meal.",
            "Search for a food (in Swedish or English), or pick from **Recently used** and **Favorites** (the star).",
            "Choose an amount in **grams** or **servings**. Calories and macros are calculated as you type.",
            "Tap **Add**. You land back on the day.",
          ],
        },
        {
          t: "list",
          items: [
            "**Can't find it?** Create **your own food** (values per 100 g; only you can see it) or use **Quick add calories**, for example for a lunch out.",
            "**Barcode:** tap **Scan barcode** and point the camera at the code. The product is looked up at Open Food Facts, an open database anyone can add data to, so check the values. A product that is found is saved so the next scan is quick. If the camera doesn't work you can type the digits under the barcode.",
            "**Product missing or values wrong?** Create your own food with the same barcode. Yours always takes priority over the database.",
            "**Edit or remove:** tap a logged entry. If you change the amount, calories and macros scale with it.",
            "**Browse:** the arrows ‹ › change the day. **The week** shows calories against your goal, protein, workouts and weight per day.",
            "**Water:** the +250 and +500 ml buttons. **Weight:** enter today's weight; the app shows a seven-day average, since single weigh-ins fluctuate.",
          ],
        },
        {
          t: "p",
          text: "**Goals:** Food → Goals (or Settings). Choose to have them calculated from height, weight, age, sex and activity level, or enter your own. The calculation uses Mifflin–St Jeor and your weekly weight rate (1 kg of body fat ≈ 7,700 kcal). Protein is set to 1.8 g per kilo, fat to 25 % of energy (at least 0.6 g per kilo) and the rest becomes carbs. The goal never goes below 1,200 kcal, and it's recalculated straight away when you log a new weight.",
        },
        {
          t: "tip",
          text: "All numbers are approximate. Nutrition data and portions vary, and the app can't know exactly what you ate. Use the goal as a direction and look at the weekly trend rather than a single day. If you have a medical condition, are pregnant or have extreme goals: ask a healthcare professional.",
        },
      ],
      cta: { href: "/food", label: "Open the food log" },
    },
    {
      id: "healthsync",
      title: "Health sync from iPhone",
      summary: "Weight from the Health app ends up in Kraft on its own",
      blocks: [
        {
          t: "p",
          text: "A shortcut in the Shortcuts app can send your latest weight from Health to Kraft every evening. There is no app to install, but you add one shortcut and one automation once.",
        },
        {
          t: "steps",
          items: [
            "Open **Settings → Health sync** in Safari on your iPhone and tap **Create key**. Tap **Copy the key**.",
            "Tap **Add the shortcut**. Shortcuts asks for the key — paste it.",
            "In Shortcuts: **Automation → New Automation → Time of Day**, pick a time, choose the shortcut **kraft-halsosynk** and **Run Immediately**.",
            "Allow access to weight in Health when iOS asks. Run the shortcut once by hand — the page then shows **Last sync** with what arrived.",
          ],
        },
        {
          t: "list",
          items: [
            "**Weight:** the latest weigh-in in Health replaces today's weigh-in in Kraft. The shortcut assumes kilograms.",
            "**The key** is a password for this sync only. You can create a new one (the old one stops working) or remove it under Settings → Health sync.",
            "**Water** Kraft can accept as a daily total, but the finished shortcut doesn't send it yet.",
          ],
        },
        {
          t: "tip",
          text: "No sync shown after you ran the shortcut? Then nothing reached Kraft, and the problem is in the shortcut or in the access to Health.",
        },
      ],
      cta: { href: "/settings/health", label: "Open health sync" },
    },
    {
      id: "appearance",
      title: "Language and theme",
      summary: "Swedish/English and dark/light",
      blocks: [
        {
          t: "list",
          items: [
            "**Language:** Kraft follows your device's language. Tap the language button (SV/EN) at the top to choose yourself; **Auto** follows the device again.",
            "**Theme:** the sun or moon button at the top switches between dark and light. Your choice follows your account to new devices.",
            "**The logo** at the top always takes you to the home page.",
          ],
        },
      ],
    },
    {
      id: "admin",
      title: "For administrators",
      summary: "Approve accounts and manage users",
      adminOnly: true,
      blocks: [
        {
          t: "list",
          items: [
            "**The bell** at the top shows how many are waiting for approval. Tap it for the list (Admin → Users).",
            "**Approve** lets the person log in. **Reject** deletes the request so the username becomes free again.",
            "**New account** on the same page creates an account that's approved straight away. Give the person the username and password.",
            "Per account you can **set a new password**, make them **admin** or **member**, or **remove** the account (all data is deleted). You can't remove yourself, and at least one admin must remain.",
            "**The status card** on the home page is only shown to admins.",
          ],
        },
      ],
      cta: { href: "/admin/users", label: "Open users" },
    },
    {
      id: "data",
      title: "Your data",
      summary: "What is stored and where",
      blocks: [
        {
          t: "p",
          text: "Kraft runs on a private server at home, not at a cloud company. What's stored is your username, a hashed password (never in plain text), your programs, workouts and sets, logged food, weight and water, and settings such as language, theme, goals and time zone. There are no ads and no tracking. If you scan a barcode, only the code itself is sent from the server to Open Food Facts, not who you are. Other users can't see your training. The administrator runs the server and can technically access the database.",
        },
        { t: "p", text: "Want out? Ask an admin to delete your account. Everything that belongs to it is deleted." },
      ],
    },
  ],
  faqTitle: "Frequently asked questions",
  faq: [
    {
      q: "It says my account is waiting for approval",
      a: "The account exists but an admin hasn't approved it yet. Ask whoever runs the app to check the bell. After that you can log in as usual.",
    },
    {
      q: "The app suggests the wrong workout",
      a: "The rotation only moves when you finish a workout. Under **Training** every workout is listed, and you can tap **Start** on any of them.",
    },
    { q: "I entered the wrong weight or reps", a: "Tap the set in the list under the exercise. You can then edit or delete it." },
    {
      q: "I closed the app in the middle of a workout",
      a: "The workout is still there. Open Kraft and tap **Continue workout** on the home page or under Training.",
    },
    {
      q: "I have no signal at the gym",
      a: "Right now you need a connection to save a set. If it fails it says so in red and your numbers stay in the fields, so you can tap again once you have signal. A proper offline mode is planned.",
    },
    {
      q: "The screen turns off during a workout",
      a: "The app asks to keep the screen on, but that only works on iOS 16.4 or newer. In low-power mode the phone may turn it off anyway.",
    },
    {
      q: "Can I use the app on several devices?",
      a: "Yes. Log in with the same account. Everything is on the server, so a new workout shows up on the other device straight away.",
    },
    {
      q: "How is my calorie goal calculated?",
      a: "From height, weight, age, sex, activity level and the weekly weight rate you choose, using Mifflin–St Jeor. You can see the numbers under **Food → Goals** and enter your own instead.",
    },
    {
      q: "Why aren't the calories exact?",
      a: "Nutrition data and portions vary, and the app doesn't know exactly what you ate. Expect several tens of percent of uncertainty on a single day. The trend over weeks says more.",
    },
    {
      q: "The camera doesn't start when I scan",
      a: "Kraft needs permission to use the camera: on iPhone under **Settings → Safari → Camera** (or Kraft, if the app is on your home screen). The camera also needs a secure connection (https) and a current iOS version. You can always type the digits under the barcode instead.",
    },
    { q: "The food I eat isn't in the list", a: "Create your own food under **+ Add → Create your own food**, or use **Quick add calories**." },
  ],
  comingTitle: "Coming up",
  coming: [
    "Meal templates",
    "A reminder when it may be time to increase the weight",
    "Approximate calorie balance and steps",
    "Offline mode",
  ],
  backToTop: "Back to top",
};

export const HELP: Record<Locale, HelpContent> = { sv, en };
