import type { AlloyGrade, AlloyRange, ChemComposition, ShihtaMatKind, ShihtaMaterial, ShihtovayaKarta } from "./mock";

// ── Строки карты ──
// Вид строки: у старых записей без kind — по номенкл. № (позиция склада) или «прочее»
export const kindOf = (m: Pick<ShihtaMaterial, "kind" | "nomenkl">): ShihtaMatKind => m.kind ?? (m.nomenkl ? "sklad" : "prochee");
// Со склада выдаются и резервируются только позиции склада; доп. материалы выдаёт распределитель работ участка
export const isSkladMaterial = (m: Pick<ShihtaMaterial, "kind" | "nomenkl">) => kindOf(m) === "sklad";

// Позиции карты выданы в другой операции (doc): карта возвращается в «На редактировании» с пометкой выданных позиций.
// Выполненная карта и карта без этих позиций не меняются (возвращается тот же объект).
export function markIssuedElsewhere(k: ShihtovayaKarta, nomenkl: Set<string>, doc: string): ShihtovayaKarta {
  if (k.status === "Выполнена") return k;
  const hit = k.materials.filter(m => isSkladMaterial(m) && nomenkl.has(m.nomenkl));
  if (hit.length === 0) return k;
  const kept = (k.vydannyePozicii ?? []).filter(v => !nomenkl.has(v.nomenkl));
  return { ...k, status: "На редактировании", vydannyePozicii: [...kept, ...hit.map(m => ({ name: m.name, nomenkl: m.nomenkl, doc }))] };
}

// ── Расчёт шихтовой карты ──────────────────────────────────────────────────────
// По строке i (Mᵢ — масса в шихту):
//   • позиция склада: Au, Ag, Pd, Pt = Mᵢ × доля элемента в позиции; Cu = Mᵢ − Au − Ag − Pd − Pt;
//   • лигатура Cu-P: Cu = ROUND(Mᵢ × (1 − p/100); 2); P = Mᵢ − Cu;
//   • медь МО: Cu = Mᵢ;
//   • прочее: элементы = Mᵢ × доля (состав вводится вручную).
// Итоги: Mш = ΣMᵢ; ΣE = ΣEᵢ; база B = Mш − ΣP (фосфор выгорает); %E = ΣE × 100 / B.
// Проверка по марке: мин ≤ ROUND(%E; 2) ≤ макс для каждого элемента с диапазоном.

// Округление до 0,01 без ошибки двоичной дроби (116,695 → 116,70)
export const r2 = (v: number) => Math.round(Number((v * 100).toFixed(6))) / 100;
export const PRECIOUS = ["au", "ag", "pd", "pt"];
// Доля основного металла аффинированного материала, %
export const AFFINAGE_PCT = 99.99;
// Лигатура Cu-P: доля в шихте серебряных сплавов (0,17 %) и допуск
export const CUP_SHARE_MIN = 0.15;
export const CUP_SHARE_MAX = 0.19;
// Фосфор лигатуры по ГОСТ 4515, %
export const P_MIN = 8.0;
export const P_MAX = 11.0;
export const OBOROT_MAX = 5;

const numOf = (v: string | number | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
export const fmt2 = (v: number) => r2(v).toFixed(2).replace(".", ",");

// Строка шихты для расчёта
export interface ShihtaLine {
  kind: ShihtaMatKind;
  // Масса в шихту, г
  mass: number;
  // Доли элементов в материале (0..1): позиция склада, прочее
  share?: Record<string, number>;
  // Лигатура Cu-P: фосфор, %
  phosphorPct?: number;
  klass?: string;
}

// Доли элементов материала по составу (г) и массе
export const shareOf = (chem: ChemComposition | undefined, mass: number): Record<string, number> =>
  mass > 0 ? Object.fromEntries(Object.entries(chem ?? {}).map(([k, v]) => [k, numOf(v) / mass]).filter(([, v]) => (v as number) > 0)) : {};

// Содержание элементов строки, г
export function lineChem(l: ShihtaLine): Record<string, number> {
  const m = l.mass > 0 ? l.mass : 0;
  switch (l.kind) {
    case "cup": {
      const cu = r2(m * (1 - (l.phosphorPct ?? 0) / 100));
      return { cu, p: r2(m - cu) };
    }
    case "medMO":
      return { cu: r2(m) };
    case "prochee":
      return Object.fromEntries(Object.entries(l.share ?? {}).map(([k, v]) => [k, r2(m * v)]));
    default: {
      const out: Record<string, number> = {};
      for (const e of PRECIOUS) {
        const v = r2(m * (l.share?.[e] ?? 0));
        if (v > 0) out[e] = v;
      }
      const cu = r2(m - Object.values(out).reduce((a, v) => a + v, 0));
      if (cu > 0) out.cu = cu;
      return out;
    }
  }
}

// Состав строки строками (как хранится в карте)
export const chemStrings = (c: Record<string, number>): ChemComposition =>
  Object.fromEntries(Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => [k, r2(v).toFixed(2)]));

// Норма марки текстом: «от 92,20 до 92,80 %», «не менее 99,99 %», «не более 0,10 %»
export function normText(r: Pick<AlloyRange, "min" | "max">) {
  if (r.min != null && r.max != null) return `от ${fmt2(r.min)} до ${fmt2(r.max)} %`;
  if (r.min != null) return `не менее ${fmt2(r.min)} %`;
  if (r.max != null) return `не более ${fmt2(r.max)} %`;
  return "—";
}

export interface GradeCheck {
  element: string;
  fact: number;
  min?: number;
  max?: number;
  ok: boolean;
}

// Расчёт шихты по строкам и (необязательно) сверка с маркой сплава
export class ShihtaCalc {
  readonly chems: Record<string, number>[];

  constructor(readonly lines: ShihtaLine[], readonly grade?: AlloyGrade) {
    this.chems = lines.map(lineChem);
  }

  // Масса шихты Mш
  get mass() { return r2(this.lines.reduce((s, l) => s + (l.mass > 0 ? l.mass : 0), 0)); }
  // Содержание элемента в шихте, г
  total(e: string) { return r2(this.chems.reduce((s, c) => s + (c[e] ?? 0), 0)); }
  get phosphor() { return this.total("p"); }
  // База расчёта долей B = Mш − ΣP
  get base() { return r2(this.mass - this.phosphor); }
  // Содержание элемента в шихте, % (к базе)
  pct(e: string) { return this.base > 0 ? (this.total(e) * 100) / this.base : 0; }
  // Доля строки в массе шихты, %
  dola(i: number) { return this.mass > 0 ? (Math.max(0, this.lines[i].mass) / this.mass) * 100 : 0; }

  // Сверка с маркой — только элементы с диапазоном
  get checks(): GradeCheck[] {
    if (!this.grade || this.mass <= 0) return [];
    return this.grade.ranges.filter(r => r.min != null || r.max != null).map(r => {
      const fact = r2(this.pct(r.element));
      const ok = (r.min == null || fact >= r.min) && (r.max == null || fact <= r.max);
      return { element: r.element, fact, min: r.min, max: r.max, ok };
    });
  }
  get complies() { return this.checks.length > 0 && this.checks.every(c => c.ok); }
  get failed() { return this.checks.filter(c => !c.ok); }

  // Доля аффинированного металла (материалы с долей основного металла марки ≥ 99,99 %) в массе шихты, %
  affinagePct(baseEl: string) {
    if (this.mass <= 0) return 0;
    const aff = this.lines.filter(l => l.kind === "sklad" && r2((l.share?.[baseEl] ?? 0) * 100) >= AFFINAGE_PCT);
    return (aff.reduce((s, l) => s + l.mass, 0) / this.mass) * 100;
  }
}

export const baseElement = (g: AlloyGrade) => g.base.toLowerCase();

// Предупреждения (не блокируют оформление)
export function shihtaWarnings(calc: ShihtaCalc, opts: { oborot?: string; minAffinage?: number }): string[] {
  const out: string[] = [];
  const ob = parseInt(opts.oborot ?? "", 10);
  if (Number.isFinite(ob) && ob > OBOROT_MAX) out.push(`Оборот превышает ${OBOROT_MAX} (ТИ 10.65-25)`);
  const g = calc.grade;
  if (g && opts.minAffinage != null && calc.mass > 0) {
    const n = calc.affinagePct(baseElement(g));
    if (r2(n) < opts.minAffinage) out.push(`Доля аффинированного металла ${fmt2(n)} % — менее ${fmt2(opts.minAffinage)} %`);
  }
  const cup = calc.lines.filter(l => l.kind === "cup");
  if (cup.some(l => (l.phosphorPct ?? 0) < P_MIN || (l.phosphorPct ?? 0) > P_MAX)) out.push("Содержание фосфора вне ГОСТ 4515");
  if (g?.base === "Ag" && cup.length && calc.mass > 0) {
    const share = r2((cup.reduce((s, l) => s + l.mass, 0) / calc.mass) * 100);
    if (share < CUP_SHARE_MIN || share > CUP_SHARE_MAX) out.push("Количество лигатуры вне нормы 0,17 ± 0,02 %");
  }
  return out;
}

// ── Норма марки в строке «Состав сплава по НД, %» ──────────────────────────────
// Текстовые обозначения («Остальное», «не более …») не хранятся в числовых полях и не участвуют в расчёте:
// они выводятся из структуры марки — диапазоны (ranges), элемент-остаток (rest) и примеси (impurities).
export type NormCell =
  | { kind: "range"; min?: number; max?: number }
  | { kind: "rest" }
  | { kind: "impurity"; max: number };

// Число нормы: не менее двух знаков после запятой, но без потери точности (0,002 → «0,002»)
export const fmtNorm = (v: number) => {
  const dec = Math.min(4, Math.max(2, (String(v).split(".")[1] ?? "").length));
  return v.toFixed(dec).replace(".", ",");
};

export function normCell(g: AlloyGrade | undefined, el: string): NormCell | null {
  if (!g) return null;
  const r = g.ranges.find(x => x.element === el && (x.min != null || x.max != null));
  if (r) return { kind: "range", min: r.min, max: r.max };
  if (g.rest === el) return { kind: "rest" };
  const imp = (g.impurities as Record<string, number | undefined>)[el];
  if (imp != null) return { kind: "impurity", max: imp };
  return null;
}

export function normCellText(c: NormCell | null): string {
  if (!c) return "—";
  if (c.kind === "rest") return "Остальное";
  if (c.kind === "impurity") return `не более ${fmtNorm(c.max)}`;
  if (c.min != null && c.max != null) return `${fmtNorm(c.min)} – ${fmtNorm(c.max)}`;
  if (c.min != null) return `не менее ${fmtNorm(c.min)}`;
  return `не более ${fmtNorm(c.max!)}`;
}

// Примеси марки, не выводимые колонками таблицы: «Fe 0,10 · Sb 0,002 · всего 0,11»
export function impuritiesText(g: AlloyGrade | undefined, shown: string[], label: (el: string) => string): string {
  const imp = Object.entries((g?.impurities ?? {}) as Record<string, number | undefined>)
    .filter(([k, v]) => v != null && !shown.includes(k));
  return imp
    .sort(([a], [b]) => (a === "total" ? 1 : b === "total" ? -1 : 0))
    .map(([k, v]) => `${k === "total" ? "всего" : label(k)} ${fmtNorm(v!)}`)
    .join(" · ");
}

// ── Приказ на плавку: несколько шихтовых карт ─────────────────────────────────
// Статус приказа по картам: есть карта на редактировании (или карт нет) — «На редактировании»;
// все выполнены — «Выполнена»; иначе — «Новая» (оформлен, доступен для выдачи на плавку).
export function prikazStatus(karty: Pick<ShihtovayaKarta, "status">[]): ShihtovayaKarta["status"] {
  if (karty.length === 0 || karty.some(k => k.status === "На редактировании")) return "На редактировании";
  if (karty.every(k => k.status === "Выполнена")) return "Выполнена";
  return "Новая";
}

// Итоговая строка шихтовых материалов приказа: одинаковые материалы всех карт суммируются
export interface ItogoMaterial extends ShihtaMaterial {
  // Номера плавок карт, в которые входит материал
  plavki: string[];
}

// Ключ суммирования: позиция склада — номенкл. №; лигатура Cu-P — содержание фосфора; медь МО — одна строка; прочее — наименование
const itogoKey = (m: ShihtaMaterial) => {
  const k = kindOf(m);
  return k === "sklad" ? `s:${m.nomenkl}` : k === "cup" ? `cup:${m.phosphorPct ?? 0}` : k === "medMO" ? "medMO" : `pr:${m.name}`;
};

export function itogoMaterials(karty: ShihtovayaKarta[]): ItogoMaterial[] {
  const out = new Map<string, ItogoMaterial>();
  for (const k of karty) {
    for (const m of k.materials) {
      const key = itogoKey(m);
      const cur = out.get(key);
      if (!cur) {
        out.set(key, { ...m, kind: kindOf(m), chem: { ...(m.chem ?? {}) }, plavki: [k.plavkaNo] });
        continue;
      }
      const chem: ChemComposition = { ...(cur.chem ?? {}) };
      for (const [e, v] of Object.entries(m.chem ?? {})) chem[e] = r2(numOf(chem[e]) + numOf(v)).toFixed(2);
      out.set(key, {
        ...cur, ves: r2(cur.ves + m.ves), qty: (cur.qty ?? 0) + (m.qty ?? 0) || undefined, chem,
        plavki: cur.plavki.includes(k.plavkaNo) ? cur.plavki : [...cur.plavki, k.plavkaNo],
      });
    }
  }
  // Порядок строк как в карте: лигатура, позиции склада, прочее, медь МО
  const order: Record<ShihtaMatKind, number> = { cup: 0, sklad: 1, prochee: 2, medMO: 3 };
  return [...out.values()].sort((a, b) => order[kindOf(a)] - order[kindOf(b)]);
}

// Строка расчёта по сохранённому материалу (доли элементов — по его составу)
export const lineOfMaterial = (m: ShihtaMaterial): ShihtaLine =>
  ({ kind: kindOf(m), mass: m.ves, share: shareOf(m.chem, m.ves), phosphorPct: m.phosphorPct, klass: m.klass });

// Марка приказа — общая для всех его карт (разные марки — сверка итога не выполняется)
export function prikazGrade(karty: ShihtovayaKarta[], grades: AlloyGrade[]): AlloyGrade | undefined {
  const ids = [...new Set(karty.map(k => k.alloyId).filter(Boolean))];
  return ids.length === 1 ? grades.find(g => g.id === ids[0]) : undefined;
}
