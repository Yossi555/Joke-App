# ARCHITECTURE: בדיחה בלחיצה

המסמך מתאר את המערכת אחרי Milestone 6, ואת הבונוס של Google. מה שנוסף ב-Milestone 5 וב-Milestone 6 מסומן בסוגריים.

## 1. מבנה המערכת בשלוש שכבות

### צד לקוח
- index.html עם ה-CSS וה-JavaScript של המסך, וקובץ auth.js בשורש לכל הכניסה (Milestone 5). עברית, `lang="he"` ו-`dir="rtl"`.
- הלוגו, ארבעת הציורים של הדמות והרקע הם קבצי SVG בתיקיית assets. הדף מחליף ביניהם לפי `data-state` על הבועה: idle, think, joke, error.
- טופס עם תיבה (maxlength 100) וכפתור. בשליחה: POST ל-/api/joke, ואז הצגת הבדיחה או ההודעה.
- הכניסה (Milestone 5):
  - הספרייה `@supabase/supabase-js` נטענת מ-jsDelivr, בגרסה קבועה, ואחריה auth.js.
  - הספרייה בדפדפן משמשת רק לכניסה: הרשמה, כניסה, התנתקות ושמירת הטוקן. היא לא קוראת ולא כותבת אף טבלה.
  - כתובת הפרויקט והמפתח הציבורי מגיעים מ-/api/config. הם לא כתובים בקוד הדף.
  - auth.js חושפת: ready, ‏signUp(name, email, password) עם full_name ב-user_metadata, ‏signIn, ‏signOut ב-scope מקומי, ‏session, ‏token, ‏onChange, והודעות שגיאה בעברית. flowType של pkce.
  - כל קריאה ל-/api שולחת את הטוקן בכותרת `Authorization: Bearer <token>`, אם יש. תשובת 401 עם `code: "auth_required"` כשנשלח טוקן: הדף מתנתק לבד, וכותב "צריך להתחבר שוב".
  - כפתור חשבון בראש המסך, חלון כניסה עם שתי לשוניות, וחלון "החשבון שלי" עם התנתקות ומחיקת חשבון.
- הקהילה (Milestone 6):
  - רכיב הצבעה אחד, "אהבתי" ו"לא אהבתי", בכל מקום שיש בדיחה. הוא מחליף את "צחקתי" מ-Milestone 4.
  - שלוש לשוניות בתחתית: ‏‎#joke, ‏‎#community ו-‎#liked. הניווט לפי ה-hash, כדי שכפתור החזרה של הטלפון יעבוד.
  - קהילה נטענת מ-/api/feed?mode=new או top, ואהבתי מ-/api/feed?mode=liked.
  - רשימה נטענת כשנכנסים ללשונית, אחרי הצבעה, ואחרי כניסה או יציאה. אין polling.
  - אורח שלוחץ על הצבעה מקבל את חלון הכניסה, וההצבעה נשלחת לבד אחרי הכניסה.
- הדף מדבר רק עם /api. הבקשות ל-supabase.co הן רק לנתיב /auth/v1, ואין אף בקשה ל-/rest/v1.
- כל טקסט מהשרת או מהמשתמש מוצג עם textContent, אף פעם לא innerHTML.
- רושם את sw.js כ-service worker.

### לוגיקה
- Vercel Functions, כל אחת עם `export default { async fetch(request) { ... } }`:
  - api/joke.js: בדיחה מ-OpenAI ושמירה בטבלה.
  - api/config.js: הכתובת והמפתח הציבורי לדפדפן (Milestone 5).
  - api/delete-account.js: מחיקת חשבון (Milestone 5).
  - api/vote.js: הצבעה (Milestone 6).
  - api/feed.js: רשימות הקהילה ואהבתי (Milestone 6). מחליפה את api/top.js.
  - api/laugh.js ו-api/top.js נמחקות ב-Milestone 6.
- רק הפונקציות בתיקיית api מדברות עם בסיס הנתונים, דרך הלקוח היחיד ב-lib/supabase.js, עם המפתח הסודי.
- זיהוי משתמש: הפונקציה לוקחת את הטוקן מהכותרת Authorization, ושואלת את Supabase עם `supabase.auth.getUser(token)`. מזהה משתמש או שם שמגיעים מהדף, לא נחשבים.
- lib/supabase.js, בנוסף ללקוח (Milestone 5):
  - `hasToken(request)`.
  - `getUserFromRequest(request, supabase)`: מחזירה את המשתמש או null, וזורקת שגיאה כש-Supabase לא זמין.
  - `displayName(user)`: מחזירה את `user_metadata.full_name`, עד 30 תווים.
- lib/http.js (Milestone 5): תשובת JSON עם `Cache-Control: no-store`, תשובת 401 עם `code: "auth_required"`, וקריאת גוף עם מגבלת גודל.
- api/joke.js:
  - מקבלת רק POST עם JSON: `{ "topic": "..." }`. חותכת את הנושא ל-100 תווים. נושא ריק או גוף שבור נחשבים "אין נושא".
  - אם יש טוקן, מזהה את המשתמש לפני הקריאה ל-OpenAI. טוקן ש-Supabase לא מכיר: 401 עם auth_required, בלי לפנות ל-OpenAI. Supabase לא זמין: הבדיחה בכל זאת מגיעה, בלי שמירה.
  - פונה ל-OpenAI, מחלצת את הטקסט, ושומרת את הבדיחה. למשתמש מחובר: עם user_id ו-author_name מהטוקן.
  - אם השמירה נכשלת, הבדיחה עדיין חוזרת לדף, עם `"id": null`, והשגיאה נרשמת ב-console.error.
- api/config.js: GET בלבד. מחזירה `{ url, publishableKey }` מ-SUPABASE_URL ומ-SUPABASE_PUBLISHABLE_KEY. אחד חסר, או שהמפתח במשתנה הוא מפתח סודי: 500 עם `code: "auth_not_configured"`. אף פעם לא מחזירה מפתח סודי.
- api/delete-account.js: POST עם טוקן בלבד. קודם מנקה את author_name בבדיחות של המשתמש, ואז `supabase.auth.admin.deleteUser`. הבדיחות נשארות, בלי שם ובלי בעלים. ההצבעות שלו נמחקות עם החשבון.
- api/vote.js: POST עם טוקן בלבד. הגוף `{ id, value }`: ‏id חייב להיות uuid, ו-value הוא 1, ‏1- או 0 בדיוק, כמספר. קוראת ל-`cast_vote` דרך rpc, עם voter מהטוקן. בדיחה שלא קיימת: 404.
- api/feed.js: GET עם mode של new, ‏top או liked. ‏new ו-top גם לאורח. ‏liked רק עם טוקן, אחרת 401. קוראת ל-`joke_feed` דרך rpc. כמות השורות: 20 ל-new, ‏10 ל-top, ‏50 ל-liked. לא מחזירה user_id אף פעם.

### נתונים
Supabase (Postgres) ו-Supabase Auth. הטבלאות `public.jokes` ו-`public.votes`, והפונקציות `public.cast_vote` ו-`public.joke_feed`. הגישה לטבלאות רק מהפונקציות בתיקיית api, עם המפתח הסודי. המשתמשים ב-`auth.users`, שמנוהלת על ידי Supabase Auth.

## 2. מבנה הנתונים
כל SQL נשמר קודם כקובץ בתיקייה db, מוצג לי, ורץ דרך המחבר של Supabase רק אחרי אישור. אחרי כל הרצה: `get_advisors`, הסבר בעברית, ועצירה.

### הטבלה `public.jokes`
מה-migration בשם `create_jokes` (db/create_jokes.sql), ומ-`add_joke_authors` (db/add_joke_authors.sql, ‏Milestone 5).

| עמודה | סוג | הגדרה |
|---|---|---|
| `id` | uuid | מפתח ראשי, ברירת מחדל `gen_random_uuid()` |
| `created_at` | timestamptz | ברירת מחדל `now()` |
| `topic` | text | |
| `text` | text | חובה |
| `laughs` | integer | חובה, ברירת מחדל 0. מ-Milestone 6 האפליקציה לא משתמשת בה, והיא נשארת |
| `user_id` | uuid | לא חובה. `references auth.users (id) on delete set null`. אינדקס. ‏Milestone 5 |
| `author_name` | text | לא חובה. check: ‏null, או בין 1 ל-30 תווים אחרי btrim. ‏Milestone 5 |

אורח שומר בדיחה בלי user_id ובלי author_name.

### הטבלה `public.votes` (Milestone 6)
מה-migration בשם `create_votes` (db/create_votes.sql).

| עמודה | סוג | הגדרה |
|---|---|---|
| `user_id` | uuid | חובה. `references auth.users (id) on delete cascade` |
| `joke_id` | uuid | חובה. `references public.jokes (id) on delete cascade`. אינדקס |
| `value` | smallint | חובה. check: ‏1- או 1 |
| `voted_at` | timestamptz | חובה, ברירת מחדל `now()` |

המפתח הראשי `(user_id, joke_id)` מבטיח קול אחד לכל משתמש לכל בדיחה.

### הפונקציות
- `public.add_laugh(joke_id uuid)`, מ-Milestone 4: מוסיפה 1 למונה ומחזירה את המספר החדש. מ-Milestone 6 האפליקציה לא משתמשת בה, והיא נשארת.
- `public.cast_vote(voter uuid, target uuid, new_value smallint)`, ב-plpgsql (Milestone 6):
  - 1 או 1-: ‏insert עם `on conflict (user_id, joke_id) do update` של value ו-voted_at.
  - 0: מוחקת את ההצבעה. כל ערך אחר: שגיאה.
  - מחזירה שורה אחת: likes, ‏dislikes ו-my_vote של הבדיחה.
- `public.joke_feed(viewer uuid, mode text, max_rows integer default 20)`, ב-sql, ‏stable (Milestone 6):
  - מחזירה id, ‏created_at, ‏topic, ‏text, ‏author_name, ‏likes, ‏dislikes ו-my_vote.
  - new: לפי created_at, מהחדש.
  - top: רק בדיחות עם like אחד לפחות, לפי likes פחות dislikes, ואז לפי likes.
  - liked: רק בדיחות ש-viewer סימן בהן 1, לפי voted_at.
  - viewer הוא null לאורח. max_rows בין 1 ל-50.
- בכל הפונקציות: `security invoker`, ‏`set search_path = ''`, ושמות מלאים כמו `public.votes`.
- לא מוחקים נתונים: העמודה laughs והפונקציה add_laugh נשארות בבסיס הנתונים.

### החוזה בין הדף לפונקציות, אחרי Milestone 6

| הפונקציה | בקשה | טוקן | תשובה |
|---|---|---|---|
| /api/config | GET | לא | `{ url, publishableKey }` |
| /api/joke | POST `{ topic }` | רשות | `{ joke, id, author_name }` |
| /api/feed?mode=new או top | GET | רשות | `{ jokes: [{ id, topic, text, author_name, likes, dislikes, my_vote, created_at }] }` |
| /api/feed?mode=liked | GET | חובה | כמו למעלה |
| /api/vote | POST `{ id, value }` | חובה | `{ likes, dislikes, my_vote }` |
| /api/delete-account | POST | חובה | `{ deleted: true }` |

- author_name הוא null לאורח ולבדיחה אנונימית.
- שגיאה: `{ error: "הודעה קצרה בעברית" }`. כשצריך להתחבר: 401 עם `{ error, code: "auth_required" }`.
- קלט שגוי, כמו id שאינו uuid או value של 5: ‏400. שיטה לא נכונה: 405.
- כל התשובות עם `Cache-Control: no-store`, כי הן תלויות במי ששואל.

## 3. התחברות והרשאות
- רמה 3 לפי course-stack.md: משתמשים אמיתיים עם הרשמה עצמית, ב-Supabase Auth (Milestone 5).
- הכניסה עם מייל וסיסמה. Confirm email כבוי, ו-Allow new users to sign up דולק. בונוס: כניסה עם Google.
- הטוקן עובר מהדף לפונקציות בכותרת `Authorization: Bearer <token>`. הפונקציות מזהות משתמש רק עם `supabase.auth.getUser(token)`. user_id או שם בגוף הבקשה לא נחשבים.
- אורח: מבקש בדיחות וקורא את הקהילה. כדי לדרג, ולראות את "אהבתי", צריך חשבון.
- ההגנה על העלות: אורך נושא מוגבל, ומגבלת הוצאה בחשבון OpenAI.

הגישה לנתונים נעולה לשרת בלבד:
- כל טבלה: RLS דולק בלי אף policy, ‏`revoke all` מ-`anon` ומ-`authenticated`, ו-grant רק ל-`service_role`.
  - `public.jokes`: ‏`grant select, insert, update`.
  - `public.votes`: ‏`grant select, insert, update, delete`.
- כל פונקציה בבסיס הנתונים: `revoke execute` מ-`public`, ‏`anon` ו-`authenticated`, ו-`grant execute` ל-`service_role`.

### בונוס: כניסה עם Google
- auth.js: פונקציה `google()` עם `signInWithOAuth`, ‏provider של google, ו-redirectTo לכתובת האתר עם / בסוף.
- לפני היציאה בודקים ב-/auth/v1/settings, שהיא ציבורית ועונה עם המפתח הציבורי, ש-Google דולק. כבוי: הודעה בעברית, בלי לצאת מהדף.
- בחזרה: הספרייה מחליפה את `?code=` בטוקן (pkce). ‏`?error=`, או קוד שלא הוחלף: הודעה בעברית בחלון הכניסה. הכתובת מתנקה בשני המקרים.
- לפני היציאה נשמרים ב-sessionStorage הלשונית, הבדיחה שעל המסך וההצבעה שחיכתה לכניסה. בחזרה הם משוחזרים, וההצבעה נשלחת מיד.
- השם מגיע מ-Google, ב-`user_metadata.full_name`, ולכן displayName לא משתנה. בשרת לא משתנה כלום.

## 4. שכבת ה-AI
- הקריאה: POST אל `https://api.openai.com/v1/responses`, מתוך הפונקציה בלבד, עם הכותרת `Authorization: Bearer <OPENAI_API_KEY>`.
- הגוף: `model` מ-OPENAI_MODEL או `gpt-5`, ‏`instructions` עם הפרומפט המרכזי, `input` עם הנושא, ‏`reasoning: { effort: "low" }` ו-`max_output_tokens`.
- הפרומפט המרכזי: "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה."
- ה-input: "נושא הבדיחה: [הנושא]". בלי נושא: "אין נושא. ספר בדיחה כללית על החיים."
- התשובה: לוקחים את `output_text` אם קיים. אחרת, את הטקסט מהפריטים מסוג `message` במערך `output`, בחלקים מסוג `output_text`. אין טקסט: שגיאה.
- שגיאה מ-OpenAI: הסטטוס והקוד נרשמים ב-console.error, והדף מקבל הודעה קצרה בעברית לפי הקוד: 401, נגמר הקרדיט, מגבלת הוצאה, 429, 404.
- לפני כתיבת הקוד בודקים בתיעוד העדכני של OpenAI ושל Vercel את מבנה הבקשה והתשובה.

## 5. אינטגרציות, APIs ואוטומציות
- OpenAI Responses API, מהפונקציה api/joke.js.
- Supabase לשמירה, דרך החבילה `@supabase/supabase-js`, רק מהפונקציות בתיקיית api.
- Supabase Auth לכניסה (Milestone 5): בדפדפן דרך הספרייה מ-jsDelivr, רק לנתיב /auth/v1. בשרת: `auth.getUser` ו-`auth.admin.deleteUser`.
- Google OAuth, דרך Supabase Auth (בונוס). ההגדרה ב-Google Cloud Console ובדשבורד של Supabase.
- אין אוטומציות ואין שירותים נוספים.

## 6. מפתחות וסודות
| השם | איפה | סוג | מה הוא |
|---|---|---|---|
| OPENAI_API_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | מפתח ה-production, ‏joke-in-a-click. רק הפונקציה קוראת אותו |
| OPENAI_API_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מפתח dev נפרד, ‏joke-in-a-click-dev. הסטודנט מדביק אותו ביד |
| OPENAI_MODEL | Vercel, Environment Variables | Config, לא חובה | שם המודל. בלי המשתנה: gpt-5 |
| SUPABASE_URL | Vercel, Environment Variables, בכל הסביבות | Config | כתובת הפרויקט ב-Supabase. lib/supabase.js ו-api/config.js קוראים אותה |
| SUPABASE_SECRET_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | המפתח הסודי של Supabase. רק lib/supabase.js קורא אותו. אני שם אותו ביד, ו-Claude לא מבקש אותו |
| SUPABASE_PUBLISHABLE_KEY | Vercel, Environment Variables, בכל הסביבות | Config. חדש ב-Milestone 5 | המפתח הציבורי. רק api/config.js קורא אותו ומעביר לדפדפן. הוא לא סוד, ו-Claude יכול להביא אותו דרך המחבר, עם get_publishable_keys |
| Client Secret של Google | רק בדשבורד של Supabase, בספק Google | בונוס | לא בקוד, לא בריפו ולא ב-Vercel |

- המפתחות הסודיים לא מופיעים בשום קובץ שנכנס לריפו, ולא בצ׳אט עם Claude. היחיד: .env.local במחשב, למי שמריץ מקומית.
- מפתח ה-production נשמר ב-Vercel כבר ב-Milestone 1. אחרי כל שינוי במשתנה: Redeploy.
- .claude/settings.json חוסם ל-Claude את הקריאה של .env ושל .env.*. בריפו יש .env.example עם השורות OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY= בלבד, בלי ערכים. הוא לא משתנה ב-Milestone 5: המפתח הציבורי אינו סוד, ולכן הוא לא בקובץ.
- למי שמריץ מקומית, .env.local מכיל את מפתח ה-dev, ומ-Milestone 4 גם את SUPABASE_URL ואת SUPABASE_SECRET_KEY, שמודבקים ביד. שם המודל לא נכנס לקובץ: בלי OPENAI_MODEL הקוד משתמש ב-gpt-5.
- הדפדפן מקבל רק את המפתח הציבורי, מ-/api/config. בקוד הדף אין sb_publishable_ ואין sb_secret_.
- .gitignore כולל `.env`, ‏`.env.*`, את החריגה `!.env.example`, ‏`.vercel` ו-`node_modules`. הוא נוצר לפני הקומיט הראשון.
- בחשבון OpenAI: קרדיט מראש, Auto recharge כבוי, ומגבלת הוצאה חודשית.

## 7. מבנה התיקיות של הקוד
```
index.html                המסך, עם ה-CSS וה-JavaScript
auth.js                   כל הכניסה בדפדפן, עם הספרייה של Supabase. Milestone 5
manifest.webmanifest      name, short_name, start_url, display: standalone, lang: he, dir: rtl, אייקונים
sw.js                     service worker, network-first, בלי /api
package.json              "type": "module", ו-@supabase/supabase-js ב-dependencies
.gitignore                .env, .env.*, !.env.example, .vercel, node_modules
.env.example              שתי שורות בלבד: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=, בלי ערכים ובלי הערות
.claude/settings.json     חוסם ל-Claude את הקריאה של .env ושל .env.*
assets/logo.svg
assets/mascot-idle.svg, mascot-think.svg, mascot-joke.svg, mascot-error.svg
assets/bg-dots.svg, bg-doodles.svg
assets/icon.svg, icon-maskable.svg
assets/icon-192.png, icon-512.png, icon-512-maskable.png
api/joke.js               בדיחה מ-OpenAI ושמירה בטבלה. המקום היחיד שקורא את מפתח OpenAI
api/config.js             הכתובת והמפתח הציבורי לדפדפן. Milestone 5
api/delete-account.js     מחיקת חשבון. Milestone 5
api/vote.js               הצבעה דרך cast_vote. Milestone 6
api/feed.js               קהילה ואהבתי דרך joke_feed. Milestone 6
lib/supabase.js           הלקוח היחיד של Supabase, ו-getUserFromRequest. המקום היחיד שקורא את המפתח הסודי
lib/http.js               תשובות JSON, ‏401 וקריאת גוף. Milestone 5
db/create_jokes.sql       עותק של ה-migration מ-Milestone 4
db/add_joke_authors.sql   Milestone 5
db/create_votes.sql       Milestone 6
spec/                     מסמכי האיפיון, ו-spec/plans
```

api/laugh.js ו-api/top.js קיימים עד Milestone 6, ונמחקים בו.

ה-service worker:
- באירוע install שומר במטמון את /, את ה-manifest, את /auth.js (מ-Milestone 5), את קבצי ה-SVG מתיקיית assets ואת שני האייקונים.
- בכל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת (כולל Supabase ו-jsDelivr): לא נוגע בה.
- גרסת מטמון חדשה ב-Milestone 5 וב-Milestone 6.

## הנחות והחלטות
- בלי ai-tests.md. במקומו, חמש בדיקות ידניות בתנאי ההשלמה של Milestone 2. המוצר קטן, והפלט הוא טקסט חופשי.
- שני גופנים מ-Google Fonts, Fredoka ו-Playpen Sans Hebrew, עם גיבוי ל-system-ui. ה-service worker לא שומר אותם, כי הם מכתובת אחרת.
- CSS ו-JavaScript של המסך בתוך index.html. הכניסה בקובץ נפרד, auth.js, כדי שהיא תהיה במקום אחד.
- `reasoning: { effort: "low" }` כדי שהבדיחה תחזור מהר. אם התיעוד העדכני לא תומך בשדה הזה במודל שנבחר, מורידים אותו.
- הפונקציה כותבת console.log קצר לכל בדיחה (הנושא והמודל), כדי לראות פניות ב-Logs.
- כשהשמירה נכשלת אין id, ולכן הבדיחה מוצגת בלי רכיב ההצבעה.
- ב-Milestone 4 הנעילה של "צחקתי" הייתה בדף בלבד. מ-Milestone 6 השרת יודע מי הצביע, והמפתח הראשי של votes מבטיח קול אחד.
- בשוויון בדירוג, הבדיחה החדשה יותר מופיעה קודם.
- מחיקת חשבון משאירה את הבדיחות, בלי שם ובלי בעלים, ומוחקת את ההצבעות. המספרים בקהילה יורדים בהתאם.
