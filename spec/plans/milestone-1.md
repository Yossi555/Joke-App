# Milestone 1: Walking Skeleton

## מטרה
הדף והפונקציה באוויר ב-Vercel, באותה כתובת, ומדברים זה עם זה. המפתח שמור ב-Vercel, אבל עוד בלי AI.

## מקורות
MILESTONES.md (Milestone 1), ARCHITECTURE.md (סעיפים 1, 2, 6, 7), DESIGN.md (המסך הראשי וה-Style Guide).

## מה בונים
| קובץ | תוכן |
|---|---|
| `package.json` | `"type": "module"`, בלי dependencies |
| `api/joke.js` | `export default { async fetch(request) }`. רק POST. מחזירה `{ "joke": "בדיחה זמנית מהשרת: [הנושא]. המפתח: נמצא" }` או "המפתח: חסר". לא מחזירה ולא רושמת את המפתח, רק כן או לא. `console.log` קצר לכל לחיצה |
| `index.html` | מסך אחד עם CSS ו-JS בתוכו, `lang="he"` ו-`dir="rtl"`, לפי DESIGN.md |

לא נוגעים ב-`.gitignore`, ב-`.env.example` ובתוכן `.claude/settings.json`. בודקים רק שהם קיימים (נבדק: קיימים).

## החלטות תכנון
- **הנושא**: נחתך ל-100 תווים גם בשרת. נושא ריק או גוף שבור הם "אין נושא". ב-M1 הטקסט הזמני הוא "בדיחה זמנית מהשרת: [הנושא]", ובלי נושא הסוגריים נשארים ריקים (בלי טקסט מומצא), כי ההתנהגות האמיתית של "בלי נושא" שייכת ל-M2.
- **מצבים בדף**: ב-M1 ממומשים idle, think, joke, וגם error בסיסי (כשהבקשה נכשלת), כי החלפת `data-state` היא אותה מכניקה. ההודעות והטיפול המלא בשגיאות של OpenAI ב-M2.
- **תמונות הדמות**: ארבעה `<img>` בתוך הבועה, ו-CSS מציג אחד לפי `data-state`. כך הקבצים נטענים מראש, בלי הבהוב בהחלפה.
- **טקסט מהשרת**: `textContent` בלבד.
- **פונטים**: Fredoka ו-Playpen Sans Hebrew מ-Google Fonts, עם גיבוי ל-system-ui.
- **תנועה**: כל ארבע האנימציות מ-DESIGN.md, ובלי תנועה כלל תחת `prefers-reduced-motion`.
- **אין CORS ואין OPTIONS**: הדף והפונקציה באותו origin.
- **service worker, manifest**: לא ב-M1 (שייכים ל-M3).

## הרצה
- ב-Vercel: Framework Preset: Other. אין build, והקבצים מוגשים מהשורש, כולל `/assets`. `spec/` ו-`CLAUDE.md` יהיו נגישים גם הם כקבצים סטטיים, בלי סיכון כי אין בהם סודות.
- מקומית (רשות): `vercel dev` ב-http://localhost:3000.

## ביד (אצל יוסי)
1. push ל-main ב-GitHub Desktop.
2. Vercel: New Project, Import, Framework Preset: Other, Deploy.
3. OpenAI: מפתח production בשם `joke-in-a-click`. Vercel: `OPENAI_API_KEY`, Secret, ב-Production וב-Preview. ואז Redeploy.
4. מקומית, רשות: מפתח dev, `.env.local`, `vercel login`, `vercel link`, `vercel dev`.

## בדיקות (Definition of Done)
לפי MILESTONES.md, שבעה תנאים. אני בודק בעצמי את הלוגיקה של הפונקציה ואת הדף בדפדפן מקומי עם שרת פשוט שמדמה את ה-API (בלי מפתחות). שאר התנאים נבדקים אצלך אחרי הפריסה.

## מה נבנה בפועל
נבנו `package.json`, ‏`api/joke.js` ו-`index.html`, בדיוק לפי התוכנית.

נבדק מקומית (שרת פשוט שמגיש את הקבצים וקורא לפונקציה, עם ערך בדוי למשתנה):
- POST עם נושא מחזיר את הבדיחה הזמנית עם "המפתח: נמצא". גוף שבור נחשב "אין נושא". GET מחזיר 405. נושא ארוך נחתך ל-100.
- בדף (רוחב 375): שליחה מחליפה מצבים ל-joke, הכפתור "עוד בדיחה!", הטקסט מוצג ב-textContent, בלי גלישה אופקית, `dir="rtl"`.
- אין בקוד CORS ואין טיפול ב-OPTIONS.

לא נבדק (ייבדק אצל יוסי אחרי פריסה): Network ו-Logs ב-Vercel, פתיחה בטלפון, ומצב "המפתח: חסר" האמיתי.

הערה: בטלפון צר, נקודה כחולה קטנה מהרקע (bg-doodles) מתקרבת לשורת ההסבר. זה קישוט בלבד, ולא שיניתי את הנכס.
