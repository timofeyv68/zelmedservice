# ЗелМедСервис — статичный сайт-каталог

Astro-сайт для презентации медицинского оборудования (выставки + SEO-каталог).

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build` → `dist/`

## Данные каталога

Источник: PDF `ЗелМедСервис_каталог_2026.pdf` (лежит в `public/catalog-2026.pdf`).

Пересборка JSON из текста PDF:

```bash
node scripts/build-catalog-from-pdf.mjs
```

Данные старого сайта `/catalog/` **не используются**.

## Структура

- `/` — главная
- `/catalog/` — каталог + фильтры
- `/catalog/[category]/` — SEO-категория
- `/catalog/[category]/[slug]/` — карточка товара + QR
- `/stand/[slug]/` — **Брошюра для стенда** (печать A4 + QR)
- `/brands/`, `/company/`, `/news/`, `/contacts/`

## Документы

- `docs/competitors.md` — анализ конкурентов
- `docs/print-brochure.md` — кнопка печати
- `docs/recommendations.md` — рекомендации SEO/контент
