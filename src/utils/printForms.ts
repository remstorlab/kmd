// ── Печатные формы документов прихода (Excel) ────────────────────────────────
// «Требование» и «Приходный ордер запасов» — по бумажным шаблонам КМД, адаптированные под атрибуты
// документов и позиций системы. Значения, которых нет в системе (цена в требовании, вид операции,
// кор. счёт), оставлены пустыми для заполнения вручную; подписи — пустые строки.

import { SkladDoc, ShihtovayaKarta, PrikazPlavka, DOC_PRIHOD_ORDER, DOC_TREBOVANIE } from "../data/mock";
import { DEMO_ORDER, ORDER_HEAD_DEFAULTS } from "../components/PrihodDocModal";
import { issueShare } from "../data/stock";
import { Sheet, S, downloadXlsx } from "./xlsx";

const ORG = "РГП «Казахстанский монетный двор Национального Банка Республики Казахстан»";
const ORG_SHORT = "РГП «КМД НБ РК»";
const BIN = "941240000242";
const SIGN = "______________________";

// Число из строки формы («1 000,50» / «1000.50»); пусто — null
const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
const yearOf = (date: string) => date.split(".")[2] ?? String(new Date().getFullYear());

// Печать доступна для этих типов документов
export const canPrintXlsx = (d: SkladDoc) => d.type === DOC_TREBOVANIE || d.type === DOC_PRIHOD_ORDER;

export function printDocXlsx(d: SkladDoc, ctx: { karty: ShihtovayaKarta[]; prikazy: PrikazPlavka[] }) {
  if (d.type === DOC_TREBOVANIE) downloadXlsx(trebovanieSheet(d, ctx.karty, ctx.prikazy), `Требование ${d.number} от ${d.date}.xlsx`);
  else if (d.type === DOC_PRIHOD_ORDER) downloadXlsx(prihodOrderSheet(d), `Приходный ордер ${d.number} от ${d.date}.xlsx`);
}

// ── Требование ───────────────────────────────────────────────────────────────

const METALS = [
  { id: "au", label: "Золота" },
  { id: "ag", label: "Серебра" },
  { id: "pd", label: "Палладия" },
  { id: "rh", label: "Родия" },
  { id: "pt", label: "Платины" },
];

function trebovanieSheet(d: SkladDoc, karty: ShihtovayaKarta[], prikazy: PrikazPlavka[]): Sheet {
  const sh = new Sheet(`Требование ${d.number}`);
  // №, Код материала, Номенкл. №, Наименование, Кол-во, Проба, Вес лиг., Au, Ag, Pd, Rh, Pt, Цена, Сумма
  sh.cols = [5, 10, 11, 36, 8, 8, 12, 11, 11, 11, 11, 11, 10, 13];
  const LAST = 14;

  // Гриф утверждения
  sh.set(1, 9, "Отпуск разрешаю:", S.bold);
  sh.set(2, 9, `Генеральный директор ${ORG_SHORT}`);
  sh.set(3, 9, `${SIGN}   ${SIGN}`);
  sh.set(4, 9, `«____» ________________ ${yearOf(d.date)}г.`);

  sh.merge(6, 1, 6, LAST, `Требование № ${d.number} от ${d.date}г.`, S.title);
  sh.height(6, 22);
  // Основание — приказ на плавку и шихтовые карты в его составе (старые документы — одна шихтовая карта)
  const prikaz = prikazy.find(p => p.id === d.prikazId);
  const karta = karty.find(k => k.id === d.shihtaId);
  const plavki = prikaz ? karty.filter(k => k.prikazId === prikaz.id).map(k => k.plavkaNo) : [];
  const osnovanie = prikaz
    ? `приказ на плавку № ${prikaz.number} от ${prikaz.date}${plavki.length ? `, шихтовые карты плавок № ${plavki.join(", ")}` : ""}`
    : karta ? `шихтовая карта № ${karta.plavkaNo} «${karta.name}» от ${karta.date}` : "—";
  sh.merge(7, 1, 7, LAST, `Основание: ${osnovanie}        Склад-отправитель: ${d.sender}        Склад-получатель: ${d.receiver}`, S.center);
  if (d.zakazchik) sh.merge(8, 1, 8, LAST, `Заказчик: ${d.zakazchik}${d.ownProperty === false ? " (не собственность заказчика)" : ""}`, S.center);

  // Шапка таблицы
  const h = 10;
  sh.merge(h, 1, h + 2, 1, "№ п/п", S.th);
  sh.merge(h, 2, h + 2, 2, "Код материала", S.th);
  sh.merge(h, 3, h + 2, 3, "Номенкл. №", S.th);
  sh.merge(h, 4, h + 2, 4, "Наименование изделия, лигатуры, полуфабриката и т.д.", S.th);
  sh.merge(h, 5, h, 12, "Выдано со склада", S.th);
  sh.merge(h, 13, h, 14, "Учётные показатели", S.th);
  sh.merge(h + 1, 5, h + 2, 5, "Кол-во, шт", S.th);
  sh.merge(h + 1, 6, h + 2, 6, "Проба", S.th);
  sh.merge(h + 1, 7, h + 2, 7, "Вес лигат. (гр)", S.th);
  sh.merge(h + 1, 8, h + 1, 12, "В составе лигатуры чистых металлов (гр)", S.th);
  METALS.forEach((m, i) => sh.set(h + 2, 8 + i, m.label, S.th));
  sh.merge(h + 1, 13, h + 2, 13, "Цена за гр.", S.th);
  sh.merge(h + 1, 14, h + 2, 14, "Сумма (тг.)", S.th);
  sh.height(h, 18).height(h + 1, 30).height(h + 2, 18);
  for (let c = 1; c <= LAST; c++) sh.set(h + 3, c, c, S.small);

  // Позиции: при частичном перемещении — вес выдаваемой части
  const rows = (d.positions ?? []).map(p => {
    const share = issueShare(p);
    const lig = p.lig !== null ? round(p.lig * share, 2) : null;
    const metals = METALS.map(m => { const v = num(p.chem?.[m.id]); return v === null ? 0 : round(v * share, 3); });
    return { p, lig, metals };
  });
  let r = h + 4;
  rows.forEach(({ p, lig, metals }, i) => {
    sh.set(r, 1, i + 1, S.tdCenter);
    sh.set(r, 2, p.code, S.tdCenter);
    sh.set(r, 3, p.nomenkl, S.tdCenter);
    sh.set(r, 4, p.name, S.td);
    sh.set(r, 5, p.issue, S.tdCenter);
    sh.set(r, 6, p.proba ?? "", S.tdCenter);
    sh.set(r, 7, lig ?? "", S.num2);
    metals.forEach((v, j) => sh.set(r, 8 + j, v, S.num3));
    sh.set(r, 13, "", S.num2);
    sh.set(r, 14, "", S.num2);
    r++;
  });
  if (!rows.length) { sh.merge(r, 1, r, LAST, "Позиции не выбраны", S.tdCenter); r++; }

  // Итого
  sh.set(r, 4, "Итого по требованию:", S.bold);
  sh.set(r, 5, sum(rows.map(x => x.p.issue)), S.bold);
  sh.set(r, 7, round(sum(rows.map(x => x.lig)), 2), S.totalNum2);
  METALS.forEach((_, j) => sh.set(r, 8 + j, round(sum(rows.map(x => x.metals[j])), 3), S.totalNum3));
  r += 2;

  sh.set(r, 2, `Отпустить: со склада «${d.sender}» на склад «${d.receiver}»`);
  r += 2;
  const left = ["Выдал кладовщик", "Начальник ПТО", "Бухгалтер по ДМ", "Начальник ИДМ"];
  const right = ["Получил металла", "Подпись"];
  left.forEach((t, i) => {
    sh.set(r + i * 2, 2, `${t}  ${SIGN}`);
    if (right[i]) sh.set(r + i * 2, 9, `${right[i]}  ${SIGN}`);
  });
  return sh;
}

// ── Приходный ордер запасов (форма 3-1) ──────────────────────────────────────

function prihodOrderSheet(d: SkladDoc): Sheet {
  const sh = new Sheet(`Приходный ордер ${d.number}`);
  const head = ORDER_HEAD_DEFAULTS;
  // Шапка документа и таблица позиций делят колонки A–N
  sh.cols = [11, 13, 10, 30, 12, 8, 13, 13, 13, 13, 12, 16, 11, 15];
  const LAST = 14;

  sh.merge(1, 1, 1, 10, ORG, S.boldUnderline);
  sh.set(1, LAST, "Форма 3-1", S.right);
  sh.merge(3, 1, 3, 4, `Склад ${d.receiver}`, S.boldUnderline);
  sh.set(3, 11, "ИИН/БИН", S.bold);
  sh.merge(3, 12, 3, 13, BIN, S.boxBold);
  sh.merge(5, 1, 5, LAST, "ПРИХОДНЫЙ ОРДЕР ЗАПАСОВ", S.title);
  sh.height(5, 22);

  // Реквизиты документа
  const t = 7;
  sh.merge(t, 1, t + 1, 1, "Номер документа", S.th);
  sh.merge(t, 2, t + 1, 2, "Дата составления", S.th);
  sh.merge(t, 3, t + 1, 3, "Вид операции", S.th);
  sh.merge(t, 4, t + 1, 5, "Наименование поставщика", S.th);
  sh.merge(t, 6, t + 1, 7, "Кор. счёт", S.th);
  sh.merge(t, 8, t, 9, "Номер сопроводительного документа", S.th);
  sh.set(t + 1, 8, "№ договора", S.th);
  sh.set(t + 1, 9, "дата", S.th);
  sh.merge(t, 10, t, LAST, "Номер платёжного документа", S.th);
  sh.set(t + 1, 10, "№ счёт-фактуры", S.th);
  sh.set(t + 1, 11, "дата", S.th);
  sh.set(t + 1, 12, "№", S.th);
  sh.merge(t + 1, 13, t + 1, 14, "дата", S.th);
  sh.height(t, 30);
  sh.set(t + 2, 1, d.number, S.boxBold);
  sh.set(t + 2, 2, d.date, S.boxBold);
  sh.set(t + 2, 3, "", S.boxBold);
  sh.merge(t + 2, 4, t + 2, 5, d.sender, S.boxBold);
  sh.merge(t + 2, 6, t + 2, 7, "", S.boxBold);
  sh.set(t + 2, 8, head.dogovor, S.boxBold);
  sh.set(t + 2, 9, d.date, S.boxBold);
  sh.set(t + 2, 10, head.schetFaktura, S.boxBold);
  sh.set(t + 2, 11, d.date, S.boxBold);
  sh.set(t + 2, 12, head.platDoc, S.boxBold);
  sh.merge(t + 2, 13, t + 2, 14, d.date, S.boxBold);
  sh.height(t + 2, 30);

  // Таблица позиций
  const h = 11;
  sh.merge(h, 1, h + 1, 1, "Кор. счёт", S.th);
  sh.merge(h, 2, h + 1, 4, "Наименование, сорт, размер, марка", S.th);
  sh.merge(h, 5, h + 1, 5, "Номенкла-турный номер", S.th);
  sh.merge(h, 6, h + 1, 6, "Ед. изм.", S.th);
  sh.merge(h, 7, h, 8, "По документу", S.th);
  sh.merge(h, 9, h, 10, "Принято", S.th);
  sh.set(h + 1, 7, "количество (лигатура)", S.th);
  sh.set(h + 1, 8, "масса (чистый вес)", S.th);
  sh.set(h + 1, 9, "количество (лигатура)", S.th);
  sh.set(h + 1, 10, "масса (чистый вес)", S.th);
  sh.merge(h, 11, h + 1, 11, "Цена за единицу в тенге", S.th);
  sh.merge(h, 12, h + 1, 12, "Сумма в тенге", S.th);
  sh.merge(h, 13, h + 1, 13, "Номер паспорта", S.th);
  sh.merge(h, 14, h + 1, 14, "Порядковый № записи по складской картотеке / позиция годового плана", S.th);
  sh.height(h, 30).height(h + 1, 60);
  sh.set(h + 2, 1, "", S.small);
  sh.merge(h + 2, 2, h + 2, 4, 1, S.small);
  for (let c = 5; c <= LAST; c++) sh.set(h + 2, c, c - 3, S.small);

  // Позиции: количество и масса — лигатурный и чистый вес позиции, г; сумма — чистый вес × цена
  const price = num(head.price);
  const positions = d.prihodPositions ?? DEMO_ORDER;
  const rows = positions.map(p => {
    const lig = num(p.lig);
    const net = num(p.net);
    return { p, lig, net, total: price !== null && net !== null ? round(net * price, 2) : null };
  });
  let r = h + 3;
  rows.forEach(({ p, lig, net, total }) => {
    sh.set(r, 1, "", S.td);
    sh.merge(r, 2, r, 4, p.name, S.tdBold);
    sh.set(r, 5, p.nomenkl, S.tdCenter);
    sh.set(r, 6, "гр", S.tdCenter);
    sh.set(r, 7, lig ?? "", S.num2);
    sh.set(r, 8, net ?? "", S.num2);
    sh.set(r, 9, lig ?? "", S.num2);
    sh.set(r, 10, net ?? "", S.num2);
    sh.set(r, 11, price ?? "", S.num2);
    sh.set(r, 12, total ?? "", S.num2);
    sh.set(r, 13, head.pasport, S.tdCenter);
    sh.set(r, 14, head.planPos, S.tdCenter);
    sh.height(r, 30);
    r++;
  });
  if (!rows.length) { sh.merge(r, 1, r, LAST, "Позиции не добавлены", S.tdCenter); r++; }

  // Итого
  const ligT = round(sum(rows.map(x => x.lig)), 2);
  const netT = round(sum(rows.map(x => x.net)), 2);
  sh.merge(r, 1, r, 6, "Итого", S.tdBold);
  [ligT, netT, ligT, netT].forEach((v, i) => sh.set(r, 7 + i, v, S.totalNum2Box));
  sh.set(r, 11, "", S.totalNum2Box);
  sh.set(r, 12, round(sum(rows.map(x => x.total)), 2), S.totalNum2Box);
  sh.set(r, 13, "", S.totalNum2Box);
  sh.set(r, 14, "", S.totalNum2Box);
  r += 3;

  sh.set(r, 1, `Начальник ОЗ  ${SIGN}`);
  sh.set(r, 8, `Заявитель: начальник ПТО  ${SIGN}`);
  sh.set(r + 2, 1, `Сдал:  ${SIGN}`);
  sh.set(r + 4, 1, `Принял: заведующий складом ${d.receiver}  ${SIGN}`);
  return sh;
}
