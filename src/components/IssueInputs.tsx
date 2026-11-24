import React from "react";
import { IssueLine, IssuePos } from "../data/stock";
import type { IssueDraft, PickedRow, StockRow } from "./StockPickerModal";

// ── Частичная выдача: ячейки таблиц позиций (только чтение) ──────────────────
// Используются в документах «Выдача со склада», «Требование», «Возврат СГП №2» и в «Движении материала».
// Количество и вес вводятся в окне подбора (StockPickerModal, панель «К выдаче»); расчёт — IssueLine (data/stock.ts).

const fmt2 = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2));

// Номенкл. №: при частичной выдаче — номер выдаваемой части, под ним серым — номер исходной записи
export function NomenklCell({ nomenkl, partNomenkl }: { nomenkl: string; partNomenkl?: string }) {
  if (!partNomenkl) return <>{nomenkl}</>;
  return (
    <div>
      <div className="text-gray-700">{partNomenkl}</div>
      <div className="text-[11px] text-gray-400 whitespace-nowrap">из № {nomenkl}</div>
    </div>
  );
}

// Лиг. вес выдаваемой части: вес части и (при частичной выдаче) рассчитанный остаток на складе.
// Драгоценные камни — без веса («—»)
export function IssueLigCell({ line }: { line: IssueLine }) {
  if (line.stone) return <>—</>;
  if (!line.needsLig) return <>{fmt2(line.issuedLig)}</>;
  const rest = line.restLig;
  return (
    <div>
      {fmt2(line.issuedLig)}
      <div className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
        остаток на складе: {rest == null ? "—" : `${rest.toFixed(2)} г`}
      </div>
    </div>
  );
}

// ── Хук для таблиц позиций документов ────────────────────────────────────────
// Позиции документа хранят полный вес позиции (lig, net), выдаваемое количество / вес (issue, issueLig)
// и номер выдаваемой части (partNomenkl).

type DocIssuePos = IssuePos & { id: string; name: string; net: number | null; partNomenkl?: string };

export function useIssuePositions<P extends DocIssuePos>(
  positions: P[],
  setPositions: React.Dispatch<React.SetStateAction<P[]>>,
) {
  const line = (p: P) => IssueLine.of(p);

  const badQty = positions.filter(p => !line(p).qtyOk);
  const badLig = positions.filter(p => !line(p).ligOk);
  // Итоги: вес драгоценных камней не входит (issuedLig = null)
  const totals = positions.reduce(
    (t, p) => {
      const l = line(p);
      return { qty: t.qty + p.issue, lig: t.lig + (l.issuedLig ?? 0), net: t.net + (l.part(p.net) ?? 0) };
    },
    { qty: 0, lig: 0, net: 0 },
  );
  // Проверка перед сохранением: количество — всегда, выданный вес — при оформлении
  const validate = (oformit: boolean, qtyWord = "к выдаче"): string | null => {
    if (badQty.length) return `Укажите количество ${qtyWord}: ${badQty.map(p => p.name).join(", ")}`;
    if (oformit && badLig.length) return `Укажите лигатурный вес выдаваемой части (больше 0 и меньше веса позиции): ${badLig.map(p => p.name).join(", ")}`;
    return null;
  };

  // Номера частей позиций документа (кроме позиции exceptId) — заняты для подбора
  const partNomenkls = (exceptId?: string) => positions.filter(p => p.id !== exceptId).map(p => p.partNomenkl).filter((n): n is string => !!n);
  // Поля карточки «К выдаче» для редактирования позиции
  const draftOf = (p: P): IssueDraft => ({ issue: p.issue, issueLig: p.issueLig, partNomenkl: p.partNomenkl, toLocation: (p as { toLocation?: string }).toLocation });
  // Строки окна подбора: остатки склада; редактируемая позиция — по своему снимку (количество и вес всей
  // позиции склада на момент подбора), даже если запись уже перемещена прошлым сохранением документа
  const pickerRows = (stock: StockRow[], editPos: P | null): StockRow[] => {
    if (!editPos) return stock;
    const { issue: _i, issueLig: _l, partNomenkl: _n, toLocation: _t, ...snap } = editPos as P & { toLocation?: string };
    const cur = stock.find(r => r.id === editPos.id);
    return [...stock.filter(r => r.id !== editPos.id), { ...cur, ...(snap as unknown as StockRow) }];
  };
  // Результат подбора: новые позиции добавляются, выбранные повторно (редактирование) — заменяют выдачу
  const applyPicked = (picked: PickedRow[], toPos: (r: StockRow) => P) => setPositions(prev => {
    const next = [...prev];
    for (const { row, qty, issueLig, partNomenkl, toLocation } of picked) {
      // Новое размещение (Требование, Возврат СГП №2) — только если окно подбора его задавало
      const fields = { issue: qty, issueLig, partNomenkl, ...(toLocation !== undefined ? { toLocation } : {}) } as Partial<P>;
      const idx = next.findIndex(p => p.id === row.id);
      if (idx >= 0) next[idx] = { ...next[idx], ...fields };
      else next.push({ ...toPos(row), ...fields });
    }
    return next;
  });

  // Ячейки строки таблицы (только чтение)
  const qtyCell = (p: P) => <>{p.issue || "—"}</>;
  const ligCell = (p: P) => <IssueLigCell line={line(p)} />;
  const nomenklCell = (p: P & { nomenkl: string }) => <NomenklCell nomenkl={p.nomenkl} partNomenkl={line(p).partial ? p.partNomenkl : undefined} />;

  return { line, totals, validate, qtyCell, ligCell, nomenklCell, partNomenkls, draftOf, applyPicked, pickerRows };
}

// Номенкл. № части при оформлении: если номер уже занят — следующий свободный.
// Возвращает позиции с итоговыми номерами и список замен (для уведомления)
export function ensurePartNomenkl<P extends { partNomenkl?: string; name: string }>(
  positions: P[],
  used: Set<string>,
  next: (used: string[]) => string,
): { positions: P[]; changed: string[] } {
  const taken = new Set(used);
  const changed: string[] = [];
  const out = positions.map(p => {
    if (!p.partNomenkl) return p;
    if (!taken.has(p.partNomenkl)) { taken.add(p.partNomenkl); return p; }
    const n = next([...taken]);
    taken.add(n);
    changed.push(`${p.name}: № ${p.partNomenkl} занят — назначен № ${n}`);
    return { ...p, partNomenkl: n };
  });
  return { positions: out, changed };
}

// Предупреждение перед оформлением: в документе есть позиции из резерва — шихтовые карты, которые их резервируют,
// вернутся в «На редактировании» (markIssuedElsewhere, data/shihta.ts)
export function RezervWarning({ karty, className = "mb-4" }: { karty: { name: string }[]; className?: string }) {
  if (karty.length === 0) return null;
  return (
    <div className={`${className} bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800`}>
      ⚠ В выдаче есть позиции из резерва. После оформления шихтовая карта {karty.map(k => `«${k.name}»`).join(", ")} вернётся в статус «На редактировании» и станет недоступна для плавки.
    </div>
  );
}
