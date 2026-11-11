# Milestone 5: האפליקציה מכירה אותך

## תכנון
הפירוט המלא ב-spec/MILESTONES.md, והחוזים ב-spec/ARCHITECTURE.md. המקור: spec/milestones-5-6.md. תמונת ייחוס: spec/mockups-users.png.

פרויקט Supabase: Joke-App, כמו ב-Milestone 4.

### סדר העבודה
0. **ביד, אצלך, בדשבורד של Supabase** (אפשר כבר עכשיו):
   - Authentication, ואז Sign In / Providers: ‏Allow new users to sign up דולק, ‏Confirm email כבוי.
   - Authentication, ואז URL Configuration: ב-Site URL ‏`https://joke-app-taupe.vercel.app`. ב-Redirect URLs: ‏`https://joke-app-taupe.vercel.app/**`, ולמי שמריץ במחשב גם `http://localhost:3000/**`.
1. שמירת ה-SQL ב-db/add_joke_authors.sql והצגתו לאישור. **עצירה.**
2. הרצת ה-migration בשם `add_joke_authors`, ‏`get_advisors`, והסבר בעברית. **עצירה: בדיקה שהטבלה עדיין נעולה.**
3. קוד השרת: lib/http.js, ‏lib/supabase.js, ‏api/config.js, ‏api/joke.js, ‏api/delete-account.js.
4. הדף: auth.js, ‏index.html (ספרייה, כפתור חשבון, שני חלונות, טוקן בכל קריאה, השורה מתחת לבדיחה), ו-sw.js.
5. בדיקות מקומיות (פירוט למטה), ועדכון הקובץ הזה במה שנבנה בפועל.
6. **עצירה לפני הדחיפה.** אני מביא את המפתח הציבורי דרך המחבר (`get_publishable_keys`), ואתה מוסיף ב-Vercel את `SUPABASE_PUBLISHABLE_KEY` מסוג Config, בכל הסביבות. רק אז commit, ואתה דוחף ב-GitHub Desktop.
7. בדיקה מול תנאי ההשלמה בכתובת החיה, ועצירה לאישור.

### ה-SQL המתוכנן (db/add_joke_authors.sql)
```sql
alter table public.jokes
  add column user_id uuid references auth.users (id) on delete set null,
  add column author_name text,
  add constraint jokes_author_name_check
    check (author_name is null or char_length(btrim(author_name)) between 1 and 30);

create index jokes_user_id_idx on public.jokes (user_id);
```
- אין שינוי בהרשאות: RLS, ה-revoke וה-grant מ-Milestone 4 חלים על הטבלה כולה, כולל העמודות החדשות.
- שורות קיימות מקבלות null בשתי העמודות, ולכן ה-check עובר עליהן.

## החלטות בקוד

### השרת
- **lib/http.js**:
  - `json(body, status)`: תמיד עם `Cache-Control: no-store`.
  - `authRequired(message)`: ‏401 עם `{ error, code: "auth_required" }`.
  - `readJson(request, maxBytes)`: קורא את הגוף כטקסט, עד 4KB. גוף גדול מדי או JSON שבור מחזירים null.
- **lib/supabase.js**, בנוסף ל-`getSupabase()` הקיים:
  - `hasToken(request)`: יש כותרת `Authorization: Bearer <משהו>`.
  - `getUserFromRequest(request, supabase)`: קוראת ל-`supabase.auth.getUser(token)` עם מגבלת זמן של 5 שניות. טוקן שגוי או פג (תשובה 401 או 403 מ-Supabase): ‏null. רשת, timeout או 5xx: זורקת שגיאה.
  - `displayName(user)`: ‏`user_metadata.full_name` אחרי trim, חתוך ל-30 תווים. ריק: null.
- **api/config.js**: ‏GET בלבד, אחרת 405. המפתח מתקבל רק אם הוא מתחיל ב-`sb_publishable_`, או שהוא JWT ישן עם `role: anon`. כל דבר אחר, כולל `sb_secret_` או JWT עם `service_role`: ‏500 עם `auth_not_configured`, והערך עצמו לא נרשם בשום מקום.
- **api/joke.js**:
  - יש טוקן: מזהים את המשתמש לפני OpenAI. ‏null: ‏401 עם auth_required, ובלי פנייה ל-OpenAI. שגיאה (Supabase לא זמין): ממשיכים כאורח, ולא שומרים.
  - שמירה עם `user_id` ו-`author_name` מהטוקן. התשובה `{ joke, id, author_name }`.
  - עוברת ל-`json` מ-lib/http.js, ולכן גם היא מקבלת `no-store`.
- **api/delete-account.js**: ‏POST בלבד, אחרת 405. בלי טוקן או עם טוקן שגוי: ‏401. קודם `update jokes set author_name = null where user_id = ...`. אם זה נכשל: ‏500, והמשתמש לא נמחק. אחר כך `auth.admin.deleteUser`, ו-`user_id` מתאפס לבד בזכות `on delete set null`. מחזירה `{ deleted: true }`.
- **api/laugh.js ו-api/top.js** לא משתנים. הם נמחקים ב-Milestone 6.

### הדף
- **הספרייה**: ‏`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js`, אותה גרסה כמו ב-package-lock.json, ואחריה `/auth.js`.
- **auth.js** חושף אובייקט אחד, `window.Auth`:
  - `ready()`: טוען את `/api/config` פעם אחת, ויוצר לקוח עם `flowType: "pkce"`, ‏`persistSession` ו-`autoRefreshToken`. אם הטעינה נכשלת, האפליקציה ממשיכה כאורח, וכפתור החשבון מציג "הכניסה לא זמינה כרגע".
  - `signUp(name, email, password)`, ‏`signIn(email, password)`, ‏`signOut()` עם `scope: "local"`, ‏`session()`, ‏`token()`, ‏`onChange(callback)`.
  - הודעות בעברית לפי קוד השגיאה של Supabase: `invalid_credentials` ("המייל או הסיסמה לא נכונים"), ‏`user_already_exists` / `email_exists` ("המייל הזה כבר רשום. נסו להתחבר"), ‏`weak_password` ("הסיסמה צריכה 6 תווים לפחות"), ובדיקה מקומית של אורך הסיסמה והשם לפני השליחה. כל השאר: הודעה כללית.
- **קריאה ל-/api**: פונקציה אחת, `api(path, options)`, שמוסיפה `Authorization` כשיש טוקן. תשובת 401 עם `auth_required`, כשנשלח טוקן: ‏`signOut()` והודעה "צריך להתחבר שוב". גם הקריאות ל-/api/laugh ול-/api/top עוברות דרכה.
- **כפתור החשבון**: מדבקה לבנה בפינה העליונה, בצד ה-inline-end (שמאל ב-RTL). לאורח "כניסה". למחובר עיגול סגול עם האות הראשונה, והשם.
- **חלון כניסה** (`<dialog>`): לשוניות כניסה והרשמה. בהרשמה: "איך לקרוא לך?" (maxlength 30), מייל (`dir="ltr"`, ‏type email) וסיסמה (minlength 6). הודעת שגיאה בתוך החלון, עם `role="alert"`. בזמן שליחה הכפתור נעול.
- **חלון "החשבון שלי"**: השם, המייל (`dir="ltr"`), התנתקות, ומחיקת חשבון. שאלת האישור היא שלב שני בתוך אותו חלון ("בטוח? הבדיחות יישארו, בלי השם שלך"), ולא `confirm()` של הדפדפן. אחרי מחיקה: התנתקות מקומית וסגירת החלון.
- **החלונות**: עולים מלמטה בטלפון, באמצע המסך במחשב, פינות 26, מסגרת 3 וצל קשה 6. ‏Escape ולחיצה על הרקע סוגרים.
- **מתחת לבדיחה**: "נכתבה עכשיו בשבילך, " ואחריו `author_name` מהשרת, רק כשהוא לא null. עם textContent.
- **sw.js**: ‏`joke-v3`, ו-`/auth.js` ב-PRECACHE. הבקשות ל-jsDelivr ול-supabase.co לא נוגעות ב-service worker, כמו היום.

## בדיקות לפני הדחיפה
- ה-SQL: אחרי ההרצה, בטרנזקציה שמבוטלת: ‏author_name של רווחים נדחה, של 31 תווים נדחה, ו-null עובר. ‏`anon` עדיין נחסם.
- ה-handlers מקומית, בלי משתני סביבה ועם Supabase מדומה: ‏405, ‏401, ‏500 של auth_not_configured, ומפתח `sb_secret_` לא חוזר אף פעם מ-/api/config.
- הדף מול שרת דמה, ברוחב טלפון: מימין לשמאל, בלי גלילה לרוחב, שני החלונות, Escape, והשורה מתחת לבדיחה.
- בכתובת החיה: שמונת תנאי ההשלמה. את ההרשמה ואת מחיקת החשבון אתה עושה עם משתמש בדיקה. אני לא יוצר חשבון ולא מקליד סיסמה בשבילך.

## שאלות פתוחות
אין. מה שלא מוגדר בספק הוחלט למעלה, ב"החלטות בקוד".

## מה נבנה בפועל
- ה-migration ‏`add_joke_authors` רץ על Joke-App. ‏`get_advisors` החזיר שני ממצאים ברמת INFO: ‏`rls_enabled_no_policy` (המצב המבוקש, כמו ב-Milestone 4) ו-`unused_index` על `jokes_user_id_idx` (האינדקס חדש, וישמש למחיקת חשבון).
- lib/http.js: ‏`json` עם `no-store`, ‏`authRequired`, ו-`readJson` עד 4KB.
- lib/supabase.js: ‏`hasToken`, ‏`getUserFromRequest` (‏4xx מ-Supabase: ‏null. רשת, timeout של 5 שניות או 5xx: שגיאה), ו-`displayName`.
- api/config.js: מקבלת רק `sb_publishable_` או JWT עם `role: anon`. כל דבר אחר: ‏500 עם `auth_not_configured`, בלי לרשום את הערך.
- api/joke.js: מזהה את המשתמש לפני OpenAI, ושומרת `user_id` ו-`author_name` מהטוקן. ‏`user_id` או שם בגוף הבקשה לא נקראים בכלל. התשובה `{ joke, id, author_name }`.
- api/delete-account.js: מנקה את השמות, ורק אם זה הצליח מוחקת את המשתמש. ‏Supabase לא זמין: ‏503.
- auth.js: ‏`window.Auth` עם ready, ‏signUp, ‏signIn, ‏signOut (local), ‏session, ‏token, ‏onChange, והודעות בעברית. ‏pkce.
- index.html: הספרייה מ-jsDelivr בגרסה 2.119.0, עם `integrity` (SRI) שנבדק מול הקובץ ב-node_modules. כפתור חשבון, חלון כניסה עם שתי לשוניות, חלון "החשבון שלי" עם אישור מחיקה בשני שלבים, ו-`api()` אחד לכל הקריאות.
- שינוי קטן מהתכנון: כשהכניסה לא זמינה, כפתור החשבון נשאר "כניסה", וההודעה "הכניסה לא זמינה כרגע" מופיעה בתוך חלון הכניסה. כך הכפתור לא נשבר בטלפון צר.
- sw.js: ‏`joke-v3`, ו-`/auth.js` ב-PRECACHE.

## מה נבדק
- במסד, בטרנזקציה שבוטלה: שם של רווחים ושם של 31 תווים נדחו, 30 תווים ו-null עברו, ‏user_id של משתמש שלא קיים נדחה, ו-`anon` נחסם. ל-`anon` ול-`authenticated` אין הרשאה לעמודות החדשות.
- ה-handlers, מול Supabase ו-OpenAI מדומים: 25 בדיקות עברו. ביניהן: טוקן שגוי מחזיר 401 בלי פנייה ל-OpenAI, ‏Supabase לא זמין מחזיר בדיחה בלי שמירה, ‏`user_id` מזויף בגוף לא נשמר, ו-`sb_secret_` אף פעם לא חוזר מ-/api/config.
- הדף מול שרת דמה, ברוחב טלפון ובמחשב: מימין לשמאל, בלי גלילה לרוחב, שלוש הודעות השגיאה בעברית, הרשמה, השם בכפתור, "נכתבה עכשיו בשבילך", רענון אחרי כניסה ואחרי יציאה, ‏401 שמנתק ומציג "צריך להתחבר שוב", מחיקת חשבון, Escape ולחיצה על הרקע. החלון עולה מלמטה בטלפון, ובאמצע המסך במחשב.
- בקוד הדף אין `sb_publishable_`, ‏`sb_secret_`, ‏`service_role` או `supabase.co`.
- עוד לא נבדק מול Supabase Auth אמיתי. זה קורה בכתובת החיה, אחרי הדחיפה.
