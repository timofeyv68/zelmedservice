import fs from 'fs';

let news = JSON.parse(fs.readFileSync('src/data/news.json', 'utf8'));

const decode = (s) =>
  String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/`n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

news = news.map((n) => ({
  ...n,
  title: decode(n.title)
    .replace(/\s*\|\s*.*$/, '')
    .replace(/^Новости\s*/i, '')
    .trim(),
  body: decode(n.body),
  date: n.date || '',
}));

if (!news.some((n) => /саммит/i.test(n.title))) {
  news.unshift({
    id: 'summit-2026',
    slug: 'rossiyskiy-diagnosticheskiy-sammit-2026',
    title: 'Компания «ЗелМедСервис» примет участие в Российском диагностическом саммите 2026',
    date: '20.10.2026',
    body: 'С 20 по 22 октября 2026 года в МВЦ «Крокус Экспо» пройдет VI Российский диагностический саммит. Компания «ЗелМедСервис» примет участие в мероприятии.',
    url: '/news/',
  });
}

fs.writeFileSync('src/data/news.json', JSON.stringify(news, null, 2), 'utf8');
console.log(news.map((n) => `${n.date} | ${n.title.slice(0, 70)}`).join('\n'));
