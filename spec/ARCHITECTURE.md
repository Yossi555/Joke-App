# ARCHITECTURE: בדיחה בלחיצה

## 1. מבנה המערכת בשלוש שכבות

### צד לקוח
- index.html אחד, עם ה-CSS וה-JavaScript בתוכו. עברית, `lang="he"` ו-`dir="rtl"`.
- הלוגו, ארבעת הציורים של הדמות והרקע הם קבצי SVG בתיקיית assets. הדף מחליף ביניהם לפי `data-state` על הבועה: idle, think, joke, error.
- טופס עם תיבה (maxlength 100) וכפתור. בשליחה: POST ל-/api/joke, ואז הצגת הבדיחה או ההודעה.
- מתחת לכל בדיחת AI: כפתור "צחקתי" עם מונה. לחיצה שולחת POST ל-/api/laugh, ואחריה הכפתור ננעל.
- רשימת "הכי מצחיקות": נטענת מ-/api/top בפתיחת הדף ואחרי כל צחוק, בלי polling.
- הדף מדבר רק עם /api. אין בו לקוח של Supabase, כתובת של Supabase או מפתח.
- הטקסט שחוזר מוצג עם textContent, לא innerHTML.
- רושם את sw.js כ-service worker.

### לוגיקה
- שלוש Vercel Functions, כל אחת עם `export default { async fetch(request) { ... } }`: api/joke.js, ‏api/laugh.js ו-api/top.js.
- רק הפונקציות בתיקיית api מדברות עם Supabase, דרך הלקוח היחיד ב-lib/supabase.js.
- api/joke.js מקבלת רק POST עם JSON: `{ "topic": "..." }`. מחזירה תמיד JSON: `{ "joke": "...", "id": "..." }` בהצלחה, `{ "error": "..." }` בשגיאה.
- חותכת את הנושא ל-100 תווים. נושא ריק או גוף שבור נחשבים "אין נושא".
- פונה ל-OpenAI, מחלצת את הטקסט, שומרת את הבדיחה בטבלה, ומחזירה את הבדיחה ואת ה-id שלה.
- אם השמירה נכשלת, הבדיחה עדיין חוזרת לדף, עם `"id": null`, והשגיאה נרשמת ב-console.error.
- api/laugh.js מקבלת POST עם `{ "id": "..." }`, בודקת שזה uuid, וקוראת ל-`add_laugh` דרך rpc.
- api/top.js מחזירה את חמש הבדיחות עם הכי הרבה צחוקים, רק כאלה עם צחוק אחד לפחות.

### נתונים
Supabase (Postgres). טבלה אחת, `public.jokes`, ופונקציה אחת, `public.add_laugh`. הגישה רק מהפונקציות בתיקיית api, עם המפתח הסודי.

## 2. מבנה הנתונים
הטבלה `public.jokes`, מה-migration בשם `create_jokes`. ה-SQL נשמר גם ב-db/create_jokes.sql.

| עמודה | סוג | הגדרה |
|---|---|---|
| `id` | uuid | מפתח ראשי, ברירת מחדל `gen_random_uuid()` |
| `created_at` | timestamptz | ברירת מחדל `now()` |
| `topic` | text | |
| `text` | text | חובה |
| `laughs` | integer | חובה, ברירת מחדל 0 |

הפונקציה `public.add_laugh(joke_id uuid)` מוסיפה 1 למונה בעדכון אחד, ומחזירה את המספר החדש, כך ששתי לחיצות באותו רגע לא דורסות זו את זו. היא `security invoker`, עם `search_path` ריק ושמות מלאים כמו `public.jokes`.

החוזה בין הדף לפונקציות:

| נתיב | כיוון | הגוף | סטטוס |
|---|---|---|---|
| /api/joke | הדף אל הפונקציה | `{ "topic": "חתולים" }`, או `{ "topic": "" }` | POST |
| /api/joke | הפונקציה אל הדף, הצלחה | `{ "joke": "...", "id": "uuid או null" }` | 200 |
| /api/joke | הפונקציה אל הדף, שגיאה | `{ "error": "הודעה קצרה בעברית" }` | 405, 500 או 502 |
| /api/laugh | הדף אל הפונקציה | `{ "id": "uuid" }` | POST |
| /api/laugh | הפונקציה אל הדף, הצלחה | `{ "laughs": 3 }` | 200 |
| /api/laugh | הפונקציה אל הדף, שגיאה | `{ "error": "הודעה קצרה בעברית" }` | 400, 404, 405 או 500 |
| /api/top | הדף אל הפונקציה | בלי גוף | GET |
| /api/top | הפונקציה אל הדף, הצלחה | `{ "top": [{ "id": "...", "topic": "...", "text": "...", "laughs": 3 }] }` | 200 |
| /api/top | הפונקציה אל הדף, שגיאה | `{ "error": "הודעה קצרה בעברית" }` | 405 או 500 |

## 3. התחברות והרשאות
אין כניסה, רמה 0. כל גולש יכול לבקש בדיחה. ההגנה על העלות היא אורך נושא מוגבל, ומגבלת הוצאה בחשבון OpenAI.

הגישה לנתונים נעולה לשרת בלבד:
- על `public.jokes`: ‏RLS מופעל, בלי אף policy.
- על הטבלה: `grant select, insert, update` ל-`service_role` בלבד, ו-`revoke all` מ-`anon` ומ-`authenticated`.
- על `public.add_laugh`: ‏`revoke execute` מ-`public`, ‏`anon` ו-`authenticated`, ו-`grant execute` ל-`service_role`.

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
- אין אוטומציות ואין שירותים נוספים.

## 6. מפתחות וסודות
| השם | איפה | סוג | מה הוא |
|---|---|---|---|
| OPENAI_API_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | מפתח ה-production, ‏joke-in-a-click. רק הפונקציה קוראת אותו |
| OPENAI_API_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מפתח dev נפרד, ‏joke-in-a-click-dev. הסטודנט מדביק אותו ביד |
| OPENAI_MODEL | Vercel, Environment Variables | Config, לא חובה | שם המודל. בלי המשתנה: gpt-5 |
| SUPABASE_SECRET_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | המפתח הסודי של Supabase. רק lib/supabase.js קורא אותו. אני שם אותו ביד, ו-Claude לא מבקש אותו |
| SUPABASE_URL | Vercel, Environment Variables, ב-Production וב-Preview | Config | כתובת הפרויקט ב-Supabase. רק lib/supabase.js קורא אותה |

- המפתח לא מופיע בשום קובץ שנכנס לריפו, ולא בצ׳אט עם Claude. היחיד: .env.local במחשב, למי שמריץ מקומית.
- מפתח ה-production נשמר ב-Vercel כבר ב-Milestone 1. אחרי כל שינוי במשתנה: Redeploy.
- .claude/settings.json חוסם ל-Claude את הקריאה של .env ושל .env.*. בריפו יש .env.example עם השורות OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY= בלבד, בלי ערכים. למי שמריץ מקומית, .env.local מכיל את מפתח ה-dev, ומ-Milestone 4 גם את SUPABASE_URL ואת SUPABASE_SECRET_KEY, שמודבקים ביד. שם המודל לא נכנס לקובץ: בלי OPENAI_MODEL הקוד משתמש ב-gpt-5.
- הדפדפן לא מקבל אף מפתח. הוא פונה רק ל-/api.
- .gitignore כולל `.env`, ‏`.env.*`, את החריגה `!.env.example`, ‏`.vercel` ו-`node_modules`. הוא נוצר לפני הקומיט הראשון.
- בחשבון OpenAI: קרדיט מראש, Auto recharge כבוי, ומגבלת הוצאה חודשית.

## 7. מבנה התיקיות של הקוד
```
index.html              המסך, עם ה-CSS וה-JavaScript
manifest.webmanifest    name, short_name, start_url, display: standalone, lang: he, dir: rtl, אייקונים
sw.js                   service worker, network-first, בלי /api
package.json            "type": "module", ו-@supabase/supabase-js ב-dependencies
.gitignore              .env, .env.*, !.env.example, .vercel, node_modules
.env.example            שתי שורות בלבד: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=, בלי ערכים ובלי הערות
.claude/settings.json   חוסם ל-Claude את הקריאה של .env ושל .env.*
assets/logo.svg
assets/mascot-idle.svg, mascot-think.svg, mascot-joke.svg, mascot-error.svg
assets/bg-dots.svg, bg-doodles.svg
assets/icon.svg, icon-maskable.svg
assets/icon-192.png, icon-512.png, icon-512-maskable.png
api/joke.js             בדיחה מ-OpenAI ושמירה בטבלה. המקום היחיד שקורא את מפתח OpenAI
api/laugh.js            מוסיפה צחוק דרך add_laugh
api/top.js              רשימת "הכי מצחיקות"
lib/supabase.js         הלקוח היחיד של Supabase. המקום היחיד שקורא את המפתח הסודי שלו
db/create_jokes.sql     עותק של ה-migration
spec/                   מסמכי האיפיון, ו-spec/plans
```

ה-service worker:
- באירוע install שומר במטמון את /, את ה-manifest, את קבצי ה-SVG מתיקיית assets ואת שני האייקונים.
- בכל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת: לא נוגע בה.

## הנחות והחלטות
- בלי ai-tests.md. במקומו, חמש בדיקות ידניות בתנאי ההשלמה של Milestone 2. המוצר קטן, והפלט הוא טקסט חופשי.
- שני גופנים מ-Google Fonts, Fredoka ו-Playpen Sans Hebrew, עם גיבוי ל-system-ui. ה-service worker לא שומר אותם, כי הם מכתובת אחרת.
- CSS ו-JavaScript בתוך index.html, כי יש מסך אחד.
- `reasoning: { effort: "low" }` כדי שהבדיחה תחזור מהר. אם התיעוד העדכני לא תומך בשדה הזה במודל שנבחר, מורידים אותו.
- הפונקציה כותבת console.log קצר לכל בדיחה (הנושא והמודל), כדי לראות פניות ב-Logs.
- כשהשמירה נכשלת אין id, ולכן הבדיחה מוצגת בלי כפתור "צחקתי".
- הנעילה של "צחקתי" היא בדף בלבד. אין כניסה למערכת, אז השרת לא יודע מי כבר צחק, ורענון מאפשר לצחוק שוב.
- `add_laugh` על id שלא קיים מחזירה null, ו-api/laugh.js עונה 404.
- בשוויון במספר הצחוקים, הבדיחה החדשה יותר מופיעה קודם.
