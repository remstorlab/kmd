import { useState } from "react";
import type { StorageLocation, VydachaDocPosition } from "../data/mock";
import { useApp } from "../store/AppContext";
import { Btn } from "./ui";
import { NO_LOC, formatLoc, parseLoc, seyfsOf, polkasOf } from "./DMPositionFormModal";

// ── Размещение на складе-получателе (Требование, Возврат СГП №2) ───────────────────────────────────
// В документ перемещения добавляются существующие позиции склада-отправителя со своим местом хранения. Новое место
// на складе-получателе задаётся в документе — по строке (колонка «Размещение на <получатель>») или сразу для всех
// позиций (панель над таблицей) — и хранится в позиции документа (toLocation). Склад и место хранения позиции
// меняются только при оформлении: до этого позиция лежит на складе-отправителе на прежнем месте, а удаление
// позиции из документа (или удаление неоформленного документа) её никак не затрагивает.

const isSet = (v: string | undefined) => !!v && v !== NO_LOC;

// Склад ведёт места хранения (в справочнике «Места хранения» есть доступные ячейки)
export const hasLocations = (locs: StorageLocation[], sklad: string) => seyfsOf(locs, sklad).length > 0;

// Место ещё существует и доступно в справочнике «Места хранения»
export const locationValid = (locs: StorageLocation[], sklad: string, loc: string | undefined) => {
  if (!isSet(loc)) return false;
  const { seyf, polka } = parseLoc(loc!);
  if (!seyfsOf(locs, sklad).includes(seyf)) return false;
  const polkas = polkasOf(locs, sklad, seyf);
  return polkas.length === 0 ? !isSet(polka) : polkas.includes(polka);
};

// Проверка перед оформлением: у каждой позиции задано доступное место на складе-получателе
export function receiverLocationError(locs: StorageLocation[], sklad: string, positions: VydachaDocPosition[]): string | null {
  if (!hasLocations(locs, sklad)) return null;
  const bad = positions.filter(p => !locationValid(locs, sklad, p.toLocation));
  return bad.length ? `Укажите размещение на складе «${sklad}» для позиций: ${bad.map(p => p.name).join(", ")}` : null;
}

// После перемещения (takeFromStock: id позиции документа → id записи на складе-получателе) записи получают место
// из документа; склад без мест хранения — без места («-»)
export function applyReceiverLocations<T extends { id: string; location: string }>(items: T[], taken: Map<string, string>, positions: VydachaDocPosition[]): T[] {
  const locByRecord = new Map<string, string>();
  for (const p of positions) {
    const to = taken.get(p.id);
    if (to) locByRecord.set(to, isSet(p.toLocation) ? p.toLocation! : NO_LOC);
  }
  return locByRecord.size ? items.map(i => (locByRecord.has(i.id) ? { ...i, location: locByRecord.get(i.id)! } : i)) : items;
}

const selCls = "px-2 py-1 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";

// Выбор сейфа и полки склада (ячейки справочника «Места хранения», только доступные)
function SeyfPolka({ sklad, value, onChange }: { sklad: string; value: string | undefined; onChange: (loc: string) => void }) {
  const { storageLocations: locs } = useApp();
  const cur = isSet(value) ? parseLoc(value!) : { seyf: NO_LOC, polka: NO_LOC };
  const seyfs = seyfsOf(locs, sklad);
  const polkas = isSet(cur.seyf) ? polkasOf(locs, sklad, cur.seyf) : [];
  const setSeyf = (s: string) => onChange(isSet(s) ? formatLoc(s, polkasOf(locs, sklad, s)[0] ?? NO_LOC) : NO_LOC);
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <select value={cur.seyf} onChange={e => setSeyf(e.target.value)} className={selCls} title="Сейф">
        <option value={NO_LOC}>Сейф —</option>
        {seyfs.map(s => <option key={s} value={s}>Сейф №{s}</option>)}
      </select>
      <select value={cur.polka} onChange={e => onChange(formatLoc(cur.seyf, e.target.value))} className={selCls} disabled={polkas.length === 0} title="Полка">
        <option value={NO_LOC}>Полка —</option>
        {polkas.map(p => <option key={p} value={p}>Полка {p}</option>)}
      </select>
    </div>
  );
}

// Ячейка таблицы позиций: выбор места (редактирование) или текст (просмотр / оформленный документ)
export function ReceiverLocationCell({ sklad, position, onChange, readOnly }: {
  sklad: string; position: VydachaDocPosition; onChange: (loc: string) => void; readOnly: boolean;
}) {
  const { storageLocations: locs } = useApp();
  if (!hasLocations(locs, sklad)) return <span className="text-gray-400">без места</span>;
  if (readOnly) return isSet(position.toLocation) ? <span>{position.toLocation}</span> : <span className="text-gray-400">—</span>;
  const invalid = isSet(position.toLocation) && !locationValid(locs, sklad, position.toLocation);
  return (
    <div>
      <SeyfPolka sklad={sklad} value={position.toLocation} onChange={onChange} />
      {invalid && <div className="text-[11px] text-red-600 mt-0.5">Место недоступно — выберите другое</div>}
    </div>
  );
}

// Панель «Разместить все позиции»: одно место для всех позиций документа
export function ReceiverLocationBar({ sklad, onApply }: { sklad: string; onApply: (loc: string) => void }) {
  const { storageLocations: locs } = useApp();
  const [loc, setLoc] = useState<string>(NO_LOC);
  if (!hasLocations(locs, sklad)) {
    return <div className="mb-3 text-xs text-gray-500">На складе «{sklad}» места хранения не ведутся — позиции размещаются без места.</div>;
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span>Разместить все позиции на складе «{sklad}»:</span>
      <SeyfPolka sklad={sklad} value={loc} onChange={setLoc} />
      <Btn size="sm" variant="secondary" disabled={!isSet(loc)} onClick={() => onApply(loc)}>Применить ко всем</Btn>
      <span className="text-gray-400">Место по позиции можно изменить в колонке «Размещение на {sklad}». Позиции перемещаются при оформлении.</span>
    </div>
  );
}
