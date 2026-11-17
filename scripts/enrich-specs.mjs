/**
 * Merge researched technical characteristics into products.json.
 * Run: node scripts/enrich-specs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const productsPath = join(root, 'src/data/products.json');
const products = JSON.parse(readFileSync(productsPath, 'utf8'));

/** @type {Record<string, { table: {label:string,value:string}[], chips?: string[], filters?: Record<string,string|number|boolean>, procurement?: {label:string,value:string}[] }>} */
const byId = {
  '1': {
    table: [
      { label: 'Количество срезов', value: '640 (320 рядов × coneXact)' },
      { label: 'Детектор', value: 'PUREViSION, 320 рядов × 0,5 мм' },
      { label: 'Охват по Z', value: '16 см' },
      { label: 'Апертура гентри', value: '78 см' },
      { label: 'Мин. время вращения', value: '0,275 с' },
      { label: 'Генератор', value: 'до 100 кВт' },
      { label: 'Реконструкция', value: 'AiCE (Deep Learning), PIQE' },
      { label: 'Наклон гентри', value: '±30°' },
    ],
    chips: ['640 срезов', '78 см', '16 см Z'],
    filters: { slices: 640, boreCm: 78 },
  },
  '2': {
    table: [
      { label: 'Количество срезов', value: 'до 160 (80 рядов)' },
      { label: 'Детектор', value: 'PUREViSION, 80 рядов × 0,5 мм' },
      { label: 'Охват по Z', value: '4 см' },
      { label: 'Апертура гентри', value: '90 см' },
      { label: 'FOV / eFOV', value: '70 / 90 см' },
      { label: 'Мин. время вращения', value: '0,4 с' },
      { label: 'Нагрузка стола', value: 'до 315 кг' },
      { label: 'Реконструкция', value: 'AiCE (Deep Learning)' },
    ],
    chips: ['160 срезов', '90 см', 'eFOV 90'],
    filters: { slices: 160, boreCm: 90 },
  },
  '3': {
    table: [
      { label: 'Количество срезов', value: '80 / 160 (coneXact)' },
      { label: 'Детектор', value: 'PUREViSION, 80 рядов × 0,5 мм' },
      { label: 'Апертура гентри', value: '78 см' },
      { label: 'Мин. время вращения', value: '0,35 с' },
      { label: 'Генератор', value: '72 кВт' },
      { label: 'FOV', value: '500 мм (eFOV 700 мм — опция)' },
      { label: 'Реконструкция', value: 'AIDR 3D Enhanced, AiCE (опция)' },
    ],
    chips: ['80/160 срезов', '78 см', '0,35 с'],
    filters: { slices: 160, boreCm: 78 },
  },
  '4': {
    table: [
      { label: 'Количество срезов', value: '80 / 160' },
      { label: 'Детектор', value: 'PUREViSION, 80 рядов × 0,5 мм' },
      { label: 'Апертура гентри', value: '80 см' },
      { label: 'Мин. время вращения', value: '0,35 с' },
      { label: 'Генератор', value: '72 кВт' },
      { label: 'Охват по Z', value: '40 мм' },
      { label: 'Реконструкция', value: 'AiCE, PIQE (опция)' },
      { label: 'Рабочий процесс', value: 'INSTINX' },
    ],
    chips: ['80/160 срезов', '80 см', 'INSTINX'],
    filters: { slices: 160, boreCm: 80 },
  },
  '5': {
    table: [
      { label: 'Количество срезов', value: '128' },
      { label: 'Ряды детектора', value: '64' },
      { label: 'Охват детектора', value: '40 мм' },
      { label: 'Апертура гентри', value: '72 см' },
      { label: 'Время вращения', value: 'от 0,374 с' },
      { label: 'Генератор', value: '80 кВт' },
      { label: 'Наклон гентри', value: '±30°' },
      { label: 'FOV сканирования', value: '50 см' },
    ],
    chips: ['128 срезов', '72 см', '40 мм'],
    filters: { slices: 128, boreCm: 72 },
  },
  '6': {
    table: [
      { label: 'Количество срезов', value: '128' },
      { label: 'Ряды детектора', value: '64' },
      { label: 'Апертура гентри', value: '72 см' },
      { label: 'Мин. время вращения', value: '0,259 с (опция)' },
      { label: 'Режимы сбора', value: '128×0,625 мм' },
      { label: 'Наклон гентри', value: '±30°' },
      { label: 'FOV', value: 'до 500 мм' },
    ],
    chips: ['128 срезов', '72 см', '0,259 с'],
    filters: { slices: 128, boreCm: 72 },
  },
  '7': {
    table: [
      { label: 'Количество срезов', value: '32 (реконструкция до 120)' },
      { label: 'Детектор', value: 'Micro-STAR GOS' },
      { label: 'Апертура гентри', value: '65 см' },
      { label: 'Время вращения', value: 'от 0,71 с' },
      { label: 'Генератор', value: '32 кВт' },
      { label: 'Напряжение трубки', value: '60–140 кВ' },
      { label: 'Наклон', value: '±30° (цифровой)' },
    ],
    chips: ['32 среза', '65 см', 'Micro-STAR'],
    filters: { slices: 32, boreCm: 65 },
  },
  '8': {
    table: [
      { label: 'Количество срезов', value: '16' },
      { label: 'Платформа', value: 'на базе 64-срезовых технологий' },
      { label: 'Ряды детектора', value: '32' },
      { label: 'Апертура гентри', value: '70 см' },
      { label: 'Теплоёмкость трубки', value: '4 MHU' },
      { label: 'Наклон гентри', value: '±30° (механический)' },
      { label: 'Реконструкция', value: 'ClearView, O-dose' },
    ],
    chips: ['16 срезов', '70 см'],
    filters: { slices: 16, boreCm: 70 },
  },
  '9': {
    table: [
      { label: 'Количество срезов', value: '512 (256 рядов)' },
      { label: 'Детектор', value: 'DivineLight' },
      { label: 'Охват по Z', value: 'до 160 мм' },
      { label: 'Апертура гентри', value: '80 см' },
      { label: 'Мин. время вращения', value: '0,25 с' },
      { label: 'Генератор', value: '100 кВт' },
      { label: 'Реконструкция', value: 'NDI (итеративная)' },
    ],
    chips: ['512 срезов', '80 см', '0,25 с'],
    filters: { slices: 512, boreCm: 80 },
  },
  '10': {
    table: [
      { label: 'Тип системы', value: 'ПЭТ/КТ' },
      { label: 'ПЭТ-детектор', value: 'LYSO + SiPM 1:1' },
      { label: 'Аксиальный охват ПЭТ', value: 'до 403,2 мм' },
      { label: 'КТ-компонент', value: 'до 128 срезов' },
      { label: 'Апертура гентри', value: '80 см' },
      { label: 'Особенность', value: 'TOF, сканирование всего тела за 2 цикла' },
    ],
    chips: ['ПЭТ/КТ', 'TOF', '403 мм'],
    filters: { slices: 128, boreCm: 80, petCt: true },
  },
  '11': {
    table: [
      { label: 'Количество срезов', value: '32' },
      { label: 'Охват по Z', value: '20 мм' },
      { label: 'Апертура гентри', value: '70 см' },
      { label: 'Генератор', value: '32 кВт' },
      { label: 'Время вращения', value: '0,75 с' },
      { label: 'Матрица реконструкции', value: '1024 × 1024' },
      { label: 'Реконструкция', value: 'NDI, imA' },
    ],
    chips: ['32 среза', '70 см', 'ECO'],
    filters: { slices: 32, boreCm: 70 },
  },
  '12': {
    table: [
      { label: 'Количество срезов', value: '16 / 32' },
      { label: 'Детектор', value: 'ScintiStar (цифровой)' },
      { label: 'Апертура гентри', value: '70 см' },
      { label: 'Генератор', value: '50 кВт' },
      { label: 'Теплоёмкость трубки', value: '5,3 MHU' },
      { label: 'Время вращения', value: 'до 0,5 с' },
      { label: 'Матрица', value: '1024 × 1024' },
    ],
    chips: ['16/32 среза', '70 см', '0,5 с'],
    filters: { slices: 32, boreCm: 70 },
  },
  '13': {
    table: [
      { label: 'Количество срезов', value: '128' },
      { label: 'Апертура гентри', value: '70 см' },
      { label: 'Детектор', value: 'ScintiStar' },
      { label: 'Применение', value: 'рутинная и кардиодиагностика' },
      { label: 'Реконструкция', value: 'NDI / коррекция дозы при КАГ' },
    ],
    chips: ['128 срезов', '70 см'],
    filters: { slices: 128, boreCm: 70 },
  },
  '14': {
    table: [
      { label: 'Количество срезов', value: '32 / 64 / 128' },
      { label: 'Тип', value: 'цифровой компьютерный томограф' },
      { label: 'Особенность', value: 'большой диаметр апертуры гентри' },
      { label: 'Применение', value: 'рутинные и специализированные исследования' },
    ],
    chips: ['32/64/128', 'МТЛ'],
    filters: { slices: 128 },
  },
  '15': {
    table: [
      { label: 'Индукция поля', value: '1,5 Тл' },
      { label: 'Апертура', value: '63 см' },
      { label: 'Тип', value: 'сверхпроводящий МРТ, короткий гентри' },
      { label: 'Площадь установки', value: 'от 29 м²' },
      { label: 'Шумоподавление', value: 'Pianissimo' },
      { label: 'Гелий', value: 'Zero boil-off' },
      { label: 'Однородность', value: '< 2 ppm в 50 см DSV' },
    ],
    chips: ['1,5 Тл', '63 см', 'Pianissimo'],
    filters: { tesla: 1.5, boreCm: 63 },
  },
  '16': {
    table: [
      { label: 'Индукция поля', value: '1,5 Тл' },
      { label: 'Апертура', value: '71 см' },
      { label: 'Длина магнита', value: '1,4 м' },
      { label: 'Градиенты (стандарт)', value: '34 мТл/м, 155 Тл/м/с' },
      { label: 'Градиенты XGO', value: '45 мТл/м, 200 Тл/м/с' },
      { label: 'RF', value: '2 канала передачи' },
      { label: 'Шумоподавление', value: 'Pianissimo / Pianissimo Zen' },
    ],
    chips: ['1,5 Тл', '71 см', 'XGO'],
    filters: { tesla: 1.5, boreCm: 71 },
  },
  '17': {
    table: [
      { label: 'Тип системы', value: 'ангиографическая / интервенционная' },
      { label: 'Детекторы', value: '8×8″ / 12×12″ / 12×16″ FPD' },
      { label: 'Hi-Def режим', value: 'пиксель 76 мкм, до 6,6 пл/мм' },
      { label: 'Конфигурации', value: 'Core+, Sky, Sky+, Biplane' },
      { label: 'Особенность', value: 'контроль дозы, Hi-Def визуализация' },
    ],
    chips: ['Hi-Def', 'FPD', 'интервенция'],
    filters: {},
  },
  '18': {
    table: [
      { label: 'Назначение', value: 'мобильный модуль для КТ, МРТ и ангиографа' },
      { label: 'Конструкция', value: 'каркасно-панельная, заводская сборка' },
      { label: 'Кабина', value: 'РЧ-экранирование' },
      { label: 'Климат-контроль', value: 'температура и влажность в комнате сканирования' },
      { label: 'Применение', value: 'город и сельская местность' },
    ],
    chips: ['мобильный', 'КТ/МРТ/ангио'],
    filters: {},
  },
  '19': {
    table: [
      { label: 'Тип', value: 'телеуправляемый рентгенодиагностический аппарат' },
      { label: 'Модель', value: 'Р-600 «Полидиагност»' },
      { label: 'Режимы', value: 'рентгеноскопия, обследования в любом положении' },
      { label: 'Стол', value: 'широкая высотная адаптация деки, наклон' },
      { label: 'Особенность', value: 'полное обследование без доп. перемещения пациента' },
    ],
    chips: ['телеуправляемый', 'Р-600'],
    filters: { xrayType: 'remote' },
  },
  '20': {
    table: [
      { label: 'Тип', value: 'аппарат на 2 рабочих места' },
      { label: 'Модель', value: 'Р-600 «Дуограф»' },
      { label: 'Режимы', value: 'рентгенография, мультиэнергия, линейная томография' },
      { label: 'Штатив', value: 'моторизированная колонна ≥250 см' },
      { label: 'Особенность', value: 'автоматизированный штатив экспертного уровня' },
    ],
    chips: ['2 раб. места', 'Р-600'],
    filters: { xrayType: 'two-station' },
  },
  '21': {
    table: [
      { label: 'Тип', value: 'флюорографический аппарат' },
      { label: 'Модель', value: 'Р-600 «Флюоро»' },
      { label: 'Детектор', value: 'полноформатный цифровой' },
      { label: 'РПУ', value: 'высокочастотное' },
      { label: 'Применение', value: 'флюорография органов грудной клетки' },
    ],
    chips: ['флюорограф', 'цифровой'],
    filters: { xrayType: 'fluoro' },
  },
  '22': {
    table: [
      { label: 'Тип', value: 'универсальный рентгеновский / флюорограф' },
      { label: 'Модель', value: 'УнивеРС-Флюорограф-МТ' },
      { label: 'Производитель', value: 'МТЛ' },
      { label: 'Применение', value: 'универсальная рентгенография и флюорография' },
    ],
    chips: ['универсальный', 'МТЛ'],
    filters: { xrayType: 'universal' },
  },
  '23': {
    table: [
      { label: 'Тип', value: 'аппарат на 2 рабочих места' },
      { label: 'Модель', value: 'УниКоРД-МТ-Плюс' },
      { label: 'Режимы', value: 'рентгенография, линейная томография' },
      { label: 'Приёмники', value: 'один или два цифровых на выбор' },
      { label: 'Стол', value: 'подъёмный с дистанционным управлением' },
    ],
    chips: ['2 раб. места', 'цифровой'],
    filters: { xrayType: 'two-station' },
  },
  '24': {
    table: [
      { label: 'Тип', value: 'цифровой универсальный аппарат' },
      { label: 'Модель', value: 'УнивеРС-МТ' },
      { label: 'Применение', value: 'полипозиционная рентгенография' },
      { label: 'Производитель', value: 'МТЛ' },
    ],
    chips: ['полипозиционный', 'МТЛ'],
    filters: { xrayType: 'universal' },
  },
  '25': {
    table: [
      { label: 'Тип', value: 'телеуправляемый рентгеновский комплекс' },
      { label: 'Модель', value: 'ТелеКоРД-7МТ' },
      { label: 'Режимы', value: 'рентгенография, рентгеноскопия, томосинтез' },
      { label: 'Особенности', value: '3D-томосинтез, мультиэнергия, панорамная сшивка' },
    ],
    chips: ['телеуправляемый', 'томосинтез'],
    filters: { xrayType: 'remote' },
  },
  '26': {
    table: [
      { label: 'Тип', value: 'палатный мобильный рентген' },
      { label: 'Модель', value: 'МобиРен-5МТ' },
      { label: 'Мощность', value: 'до 50 кВт' },
      { label: 'Приёмник', value: 'беспроводной цифровой 35×43 см' },
      { label: 'Скорость передвижения', value: 'до 4 км/ч' },
      { label: 'Питание', value: 'автономное' },
    ],
    chips: ['палатный', '50 кВт', '35×43'],
    filters: { xrayType: 'mobile' },
  },
  '27': {
    table: [
      { label: 'Тип', value: 'палатный мобильный рентген' },
      { label: 'Модель', value: 'МобиРен-4МТ' },
      { label: 'Масса', value: 'до 70 кг' },
      { label: 'Питание', value: 'встроенный аккумулятор' },
      { label: 'Связь', value: 'Wi-Fi' },
      { label: 'Особенность', value: 'компактные габариты для ограниченных помещений' },
    ],
    chips: ['палатный', 'до 70 кг', 'Wi-Fi'],
    filters: { xrayType: 'mobile' },
  },
  '28': {
    table: [
      { label: 'Тип', value: 'мобильный рентгенохирургический аппарат (С-дуга)' },
      { label: 'Модель', value: 'Р-600 «Опервиз»' },
      { label: 'Режимы', value: 'непрерывная и импульсная рентгеноскопия' },
      { label: 'Детектор', value: 'динамический плоскопанельный, DQE >80%' },
      { label: 'Особенность', value: 'органоавтоматика параметров' },
    ],
    chips: ['С-дуга', 'FPD', 'DQE >80%'],
    filters: {},
  },
  '29': {
    table: [
      { label: 'Тип', value: 'мобильная С-дуга' },
      { label: 'Модель', value: 'СиКоРД-2МТ' },
      { label: 'Детектор', value: 'динамический плоскопанельный до 30×30 см' },
      { label: 'Генератор', value: '4 / 5 / 20 кВт (по исполнению)' },
      { label: 'Глубина С-дуги', value: '70,7 см' },
      { label: 'Анод', value: 'вращающийся, жидкостное охлаждение' },
      { label: 'Применение', value: 'ортопедия, ангиография, хирургия' },
    ],
    chips: ['С-дуга', 'FPD 30×30', 'до 20 кВт'],
    filters: {},
    procurement: [{ label: 'РУ', value: 'РЗН 2019/9384' }],
  },
  '30': {
    table: [
      { label: 'Тип', value: 'цифровой маммограф' },
      { label: 'Модель', value: 'Маммо-6МТ' },
      { label: 'Режимы', value: 'скрининг, томосинтез' },
      { label: 'Томосинтез', value: 'послойное сканирование с шагом 1 мм' },
      { label: 'Особенность', value: 'выявление микрокальцинатов от 0,1 мм' },
    ],
    chips: ['томосинтез', 'скрининг'],
    filters: { tomosynthesis: true },
  },
  '31': {
    table: [
      { label: 'Тип', value: 'цифровой маммограф с томосинтезом' },
      { label: 'Модель', value: 'Маммо-5МТ' },
      { label: 'Генератор', value: '7,4 кВт' },
      { label: 'Режимы', value: '2D, 3D, COMBO, CESM, Synthetic 2D' },
      { label: 'Биопсия', value: 'стереотаксическая и под контролем томосинтеза' },
      { label: 'Детектор', value: 'цифровой с поддержкой томосинтеза' },
    ],
    chips: ['томосинтез', 'CESM', '7,4 кВт'],
    filters: { tomosynthesis: true },
  },
  '32': {
    table: [
      { label: 'Тип', value: 'цифровой маммограф (биопсийный)' },
      { label: 'Модель', value: 'Маммо-5МТ' },
      { label: 'Специализация', value: 'стереотаксическая / томосинтезная биопсия' },
      { label: 'База', value: 'платформа Маммо-5МТ' },
    ],
    chips: ['биопсия', 'Маммо-5МТ'],
    filters: { tomosynthesis: true },
  },
  '33': {
    table: [
      { label: 'Тип', value: 'цифровой маммограф' },
      { label: 'Модель', value: 'Маммо-4МТ-Плюс' },
      { label: 'Применение', value: 'скрининговая и диагностическая маммография' },
      { label: 'Производитель', value: 'МТЛ' },
    ],
    chips: ['цифровой', 'МТЛ'],
    filters: {},
  },
  '34': {
    table: [
      { label: 'Тип', value: 'цифровой маммограф' },
      { label: 'Модель', value: 'AMULET Innovality' },
      { label: 'Детектор', value: 'a-Se прямого преобразования, HCP' },
      { label: 'Размер детектора', value: '240 × 300 мм' },
      { label: 'Пиксель', value: '50 мкм' },
      { label: 'Интервал между снимками', value: '15 с' },
      { label: 'Режимы', value: '2D, томосинтез (dual-mode), i-AEC' },
    ],
    chips: ['50 мкм', 'томосинтез', 'a-Se'],
    filters: { tomosynthesis: true },
  },
  '35': {
    table: [
      { label: 'Серия', value: 'Aplio flex / Aplio go' },
      { label: 'Класс', value: 'компактные УЗ-системы' },
      { label: 'Тип', value: 'стационарные / портативные конфигурации линейки Aplio' },
      { label: 'Производитель', value: 'Canon Medical' },
    ],
    chips: ['Aplio', 'компакт'],
    filters: { usClass: 'compact' },
  },
  '36': {
    table: [
      { label: 'Серия', value: 'Aplio i-series — Prism Edition' },
      { label: 'Класс', value: 'премиальный / экспертный' },
      { label: 'Платформа', value: 'iBeam / Deep Learning Imaging' },
      { label: 'Применение', value: 'мультидисциплинарная диагностика' },
    ],
    chips: ['Prism', 'премиум'],
    filters: { usClass: 'premium' },
  },
  '37': {
    table: [
      { label: 'Серия', value: 'Aplio a-series' },
      { label: 'Класс', value: 'экспертный' },
      { label: 'Применение', value: 'общая визуализация, кардио, сосуды' },
      { label: 'Производитель', value: 'Canon Medical' },
    ],
    chips: ['Aplio a', 'эксперт'],
    filters: { usClass: 'expert' },
  },
  '38': {
    table: [
      { label: 'Модель', value: 'Aplio flex' },
      { label: 'Класс', value: 'компактный' },
      { label: 'Тип', value: 'ультразвуковая система' },
      { label: 'Производитель', value: 'Canon Medical' },
    ],
    chips: ['Aplio flex', 'компакт'],
    filters: { usClass: 'compact' },
  },
  '39': {
    table: [
      { label: 'Модель', value: 'Aplio go' },
      { label: 'Класс', value: 'компактный / мобильный' },
      { label: 'Тип', value: 'ультразвуковая система' },
      { label: 'Производитель', value: 'Canon Medical' },
    ],
    chips: ['Aplio go', 'компакт'],
    filters: { usClass: 'compact' },
  },
  '40': {
    table: [
      { label: 'Модель', value: 'X-CUBE 90' },
      { label: 'Класс', value: 'премиальный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Производитель', value: 'Alpinion' },
    ],
    chips: ['X-CUBE 90', 'премиум'],
    filters: { usClass: 'premium' },
  },
  '41': {
    table: [
      { label: 'Серия', value: 'E-CUBE 15' },
      { label: 'Класс', value: 'экспертный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Производитель', value: 'Alpinion' },
    ],
    chips: ['E-CUBE 15', 'эксперт'],
    filters: { usClass: 'expert' },
  },
  '42': {
    table: [
      { label: 'Серия', value: 'E-CUBE 8' },
      { label: 'Класс', value: 'высокий / экспертный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Производитель', value: 'Alpinion' },
    ],
    chips: ['E-CUBE 8'],
    filters: { usClass: 'high' },
  },
  '43': {
    table: [
      { label: 'Серия', value: 'E-CUBE i7' },
      { label: 'Класс', value: 'портативный / компактный' },
      { label: 'Тип', value: 'ультразвуковая система' },
      { label: 'Производитель', value: 'Alpinion' },
    ],
    chips: ['E-CUBE i7', 'портатив'],
    filters: { usClass: 'portable' },
  },
  '44': {
    table: [
      { label: 'Платформа', value: 'ELUXEO 7000' },
      { label: 'Источник света', value: '4-LED (BL-7000)' },
      { label: 'Процессор', value: 'VP-7000, Full HD' },
      { label: 'Совместимость', value: 'эндоскопы серий 700 / 600 / 500' },
      { label: 'Режимы визуализации', value: 'BLI, LCI' },
      { label: 'DICOM', value: 'поддерживается' },
    ],
    chips: ['4-LED', 'Full HD', 'BLI/LCI'],
    filters: {},
  },
  '45': {
    table: [
      { label: 'Платформа', value: 'ELUXEO 6000 / ELUXEO Lite' },
      { label: 'Особенность', value: 'встроенный 3-LED источник (EP-6000)' },
      { label: 'Вывод', value: 'Full HD' },
      { label: 'Совместимость', value: 'серии 600 / 700' },
    ],
    chips: ['ELUXEO 6000', '3-LED'],
    filters: {},
  },
  '46': {
    table: [
      { label: 'Тип', value: 'ИИ-поддержка эндоскопии (CAD)' },
      { label: 'Модель', value: 'CAD EYE' },
      { label: 'Функции', value: 'детекция и характеристика полипов' },
      { label: 'Режимы', value: 'White Light, LCI, BLI' },
      { label: 'Оборудование', value: 'EX-1 + ПО EW10-EC02' },
      { label: 'Совместимость', value: 'ELUXEO 7000 / 6000, колоноскопы 700' },
    ],
    chips: ['CAD', 'AI', 'полипы'],
    filters: {},
  },
  '47': {
    table: [
      { label: 'Тип', value: 'линейка видеоэндоскопов' },
      { label: 'Серии', value: '700 / 600 / 500' },
      { label: 'Платформа', value: 'ELUXEO' },
      { label: 'Производитель', value: 'Fujifilm' },
    ],
    chips: ['700/600/500', 'Fujifilm'],
    filters: {},
  },
  '48': {
    table: [
      { label: 'Тип', value: 'эндоскопическая система' },
      { label: 'Модель', value: 'ЭФА-М' },
      { label: 'Производитель', value: 'ЭФА МЕДИКА' },
    ],
    chips: ['ЭФА-М'],
    filters: {},
  },
  '49': {
    table: [
      { label: 'Тип', value: 'видеоэндоскопическая система' },
      { label: 'Модель', value: 'V-1000' },
      { label: 'Производитель', value: 'Concemed' },
    ],
    chips: ['V-1000'],
    filters: {},
  },
  '50': {
    table: [
      { label: 'Тип', value: 'видеоэндоскопическая система' },
      { label: 'Модель', value: 'V-800' },
      { label: 'Производитель', value: 'Concemed' },
    ],
    chips: ['V-800'],
    filters: {},
  },
  '51': {
    table: [
      { label: 'Тип', value: 'стоматологическая установка' },
      { label: 'Серия', value: 'X1' },
      { label: 'Производитель', value: 'CINGOL' },
    ],
    chips: ['X1'],
    filters: {},
  },
  '52': {
    table: [
      { label: 'Тип', value: 'стоматологическая установка' },
      { label: 'Серия', value: 'X3' },
      { label: 'Производитель', value: 'CINGOL' },
    ],
    chips: ['X3'],
    filters: {},
  },
  '53': {
    table: [
      { label: 'Тип', value: 'стоматологическая установка' },
      { label: 'Серия', value: 'X5' },
      { label: 'Производитель', value: 'CINGOL' },
    ],
    chips: ['X5'],
    filters: {},
  },
  '54': {
    table: [
      { label: 'Тип', value: 'стоматологическая установка' },
      { label: 'Серия', value: 'X5+' },
      { label: 'Производитель', value: 'CINGOL' },
    ],
    chips: ['X5+'],
    filters: {},
  },
  '55': {
    table: [
      { label: 'Модель', value: 'W9-RUS (HERA W9)' },
      { label: 'Класс', value: 'премиальный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Направление', value: 'акушерство / гинекология' },
      { label: 'Режимы', value: '2D, 3D/4D, Doppler' },
    ],
    chips: ['премиум', '3D/4D', 'АГиН'],
    filters: { usClass: 'premium' },
  },
  '56': {
    table: [
      { label: 'Модель', value: 'W10-RUS (HERA W10)' },
      { label: 'Класс', value: 'премиальный' },
      { label: 'Платформа', value: 'CrystalArchitecture' },
      { label: 'Направление', value: 'акушерство / гинекология' },
      { label: 'Режимы', value: '2D, 3D/4D, MV-Flow, Doppler' },
    ],
    chips: ['премиум', 'CrystalArchitecture'],
    filters: { usClass: 'premium' },
  },
  '57': {
    table: [
      { label: 'Модель', value: 'Z20-RUS (HERA Z20)' },
      { label: 'Класс', value: 'премиальный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Режимы', value: '2D, 3D/4D, спектральный и цветовой Doppler' },
    ],
    chips: ['премиум', 'Z20'],
    filters: { usClass: 'premium' },
  },
  '58': {
    table: [
      { label: 'Модель', value: 'RS85-RUS' },
      { label: 'Класс', value: 'премиальный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Применение', value: 'общая визуализация, сложные исследования' },
      { label: 'Режимы', value: '2D, 3D/4D, MV-Flow, Doppler' },
    ],
    chips: ['премиум', 'RS85'],
    filters: { usClass: 'premium' },
  },
  '59': {
    table: [
      { label: 'Модель', value: 'HS50-RUS' },
      { label: 'Класс', value: 'экспертный' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
      { label: 'Режимы', value: '2D, 3D/4D, CW/PW/Power/Color Doppler' },
    ],
    chips: ['эксперт', 'HS50'],
    filters: { usClass: 'expert' },
  },
  '60': {
    table: [
      { label: 'Модель', value: 'HM70 EVO' },
      { label: 'Класс', value: 'экспертный портативный' },
      { label: 'Масса системы', value: '≈ 6,0 кг (с аккумулятором)' },
      { label: 'Режимы', value: '2D, 3D/4D, CDI, PW/CW, TDI, Elastoscan' },
      { label: 'Применение', value: 'абдомен, АГиН, кардио, сосуды, MSK, emergency' },
    ],
    chips: ['портатив', '≈6 кг', 'эксперт'],
    filters: { usClass: 'portable' },
  },
  '61': {
    table: [
      { label: 'Серия', value: 'V6 / V7 / V8' },
      { label: 'Класс', value: 'экспертный — премиальный (по модели)' },
      { label: 'Тип', value: 'стационарные УЗ-системы' },
      { label: 'Применение', value: 'мультидисциплинарная диагностика' },
    ],
    chips: ['V-серия', 'эксперт/премиум'],
    filters: { usClass: 'expert' },
  },
  '62': {
    table: [
      { label: 'Модель', value: 'HS40-RUS' },
      { label: 'Класс', value: 'высокий' },
      { label: 'Режимы', value: '2D, 3D, PW и цветовой Doppler' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
    ],
    chips: ['высокий', 'HS40'],
    filters: { usClass: 'high' },
  },
  '63': {
    table: [
      { label: 'Модель', value: 'HS30-RUS' },
      { label: 'Класс', value: 'высокий' },
      { label: 'Режимы', value: '2D, 3D, PW и цветовой Doppler' },
      { label: 'Тип', value: 'стационарная УЗ-система' },
    ],
    chips: ['высокий', 'HS30'],
    filters: { usClass: 'high' },
  },
};

const includes = [
  { title: 'Поставка', text: 'Оборудование для ЛПУ с комплектом документов и логистикой по России.' },
  { title: 'Монтаж и ввод', text: 'Установка, пусконаладка на площадке заказчика.' },
  { title: 'Обучение', text: 'Обучение персонала работе на оборудовании.' },
  { title: 'Сервис', text: 'Гарантийное и постгарантийное сопровождение.' },
];

let updated = 0;
for (const p of products) {
  const spec = byId[p.id];
  if (!spec) continue;
  p.specTable = spec.table;
  p.specs = (spec.chips && spec.chips.length ? spec.chips : spec.table.slice(0, 3).map((r) => `${r.label}: ${r.value}`));
  p.filters = spec.filters || {};
  p.includes = includes;
  const procurement = [
    { label: 'Категория', value: p.category },
    { label: 'Бренд', value: p.brand },
    { label: 'Цена', value: 'По запросу' },
    { label: 'Комплектация', value: 'Поставка, монтаж, обучение, сервис' },
    ...(spec.procurement || []),
  ];
  p.procurement = procurement;

  // SEO titles tuned for commercial intent
  if (!p.seoTitle?.includes('характеристики')) {
    p.seoTitle = `${p.name} — купить, характеристики | ЗелМедСервис`;
  }
  p.seoDescription = `${p.name}: технические характеристики, поставка для ЛПУ, монтаж, обучение и сервис. Запросите КП у ЗелМедСервис.`;
  updated++;
}

writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n', 'utf8');
console.log(`Updated ${updated}/${products.length} products with specTable`);
