import { ChemComposition } from "./mock";

// ── Учёт остатков: частичная выдача / резерв и возврат ─────────────────────────
// Запись склада (позиция ДМ или ГП) идентифицируется своим id. Номенклатурный № — номер партии (лота):
// он сохраняется у всех частей, на которые делится запись.
//
// Частичная выдача (резерв) q из qty:
//   • исходная запись остаётся на месте — тот же id, место хранения и статус, количество qty − q,
//     массы и хим. состав — остаток;
//   • выделенная часть — новая запись (новый id, parentId = id исходной) с количеством q и
//     пропорциональными массами и хим. составом; к ней применяется новый статус (выдача, резерв).
// Документы и операции ссылаются на конкретную запись по id (srcId), а не по номенкл. №.
// Возврат выделенной части (отмена выдачи / снятие резерва) объединяет её обратно с исходной записью,
// если та ещё на складе; иначе часть возвращается на склад отдельной записью.
//
// Позиция без количества изделий (qty = 0) или выдаваемая полностью не делится — меняется сама запись.

export interface StockRecord {
  id: string;
  qty: number;
  ligWeight?: number;
  netWeight?: number;
  chem?: ChemComposition;
  parentId?: string;
  status: string;
  // Склад записи: возвращаемая часть объединяется с исходной записью только на том же складе
  sklad?: string;
  location: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const num = (v: string | undefined) => parseFloat(String(v ?? "").replace(",", "."));

// Хим. состав части k (0..1) и остатка — так, чтобы сумма частей совпадала с исходным составом
function splitChem(chem: ChemComposition | undefined, k: number): [ChemComposition | undefined, ChemComposition | undefined] {
  if (!chem) return [undefined, undefined];
  const part: ChemComposition = {};
  const rest: ChemComposition = {};
  for (const [el, v] of Object.entries(chem)) {
    const n = num(v);
    if (!Number.isFinite(n)) { part[el] = v; rest[el] = v; continue; }
    const p = round2(n * k);
    part[el] = p.toFixed(2);
    rest[el] = round2(n - p).toFixed(2);
  }
  return [part, rest];
}

const addChem = (a: ChemComposition | undefined, b: ChemComposition | undefined): ChemComposition | undefined => {
  if (!a && !b) return undefined;
  const out: ChemComposition = { ...a };
  for (const [el, v] of Object.entries(b ?? {})) {
    const x = num(out[el]);
    const y = num(v);
    out[el] = Number.isFinite(x) && Number.isFinite(y) ? round2(x + y).toFixed(2) : out[el] ?? v;
  }
  return out;
};

// Можно ли выдать из записи часть (есть количество изделий и берётся меньше него)
export const isPartial = (it: { qty: number }, q: number) => it.qty > 0 && q > 0 && q < it.qty;

// Делит запись: [остаток с прежним id, выделенная часть с новым id].
// partLig — лигатурный вес выделенной части (= вес записи − введённый вес остатка на складе): если задан,
// массы и хим. состав делятся по весу, иначе — пропорционально количеству.
export function splitRecord<T extends StockRecord>(it: T, q: number, newId: string, partLig?: number): [T, T] {
  const byWeight = partLig != null && it.ligWeight != null && it.ligWeight > 0 && partLig > 0 && partLig < it.ligWeight;
  const k = byWeight ? partLig! / it.ligWeight! : q / it.qty;
  const lig = it.ligWeight == null ? undefined : byWeight ? round2(partLig!) : round2(it.ligWeight * k);
  const net = it.netWeight == null ? undefined : round2(it.netWeight * k);
  const [chemPart, chemRest] = splitChem(it.chem, k);
  const rest = {
    ...it, qty: it.qty - q,
    ...(lig != null ? { ligWeight: round2(it.ligWeight! - lig) } : {}),
    ...(net != null ? { netWeight: round2(it.netWeight! - net) } : {}),
    ...(chemRest ? { chem: chemRest } : {}),
  };
  const part = {
    ...it, id: newId, parentId: it.id, qty: q,
    ...(lig != null ? { ligWeight: lig } : {}),
    ...(net != null ? { netWeight: net } : {}),
    ...(chemPart ? { chem: chemPart } : {}),
  };
  return [rest, part];
}

// Выдача (резерв) из записей: take — id записи → количество. Полностью взятая запись меняется через apply,
// при частичной — выделяется новая запись. Возвращает новый список и id записей, в которые ушла выдача.
export function takeFromStock<T extends StockRecord>(
  items: T[],
  take: Map<string, number>,
  apply: (it: T) => T,
  newId: (it: T) => string,
  // id записи → лигатурный вес выделяемой части (частичная выдача с введённым весом остатка)
  partLig?: Map<string, number>,
): { items: T[]; taken: Map<string, string> } {
  const taken = new Map<string, string>();
  const out = items.flatMap(it => {
    const q = take.get(it.id);
    if (q === undefined) return [it];
    if (!isPartial(it, q)) {
      taken.set(it.id, it.id);
      return [apply(it)];
    }
    const [rest, part] = splitRecord(it, q, newId(it), partLig?.get(it.id));
    taken.set(it.id, part.id);
    return [rest, apply(part)];
  });
  return { items: out, taken };
}

// ── Частичная выдача позиции документа (выдача, требование, возврат СГП №2) ──
// Позиция выдаётся частично, если выдаётся меньше изделий, чем есть. Тогда вводится лигатурный вес,
// остающийся на складе; выдаваемая часть = вес позиции − остаток, чистый вес и хим. состав — в той же доле.
export interface IssuePos { qty: number; issue: number; lig: number | null; restLig?: string }
export const isPartialIssue = (p: IssuePos) => p.qty > 0 && p.issue > 0 && p.issue < p.qty;
export const restLigOf = (p: IssuePos) => num(p.restLig);
// Введённый остаток корректен: больше 0 и меньше веса позиции
export const restLigOk = (p: IssuePos) => {
  const r = restLigOf(p);
  return Number.isFinite(r) && r > 0 && p.lig != null && r < p.lig;
};
// Доля выдаваемой части позиции (0..1): по введённому весу остатка, без него — по количеству
export const issueShare = (p: IssuePos) =>
  !isPartialIssue(p) ? 1 : restLigOk(p) ? (p.lig! - restLigOf(p)) / p.lig! : p.issue / p.qty;
// Лигатурный вес выдаваемых частей для takeFromStock: id записи → вес
export const partLigMap = <P extends IssuePos & { id: string }>(ps: P[]) =>
  new Map(ps.filter(p => isPartialIssue(p) && restLigOk(p)).map(p => [p.id, round2(p.lig! - restLigOf(p))]));

// Возврат записей на склад: часть объединяется с исходной записью (parentId), если та на складе
// со статусом stockStatus; иначе запись получает статус stockStatus (и место хранения, если задано).
export function returnToStock<T extends StockRecord>(items: T[], ids: Set<string>, stockStatus: T["status"], location?: (it: T) => string): T[] {
  let out = [...items];
  for (const id of ids) {
    const part = out.find(i => i.id === id);
    if (!part) continue;
    const parent = part.parentId ? out.find(i => i.id === part.parentId && i.status === stockStatus && i.sklad === part.sklad) : undefined;
    if (parent) {
      const merged = {
        ...parent,
        qty: parent.qty + part.qty,
        ...(parent.ligWeight != null || part.ligWeight != null ? { ligWeight: round2((parent.ligWeight ?? 0) + (part.ligWeight ?? 0)) } : {}),
        ...(parent.netWeight != null || part.netWeight != null ? { netWeight: round2((parent.netWeight ?? 0) + (part.netWeight ?? 0)) } : {}),
        chem: addChem(parent.chem, part.chem),
      };
      out = out.filter(i => i.id !== id).map(i => (i.id === parent.id ? merged : i));
    } else {
      out = out.map(i => (i.id === id ? { ...i, status: stockStatus, ...(location ? { location: location(i) } : {}) } : i));
    }
  }
  return out;
}
