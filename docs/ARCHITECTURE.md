# Architecture

Sayfit یک سایت استاتیک با HTML، CSS و ES Modules است. build step یا package manager ندارد و باید با HTTP server اجرا شود.

## جریان اصلی

1. `index.html` shell اصلی و fallback انگلیسی را ارائه می‌کند.
2. `js/main.js` زبان، ناوبری، cube، اپ‌ها و پروژه‌ها را راه‌اندازی می‌کند.
3. `data/projects.json` دادهٔ اصلی پروژه‌ها و مسیر media است.
4. `data/projects-fa.json` ترجمهٔ مستقل عنوان و توضیح پروژه‌هاست.
5. `data/apps.json` فقط اطلاعات فنی اپ‌ها را نگه می‌دارد؛ متن‌ها در `data/apps-en.json` و `data/apps-fa.json` هستند.
6. `tools/generate_project_pages.py` صفحات `work/` و `fa/work/`، صفحهٔ فارسی Home و `sitemap.xml` را تولید می‌کند.
7. `js/modules/work-categories.js` شش دستهٔ Home را از ترجمه‌ها و تصویر جلد موجود در دادهٔ پروژه‌ها می‌سازد.
8. `update_projects.py` نام فایل‌های تصویری پروژه‌ها را پایدار و توصیفی می‌کند و سپس `data/projects.json` را بازسازی می‌کند.

## معماری Work

- Home فقط یک سکشن `work` دارد و شش دسته را در یک چرخ‌وفلک نمایش می‌دهد.
- کلیدهای دسته عبارت‌اند از `sculpture`، `eyewear`، `logo-design`، `jewelry`، `painting` و `photography`.
- هر شش دسته همیشه صفحهٔ index انگلیسی و فارسی تولیدشده دارند؛ خالی‌بودن داده باعث حذف URL نمی‌شود.
- صفحهٔ دسته دادهٔ خود را از `data/projects.json` می‌گیرد و با `data/projects-fa.json` ترجمه می‌کند.
- صفحه‌های پروژه و دسته یک هدر مشترک تولیدشده دارند.
- هدر مشترک صفحات Work شامل مکعب کوچک بازگشت به Home است؛ این مکعب بخشی از
  قالب تولیدکننده است و نباید داخل فایل‌های generated دستی ویرایش شود.
- Home cube فقط عنوان وجه‌ها را دارد. زیرمنوهای دسته‌بندی در هدر باقی می‌مانند
  و وجه‌های Cube مستقیماً به سکشن‌های Home اسکرول می‌کنند.

## Home cube Desktop Hover / Focus

`js/modules/cube.js` owns cube motion and the desktop hover controller. Hover
intent starts only on a real mouse move whose DOM target is one of the cube's
faces. Pointer coordinates are tracked from successive `clientX` / `clientY`
events; transformed face geometry is never polled to infer intent.

The controller freezes two screen-space rectangles per interaction. The
candidate rectangle is the acquired face's current bounding box expanded by
18 px and protects the 250 ms intent delay against small movement and changing
descendant hit-tests. Once a face is committed, the hold rectangle bounds that
face's projected four vertices over 12 samples from the current pose to its
focus pose, unions the current rendered face box, and expands by 24 px. It is
computed once before focus starts and is not updated while the cube moves.
Projection reuses the existing face-angle, shortest-yaw, perspective and
wireframe helpers; it does not create another motion or geometry engine.

Face switching requires a real mouse move onto a different face and at least
6 px of movement from the intent anchor, then uses the same 250 ms delay. The
previous focused face remains active during that pending switch. `initCube()`
routes hover and drag through one window mouse-move listener so an active held
drag retains priority and its existing default suppression. Viewport exit,
window blur, hidden-document state and page scrolling release hover explicitly.

The CSS hover-state classes remain in `css/parts/cube.css`; the visual design,
Home markup, click/keyboard/touch navigation, Focus interpolation and SVG
wireframe synchronization are independent of this controller change.

## قوانین مهم

- فایل‌های `work/` generated هستند و نباید دستی ویرایش شوند.
- `projects/` منبع خام تصاویر است؛ `data/projects.json` خروجی metadata آن است.
- `image/` را تغییر نده؛ مدیریت آن با مالک پروژه است.
- کلیدهای دسته قراردادی هستند و نباید برای زیبایی تغییر کنند؛ label قابل ترجمه است.
- بخش Customer فضای مشتری/تست است و خارج از گردش عادی سایت نگه داشته می‌شود.
- ثبت یا تغییر هر مستندی، از جمله تصمیم‌ها و تاریخچهٔ تغییرات، فقط با دستور صریح مالک انجام شود؛ ابتدا تغییرات تکمیل و سپس در زمان درخواستی مالک مستند شوند.
