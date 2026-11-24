import type { VydachaDocPosition } from "../data/mock";
import { NO_LOC } from "./DMPositionFormModal";

// ── Новое размещение позиции в документе перемещения (Требование, Возврат СГП №2) ───────────────────
// В документ добавляется существующая позиция склада-отправителя со своим местом хранения («Текущее размещение»).
// «Новое размещение» — место на складе-получателе: по умолчанию такое же, как текущее (сейф / полка); задаётся
// в окне подбора (панель справа, StockPickerModal issue.toSklad) — при добавлении и по карандашу позиции — и хранится
// в документе (toLocation). На складе место меняется только при перемещении позиции; удаление позиции из документа
// текущее место не меняет.

// Новое место позиции: заданное в документе или (по умолчанию) текущее
export const newLocOf = (p: Pick<VydachaDocPosition, "location" | "toLocation">) => p.toLocation ?? p.location ?? NO_LOC;

// Записи, перемещённые на склад-получатель (takeFromStock: id позиции документа → id записи), получают новое место
export function applyNewLocations<T extends { id: string; location: string }>(items: T[], taken: Map<string, string>, positions: VydachaDocPosition[]): T[] {
  const loc = new Map<string, string>();
  for (const p of positions) { const to = taken.get(p.id); if (to) loc.set(to, newLocOf(p)); }
  return loc.size ? items.map(i => (loc.has(i.id) ? { ...i, location: loc.get(i.id)! } : i)) : items;
}

// Ячейка «Текущее / Новое размещение»: склад и место (только просмотр)
export function LocText({ sklad, location }: { sklad: string; location: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-gray-400">{sklad}</span>
      <span className="text-gray-700"> · {location && location !== NO_LOC ? location : "без места"}</span>
    </span>
  );
}
