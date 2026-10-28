# Milestone 2: בדיחה מ-GPT-5

## מטרה
הבדיחה מגיעה מ-GPT-5 דרך הפונקציה, והמפתח נשאר בשרת.

## מקורות
MILESTONES.md (Milestone 2), ARCHITECTURE.md (סעיפים 1, 2, 4, 6), DESIGN.md (ארבעת המצבים).

תיעוד עדכני שנקרא (28.10.2026):
- OpenAI: Text generation, ‏gpt-5, ‏Error codes, ‏Reasoning, ‏Responses create.
- Vercel: Node.js runtime, ‏Function duration, ‏Environment variables, ‏Runtime logs.

## מה למדנו מהתיעוד
- **הבקשה**: `model`, ‏`instructions` (מחרוזת), ‏`input` (מחרוזת מותרת), ‏`reasoning: { effort: "low" }` נתמך ב-gpt-5 (minimal, low, medium, high), ‏`max_output_tokens`.
- **`max_output_tokens` כולל את טוקני החשיבה**. ערך נמוך מדי יחזיר תשובה בלי טקסט (`status: "incomplete"`, ‏`reason: "max_output_tokens"`). לכן 2000: מספיק לחשיבה קצרה ולבדיחה, ועדיין תקרה לעלות.
- **התשובה**: `output_text` הוא נוחות של ה-SDK, ולרוב לא מופיע ב-JSON הגולמי. לכן הקוד בודק אותו קודם (לפי ARCHITECTURE), ואם אין, אוסף את `text` מהחלקים מסוג `output_text` בפריטים מסוג `message` במערך `output`. פריט מסוג `reasoning` מדלגים עליו.
- **שגיאות**: גוף בצורת `{ error: { message, type, code, param } }`. ב-429 מבחינים לפי `error.code`:
  - `credit_balance_exhausted`, או `type: "insufficient_quota"`: נגמר הקרדיט.
  - `organization_spend_limit_exceeded`, ‏`project_spend_limit_exceeded`, ‏`organization_usage_limit_exceeded`: מגבלת הוצאה.
  - כל 429 אחר: יותר מדי בקשות.
- **gpt-5 מסומן Deprecated** אצל OpenAI, ועדיין זמין. נשאר ברירת המחדל לפי הספק. המעבר הוא רק `OPENAI_MODEL` ב-Vercel, בלי לגעת בקוד.
- **Vercel**: `export default { async fetch(request) }` עם `"type": "module"` נתמך. Node 24 כברירת מחדל, עם `fetch` גלובלי. ‏`console.error` נרשם ברמה error ב-Logs. שינוי במשתנה סביבה חל רק בפריסה חדשה.

## מה בונים
| קובץ | שינוי |
|---|---|
| `api/joke.js` | קריאה ל-Responses API עם fetch, חילוץ הטקסט, מיפוי שגיאות להודעות בעברית |
| `index.html` | מציג את הודעת השגיאה שהשרת שלח (textContent), ואם אין, הודעה כללית |

לא נוגעים ב-`.gitignore`, ב-`.env.example`, ב-`.claude/settings.json` וב-`package.json`.

## הפונקציה, צעד אחר צעד
1. לא POST: ‏405, ‏"אפשר לשלוח רק בקשת POST." (כמו היום).
2. הנושא: trim, חיתוך ל-100. ריק או גוף שבור: אין נושא.
3. אין `OPENAI_API_KEY`: ‏500, ‏"השרת לא מוגדר עדיין. נסו מאוחר יותר.", ו-console.error "missing OPENAI_API_KEY".
4. המודל: `process.env.OPENAI_MODEL` (אחרי trim), או `gpt-5`.
5. `console.log` קצר: הנושא והמודל.
6. POST ל-`https://api.openai.com/v1/responses` עם הפרומפט המרכזי מ-ARCHITECTURE סעיף 4, ה-input "נושא הבדיחה: [הנושא]" או "אין נושא. ספר בדיחה כללית על החיים.", ‏`reasoning: { effort: "low" }`, ‏`max_output_tokens: 2000`. מגבלת זמן: 30 שניות (`AbortSignal.timeout`).
7. תשובה לא תקינה מ-OpenAI: ‏console.error עם הסטטוס, ה-type וה-code, ו-502 עם הודעה לפי הטבלה.
8. חילוץ הטקסט. אין טקסט: ‏console.error עם `status` ו-`incomplete_details`, ו-502.
9. הצלחה: ‏200, ‏`{ "joke": "..." }`.

### ההודעות לדף
| מקרה | הודעה |
|---|---|
| 401 | "יש בעיה במפתח של השרת." |
| נגמר הקרדיט | "נגמר הקרדיט ב-OpenAI." |
| מגבלת הוצאה | "הגענו למגבלת ההוצאה החודשית." |
| 429 אחר | "יותר מדי בקשות. נסו שוב בעוד רגע." |
| 404, או `code: "model_not_found"` | "המודל שהוגדר לא נמצא." |
| זמן נגמר | "הבדיחה מתעכבת. נסו שוב." |
| כל השאר, כולל אין טקסט | "לא הצלחנו להביא בדיחה. נסו שוב." |

### מה לא נרשם ב-Logs
המפתח לעולם לא. גם את `error.message` של OpenAI לא רושמים, כי בשגיאת 401 הוא מצטט חלק מהמפתח. רושמים רק סטטוס, ‏type, ‏code ו-param.

## הדף
ארבעת המצבים כבר קיימים מ-M1 (idle, think, joke, error, עם ארבעת הציורים, "עוד בדיחה!" ו"לנסות שוב"). השינוי היחיד: במצב שגיאה מוצג `data.error` מהשרת. כשל רשת או תשובה שאינה JSON: "משהו השתבש. נסו שוב בעוד רגע."

## ביד (אצל יוסי)
1. **לפני הקוד**: ב-OpenAI לוודא קרדיט מראש, ‏Auto recharge כבוי, ומגבלת הוצאה חודשית.
2. אחרי הבנייה: push ב-GitHub Desktop. אין צורך ב-Redeploy.
3. בדיקה 4: להוסיף ב-Vercel `OPENAI_MODEL` עם שם שגוי, ‏Redeploy, לבדוק, למחוק את המשתנה, ‏Redeploy שוב.
4. מקומית (רשות): `vercel dev` עם מפתח ה-dev ב-.env.local.

## בדיקות (Definition of Done)
לפי MILESTONES.md, שמונה תנאים. אני בודק מקומית בלי מפתח אמיתי: סקריפט בתיקייה זמנית שמחליף את `fetch` בתחליף שמדמה את OpenAI ומחזיר תשובות מוצלחות ושגיאות (401, ‏429 לפי קוד, ‏404, תשובה בלי טקסט), ובודק שכל מקרה מגיע לדף כהודעה הנכונה. הבדיחה האמיתית נבדקת אצלך אחרי ה-push.

## מה נבנה בפועל
נבנו `api/joke.js` ו-`index.html` לפי התוכנית. סטייה אחת: ב-429 בודקים קודם את קודי מגבלת ההוצאה ורק אחר כך את הקרדיט, כי גם שגיאת מגבלת הוצאה יכולה להגיע עם `type: "insufficient_quota"`. הבדיקה המקומית תפסה את זה.

נבדק מקומית, בלי מפתח אמיתי (fetch מדומה):
- תשובה גולמית עם פריט `reasoning` ופריט `message`: הבדיחה חוזרת. גם `output_text` עובד.
- `status: "incomplete"` בלי טקסט: ‏502 והודעה כללית, וב-Log הסיבה `max_output_tokens`.
- 401, קרדיט, מגבלת הוצאה, 429 אחר, 404, ‏400 עם `model_not_found`, ‏500 שאינו JSON, זמן נגמר: כל אחד מקבל את ההודעה שבטבלה. ב-Log יש רק סטטוס, ‏type, ‏code ו-param.
- גוף שבור: בדיחה כללית. נושא של 300 תווים נחתך ל-100. ‏`OPENAI_MODEL` עם רווחים נחתך. ‏GET: ‏405. בלי מפתח: ‏500.
- בדף (רוחב 375): חתולים, תיבה ריקה ושגיאה עוברים בין המצבים הנכונים, עם הטקסט והכפתור הנכונים. ‏maxlength 100, בלי גלילה אופקית, ואין `sk-` בדף.

עוד לא נבדק: קריאה אמיתית ל-OpenAI. נבדק אצלך אחרי ה-push.
