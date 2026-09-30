import React, { useState } from "react";
import { Btn, Modal, Field, Input, Select, KlassSelect, KlassCode, SearchInput, SortTh, useSort } from "./ui";
import { VydachaDocPosition } from "../data/mock";

// ── Подбор позиций со склада (чекбокс + количество по каждой позиции) ─────────
// Общий для выдачи со склада (ГП/ДМ) и шихтовых карт.

// Позиция склада в едином виде (из учёта ГП или ДМ)
export type StockRow = Omit<VydachaDocPosition, "issue">;

const ALL_KLASS = "Все классы";
const ALL_CODES = "Все коды";
const ALL_LOCS = "Все места хранения";

export default function StockPickerModal({
  title,
  rows,
  already = {},
  showWeights = false,
  qtyLabel = "Кол-во к выдаче",
  emptyText = "Нет доступных позиций на складе",
  addLabel = "Добавить",
  onClose,
  onAdd,
}: {
  title: string;
  rows: StockRow[];
  // Сколько уже взято из каждой позиции (id → кол-во) — вычитается из доступного
  already?: Record<string, number>;
  // Показывать пробу и массы (для ДМ)
  showWeights?: boolean;
  qtyLabel?: string;
  emptyText?: string;
  addLabel?: string;
  onClose: () => void;
  onAdd: (picked: { row: StockRow; qty: number }[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [code, setCode] = useState(ALL_CODES);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [onlySelected, setOnlySelected] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});

  const left = (r: StockRow) => r.qty - (already[r.id] ?? 0);
  const available = rows.filter(r => left(r) > 0);
  const codes = [ALL_CODES, ...Array.from(new Set(available.map(r => r.code))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(available.map(r => r.location))).sort()];

  const filtered = available.filter(r => {
    const q = search.trim().toLowerCase();
    return (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || r.klass === klass)
      && (code === ALL_CODES || r.code === code)
      && (loc === ALL_LOCS || r.location === loc)
      && (!onlySelected || r.id in selectedQty);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    nomenkl: r => r.nomenkl,
    name: r => r.name,
    klass: r => r.klass,
    code: r => r.code,
    proba: r => r.proba ?? 0,
    lig: r => r.lig ?? 0,
    net: r => r.net ?? 0,
    location: r => r.location,
    qty: r => left(r),
  });

  const selectedCount = Object.keys(selectedQty).length;
  const allChecked = filtered.length > 0 && filtered.every(r => r.id in selectedQty);

  const toggle = (id: string) => setSelectedQty(prev => {
    const next = { ...prev };
    if (id in next) delete next[id]; else next[id] = "1";
    return next;
  });
  const toggleAll = () => setSelectedQty(prev => {
    const next = { ...prev };
    if (allChecked) filtered.forEach(r => delete next[r.id]);
    else filtered.forEach(r => { if (!(r.id in next)) next[r.id] = "1"; });
    return next;
  });
  const setQty = (id: string, v: string) => setSelectedQty(prev => (id in prev ? { ...prev, [id]: v.replace(/[^\d]/g, "") } : prev));

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setCode(ALL_CODES); setLoc(ALL_LOCS); setOnlySelected(false); };

  const add = () => {
    const picked = available
      .filter(r => r.id in selectedQty)
      .map(r => ({ row: r, qty: Math.max(1, Math.min(parseInt(selectedQty[r.id], 10) || 1, left(r))) }));
    if (picked.length) onAdd(picked);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      extraWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0}>{addLabel}{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
      </>}
    >
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
        <Field label="Код материала"><Select value={code} options={codes} onChange={setCode} /></Field>
        <div className="col-span-2">
          <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Только выбранные
        </label>
        <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Найдено: {filtered.length} из {available.length}</span>
        <span>Выбрано: {selectedCount}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          {available.length === 0 ? emptyText : "Нет позиций по заданным фильтрам"}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код</SortTh>
              {showWeights && <>
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Лигат. г</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый г</SortTh>
              </>}
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">Доступно</SortTh>
              <th className="px-3 py-2 text-left w-28">{qtyLabel}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(r => {
                const checked = r.id in selectedQty;
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 text-gray-500">{r.nomenkl}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
                    <td className="px-3 py-2 text-blue-600">{r.code}</td>
                    {showWeights && <>
                      <td className="px-3 py-2">{r.proba}</td>
                      <td className="px-3 py-2">{r.lig}</td>
                      <td className="px-3 py-2">{r.net}</td>
                    </>}
                    <td className="px-3 py-2 text-gray-500">{r.location}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{left(r)} {r.unit}</td>
                    <td className="px-3 py-2"><Input value={selectedQty[r.id] ?? ""} onChange={v => setQty(r.id, v)} placeholder="1" disabled={!checked} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
