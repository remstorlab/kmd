import React, { useState } from "react";
import { Badge, Btn, Modal, Field, Input, Select, KlassSelect, KlassCode, SearchInput, SortTh, useSort, useMaterialCodeLabel, probaText, NetAuAg, NET_AU_AG, usePaged, FillerRows,
  OborotValue, oborotRowCls, OBOROT_LABEL,
} from "./ui";
import { VydachaDocPosition } from "../data/mock";
import { useApp } from "../store/AppContext";

// ── Подбор позиций со склада (чекбокс + количество по каждой позиции) ─────────
// Общий для выдачи со склада (ГП/ДМ) и шихтовых карт.

// Позиция склада в едином виде (из учёта ГП или ДМ)
export type StockRow = Omit<VydachaDocPosition, "issue"> & { status?: string };

// Добавлять можно только позиции в этом статусе (остальные видны при смене фильтра, но не выбираются)
const STOCK_STATUS = "На складе";
const ALL_STATUSES = "Все статусы";

const ALL_KLASS = "Все классы";
const ALL_CODES = "Все коды";
const ALL_LOCS = "Все места хранения";

export default function StockPickerModal({
  title,
  rows,
  already = {},
  showWeights = false,
  probaPct = false,
  withStatus = false,
  excludeKlass,
  qtyLabel = "Количество к выдаче",
  qtyInput = true,
  emptyText = "Нет доступных позиций на складе",
  addLabel = "Добавить",
  toolbar,
  skladFilter,
  onClose,
  onAdd,
}: {
  title: string;
  rows: StockRow[];
  // Сколько уже взято из каждой позиции (id → кол-во) — вычитается из доступного
  already?: Record<string, number>;
  // Показывать пробу и массы (для ДМ)
  showWeights?: boolean;
  // Проба — фактическая, в % с 2 знаками; чистый вес — по ней (r.net); для шихтовых карт
  probaPct?: boolean;
  // Классы, которые не предлагаются в фильтре (позиции этих классов не передаются в rows)
  excludeKlass?: string[];
  // Столбец и фильтр «Статус» (значения — справочник «Статусы позиций»), по умолчанию — «На складе»
  withStatus?: boolean;
  qtyLabel?: string;
  // false — без ввода количества: позиция берётся целиком (весь доступный остаток).
  // Функция — ввод количества только для подходящих позиций.
  qtyInput?: boolean | ((r: StockRow) => boolean);
  emptyText?: string;
  addLabel?: string;
  // Дополнительные поля над фильтрами (например, выбор склада)
  toolbar?: React.ReactNode;
  // Показывать только позиции этого склада; отмеченные позиции других складов сохраняются и тоже добавляются
  skladFilter?: string;
  onClose: () => void;
  onAdd: (picked: { row: StockRow; qty: number }[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [code, setCode] = useState(ALL_CODES);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [onlySelected, setOnlySelected] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});
  const { statusDicts } = useApp();
  const statusOptions = [ALL_STATUSES, ...(statusDicts.find(d => d.group === "pozicii")?.items.map(i => i.name).filter(n => n !== "Закрыта") ?? [STOCK_STATUS])];
  const [status, setStatus] = useState(STOCK_STATUS);
  // Выбрать можно только позицию на складе
  const selectable = (r: StockRow) => !withStatus || !r.status || r.status === STOCK_STATUS;

  const left = (r: StockRow) => r.qty - (already[r.id] ?? 0);
  const hasInput = (r: StockRow) => (typeof qtyInput === "function" ? qtyInput(r) : qtyInput);
  // Без ввода количества позиция доступна, пока её не взяли (количество изделий может быть не указано)
  const available = rows.filter(r => (hasInput(r) ? left(r) > 0 : !(r.id in already)));
  const anyInput = available.some(hasInput);
  const codeLabel = useMaterialCodeLabel();
  const codes = [ALL_CODES, ...Array.from(new Set(available.map(r => r.code))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(available.map(r => r.location))).sort()];

  const filtered = available.filter(r => {
    const q = search.trim().toLowerCase();
    return (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || r.klass === klass)
      && (code === ALL_CODES || r.code === code)
      && (loc === ALL_LOCS || r.location === loc)
      && (!skladFilter || onlySelected || r.sklad === skladFilter)
      && (!onlySelected || r.id in selectedQty)
      && (!withStatus || onlySelected || status === ALL_STATUSES || r.status === status);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    nomenkl: r => r.nomenkl,
    name: r => r.name,
    klass: r => r.klass,
    code: r => codeLabel(r.code),
    proba: r => r.proba ?? 0,
    lig: r => r.lig ?? 0,
    net: r => r.net ?? 0,
    oborot: r => r.oborot ?? 0,
    location: r => r.location,
    qty: r => left(r),
  });

  const selectedCount = Object.keys(selectedQty).length;
  const allChecked = filtered.some(selectable) && filtered.filter(selectable).every(r => r.id in selectedQty);

  // При отметке позиции подставляется всё доступное количество — его можно уменьшить
  const initQty = (r: StockRow) => String(left(r));
  const toggle = (r: StockRow) => setSelectedQty(prev => {
    const next = { ...prev };
    if (r.id in next) delete next[r.id]; else next[r.id] = initQty(r);
    return next;
  });
  const toggleAll = () => setSelectedQty(prev => {
    const next = { ...prev };
    if (allChecked) filtered.forEach(r => delete next[r.id]);
    else filtered.filter(selectable).forEach(r => { if (!(r.id in next)) next[r.id] = initQty(r); });
    return next;
  });
  const setQty = (id: string, v: string) => setSelectedQty(prev => (id in prev ? { ...prev, [id]: v.replace(/[^\d]/g, "") } : prev));

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setCode(ALL_CODES); setLoc(ALL_LOCS); setOnlySelected(false); setStatus(STOCK_STATUS); };

  const add = () => {
    const picked = available
      .filter(r => r.id in selectedQty)
      .map(r => ({ row: r, qty: hasInput(r) ? Math.max(1, Math.min(parseInt(selectedQty[r.id], 10) || left(r), left(r))) : left(r) }));
    if (picked.length) onAdd(picked);
  };

  const pg11 = usePaged(sorted, "stock-picker");
  return (
    <Modal
      title={title}
      onClose={onClose}
      largeWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0}>{addLabel}{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
      </>}
    >
      {toolbar && <div className="mb-3">{toolbar}</div>}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} exclude={excludeKlass} /></Field>
        <Field label="Код материала"><Select value={code} options={codes} onChange={setCode} optionLabel={v => (v === ALL_CODES ? v : codeLabel(v))} /></Field>
        <div className={withStatus ? "" : "col-span-2"}>
          <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
        </div>
        {withStatus && <Field label="Статус"><Select value={status} options={statusOptions} onChange={setStatus} /></Field>}
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Только выбранные
        </label>
        <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Найдено: {filtered.length} из {skladFilter && !onlySelected ? available.filter(r => r.sklad === skladFilter).length : available.length}</span>
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
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">{probaPct ? "Проба, %" : "Проба"}</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{probaPct ? "Чистый вес, г" : NET_AU_AG}</SortTh>
                <SortTh sortKey="oborot" sort={sort} onSort={toggleSort} className="px-3 py-2">{OBOROT_LABEL}</SortTh>
              </>}
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              {withStatus && <th className="px-3 py-2 text-left">Статус</th>}
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество</SortTh>
              {anyInput && <th className="px-3 py-2 text-left w-28">{qtyLabel}</th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg11.pageItems.map(r => {
                const checked = r.id in selectedQty;
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : oborotRowCls(r.oborot)}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(r)} disabled={!selectable(r)} title={selectable(r) ? undefined : `Позиция в статусе «${r.status}» — добавить нельзя`} className="w-4 h-4 accent-blue-600 disabled:opacity-30" /></td>
                    <td className="px-3 py-2 text-gray-500">{r.nomenkl}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
                    <td className="px-3 py-2 text-blue-600">{codeLabel(r.code)}</td>
                    {showWeights && <>
                      <td className="px-3 py-2">{probaPct && r.proba ? (r.proba / 10).toFixed(2).replace(".", ",") : probaText(r.proba)}</td>
                      <td className="px-3 py-2">{r.lig}</td>
                      <td className="px-3 py-2">{probaPct ? (r.net != null ? r.net.toFixed(2).replace(".", ",") : "—") : <NetAuAg chem={r.chem} />}</td>
                      <td className="px-3 py-2"><OborotValue value={r.oborot} /></td>
                    </>}
                    <td className="px-3 py-2 text-gray-500">{r.location}</td>
                    {withStatus && <td className="px-3 py-2">{r.status ? <Badge label={r.status} group="pozicii" /> : "—"}</td>}
                    <td className="px-3 py-2 text-gray-500">{left(r) || "—"}</td>
                    {anyInput && <td className="px-3 py-2">{hasInput(r) ? <Input value={selectedQty[r.id] ?? String(left(r))} onChange={v => setQty(r.id, v)} placeholder={String(left(r))} disabled={!checked} /> : <span className="text-xs text-gray-400">целиком</span>}</td>}
                  </tr>
                );
              })}
              <FillerRows count={pg11.fill} cols={12} />
            </tbody>
          </table>
          {pg11.pager}
        </div>
      )}
    </Modal>
  );
}
