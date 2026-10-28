# Milestone 3: התקנה בטלפון

## מטרה
מתקינים את האפליקציה במסך הבית, והיא נפתחת במסך מלא.

## מקורות
MILESTONES.md (Milestone 3), ARCHITECTURE.md (סעיפים 1, 7, והנחות), DESIGN.md (רשימת הקבצים ב-assets), tech-stack.md (PWA).

## מה בונים
| קובץ | תוכן |
|---|---|
| `manifest.webmanifest` | `name: "בדיחה בלחיצה"`, ‏`short_name: "בדיחה"`, ‏`id`, ‏`start_url` ו-`scope`: `/`, ‏`display: standalone`, ‏`lang: he`, ‏`dir: rtl`, ‏`theme_color` ו-`background_color`: `#FFE15A`, ושלושה אייקונים |
| `sw.js` | service worker, ‏network-first, בלי /api |
| `index.html` | קישור ל-manifest, ‏`theme-color`, אייקון (גם `apple-touch-icon` לאייפון), ורישום של `/sw.js` |

לא נוגעים ב-`api/joke.js`, ב-`.gitignore`, ב-`.env.example`, ב-`.claude/settings.json` וב-`package.json`.

## האייקונים
| קובץ | גודל | purpose |
|---|---|---|
| `assets/icon-192.png` | 192×192 | any |
| `assets/icon-512.png` | 512×512 | any |
| `assets/icon-512-maskable.png` | 512×512 | maskable |

הגדלים נבדקו מול הקבצים. משתמשים בהם כמו שהם.

## ה-service worker
- **install**: שומר במטמון את `/`, ‏`/manifest.webmanifest`, שבעת קבצי ה-SVG שהדף משתמש בהם (לוגו, ארבע דמויות, שני רקעים), ו-`icon-192.png` ו-`icon-512.png`.
- **fetch**: רק GET מאותה כתובת, ולא `/api`. קודם רשת, ותשובה תקינה נשמרת כעותק. אין רשת: מהמטמון. ניווט בלי עותק משלו מקבל את `/`.
- **כל השאר** (POST, ‏`/api`, ‏Google Fonts): ה-service worker לא נוגע בהם.
- **עדכון**: שם מטמון עם גרסה. ‏`skipWaiting` ו-`clients.claim`, ובאירוע activate מוחקים מטמונים ישנים. כיוון שזו גישת network-first, שינוי שנדחף מופיע ברענון הבא גם בלי לשנות גרסה.

## החלטות
- `apple-touch-icon` ב-index.html, כי אייפון לוקח את אייקון מסך הבית ממנו ולא מה-manifest.
- הרישום של `sw.js` רק אם הדפדפן תומך, ושגיאת רישום רק ב-console. הדף עובד גם בלי.

## ביד (אצל יוסי)
1. push ב-GitHub Desktop. אין צורך ב-Redeploy.
2. בדיקות 1 ו-4 במחשב, בכלי המפתחים. בדיקות 2 ו-3 בטלפון.
3. בדיקה 5: שינוי קטן בטקסט, push, ורענון. אני מכין את השינוי כשתגיע אליה.

## בדיקות (Definition of Done)
לפי MILESTONES.md, חמישה תנאים. אני בודק מקומית בשרת סטטי פשוט (בלי מפתח): שה-manifest נטען בלי שגיאות, שה-service worker נרשם, ושב-Cache Storage אין כתובת של /api אחרי לחיצה. ההתקנה בטלפון נבדקת אצלך.

## מה נבנה בפועל
נבנו `manifest.webmanifest`, ‏`sw.js` והשינויים ב-`index.html` לפי התוכנית, בלי סטיות.

נבדק מקומית ב-Chrome (headless), עם שרת סטטי ו-/api/joke מדומה:
- Manifest: אין שגיאות, ואין שגיאות התקנה (installability). שלושת האייקונים נקראים, ‏`display: standalone`, הצבעים `#FFE15A`.
- ה-service worker נרשם בהיקף `/`, ושולט בדף אחרי רענון.
- שתי לחיצות רצופות: שתי בדיחות שונות, כלומר /api לא מוגש מהמטמון.
- Cache Storage ‏(`joke-v1`): ‏`/`, ה-manifest, שבעת קבצי ה-SVG ושני האייקונים. אין אף כתובת של /api.
- בלי רשת: הדף והלוגו נטענים מהמטמון.

הבדיקה בתוך הדפדפן המובנה של האפליקציה לא עבדה, כי הוא לא מאפשר רישום service worker. לכן Chrome.

נפרס ב-Vercel (commit c53c531): https://joke-app-taupe.vercel.app. יוסי דחף, בדק את תנאי ההשלמה במחשב ובטלפון, ואישר את המיילסטון.
