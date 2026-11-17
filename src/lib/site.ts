export const site = {
  name: 'ЗелМедСервис',
  legalName: 'ООО «ЗелМедСервис»',
  url: 'https://zelmedservice.ru',
  phone: '+7 (495) 968-88-29',
  phoneHref: 'tel:+74959688829',
  email: 'sale@zelmedservice.ru',
  address: 'Москва, Зеленоград, проезд 4922, дом 4 стр. 5, Технопарк «ЭЛМА»',
  catalogPdf: 'catalog-2026.pdf',
  years: '2011–2026',
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  categorySlug: string;
  directionSlug: string;
  brand: string;
  brandSlug: string;
  description: string;
  specs: string[];
  image: string;
  imageRemote?: string;
  price: string;
  featured?: boolean;
  url: string;
};

export type Category = {
  slug: string;
  name: string;
  directionSlug: string;
  description?: string;
};

export type Direction = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
};

export type Brand = {
  slug: string;
  name: string;
};
