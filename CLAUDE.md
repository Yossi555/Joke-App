# CLAUDE.md: בדיחה בלחיצה

## שפה
- האפליקציה בעברית, מימין לשמאל (`lang="he"`, `dir="rtl"`).
- התקשורת איתי בעברית.

## הנחיה שוטפת
- בשלב ההקמה ובכל מיילסטון: מנחים אותי צעד אחר צעד מה השלב הבא, בצורה עניינית, קצרה וברורה.
- לפני ששואלים שאלות: קוראים קודם את הקבצים הרלוונטיים, מחדדים מולי רק את מה שבאמת פתוח, ואז מתחילים.
- בסוף כל מיילסטון עוצרים, ומחכים לבדיקה ולאישור מפורש שלי לפני שממשיכים.

## מפתחות: חוק הברזל
- לא מבקשים ממני אף מפתח, לא כותבים מפתח ולא קוראים מפתח, בשום קובץ ובשום צורה.
- מפתח ה-production שמור אצלי ב-Vercel (Secret, ב-Production וב-Preview).
- מפתח ה-dev אני מדביק בעצמי ב-.env.local. Claude לא קורא, לא כותב ולא פותח את .env או .env.* בשום דרך, גם לא דרך הטרמינל.
- `.claude/settings.json` חוסם את הקריאה של .env ושל .env.*.
- `.env.example` מכיל רק את השורות `OPENAI_API_KEY=` ו-`SUPABASE_SECRET_KEY=`, בלי ערכים ובלי הערות.
- המפתח הסודי של Supabase שמור אצלי ב-Vercel (Secret, ב-Production וב-Preview). אני שם אותו בעצמי, ו-Claude לא מבקש אותו.
- המפתח הציבורי, `SUPABASE_PUBLISHABLE_KEY`, שמור ב-Vercel מסוג Config, בכל הסביבות. הוא לא סוד: Claude יכול להביא אותו דרך המחבר, עם `get_publishable_keys`. הוא לא נכנס ל-.env.example.
- ה-Client Secret של Google (בונוס) נשאר רק בדשבורד של Supabase. לא בקוד, לא בריפו ולא ב-Vercel.
- `.gitignore` מתעלם מ-.env, מ-.env.*, מ-.vercel ומ-node_modules, עם החריגה `!.env.example`.

## שמירה: Supabase
- הנתונים נשמרים ב-Supabase, בטבלה `public.jokes`, ומ-Milestone 6 גם ב-`public.votes`.
- רק הפונקציות בתיקיית `api/` מדברות עם הטבלאות, דרך הלקוח היחיד ב-`lib/supabase.js`. הכתובת מ-`process.env.SUPABASE_URL`, והמפתח מ-`process.env.SUPABASE_SECRET_KEY`.
- הדף מדבר רק עם `/api`. הוא לא קורא ולא כותב אף טבלה, ואין בו כתובת של Supabase או מפתח בקוד.
- כל טבלה נעולה לשרת: RLS מופעל בלי אף policy, `revoke all` מ-`anon` ומ-`authenticated`, והרשאות ל-`service_role` בלבד. כל פונקציה בבסיס הנתונים: `revoke execute` מ-`public`, `anon` ו-`authenticated`, ו-`grant execute` ל-`service_role`.
- ה-SQL נשמר קודם כקובץ ב-`db/`, מוצג לי, ורץ דרך המחבר רק אחרי אישור. אחרי ההרצה: `get_advisors`, הסבר בעברית, ועצירה.

## כניסה: Supabase Auth
- מ-Milestone 5 הכניסה ב-Supabase Auth, ברמה 3 לפי course-stack.md: משתמשים אמיתיים עם הרשמה עצמית, במייל וסיסמה. כניסה עם Google היא בונוס.
- הספרייה של Supabase בדפדפן, ב-`auth.js`, משמשת רק לכניסה: הרשמה, כניסה, התנתקות ושמירת הטוקן. הכתובת והמפתח הציבורי מגיעים מ-`/api/config`.
- הדף שולח את הטוקן בכותרת `Authorization: Bearer <token>`, בכל קריאה ל-`/api`.
- הפונקציות מזהות משתמש רק עם `supabase.auth.getUser(token)`. מזהה משתמש או שם שמגיעים מהדף, לא נחשבים.
- כל טקסט מהשרת או מהמשתמש מוצג עם textContent, אף פעם לא innerHTML. אין polling.

## מבנה התיקיות
- `spec/`: שבעת מסמכי הספק (PRD, MVP, product-10-definitions, MILESTONES, ARCHITECTURE, tech-stack, DESIGN), ואיתם course-stack.md, ‏milestones-5-6.md (המקור של Milestones 5 ו-6 ושל הבונוס) ותמונות הייחוס (wireframes, mockups, style-guide, mockups-users).
- `spec/plans/`: תיעוד לכל מיילסטון אחרי התכנון והבנייה: `milestone-1.md`, `milestone-2.md` וכן הלאה. גם השיחות נקראות באותם שמות.
- `assets/`: נשארת בשורש, כי האפליקציה משתמשת בה. משתמשים בקבצים כמו שהם.
- הקוד בשורש, לפי סעיף 7 ב-spec/ARCHITECTURE.md.

## Git ו-GitHub
- ריפו ציבורי ב-GitHub: https://github.com/Yossi555/Joke-App (משתמש Yossi555), ענף `main`.
- את הדחיפה אני עושה בעצמי ב-GitHub Desktop. Claude עושה commit, ומנחה אותי מתי לדחוף.
- לפני כל commit: מוודאים ש-.gitignore, ‏.env.example ו-.claude/settings.json קיימים.

## פריסה: Vercel
- הלינק החי ב-Vercel, לא ב-GitHub Pages.
- ב-Milestone 1 מנחים אותי לייבא את הריפו ל-Vercel ולשמור בו את המפתח. מאז כל push ל-main מתעדכן לבד.
- בסוף כל שלב נותנים לי את הלינק החי.

## עבודה במיילסטונים
- בונים לפי spec/MILESTONES.md, מיילסטון אחרי מיילסטון. לכל מיילסטון שיחה חדשה בתיקייה הזו.
- לכל מיילסטון ארבעה שלבים:
  1. **תכנון**: קוראים את הספק הרלוונטי, ומתעדים את התוכנית ב-spec/plans/milestone-N.md.
  2. **בנייה**: כותבים את הקוד, ומעדכנים את קובץ התוכנית במה שנבנה בפועל.
  3. **הרצה**: אני בוחר איפה לבדוק, בכתובת של Vercel או במחשב עם `vercel dev` (http://localhost:3000).
  4. **דחיפה**: commit ו-push ל-main, ונותנים לי את הלינק לצפייה.

## בחירת מודל
- הקמה, Milestone 1 ו-Milestone 3: Sonnet. העבודה פשוטה ומוגדרת היטב.
- Milestone 2 (הקריאה ל-OpenAI, חילוץ התשובה וטיפול בשגיאות): Opus, לפחות לשלב התכנון.
