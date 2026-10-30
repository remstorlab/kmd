// Только типы: data/mock.ts сам использует этот расчёт для демо-данных (без циклической зависимости при загрузке)
import type { ChemComposition, MaterialCode } from "./mock";

// ── Расчёт химического состава позиции по коду материала, пробе и лигатурному весу ──
// Справочник «Коды материалов» хранит процентное содержание элементов сплава (ЗлСрМ 750-125 → Au 75 %, Ag 12,5 %,
// остальное Cu). Состав позиции, %:
//   1) при выборе кода материала — справочное содержание;
//   2) при выборе пробы — содержание основного металла кода (Au для золотых сплавов) = Проба / 10 %,
//      разница уходит в остаток (Cu), остальные элементы не меняются;
//   3) проценты можно поправить вручную.
// Граммы элемента = Лигатурный вес × % / 100; чистый вес позиции = граммы основного металла
// (= Лигатурный вес × Проба / 1000). Всё округляется до двух знаков.

// Элемент-остаток сплава («остальное») — медь
export const REST_ELEMENT = "cu";

export const r2 = (v: number) => Math.round(v * 100) / 100;
const numOf = (v: string | number | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const s2 = (v: number) => r2(v).toFixed(2);

// Процентное содержание: id элемента → %, строкой (как вводится в поля)
export type ChemPercent = Record<string, string>;

// Основной металл кода (au / ag / pt / pd) — к нему относится проба: префикс краткого наименования кода
// (как baseMetal в data/mock.ts), по умолчанию — золото
export const mainElementOf = (code: string, codes: MaterialCode[]) => {
  const prefix = (codes.find(c => c.code === code)?.shortName ?? code).slice(0, 2);
  return prefix === "Au" || prefix === "Ag" || prefix === "Pt" || prefix === "Pd" ? prefix.toLowerCase() : "au";
};

// Справочное содержание кода материала, % (пусто — у кода состав не задан)
export function compositionOf(code: string, codes: MaterialCode[]): ChemPercent {
  const comp = codes.find(c => c.code === code)?.composition ?? {};
  return Object.fromEntries(Object.entries(comp).filter(([, v]) => v > 0).map(([k, v]) => [k, s2(v)]));
}

// Корректировка состава по пробе: основной металл = Проба / 10 %, остаток (Cu) = 100 % − остальные элементы
export function applyProba(pct: ChemPercent, proba: string, main: string): ChemPercent {
  const p = numOf(proba);
  if (!(p > 0)) return pct;
  const next: ChemPercent = { ...pct, [main]: s2(p / 10) };
  if (main === REST_ELEMENT) return next;
  const others = Object.entries(next).filter(([k]) => k !== REST_ELEMENT).reduce((a, [, v]) => a + (numOf(v) || 0), 0);
  const rest = r2(100 - others);
  if (rest > 0) next[REST_ELEMENT] = s2(rest);
  else delete next[REST_ELEMENT];
  return next;
}

// Граммы элемента по % и лигатурному весу
export const gramOf = (pct: string | undefined, lig: number) => {
  const p = numOf(pct);
  return Number.isFinite(p) && lig > 0 ? s2((lig * p) / 100) : "";
};
export const gramsFrom = (pct: ChemPercent, lig: number): ChemComposition =>
  Object.fromEntries(Object.entries(pct).map(([k, v]) => [k, gramOf(v, lig)]).filter(([, g]) => g !== "" && Number(g) > 0));

// % элемента по граммам и лигатурному весу (для позиций, сохранённых раньше в граммах)
export const pctOf = (g: string | undefined, lig: number) => {
  const v = numOf(g);
  return Number.isFinite(v) && lig > 0 ? s2((v / lig) * 100) : "";
};
export const pctFrom = (chem: ChemComposition | undefined, lig: number): ChemPercent =>
  Object.fromEntries(Object.entries(chem ?? {}).map(([k, v]) => [k, pctOf(v, lig)]).filter(([, p]) => p !== ""));

// Сумма процентов состава
export const pctSum = (pct: ChemPercent) => r2(Object.values(pct).reduce((a, v) => a + (numOf(v) || 0), 0));

export const num0 = (v: string | number | undefined) => {
  const n = numOf(v);
  return Number.isFinite(n) ? n : 0;
};
