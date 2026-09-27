# ساختار پروژهٔ Sayfit Website

این فایل نقشهٔ پوشه‌ها و جریان‌های اصلی پروژه است. فایل‌ها و دسته‌های تولیدشده ممکن است با اضافه‌شدن محتوا تغییر کنند؛ فهرست زیر معماری فعلی را نشان می‌دهد، نه فهرست تک‌تک عکس‌های پروژه.

## درخت اصلی

```text
SayfitWebsite/
├── .gitattributes
├── .gitignore
├── .htaccess
├── CLAUDE.md
├── index.html                         # پوسته و صفحهٔ اصلی انگلیسی
├── robots.txt
├── sitemap.xml                        # خروجی مولد صفحه‌ها
├── start-server.bat
├── update_projects.py                 # مدیریت رسانه و بازسازی projects.json
├── update_projects.spec
├── assets/
│   ├── apps/bekuk.svg
│   ├── make-og-cover.py
│   └── og-cover.png
├── css/
│   ├── style.css                      # ورودی و ترتیب import استایل‌ها
│   └── parts/                         # استایل‌های بخش‌بندی‌شده
├── data/
│   ├── apps.json                      # دادهٔ فنی اپ‌ها
│   ├── apps-en.json                   # متن انگلیسی اپ‌ها
│   ├── apps-fa.json                   # متن فارسی اپ‌ها
│   ├── projects.json                  # داده و مسیر رسانهٔ پروژه‌ها
│   └── projects-fa.json               # ترجمهٔ فارسی پروژه‌ها
├── docs/                              # مستندات پروژه
├── fa/
│   ├── index.html                     # صفحهٔ فارسی تولیدشده
│   └── work/                          # صفحات فارسی تولیدشده
├── font/                              # فونت‌های سایت
├── i18n/
│   ├── en.json
│   └── fa.json
├── image/                             # دارایی‌های تصویری مدیریت‌شدهٔ مالک
├── js/
│   ├── main.js
│   ├── project-page.js
│   └── modules/                       # apps, i18n, sliders, viewer, navigation و ماژول‌های مشترک
├── projects/
│   └── work/                          # فایل‌های خام پروژه‌ها؛ منبع رسانه
├── Sayfit-Tuner/                      # اپ مستقل از وب‌سایت اصلی
├── tools/
│   ├── generate_persian_home.py
│   ├── generate_project_pages.py
│   └── prepare-deploy.ps1
└── work/                              # صفحات انگلیسی تولیدشده
```

پوشه‌های `customer/`، `old/`، `build/`، `deploy/` و `export/` برای تست خصوصی، نسخه‌های قدیمی یا خروجی‌های کاری هستند؛ جزو ساختار عمومی سایت نیستند. فایل‌های محلی `map-example.cdr` و `sayfit-website.zip` هم دارایی/بستهٔ جانبی‌اند.

## منبع داده و تولید صفحات

- متن‌های رابط در `i18n/en.json` و `i18n/fa.json` نگهداری می‌شوند.
- اطلاعات اپ‌ها در `data/apps.json` و متن هر زبان در `data/apps-en.json` و `data/apps-fa.json` است؛ رندر کارت‌ها با `js/modules/apps.js` انجام می‌شود.
- رسانه و دادهٔ انگلیسی پروژه‌ها در `projects/work/` و `data/projects.json` است. ترجمه‌ها در `data/projects-fa.json` قرار دارند.
- دسته‌های پایدار Work عبارت‌اند از `sculpture`، `eyewear`، `logo-design`، `jewelry`، `painting` و `photography`. نام عمومی مسیر عینک `eyewear` است؛ `tailor-made-glasses` فقط ممکن است در مسیر رسانه‌های قدیمی CDN دیده شود.
- `tools/generate_persian_home.py` صفحهٔ فارسی Home را می‌سازد. `tools/generate_project_pages.py` صفحات دسته و پروژه به انگلیسی و فارسی و `sitemap.xml` را تولید می‌کند.
- `tools/prepare-deploy.ps1` خروجی آمادهٔ بارگذاری را در `deploy/` می‌سازد. فایل‌های `work/`، `fa/work/`، `fa/index.html` و `sitemap.xml` را دستی ویرایش نکنید.

## اجرای محلی

پروژه HTML، CSS و ES Modules است و به build step یا package manager نیاز ندارد. برای اجرای کامل باید پوشه از طریق HTTP سرو شود؛ اجرای مستقیم `index.html` با `file://` برای ماژول‌ها کافی نیست. از `start-server.bat` یا `python -m http.server 8000` استفاده کنید.

## مرز Git و دارایی‌ها

به‌طور پیش‌فرض، `.gitignore` فقط `projects/` را برای Git باز می‌گذارد؛ مالک می‌تواند صریحاً بخواهد فایل‌های مستندات منتخب هم جداگانه ثبت شوند. ابزار `update_projects.py` همچنان باید فقط فایل‌های رسانه‌ای `projects/` را stage کند؛ کد سایت و داده‌های تولیدشده جداگانه روی هاست منتشر می‌شوند. پوشهٔ `image/` را تغییر ندهید مگر با درخواست مستقیم مالک.
