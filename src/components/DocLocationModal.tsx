import { useState, type ReactNode } from "react";
import type { VydachaDocPosition } from "../data/mock";
import { useApp } from "../store/AppContext";
import { Btn, Modal, Field, Input, Select, KlassCode, useMaterialCodeLabel, probaText } from "./ui";
import { NO_LOC, formatLoc, parseLoc, seyfsOf, polkasOf } from "./DMPositionFormModal";

// ── Новое размещение позиции в документе перемещения (Требование, Возврат СГП №2) ───────────────────
// В документ добавляется существующая позиция склада-отправителя со своим местом хранения («Текущее размещение»).
// «Новое размещение» — место на складе-получателе: по умолчанию такое же, как текущее (сейф / полка), меняется в окне
// «Изменение места хранения» по карандашу позиции и хранится в документе (toLocation). На складе место меняется
// только при перемещении позиции; удаление позиции из документа текущее место не меняет.

// Новое место позиции: заданное в документе или (по умолчанию) текущее
export const newLocOf = (p: Pick<VydachaDocPosition, "location" | "toLocation">) => p.toLocation ?? p.location ?? NO_LOC;

// Записи, перемещённые на склад-получатель (takeFromStock: id позиции документа → id записи), получают новое место
export function applyNewLocations<T extends { id: string; location: string }>(items: T[], taken: Map<string, string>, positions: VydachaDocPosition[]): T[] {
  const loc = new Map<string, string>();
  for (const p of positions) { const to = taken.get(p.id); if (to) loc.set(to, newLocOf(p)); }
  return loc.size ? items.map(i => (loc.has(i.id) ? { ...i, location: loc.get(i.id)! } : i)) : items;
}

// Ячейка «… размещение»: склад и место
export function LocText({ sklad, location }: { sklad: string; location: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-gray-400">{sklad}</span>
      <span className="text-gray-700"> · {location && location !== NO_LOC ? location : "без места"}</span>
    </span>
  );
}

// Окно «Изменение места хранения» позиции документа: текущее размещение (только просмотр) и новое — сейф и полка
// из справочника «Места хранения» склада-получателя (доступные ячейки)
export default function DocLocationModal({ position, fromSklad, toSklad, onClose, onSave, onEditQty }: {
  position: VydachaDocPosition;
  fromSklad: string;
  toSklad: string;
  onClose: () => void;
  onSave: (toLocation: string) => void;
  // Изменить количество / вес позиции (окно подбора) — для позиций, добавленных вручную
  onEditQty?: () => void;
}) {
  const { storageLocations: locs } = useApp();
  const codeLabel = useMaterialCodeLabel();
  const cur = parseLoc(position.location ?? "");
  const init = parseLoc(newLocOf(position));
  const seyfs = seyfsOf(locs, toSklad);
  // Значение не из справочника (напр. по умолчанию — сейф склада-отправителя, которого нет у получателя) остаётся в списке
  const seyfOptions = [NO_LOC, ...(init.seyf !== NO_LOC && !seyfs.includes(init.seyf) ? [init.seyf] : []), ...seyfs];
  const [seyf, setSeyf] = useState(init.seyf);
  const polkasFor = (s: string) => { const list = polkasOf(locs, toSklad, s); return [NO_LOC, ...(s === init.seyf && init.polka !== NO_LOC && !list.includes(init.polka) ? [init.polka] : []), ...list]; };
  const [polka, setPolka] = useState(init.polka);
  const changeSeyf = (s: string) => { setSeyf(s); setPolka(polkasOf(locs, toSklad, s)[0] ?? NO_LOC); };
  const next = formatLoc(seyf, polka);
  const unknown = seyf !== NO_LOC && (!seyfs.includes(seyf) || (polka !== NO_LOC && !polkasOf(locs, toSklad, seyf).includes(polka)));

  const attrs: [string, ReactNode][] = [
    ["Номенкл. №", position.nomenkl],
    ["Наименование", position.name],
    ["Класс", <KlassCode value={position.klass} />],
    ["Код материала", codeLabel(position.code)],
    ["Проба", probaText(position.proba)],
    ["Количество", position.issue],
  ];

  return (
    <Modal
      title="Изменение места хранения"
      onClose={onClose}
      footer={<>
        {onEditQty && <div className="mr-auto"><Btn variant="secondary" onClick={onEditQty}>Изменить количество и вес</Btn></div>}
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => onSave(next)}>Сохранить</Btn>
      </>}
    >
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
        {attrs.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-medium text-gray-900 truncate">{value}</div>
          </div>
        ))}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Текущее размещение</h4>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Склад"><Input value={fromSklad} disabled /></Field>
        <Field label="Сейф"><Input value={cur.seyf} disabled /></Field>
        <Field label="Полка"><Input value={cur.polka} disabled /></Field>
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Новое размещение</h4>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Склад"><Input value={toSklad} disabled /></Field>
        <Field label="Сейф"><Select value={seyf} options={seyfOptions} onChange={changeSeyf} /></Field>
        <Field label="Полка"><Select value={polka} options={polkasFor(seyf)} onChange={setPolka} disabled={seyf === NO_LOC} /></Field>
      </div>
      {unknown && <div className="mt-2 text-xs text-orange-600">Такого места нет среди доступных мест хранения склада «{toSklad}» — проверьте сейф и полку</div>}
      <p className="mt-3 text-xs text-gray-500">Место хранения позиции меняется при перемещении по документу. Если позицию удалить из документа, её текущее размещение не изменится.</p>
    </Modal>
  );
}
