# Milestone 4: האפליקציה זוכרת

## תכנון
הפירוט המלא ב-spec/MILESTONES.md, והחוזים ב-spec/ARCHITECTURE.md.

פרויקט Supabase: Joke-App, היחיד בחשבון.

סדר העבודה:
1. שמירת ה-SQL ב-db/create_jokes.sql והצגתו לאישור. **עצירה.**
2. הרצת ה-migration בשם `create_jokes`, הרצת `get_advisors` והסבר בעברית. **עצירה: בדיקה שהטבלה נעולה.**
3. קוד השרת: lib/supabase.js, ‏api/joke.js, ‏api/laugh.js, ‏api/top.js, והחבילה `@supabase/supabase-js` ב-dependencies.
4. הדף: כפתור "צחקתי" עם מונה, ורשימת "הכי מצחיקות", לפי DESIGN.md.
5. **עצירה לפני הדחיפה.** ואז push ובדיקה מול תנאי ההשלמה.

## החלטה ב-SQL
ב-Supabase טבלה חדשה ב-public מקבלת כברירת מחדל את כל ההרשאות גם ל-`service_role`, כולל delete. לכן ה-revoke כולל גם אותו, ומיד אחריו מקבל `service_role` רק select, insert ו-update.

## מצב המשתנים ב-Vercel
`SUPABASE_SECRET_KEY` ו-`SUPABASE_URL` קיימים ב-Production וב-Preview. תקינות המפתח תיבדק בהרצה.

## מה נבנה בפועל
- ה-migration `create_jokes` רץ על Joke-App. `get_advisors` החזיר רק את `rls_enabled_no_policy`, ברמת INFO, וזה המצב המבוקש.
- lib/supabase.js: לקוח אחד שנוצר בשימוש הראשון, כדי שמשתנה חסר לא יפיל את api/joke.js.
- api/joke.js שומרת את הבדיחה ומחזירה `{ joke, id }`. כשהשמירה נכשלת, `id` הוא null והשגיאה נרשמת ב-console.error.
- api/laugh.js ו-api/top.js לפי החוזים ב-ARCHITECTURE.md. לקריאות ל-Supabase יש מגבלת זמן של 5 שניות.
- index.html: כפתור "צחקתי" עם מונה בתוך הבועה, ורשימת "הכי מצחיקות" מתחתיה. אם הספירה נכשלת, הכפתור נפתח שוב ומוצגת הודעה.
- החבילה `@supabase/supabase-js` ב-dependencies, ונוסף package-lock.json.

## מה נבדק
- במסד, בטרנזקציה שבוטלה: `add_laugh` מחזירה 1 ואז 2, על id שלא קיים מחזירה null, ל-`service_role` אין delete, ו-`anon` נחסם.
- ה-handlers בלי משתני סביבה: 405, ‏400 ו-500 נכונים.
- הדף מול שרת דמה, ברוחב טלפון: מימין לשמאל, בלי גלילה לרוחב, נעילה אחרי לחיצה, עדכון הרשימה, ובדיחה בלי id מוצגת בלי כפתור.
- עדיין לא נבדק: הזרימה המלאה מול Supabase ו-OpenAI. היא תיבדק אחרי הדחיפה, מול תנאי ההשלמה.
