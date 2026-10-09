import React, { useState, useRef } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, PrintIcon, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, KlassSelect, KlassCode, SearchInput, Tabs, Textarea, MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, MaterialCodeSelect, parseRuDate,
} from "../components/ui";
import { Operation, OperPosition, OperStage, ShihtovayaKarta, ChemComposition, isGPKlass, spravValues, DOC_TYPE_LKI, initialMaterialClasses } from "../data/mock";
import { Eye, Plus, Paperclip } from "lucide-react";
import { useScreen, useTabParam } from "../router";
import ChemCompositionBlock from "../components/ChemCompositionBlock";
import DMPositionViewModal, { DMPositionView } from "../components/DMPositionViewModal";
import DMPositionFormModal, { PrihodPosition, emptyPosition, locOf } from "../components/DMPositionFormModal";

// ── Списание разницы modal ────────────────────────────────────────────────────

function SpisanieModal({ delta, onClose, onConfirm }: { delta: number; onClose: () => void; onConfirm: () => void }) {
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal title="Списание разницы" onClose={onClose} footer={
      <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <button
          onClick={files.length > 0 && reason ? onConfirm : undefined}
          disabled={files.length === 0 || !reason}
          className="px-4 py-2 rounded-lg border border-red-500 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Списать разницу
        </button>
      </>
    }>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4 text-sm">
        <span className="text-yellow-600">⚠</span>
        <span className="text-yellow-800 font-medium">Превышение допустимой дельты: {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(2)} г</span>
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Причина списания</label>
        <Textarea value={reason} onChange={setReason} placeholder="Укажите причину списания разницы весов…" rows={4} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Акт списания (обязательно)</label>
        {files.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files?.length) setFiles(Array.from(e.target.files)); }} />
            <Paperclip className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Прикрепите файл акта списания<br /><span className="text-xs text-gray-400">PDF, DOCX — до 10 МБ</span></p>
          </div>
        ) : (
          <MultiFileUpload files={files} onChange={setFiles} />
        )}
      </div>
    </Modal>
  );
}

// ── Добавить позицию ДМ со склада ─────────────────────────────────────────────



const ALL_KLASS = "Все классы";
const ALL_METALS = "Все металлы";
const ALL_LOCS = "Все места хранения";
const ALL_STATUSES = "Все статусы";

function AddDMPositionModal({ already = {}, onClose, onAdd }: {
  // Сколько уже добавлено в выдачу по номенклатуре — вычитается из остатка на складе
  already?: Record<string, number>;
  onClose: () => void;
  onAdd: (rows: Omit<OperPosition, "n">[]) => void;
}) {
  const { dmItems, shihtovyeKarty } = useApp();
  // id → введённое количество к выдаче; наличие ключа = позиция выбрана
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [metal, setMetal] = useState(ALL_METALS);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [status, setStatus] = useState(ALL_STATUSES);
  const [onlySelected, setOnlySelected] = useState(false);

  type Item = (typeof dmItems)[number];
  const left = (i: Item) => i.qty - (already[i.nomenkl] ?? 0);
  // Позиции в резерве тоже можно выдать — тогда шихтовая карта, которая их резервирует, вернётся в «Редактирование».
  const availableItems = dmItems.filter(i => !isGPKlass(i.klass) && (i.status === "На складе" || i.status === "Резерв") && left(i) > 0);
  const reservedBy = (nomenkl: string) => shihtovyeKarty.find(k => k.status !== "Выполнена" && k.materials.some(m => m.nomenkl === nomenkl));
  const affectedKarty = [...new Set(
    availableItems.filter(i => i.id in selectedQty && i.status === "Резерв").map(i => reservedBy(i.nomenkl)?.name).filter(Boolean),
  )];

  const codeLabel = useMaterialCodeLabel();
  const metals = [ALL_METALS, ...Array.from(new Set(availableItems.map(i => i.metal))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(availableItems.map(i => i.location))).sort()];

  const filtered = availableItems.filter(i => {
    const q = search.trim().toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || i.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || i.klass === klass)
      && (metal === ALL_METALS || i.metal === metal)
      && (loc === ALL_LOCS || i.location === loc)
      && (status === ALL_STATUSES || i.status === status)
      && (!onlySelected || i.id in selectedQty);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: i => i.name,
    nomenkl: i => i.nomenkl,
    klass: i => i.klass,
    proba: i => i.proba,
    netWeight: i => i.netWeight,
    location: i => i.location,
    qty: i => left(i),
  });

  const selectedCount = Object.keys(selectedQty).length;
  const allChecked = filtered.length > 0 && filtered.every(i => i.id in selectedQty);

  const toggle = (id: string) => setSelectedQty(prev => {
    const next = { ...prev };
    if (id in next) delete next[id]; else next[id] = "1";
    return next;
  });
  const toggleAll = () => setSelectedQty(prev => {
    const next = { ...prev };
    if (allChecked) filtered.forEach(i => delete next[i.id]);
    else filtered.forEach(i => { if (!(i.id in next)) next[i.id] = "1"; });
    return next;
  });
  const setQty = (id: string, v: string) => setSelectedQty(prev => (id in prev ? { ...prev, [id]: v.replace(/[^\d]/g, "") } : prev));
  const qtyOf = (i: Item) => parseInt(selectedQty[i.id], 10) || 0;
  const badQty = (i: Item) => i.id in selectedQty && (qtyOf(i) < 1 || qtyOf(i) > left(i));
  const hasBadQty = availableItems.some(badQty);

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setMetal(ALL_METALS); setLoc(ALL_LOCS); setStatus(ALL_STATUSES); setOnlySelected(false); };

  const add = () => {
    const chosen = availableItems.filter(i => i.id in selectedQty);
    if (chosen.length === 0 || hasBadQty) return;
    onAdd(chosen.map(i => {
      const qty = qtyOf(i);
      // При частичной выдаче вес пропорционален количеству
      const k = i.qty > 0 ? qty / i.qty : 1;
      const ves = +(i.netWeight * k).toFixed(2);
      const lig = +(i.ligWeight * k).toFixed(2);
      return { name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, qty, ves, ag: i.chem?.ag || "-", cu: i.chem?.cu || "-", chem: i.chem, loc: i.location, metal: i.metal, lig, net: ves };
    }));
  };

  return (
    <Modal
      title="Добавить позицию ДМ со склада"
      onClose={onClose}
      extraWide
      footer={<>
        {hasBadQty && <span className="mr-auto self-center text-xs text-red-600">Количество к выдаче должно быть от 1 до остатка на складе</span>}
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0 || hasBadQty}>Добавить{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
      </>}
    >
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
        <Field label="Код материала"><Select value={metal} options={metals} onChange={setMetal} optionLabel={v => (v === ALL_METALS ? v : codeLabel(v))} /></Field>
        <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
        <Field label="Статус"><Select value={status} options={[ALL_STATUSES, "На складе", "Резерв"]} onChange={setStatus} /></Field>
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Только выбранные
        </label>
        <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Найдено: {filtered.length} из {availableItems.length}</span>
        <span>Выбрано: {selectedCount}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          {availableItems.length === 0 ? "Нет доступных позиций на складе ДМ" : "Нет позиций по заданным фильтрам"}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый вес г</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <th className="px-3 py-2 text-left">Статус</th>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">На складе</SortTh>
              <th className="px-3 py-2 text-left w-28">Кол-во к выдаче</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(i => {
                const checked = i.id in selectedQty;
                const karta = i.status === "Резерв" ? reservedBy(i.nomenkl) : undefined;
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(i.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 font-medium">{i.name}</td>
                    <td className="px-3 py-2 text-gray-500">{i.nomenkl}</td>
                    <td className="px-3 py-2"><KlassCode value={i.klass} /></td>
                    <td className="px-3 py-2">{i.proba}</td>
                    <td className="px-3 py-2">{i.netWeight}</td>
                    <td className="px-3 py-2 text-gray-500">{i.location}</td>
                    <td className="px-3 py-2">
                      <Badge label={i.status} group="pozicii" />
                      {karta && <div className="text-xs text-gray-400 mt-0.5" title={karta.name}>ШК {karta.plavkaNo}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{left(i)} шт</td>
                    <td className="px-3 py-2">
                      <div className={badQty(i) ? "rounded-lg ring-1 ring-red-400" : ""}>
                        <Input value={selectedQty[i.id] ?? ""} onChange={v => setQty(i.id, v)} placeholder="1" disabled={!checked} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {affectedKarty.length > 0 && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
          ⚠ Выбраны позиции из резерва. После выдачи шихтовая карта {affectedKarty.map(n => `«${n}»`).join(", ")} вернётся в статус «Редактирование» и станет недоступна для плавки.
        </div>
      )}
    </Modal>
  );
}

// ── Добавить позицию возврата (из выдачи или новую) ───────────────────────────

const DM_SKLAD = spravValues("Склады")[0] ?? "";

function VozvratPickModal({ vydacha, reservedNomenkl, view, onClose, onAdd }: {
  vydacha: OperPosition[];
  // Номенклатурные номера позиций операции — новая позиция получает следующий свободный
  reservedNomenkl: string[];
  // Позиция операции в виде позиции склада ДМ (код материала, веса, статус)
  view: (p: OperPosition) => DMPositionView;
  onClose: () => void;
  onAdd: (rows: Omit<OperPosition, "n">[]) => void;
}) {
  const { storageLocations } = useApp();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewing, setViewing] = useState<OperPosition | null>(null);
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [metal, setMetal] = useState(ALL_METALS);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [onlySelected, setOnlySelected] = useState(false);
  const screen = useScreen();
  const showAddNew = screen.has("new-position");
  const setShowAddNew = (open: boolean) => (open ? screen.open("new-position") : screen.close("new-position"));

  const codeLabel = useMaterialCodeLabel();
  const metals = [ALL_METALS, ...Array.from(new Set(vydacha.map(p => view(p).metal).filter(Boolean))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(vydacha.map(p => p.loc))).sort()];

  const filtered = vydacha.filter(p => {
    const q = search.trim().toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || p.klass === klass)
      && (metal === ALL_METALS || view(p).metal === metal)
      && (loc === ALL_LOCS || p.loc === loc)
      && (!onlySelected || selected.has(p.n));
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    qty: p => p.qty ?? 0,
    klass: p => p.klass,
    metal: p => codeLabel(view(p).metal),
    proba: p => p.proba,
    lig: p => view(p).ligWeight ?? 0,
    net: p => view(p).netWeight ?? 0,
    loc: p => p.loc,
    status: p => view(p).status ?? "",
  });

  const allChecked = filtered.length > 0 && filtered.every(p => selected.has(p.n));
  const toggle = (n: number) => setSelected(prev => {
    const s = new Set(prev);
    s.has(n) ? s.delete(n) : s.add(n);
    return s;
  });
  const toggleAll = () => setSelected(prev => {
    const s = new Set(prev);
    if (allChecked) filtered.forEach(p => s.delete(p.n));
    else filtered.forEach(p => s.add(p.n));
    return s;
  });

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setMetal(ALL_METALS); setLoc(ALL_LOCS); setOnlySelected(false); };

  const addSelected = () => {
    const chosen = vydacha.filter(p => selected.has(p.n));
    if (chosen.length === 0) return;
    onAdd(chosen.map(({ n, ...rest }) => rest));
  };

  // Новая позиция — та же форма, что при приёме на склад ДМ
  const addNew = (p: PrihodPosition) => {
    const lig = num(p.lig);
    const net = num(p.net);
    onAdd([{
      name: p.name,
      nomenkl: p.nomenkl,
      klass: p.klass,
      proba: num(p.proba),
      qty: parseInt(p.kol, 10) || 1,
      ves: net || lig,
      lig,
      net,
      metal: p.code,
      ag: p.chem.ag || "-",
      cu: p.chem.cu || "-",
      chem: p.chem,
      loc: locOf(p),
    }]);
    setShowAddNew(false);
  };

  const th = "px-3 py-2";
  const dash = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v);

  return (
    <Modal
      title="Добавить позицию возврата"
      onClose={onClose}
      extraWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={addSelected} disabled={selected.size === 0}>Добавить{selected.size > 0 ? ` (${selected.size})` : ""}</Btn>
      </>}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции из выдачи</h3>
        <Btn size="sm" onClick={() => setShowAddNew(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
        <Field label="Код материала"><Select value={metal} options={metals} onChange={setMetal} optionLabel={v => (v === ALL_METALS ? v : codeLabel(v))} /></Field>
        <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Только выбранные
        </label>
        <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Найдено: {filtered.length} из {vydacha.length}</span>
        <span>Выбрано: {selected.size}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          {vydacha.length === 0 ? "В выдаче пока нет позиций" : "Нет позиций по заданным фильтрам"}
        </div>
      ) : (
        <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
              <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Лигат. вес г</SortTh>
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>Чистый вес г</SortTh>
              <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
              <th className="w-10"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(p => {
                const v = view(p);
                const checked = selected.has(p.n);
                return (
                  <tr key={p.n} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(p.n)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">{p.qty ?? "—"}</td>
                    <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                    <td className="px-3 py-2 text-blue-600 font-medium">{v.metal ? codeLabel(v.metal) : "—"}</td>
                    <td className="px-3 py-2">{p.proba}</td>
                    <td className="px-3 py-2">{dash(v.ligWeight)}</td>
                    <td className="px-3 py-2">{dash(v.netWeight)}</td>
                    <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                    <td className="px-3 py-2">{v.status ? <Badge label={v.status} group="pozicii" /> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-3 py-2"><EyeIcon onClick={() => setViewing(p)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <DMPositionViewModal item={view(viewing)} onClose={() => setViewing(null)} />}
      {showAddNew && (
        <DMPositionFormModal
          mode="add"
          sklad={DM_SKLAD}
          initial={emptyPosition(storageLocations, DM_SKLAD, "Слиток", "1000")}
          reservedNomenkl={reservedNomenkl}
          onClose={() => setShowAddNew(false)}
          onSave={addNew}
        />
      )}
    </Modal>
  );
}

// ── Выдача по шихтовой карте ──────────────────────────────────────────────────

function ShihtaPickModal({ onClose, onPick }: { onClose: () => void; onPick: (k: ShihtovayaKarta) => void }) {
  const { shihtovyeKarty } = useApp();
  const available = shihtovyeKarty.filter(k => k.status === "Новая");

  return (
    <Modal title="Выдача по шихтовой карте" onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Отмена</Btn>}>
      {available.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          Нет шихтовых карт в статусе «Новая»
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {available.map(k => (
            <button
              key={k.id}
              onClick={() => onPick(k)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{k.name}</div>
                <div className="text-xs text-gray-400">{k.plavkaNo} · {k.date}</div>
              </div>
              <Badge label={k.status} group="shihta" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Списание потерь ───────────────────────────────────────────────────────────

// name — технологическая операция из справочника «Технологические операции»
type LossRow = { id: string; date: string; name: string; ves: string };

const docAccept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff";

const num = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
const fmt = (v: number) => v.toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 9);
// Дата строки потерь хранится в ISO (yyyy-mm-dd) для <input type="date">, показывается в формате ru-RU.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isoToRu = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const newLoss = (): LossRow => ({ id: uid(), date: todayIso(), name: "", ves: "" });

// Документы списания демо-операции «Производство ГП»
const seedSpisanieFiles = () => [new File([], "Служебная_записка_потери_18082026.pdf"), new File([], "Акт_списания_18082026.pdf")];
const seedGpLosses: LossRow[] = [
  { id: "l1", date: "2026-08-18", name: "Прокат, отжиг, травление", ves: "0.35" },
  { id: "l2", date: "2026-08-18", name: "Вырубка и обрубка", ves: "0.80" },
  { id: "l3", date: "2026-08-18", name: "Чеканка", ves: "0.60" },
  { id: "l4", date: "2026-08-18", name: "Полирование", ves: "0.15" },
];

const sumLosses = (losses: LossRow[], pred: (l: LossRow) => boolean = () => true) =>
  losses.filter(pred).reduce((a, l) => a + num(l.ves), 0);

function LossTable({ losses, readOnly, onChange }: {
  losses: LossRow[];
  readOnly: boolean;
  onChange: (rows: LossRow[]) => void;
}) {
  const upd = (id: string, patch: Partial<LossRow>) => onChange(losses.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const techOps = spravValues("Технологические операции");
  // Пустой вариант — «не выбрано»; значение не из справочника (устаревшее) сохраняется в списке
  const opOptions = (v: string) => ["", ...(v && !techOps.includes(v) ? [v] : []), ...techOps];
  return (
    <>
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="px-3 py-2 text-left w-10">№</th>
          <th className="px-3 py-2 text-left w-44">Дата</th>
          <th className="px-3 py-2 text-left">Наименование потерь</th>
          <th className="px-3 py-2 text-left w-32">Вес потерь, г</th>
          {!readOnly && <th className="w-10"></th>}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {losses.map((l, i) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-1.5">
                <input
                  type="date"
                  value={l.date}
                  onChange={e => upd(l.id, { date: e.target.value })}
                  disabled={readOnly}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </td>
              <td className="px-3 py-1.5">
                <Select value={l.name} options={opOptions(l.name)} onChange={v => upd(l.id, { name: v })} optionLabel={v => v || "Выберите операцию"} disabled={readOnly} />
              </td>
              <td className="px-3 py-1.5"><Input value={l.ves} onChange={v => upd(l.id, { ves: v })} placeholder="0.00" disabled={readOnly} /></td>
              {!readOnly && <td className="px-2 py-1.5"><DeleteIcon onClick={() => onChange(losses.filter(x => x.id !== l.id))} /></td>}
            </tr>
          ))}
          {losses.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-400">Потери не указаны</td></tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <button
          onClick={() => onChange([...losses, newLoss()])}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />Добавить потерю
        </button>
      )}
    </>
  );
}

function SpisanieDocBlock({ files, setFiles, readOnly }: {
  files: File[];
  setFiles: (f: File[]) => void;
  readOnly: boolean;
}) {
  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Документы списания</span>
        <span className="text-xs text-gray-400">Общие документы по списанию потерь</span>
      </div>
      <div className="p-4">
        <MultiFileUpload files={files} onChange={setFiles} accept={docAccept} disabled={readOnly} />
      </div>
    </div>
  );
}

function SpisanieTab({ losses, setLosses, files, setFiles, vesStart, readOnly }: {
  losses: LossRow[];
  setLosses: React.Dispatch<React.SetStateAction<LossRow[]>>;
  files: File[];
  setFiles: (f: File[]) => void;
  vesStart: number;
  readOnly: boolean;
}) {
  const total = sumLosses(losses);
  const vesInWork = vesStart - total;

  return (
    <>
      {/* Сводка */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Выдано в работу", value: vesStart },
          { label: "Списано всего", value: total },
          { label: "Остаток в работе", value: vesInWork },
        ].map(c => (
          <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="text-base font-semibold text-gray-900">{fmt(c.value)} г</div>
          </div>
        ))}
      </div>

      <LossTable losses={losses} readOnly={readOnly} onChange={rows => setLosses(rows)} />

      <SpisanieDocBlock files={files} setFiles={setFiles} readOnly={readOnly} />
    </>
  );
}

// ── Таблица позиций операции: те же столбцы и порядок, что на складе ДМ ───────

function OperPositionsTable({ rows, view, readOnly, onView, onDelete }: {
  rows: OperPosition[];
  view: (p: OperPosition) => DMPositionView;
  readOnly: boolean;
  onView: (p: OperPosition) => void;
  onDelete: (p: OperPosition) => void;
}) {
  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(rows, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    qty: p => p.qty ?? 0,
    klass: p => p.klass,
    metal: p => codeLabel(view(p).metal),
    proba: p => p.proba,
    lig: p => view(p).ligWeight ?? 0,
    net: p => view(p).netWeight ?? 0,
    loc: p => p.loc,
    status: p => view(p).status ?? "",
  });
  const th = "px-3 py-2";
  const dash = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
          <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
          <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
          <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество</SortTh>
          <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
          <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
          <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
          <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Лигат. вес г</SortTh>
          <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>Чистый вес г</SortTh>
          <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
          <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
          <th className={readOnly ? "w-10" : "w-20"}></th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(p => {
            const v = view(p);
            return (
              <tr key={p.n} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.qty ?? "—"}</td>
                <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                <td className="px-3 py-2 text-blue-600 font-medium">{v.metal ? codeLabel(v.metal) : "—"}</td>
                <td className="px-3 py-2">{p.proba}</td>
                <td className="px-3 py-2">{dash(v.ligWeight)}</td>
                <td className="px-3 py-2">{dash(v.netWeight)}</td>
                <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                <td className="px-3 py-2">{v.status ? <Badge label={v.status} group="pozicii" /> : <span className="text-gray-400">—</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => onView(p)} />
                    {!readOnly && <DeleteIcon onClick={() => onDelete(p)} />}
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-gray-400">Позиции не добавлены</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Operation modal ───────────────────────────────────────────────────────────

type TabName = "Выдача" | "Возврат" | "Списание" | "Итого";

const vydachaPositions: OperPosition[] = [
  { n: 1, name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", proba: 999, qty: 1, ves: 500.25, ag: "-", cu: "-", loc: "Сейф №1, Полка А", metal: "1000", lig: 500.25, net: 499.75, chem: { au: "499.75" } },
  { n: 2, name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", proba: 585, qty: 1, ves: 45.80, ag: "0.12", cu: "1.20", loc: "Сейф №2, Полка А", metal: "1000", lig: 45.80, net: 26.79, chem: { au: "26.79", ag: "0.12", cu: "1.20" } },
];
const vozvratPositions: OperPosition[] = [
  { n: 1, name: "Подкат 30х20", nomenkl: "DM-R01", klass: "Подкат", proba: 999, qty: 1, ves: 480.10, ag: "-", cu: "-", loc: "Сейф №1, Полка Б", metal: "1000", lig: 480.10, net: 479.62, chem: { au: "479.62" } },
  { n: 2, name: "Королёк №1", nomenkl: "DM-R02", klass: "Королёк", proba: 999, qty: 1, ves: 55.60, ag: "-", cu: "-", loc: "Сейф №2, Полка Б", metal: "1000", lig: 55.60, net: 55.54, chem: { au: "55.54" } },
  { n: 3, name: "Шлак золотосодержащий", nomenkl: "DM-R03", klass: "Отходы", proba: 500, qty: 1, ves: 8.00, ag: "0.05", cu: "2.10", loc: "Сейф №3, Полка А", metal: "1000", lig: 8.00, net: 4.00, chem: { au: "4.00", ag: "0.05", cu: "2.10" } },
];

const VID_LKI = "Анализ в ЛКИ";

// Операция оформлена — выдача проведена («Выдано») или операция закрыта («Завершено»). Только такие можно печатать.
const isOformlena = (o: Operation) => o.stage === "Выдано" || o.stage === "Завершено";

// Номер документа — сквозной целочисленный счётчик по всем операциям.
const nextDocNo = (ops: Operation[]) =>
  String(ops.reduce((m, o) => Math.max(m, parseInt(o.document, 10) || 0), 0) + 1);

// Позиции операции; для демо-операций без сохранённых позиций — те же образцы, что показывает форма.
const opVydacha = (o: Operation) => o.vydachaPos ?? vydachaPositions;
const opVozvrat = (o: Operation) => o.vozvratPos ?? (o.stage === "Завершено" || o.stage === "Возврат: На редактировании" ? vozvratPositions : []);

// Значение из справочника плюс текущее значение операции, если его уже нет среди активных.
const withCurrent = (opts: string[], v: string) => (v && !opts.includes(v) ? [v, ...opts] : opts);

// ── Печатная форма операции (PDF через диалог печати браузера) ────────────────

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function posTable(title: string, rows: OperPosition[]) {
  const total = rows.reduce((a, p) => a + p.ves, 0);
  const body = rows.length
    ? rows.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${esc(p.nomenkl)}</td><td>${esc(p.klass)}</td><td class="r">${esc(p.proba)}</td><td class="r">${fmt(p.ves)}</td><td>${esc(p.loc)}</td></tr>`).join("")
    : `<tr><td colspan="7" class="empty">Нет позиций</td></tr>`;
  return `<h2>${title}</h2>
    <table><thead><tr><th>№</th><th>Наименование</th><th>Номенкл. №</th><th>Класс</th><th>Проба</th><th>Вес, г</th><th>Размещение</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="5">Итого</td><td class="r">${fmt(total)}</td><td></td></tr></tfoot></table>`;
}

// Печатная форма зависит от типа документа операции
function printOperation(o: Operation, spisano = 0) {
  const docType = o.docType ?? (o.vid === VID_LKI ? DOC_TYPE_LKI : undefined);
  printHtml(
    docType === DOC_TYPE_MSL ? mslHtml(o, spisano)
      : docType === DOC_TYPE_LKI ? lkiNakladnayaHtml(o)
      : operationHtml(o, spisano),
  );
}

// Общая форма — для остальных типов документов
function operationHtml(o: Operation, spisano: number) {
  const vyd = opVydacha(o);
  const voz = opVozvrat(o);
  const vesVyd = vyd.reduce((a, p) => a + p.ves, 0);
  const vesVoz = voz.reduce((a, p) => a + p.ves, 0);
  const delta = vesVoz + spisano - vesVyd;
  const head: [string, string | undefined][] = [
    ["Тип операции", o.type],
    ["Вид операции", o.vid],
    ["Тип документа", o.docType],
    ["Дата операции", o.date],
    ["Заказчик", o.zakazchik],
    ["Подотчётное лицо", o.responsible],
    ...(o.vid === "Плавка" ? [["Номер плавки", o.plavkaNo] as [string, string | undefined]] : []),
    ["Статус", o.stage],
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Операция_${esc(o.document)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
    h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
    .sub { text-align: center; color: #555; margin-bottom: 14px; }
    h2 { font-size: 12px; margin: 16px 0 6px; text-transform: uppercase; }
    .head { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
    .head div span { color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
    th { background: #f0f0f0; }
    tfoot td { font-weight: bold; }
    .r { text-align: right; }
    .empty { text-align: center; color: #777; }
    .sum { margin-top: 12px; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; }
    .sign div { border-top: 1px solid #111; padding-top: 4px; }
  </style></head><body>
  <h1>Операция движения материала № ${esc(o.document)}</h1>
  <div class="sub">от ${esc(o.date)}</div>
  <div class="head">${head.map(([k, v]) => `<div><span>${k}:</span> ${esc(v || "—")}</div>`).join("")}</div>
  ${posTable("Выдача", vyd)}
  ${voz.length ? posTable("Возврат", voz) : ""}
  <div class="sum">Выдано: <b>${fmt(vesVyd)} г</b> · Возвращено: <b>${fmt(vesVoz)} г</b>${spisano ? ` · Списано: <b>${fmt(spisano)} г</b>` : ""}${voz.length ? ` · Дельта: <b>${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))} г</b>` : ""}</div>
  <div class="sign">
    <div>Выдал: ${esc(o.vydal || "")}</div>
    <div>Получил: ${esc(o.poluchil || o.responsible)}</div>
  </div>
  </body></html>`;
  return html;
}

// ── Бланки по образцам бумажных форм ──────────────────────────────────────────

const DOC_TYPE_MSL = "Маршрутный лист";
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
// «19.08.2026» → { d: "19", m: "августа", y: "2026" }
const dateParts = (ru: string) => {
  const [d, m, y] = ru.split(".");
  return { d: String(parseInt(d, 10) || ""), m: MONTHS_GEN[parseInt(m, 10) - 1] ?? "", y: y ?? "" };
};
const metalOf = (name: string) =>
  /золот/i.test(name) ? "Зл" : /серебр/i.test(name) ? "Ср" : /платин/i.test(name) ? "Пл" : /паллад/i.test(name) ? "Пд" : "";
const klassCode = (klass: string) => initialMaterialClasses.find(c => c.name === klass)?.code ?? klass;
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
const fmt3 = (v: number) => v.toFixed(3);
// Подчёркнутое поле бланка с вписанным значением
const fld = (value: unknown, cls = "") => `<span class="f ${cls}">${esc(value) || "&nbsp;"}</span>`;

const blankCss = `
  body { font-family: "Times New Roman", Times, serif; font-size: 12px; color: #000; margin: 0; }
  .row { display: flex; align-items: flex-end; gap: 6px; margin: 7px 0; white-space: nowrap; }
  .f { flex: 1; border-bottom: 1px solid #000; padding: 0 6px; text-align: center; min-height: 15px; font-family: Arial, sans-serif; font-size: 11px; color: #123; white-space: normal; }
  .w0 { flex: 0 0 auto; min-width: 60px; }
  .gap { flex: 0 0 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: middle; }
  th { font-weight: normal; text-align: center; }
  td { font-family: Arial, sans-serif; font-size: 10.5px; height: 22px; }
  .c { text-align: center; } .r { text-align: right; }
  .diag { position: relative; padding: 0; height: 64px; background: linear-gradient(to bottom right, transparent calc(50% - 0.5px), #000 50%, transparent calc(50% + 0.5px)); }
  .diag .tl { position: absolute; top: 3px; left: 4px; text-align: left; font-size: 10px; }
  .diag .br { position: absolute; bottom: 3px; right: 4px; text-align: right; font-size: 10px; }
  .stamp { position: absolute; top: 0; right: 0; text-align: center; font-size: 12px; line-height: 1.25; }
  .stamp .box { border: 1px solid #000; padding: 0 6px; }
  .sign { display: flex; gap: 48px; margin-top: 28px; }
  .sign .row { flex: 1; }
`;

// Маршрутно-сопроводительный лист (Форма М-1, СМК-4.16-27)
function mslHtml(o: Operation, spisano: number) {
  const vyd = opVydacha(o);
  const voz = opVozvrat(o);
  const { d, m, y } = dateParts(o.date);
  const vesDo = vyd.reduce((a, p) => a + p.ves, 0);
  const vesPosle = voz.reduce((a, p) => a + p.ves, 0);
  const qtyDo = vyd.reduce((a, p) => a + (p.qty ?? 1), 0);
  const qtyPosle = voz.reduce((a, p) => a + (p.qty ?? 1), 0);
  const poteri = spisano || (voz.length ? vesDo - vesPosle : 0);
  const probas = uniq(vyd.map(p => String(p.proba)));
  const marka = uniq(vyd.map(p => `${metalOf(p.name)} ${p.proba}`.trim())).join(", ");
  const slitki = vyd.filter(p => /слит/i.test(p.klass)).map(p => p.nomenkl).join(", ");
  const izdelie = uniq(voz.filter(p => isGPKlass(p.klass)).map(p => p.name)).join(", ");
  const zagotovki = uniq(vyd.map(p => p.klass.toLowerCase())).join(", ");
  const litsevik = o.poluchil || o.responsible;
  // Разбивка результата операции по классам: «Пдк 480.10», «Отх 8.00» …
  const razbivka = voz.map(p => `${esc(klassCode(p.klass))} ${fmt(p.ves)}`).join("<br>");
  // Пустые строки для следующих операций — заполняются вручную
  const blankRows = Array.from({ length: 6 }, () => `<tr>${"<td></td>".repeat(11)}<td colspan="3"></td></tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>МСЛ_${esc(o.document)}</title>
  <style>@page { size: A4 landscape; margin: 10mm; } ${blankCss}</style></head><body style="position: relative">
  <div class="stamp">Форма М-1<br><span class="box">СМК-4.16-27</span><br>Лист №1</div>
  <div class="row" style="margin-top: 34px; padding-right: 130px">
    <b>Маршрутно-сопроводительный лист №</b>${fld(o.document)}
    <span>от</span>${fld(`${d} ${m}`)}<span>${fld(y, "w0")} г</span>
  </div>
  <div class="row" style="padding-right: 130px">Наименование изделия${fld(izdelie)}<span class="gap"></span>Наименование заготовок изделия${fld(zagotovki)}</div>
  <div class="row">Марка материала, проба${fld(marka)}<span class="gap"></span>Слиток №${fld(slitki)}</div>
  <div class="row">№ пробы при пробоотборе${fld("")}<span class="gap"></span>фактическое содержание${fld(probas.map(p => `${(parseFloat(p) / 10).toFixed(2)}%`).join(", "))}<span class="gap"></span>Накладная №${fld("")}</div>
  <div class="row">Ф.И.О. лицевика${fld(litsevik)}<span class="gap"></span>Журнал №${fld("")}<span class="gap"></span>Стр.№${fld("")}</div>
  <div class="row">Ф.И.О. лицевика${fld("")}<span class="gap"></span>Журнал №${fld("")}<span class="gap"></span>Стр.№${fld("")}</div>
  <div class="row">Примечание${fld(o.vid)}</div>

  <table style="margin-top: 8px">
    <tr><th style="width: 22%">Толщина полосы</th><th>Описание дефектов</th><th style="width: 15%">Заключение о соответствии НТД</th><th style="width: 12%">Штамп БТК</th></tr>
    <tr><td style="height: 56px"></td><td></td><td></td><td></td></tr>
  </table>
  <div class="row">Решение технолога участка о материале (при наличии отклонений от требований НТД)${fld("")}</div>
  <div class="row">${fld("")}</div>

  <table style="margin-top: 6px">
    <thead><tr>
      <th style="width: 6%">Дата</th>
      <th style="width: 11%">Наименование операции</th>
      <th style="width: 8%">Вес до операции (кол-во)</th>
      <th style="width: 8%">Вес после операции (кол-во)</th>
      <th style="width: 9%">Пласт, стр, пфл, н/п, п/ф, отх., ост.</th>
      <th style="width: 6%">Потери</th>
      <th style="width: 10%">Исполнитель</th>
      <th style="width: 9%">Примечание</th>
      <th class="diag" style="width: 7%"><span class="tl">Кол-во изделий</span><span class="br">Кол-во предъявл.</span></th>
      <th class="diag" style="width: 7%"><span class="tl">Кол-во годных</span><span class="br">Кол-во принятых</span></th>
      <th style="width: 6%">Кол-во не-соотв.</th>
      <th style="width: 7%" colspan="3">Штамп БТК, роспись</th>
    </tr></thead>
    <tbody>
      <tr>
        <td class="c">${esc(o.date)}</td>
        <td>${esc(o.vid)}</td>
        <td class="r">${fmt(vesDo)}<br>(${qtyDo} шт)</td>
        <td class="r">${voz.length ? `${fmt(vesPosle)}<br>(${qtyPosle} шт)` : ""}</td>
        <td>${razbivka}</td>
        <td class="r">${poteri > 0 ? fmt(poteri) : "—"}</td>
        <td>${esc(o.responsible)}</td>
        <td>${esc(slitki)}</td>
        <td class="c">${qtyDo}</td>
        <td class="c">${voz.length ? qtyPosle : ""}</td>
        <td></td>
        <td colspan="3"></td>
      </tr>
      ${blankRows}
    </tbody>
  </table>
  </body></html>`;
}

// Накладная (Форма №2) на передачу проб в ЛКИ
function lkiNakladnayaHtml(o: Operation) {
  const vyd = opVydacha(o);
  const { d, m, y } = dateParts(o.date);
  const rows = vyd.map(p => {
    const vesMet = (p.ves * p.proba) / 1000;
    return `<tr>
      <td>${esc(p.name)}</td><td class="c">г</td><td class="c">${esc(p.nomenkl)}</td><td class="c">${p.qty ?? 1}</td><td class="c">—</td>
      <td class="r">${fmt(p.ves)}</td><td class="r">${(p.proba / 10).toFixed(2)}</td><td class="r">${fmt3(vesMet)}</td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`;
  }).join("");
  // Пустые строки — бланк заполняется в лаборатории
  const blank = Array.from({ length: Math.max(4, 14 - vyd.length) }, () => `<tr>${"<td></td>".repeat(15)}</tr>`).join("");
  const netto = vyd.reduce((a, p) => a + p.ves, 0);
  const met = vyd.reduce((a, p) => a + (p.ves * p.proba) / 1000, 0);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Накладная_ЛКИ_${esc(o.document)}</title>
  <style>@page { size: A4 landscape; margin: 10mm; } ${blankCss}
    .title { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
    .forma { position: absolute; right: 0; top: 0; font-size: 14px; }
    .sub th { font-size: 10px; }
  </style></head><body style="position: relative">
  <div class="forma">Форма №2</div>
  <div class="row" style="margin-top: 24px; max-width: 78%">
    <span class="title">НАКЛАДНАЯ №</span>${fld(o.document)}
    <span class="gap"></span>«${fld(d, "w0")}»${fld(m)}${fld(y, "w0")} г
  </div>
  <div class="row" style="max-width: 78%; padding-left: 18%">Склад №${fld("ДМ")}<span class="gap"></span>Цех №${fld("")}<span class="gap"></span>Заказ №${fld("")}</div>
  <div class="title" style="margin: 18px 0 8px">В ЛКИ</div>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width: 20%">Шифр готовой продукции</th>
        <th colspan="7">К сдаче на склад</th>
        <th colspan="4">Принято на склад</th>
        <th colspan="3">Тара</th>
      </tr>
      <tr class="sub">
        <th>ед.изм.</th><th>№ пробы</th><th>кол-во мест</th><th>вес брутто</th><th>вес нетто</th><th>% содерж.</th><th>вес. мет.</th>
        <th>кол-во мест</th><th>брутто</th><th>нетто</th><th>чист.</th>
        <th>кол-во</th><th>цена</th><th>№ номенкл.</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${blank}
      <tr><td class="r"><b>Итого</b></td><td></td><td></td><td></td><td></td><td class="r"><b>${fmt(netto)}</b></td><td></td><td class="r"><b>${fmt3(met)}</b></td>${"<td></td>".repeat(7)}</tr>
    </tbody>
  </table>

  <div class="sign">
    <div class="row">Сдал${fld(o.vydal || "")}</div>
    <div class="row">Принял (ЛКИ)${fld("")}</div>
  </div>
  </body></html>`;
}

function printHtml(html: string) {
  // Скрытый iframe вместо нового окна — не блокируется браузером; «Сохранить как PDF» в диалоге печати.
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow!;
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => { win.focus(); win.print(); }, 100);
}

function OperModal({ op, onClose, onSave, readOnly = false }: { op?: Operation | null; onClose: () => void; onSave: (o: Operation) => void; readOnly?: boolean }) {
  // Этап операции определяет, какие вкладки доступны и что редактируется:
  // выдача — только вкладка «Выдача»; возврат — «Возврат»/«Списание»/«Итого», «Выдача» только просмотр; завершено — всё только просмотр.
  const stage: OperStage = op?.stage ?? "Выдача: На редактировании";
  const phase: "vydacha" | "vozvrat" | "done" = stage === "Выдача: На редактировании" ? "vydacha" : stage === "Завершено" ? "done" : "vozvrat";
  const ro = readOnly || phase === "done";
  const vydachaRo = ro || phase !== "vydacha";
  const vozvratRo = ro || phase !== "vozvrat";
  const headRo = vydachaRo;
  const disabledTabs: TabName[] = phase === "vydacha" ? ["Возврат", "Списание", "Итого"] : [];

  // Вкладка — ?tab=…; по умолчанию на этапе возврата открывается «Возврат»
  const [tab, setTab] = useTabParam<TabName>(
    { "Выдача": "vydacha", "Возврат": "vozvrat", "Списание": "spisanie", "Итого": "itogo" },
    phase === "vozvrat" && !readOnly ? "Возврат" : "Выдача",
  );
  const [vid, setVid] = useState<string>(op?.vid || "Плавка");
  const [type, setType] = useState<string>(op?.type || "Выдача");
  const [vydacha, setVydacha] = useState<OperPosition[]>(() => op?.vydachaPos ?? (op ? vydachaPositions : []));
  const [vozvrat, setVozvrat] = useState<OperPosition[]>(() => op?.vozvratPos ?? (op && phase !== "vydacha" && stage !== "Выдано" ? vozvratPositions : []));
  const [losses, setLosses] = useState<LossRow[]>(() => (op?.vid === "Производство ГП" ? seedGpLosses : [newLoss()]));
  const [spisanieFiles, setSpisanieFiles] = useState<File[]>(() => (op?.vid === "Производство ГП" ? seedSpisanieFiles() : []));
  // Вложенные экраны: …/spisanie-raznicy, …/add-position, …/vozvrat-pick, …/shihta-pick
  const screen = useScreen();
  const nested = (name: string) => [screen.has(name), (open: boolean) => (open ? screen.open(name) : screen.close(name))] as const;
  const [showSpisanie, setShowSpisanie] = nested("spisanie-raznicy");
  const [showAddDM, setShowAddDM] = nested("add-position");
  const [showVozvratPick, setShowVozvratPick] = nested("vozvrat-pick");
  const [showShihtaPick, setShowShihtaPick] = nested("shihta-pick");
  const [pickedShihtaId, setPickedShihtaId] = useState<string | null>(null);
  const { dmItems, setDmItems, setShihtovyeKarty, operations, currentUser } = useApp();
  // Документы вкладок «Выдача» / «Возврат»
  const [vydachaFiles, setVydachaFiles] = useState<File[]>(() =>
    op?.vydachaFiles ?? (op?.vid === "Плавка" ? [new File([], `Приказ-${op.document}.pdf`)] : []));
  const [vozvratFiles, setVozvratFiles] = useState<File[]>(() =>
    op?.vozvratFiles ?? (op && phase !== "vydacha" && stage !== "Выдано" ? [new File([], `МСЛ-${op.document}.pdf`)] : []));
  const { toast, show, clear } = useToast();

  const appendPositions = (target: "vydacha" | "vozvrat", rows: Omit<OperPosition, "n">[]) => {
    const setFn = target === "vydacha" ? setVydacha : setVozvrat;
    setFn(prev => {
      const maxN = prev.reduce((m, p) => Math.max(m, p.n), 0);
      return [...prev, ...rows.map((r, i) => ({ n: maxN + i + 1, ...r }))];
    });
  };

  // Позиция операции в виде позиции склада ДМ: недостающие поля — из позиции склада с тем же номенклатурным №
  const posView = (p: OperPosition): DMPositionView => {
    const dm = dmItems.find(i => i.nomenkl === p.nomenkl);
    return {
      name: p.name, nomenkl: p.nomenkl, klass: p.klass, metal: p.metal ?? dm?.metal ?? "",
      qty: p.qty ?? null, proba: p.proba, ligWeight: p.lig ?? null, netWeight: p.net ?? null,
      location: p.loc, status: dm?.status, chem: p.chem ?? dm?.chem,
    };
  };
  // Просмотр позиции: …/position/<вкладка>-<n>
  const posKey = screen.after("position");
  const viewPos = (() => {
    if (!posKey) return null;
    const [list, n] = posKey.split("-");
    return (list === "vozvrat" ? vozvrat : vydacha).find(p => String(p.n) === n) ?? null;
  })();

  const [head, setHead] = useState(() => ({
    docType: op ? (op.docType ?? (op.vid === VID_LKI ? DOC_TYPE_LKI : "Приказ")) : "",
    // Номер присваивается автоматически при создании — следующий по счёту среди всех операций.
    document: op?.document || nextDocNo(operations),
    date: op?.date || new Date().toLocaleDateString("ru-RU"),
    zakazchik: op ? (op.zakazchik ?? "Монетный двор") : "",
    responsible: op?.responsible || "",
    plavkaNo: op ? (op.plavkaNo ?? "П-2026-0089") : "",
    // «Выдал» — авторизованный пользователь; у сохранённой операции остаётся тот, кто её оформлял.
    vydal: op ? (op.vydal ?? "Ким Александр Юрьевич") : (currentUser?.fullName ?? ""),
    poluchil: op ? (op.poluchil ?? op.responsible) : "",
  }));

  // Blank options list for a brand-new operation so pickers start unselected.
  const withBlank = (opts: string[]) => (op ? opts : ["", ...opts]);

  // «Накладная в ЛКИ» — единственный тип документа для «Анализ в ЛКИ» и только для него.
  const docTypeOptions = vid === VID_LKI
    ? [DOC_TYPE_LKI]
    : withBlank(withCurrent(spravValues("Типы документов").filter(t => t !== DOC_TYPE_LKI), head.docType));
  const changeVid = (v: string) => {
    setVid(v);
    if (v === VID_LKI) setHead(h => ({ ...h, docType: DOC_TYPE_LKI }));
    else if (head.docType === DOC_TYPE_LKI) setHead(h => ({ ...h, docType: "" }));
  };

  const vesVydacha = vydacha.reduce((a, p) => a + p.ves, 0);
  const vesVozvrat = vozvrat.reduce((a, p) => a + p.ves, 0);
  const vesSpisano = sumLosses(losses);
  const delta = +(vesVozvrat + vesSpisano - vesVydacha).toFixed(2);
  const deltaSign = delta >= 0 ? "+" : "−";
  const inNorm = Math.abs(delta) <= 5;

  // Дельта, на которую оформлен акт «Списать разницу». Действует, только пока дельта не изменилась.
  const [spisanaRaznica, setSpisanaRaznica] = useState<number | null>(() => (op?.statusClose === "Закрыто: списано" ? delta : null));
  const raznicaSpisana = spisanaRaznica !== null && spisanaRaznica === delta;

  const oformitBlock =
    phase === "vydacha"
      ? (vydacha.length === 0 ? "Добавьте хотя бы одну позицию во вкладке «Выдача»" : null)
      : vozvrat.length === 0 ? "Добавьте позиции во вкладке «Возврат»"
      : !inNorm && !raznicaSpisana ? `Дельта ${deltaSign}${fmt(Math.abs(delta))} г превышает допуск ±5 г — спишите разницу во вкладке «Итого»`
      : null;

  // Выданные позиции ДМ уходят в подотчёт. Если позиция была в резерве чужой шихтовой карты,
  // эта карта возвращается в «Редактирование» и пропадает из выбора ШК для плавки (там только «Новая»).
  const applyVydacha = () => {
    const vydanoNomenkl = new Set(vydacha.filter(p => !isGPKlass(p.klass)).map(p => p.nomenkl));
    const izRezerva = dmItems.filter(i => i.status === "Резерв" && vydanoNomenkl.has(i.nomenkl));
    setDmItems(prev => prev.map(i => (vydanoNomenkl.has(i.nomenkl) && i.status !== "В подотчёте" ? { ...i, status: "В подотчёте" } : i)));
    if (izRezerva.length === 0) return;
    const rezNomenkl = new Set(izRezerva.map(i => i.nomenkl));
    const zatronuty: string[] = [];
    setShihtovyeKarty(prev => prev.map(k => {
      if (k.id === pickedShihtaId || k.status === "Выполнена") return k;
      const hit = k.materials.filter(m => rezNomenkl.has(m.nomenkl)).map(m => m.name);
      if (hit.length === 0) return k;
      zatronuty.push(k.name);
      return { ...k, status: "Редактирование", vydannyePozicii: [...new Set([...(k.vydannyePozicii ?? []), ...hit])] };
    }));
    if (zatronuty.length) show(`Шихтовая карта ${zatronuty.map(n => `«${n}»`).join(", ")} переведена в «Редактирование»`);
  };

  const buildOp = (next: OperStage): Operation => ({
    id: op?.id || `op-${Date.now()}`,
    date: head.date,
    type: type as any,
    vid: vid as any,
    positions: vydacha.length,
    document: head.document,
    responsible: head.responsible,
    stage: next,
    statusVydacha: next === "Выдача: На редактировании" ? "Не выдано" : "Выдано",
    statusVozvrat: next === "Завершено" ? "Полностью" : vozvrat.length > 0 ? "Частично" : "Не начат",
    statusClose: next !== "Завершено" ? "Не закрыто" : !inNorm ? "Закрыто: списано" : "Закрыто",
    vydachaPos: vydacha,
    vozvratPos: vozvrat,
    vydachaFiles,
    vozvratFiles,
    docType: head.docType,
    zakazchik: head.zakazchik,
    plavkaNo: vid === "Плавка" ? head.plavkaNo : undefined,
    vydal: head.vydal,
    poluchil: head.poluchil,
  });

  const save = (oformit = false) => {
    const next: OperStage = phase === "vydacha"
      ? (oformit ? "Выдано" : "Выдача: На редактировании")
      : (oformit ? "Завершено" : "Возврат: На редактировании");
    // Позиции уходят в подотчёт только при оформлении выдачи
    if (phase === "vydacha" && oformit) applyVydacha();
    onSave(buildOp(next));
  };

  // Печать доступна только для оформленной операции — печатается текущее состояние формы.
  const canPrint = !!op && isOformlena(op);
  const printBtn = (
    <span className="self-center">
      <PrintIcon
        disabled={!canPrint}
        title={canPrint ? "Печать (PDF)" : "Печать доступна после оформления операции"}
        onClick={() => op && printOperation(buildOp(op.stage), vesSpisano)}
      />
    </span>
  );

  return (
    <Modal
      title={`Движение материала${op ? ` — ${op.vid}` : vid ? ` — ${vid}` : ""}`}
      onClose={onClose}
      extraWide
      footer={ro ? <>{printBtn}<Btn variant="secondary" onClick={onClose}>Закрыть</Btn></> : (
        <>
          {oformitBlock && <span className="mr-auto self-center text-xs text-yellow-700">⚠ Оформление недоступно: {oformitBlock}</span>}
          {printBtn}
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save(true)} disabled={!!oformitBlock}>Оформить</Btn>
          <Btn variant="secondary" onClick={() => save()}>Сохранить</Btn>
        </>
      )}
    >
      {/* Статус операции */}
      {op && (
        <div className="flex items-center gap-2 mb-4">
          <Badge label={op.stage} group="operacii" />
          {!readOnly && phase === "vozvrat" && <span className="text-xs text-gray-500">Оформление возврата: вкладка «Выдача» доступна только для просмотра</span>}
          {!readOnly && phase === "done" && <span className="text-xs text-gray-500">Операция завершена — доступна только для просмотра</span>}
        </div>
      )}
      {!op && <div className="mb-4 text-xs text-gray-500">Новая операция: заполните вкладку «Выдача». Возврат оформляется после выдачи.</div>}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Тип операции">
          <Select value={type} options={withCurrent(spravValues("Типы операций"), type)} onChange={setType} disabled={headRo || !!op} />
        </Field>
        <Field label="Вид операции">
          <Select value={vid} options={withCurrent(spravValues("Виды операций"), vid)} onChange={changeVid} disabled={headRo || !!op} />
        </Field>
        <Field label="Тип документа"><Select value={head.docType} options={docTypeOptions} onChange={v => setHead(h => ({ ...h, docType: v }))} disabled={headRo || vid === VID_LKI} /></Field>
        <Field label="Номер документа"><Input value={head.document} disabled /></Field>
        <Field label="Дата операции"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={headRo} /></Field>
        <Field label="Заказчик"><Select value={head.zakazchik} options={withBlank(["Монетный двор"])} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} disabled={headRo} /></Field>
        <Field label="Подотчётное лицо" full><Select value={head.responsible} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович", "Иванова Мария Сергеевна"])} onChange={v => setHead(h => ({ ...h, responsible: v }))} disabled={headRo} /></Field>
        {vid === "Плавка" && (
          <Field label="Номер плавки"><Input value={head.plavkaNo} onChange={v => setHead(h => ({ ...h, plavkaNo: v }))} disabled={headRo} /></Field>
        )}
        <Field label="Выдал"><Input value={head.vydal} disabled /></Field>
        <Field label="Получил"><Select value={head.poluchil} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович"])} onChange={v => setHead(h => ({ ...h, poluchil: v }))} disabled={headRo} /></Field>
      </div>

      {/* Tabs */}
      <Tabs tabs={["Выдача", "Возврат", "Списание", "Итого"]} active={tab} onChange={t => setTab(t as TabName)} disabled={disabledTabs} />

      {tab === "Выдача" && (
        <>
          {!vydachaRo && (
            <div className="flex gap-2 mb-3">
              {vid === "Плавка" ? (
                // Для плавки состав выдачи определяет только шихтовая карта.
                <Btn size="sm" onClick={() => setShowShihtaPick(true)}><Plus className="w-4 h-4" />Выдать по ШК</Btn>
              ) : (
                <Btn size="sm" onClick={() => setShowAddDM(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              )}
              <ExportBtn onToast={show} />
            </div>
          )}
          <OperPositionsTable
            rows={vydacha}
            view={posView}
            readOnly={vydachaRo}
            onView={p => screen.open("position", `vydacha-${p.n}`)}
            onDelete={p => setVydacha(prev => prev.filter(x => x.n !== p.n))}
          />
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
            <MultiFileUpload files={vydachaFiles} onChange={setVydachaFiles} accept={docAccept} disabled={vydachaRo} />
          </div>
        </>
      )}

      {tab === "Возврат" && (
        <>
          {!vozvratRo && (
            <div className="flex gap-2 mb-3">
              <Btn size="sm" onClick={() => setShowVozvratPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          )}
          <OperPositionsTable
            rows={vozvrat}
            view={posView}
            readOnly={vozvratRo}
            onView={p => screen.open("position", `vozvrat-${p.n}`)}
            onDelete={p => setVozvrat(prev => prev.filter(x => x.n !== p.n))}
          />
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
            <MultiFileUpload files={vozvratFiles} onChange={setVozvratFiles} accept={docAccept} disabled={vozvratRo} />
          </div>
        </>
      )}

      {tab === "Списание" && (
        <SpisanieTab
          losses={losses}
          setLosses={setLosses}
          files={spisanieFiles}
          setFiles={setSpisanieFiles}
          vesStart={vesVydacha}
          readOnly={vozvratRo}
        />
      )}

      {tab === "Итого" && (
        <>
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mb-5 border ${inNorm ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2">
              <span className={inNorm ? "text-green-600" : "text-yellow-600"}>{inNorm ? "✓" : "⚠"}</span>
              <span className={`font-medium text-sm ${inNorm ? "text-green-800" : "text-yellow-800"}`}>
                Дельта: {deltaSign}{fmt(Math.abs(delta))} г (допуск: ±5 г) {inNorm ? "— В норме!" : "— Превышение!"}
              </span>
            </div>
            {!inNorm && raznicaSpisana && <Badge label="Разница списана" group="itogo-operacii" />}
            {!inNorm && !raznicaSpisana && !vozvratRo && (
              <button
                onClick={() => setShowSpisanie(true)}
                className="px-3 py-1.5 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Списать разницу
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
              Операция 1 — Плавка золотых слитков
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Выдача</div>
              {vydacha.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="text-sm text-gray-900">{p.name} <span className="text-gray-400 text-xs">{p.nomenkl}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{p.ves} г</span>
                    <Badge label="Преобразован" group="itogo-operacii" />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center py-2 text-gray-400 text-xs">↓ связь ↓</div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Возврат</div>
              {vozvrat.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="text-sm text-gray-900">{p.name} <span className="text-gray-400 text-xs">{p.nomenkl}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{p.ves} г</span>
                    <Badge label={i === 0 ? "Без изменений" : i === 2 ? "Новая" : "Без изменений"} group="itogo-operacii" />
                  </div>
                </div>
              ))}
              {vesSpisano > 0 && <>
                <div className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Списание потерь</div>
                {losses.filter(l => num(l.ves) > 0).map(l => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <div className="text-sm text-gray-900">{l.name || "Без наименования"} <span className="text-gray-400 text-xs">{isoToRu(l.date)}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{l.ves} г</span>
                      <Badge label="Списано" group="itogo-operacii" />
                    </div>
                  </div>
                ))}
              </>}
              <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">Выдано:</span> <b>{fmt(vesVydacha)} г</b></div>
                <div><span className="text-gray-500">Возврат:</span> <b>{fmt(vesVozvrat)} г</b></div>
                <div><span className="text-gray-500">Списано:</span> <b>{fmt(vesSpisano)} г</b></div>
                <div><span className="text-gray-500">Дельта:</span> <b>{deltaSign}{fmt(Math.abs(delta))} г</b></div>
              </div>
            </div>
          </div>
        </>
      )}

      {showSpisanie && (
        <SpisanieModal
          delta={delta}
          onClose={() => setShowSpisanie(false)}
          onConfirm={() => { setShowSpisanie(false); setSpisanaRaznica(delta); show("Разница списана — операцию можно оформить"); }}
        />
      )}
      {showAddDM && (
        <AddDMPositionModal
          already={vydacha.reduce<Record<string, number>>((m, p) => ({ ...m, [p.nomenkl]: (m[p.nomenkl] ?? 0) + (p.qty ?? 0) }), {})}
          onClose={() => setShowAddDM(false)}
          onAdd={rows => { appendPositions("vydacha", rows); setShowAddDM(false); show("Позиции добавлены"); }}
        />
      )}
      {showVozvratPick && (
        <VozvratPickModal
          vydacha={vydacha}
          reservedNomenkl={[...vydacha, ...vozvrat].map(p => p.nomenkl)}
          view={posView}
          onClose={() => setShowVozvratPick(false)}
          onAdd={rows => { appendPositions("vozvrat", rows); setShowVozvratPick(false); show("Позиции возврата добавлены"); }}
        />
      )}
      {viewPos && <DMPositionViewModal item={posView(viewPos)} onClose={() => screen.close("position")} />}
      {showShihtaPick && (
        <ShihtaPickModal
          onClose={() => setShowShihtaPick(false)}
          onPick={k => {
            appendPositions("vydacha", k.materials.map(m => {
              const dm = dmItems.find(i => i.nomenkl === m.nomenkl);
              const part = dm && dm.qty > 0 ? (m.qty ?? 1) / dm.qty : 1;
              return { ...m, ag: "-", cu: "-", metal: dm?.metal, lig: m.ves, net: dm ? +(dm.netWeight * part).toFixed(2) : undefined, chem: m.chem ?? dm?.chem };
            }));
            setHead(h => ({ ...h, plavkaNo: k.plavkaNo }));
            setPickedShihtaId(k.id);
            setShowShihtaPick(false);
            show(`Позиции шихтовой карты «${k.name}» добавлены`);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Реестр операций ───────────────────────────────────────────────────────────

export function DvizhenieMateriаla() {
  const { operations, setOperations } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const [filterVid, setFilterVid] = useState("Все виды");
  const [search, setSearch] = useState("");
  // Экраны: /dvizhenie-materiala/new, /view/:id, /edit/:id
  const screen = useScreen();
  const viewOp = operations.find(o => o.id === screen.after("view")) ?? null;
  const editOp = operations.find(o => o.id === screen.after("edit")) ?? null;
  const showNew = screen.has("new");
  const setViewOp = (o: Operation | null) => (o ? screen.openTop("view", o.id) : screen.close("view"));
  const setEditOp = (o: Operation | null) => (o ? screen.openTop("edit", o.id) : screen.close("edit"));
  const setShowNew = (open: boolean) => (open ? screen.openTop("new") : screen.close("new"));
  const [selected, setSelected] = useState<string | null>(null);
  const perPage = 8;

  const toggleSelect = (id: string) => {
    setSelected(prev => (prev === id ? null : id));
  };

  const filtered = operations.filter(o => {
    const matchSearch = !search || o.document.toLowerCase().includes(search.toLowerCase()) || o.responsible.toLowerCase().includes(search.toLowerCase());
    const matchVid = filterVid === "Все виды" || o.vid === filterVid;
    return matchSearch && matchVid;
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    date: o => parseRuDate(o.date),
    type: o => o.type,
    vid: o => o.vid,
    positions: o => o.positions,
    document: o => o.document,
    responsible: o => o.responsible,
    stage: o => o.stage,
  });

  // Возврат оформляется по выданной операции (или продолжается по черновику возврата)
  const selectedOp = operations.find(o => o.id === selected) ?? null;
  const canVozvrat = !!selectedOp && (selectedOp.stage === "Выдано" || selectedOp.stage === "Возврат: На редактировании");

  const typeColor: Record<string, string> = {
    "Выдача": "text-green-600",
    "Возврат": "text-blue-600",
    "Выдача-Возврат": "text-orange-500",
  };

  return (
    <div>
      <PageHeader
        title="Движение материала (операции)"
        subtitle="Выдача и возврат материалов подотчётным лицам"
        breadcrumb={["Движение материала", "Реестр операций"]}
        actions={
          <>
            <Btn variant="secondary" disabled={!canVozvrat} onClick={() => selectedOp && setEditOp(selectedOp)}>Оформить возврат</Btn>
            <Btn onClick={() => setShowNew(true)}>Новая операция</Btn>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Документ / Подотчётник</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Вид операции</label>
          <select value={filterVid} onChange={e => setFilterVid(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все виды", ...spravValues("Виды операций")].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterVid("Все виды"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Сбросить</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3"></th>
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Тип</SortTh>
              <SortTh sortKey="vid" sort={sort} onSort={toggleSort}>Вид операции</SortTh>
              <SortTh sortKey="positions" sort={sort} onSort={toggleSort}>Позиции</SortTh>
              <SortTh sortKey="document" sort={sort} onSort={toggleSort}>Документ</SortTh>
              <SortTh sortKey="responsible" sort={sort} onSort={toggleSort}>Подотчётник</SortTh>
              <SortTh sortKey="stage" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(op => (
              <tr key={op.id} className={`hover:bg-gray-50 transition-colors ${selected === op.id ? "bg-blue-50/50" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected === op.id} onChange={() => toggleSelect(op.id)} className="w-4 h-4 accent-blue-600" />
                </td>
                <td className="px-4 py-3 text-gray-500">{op.date}</td>
                <td className={`px-4 py-3 font-medium ${typeColor[op.type] || "text-gray-700"}`}>{op.type}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewOp(op)} className="text-blue-600 hover:underline">{op.vid}</button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewOp(op)} className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                    {op.positions}
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
                <td className="px-4 py-3 text-blue-600">{op.document}</td>
                <td className="px-4 py-3 text-gray-700">{op.responsible}</td>
                <td className="px-4 py-3 whitespace-nowrap"><Badge label={op.stage} group="operacii" /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewOp(op)} />
                  <EditIcon onClick={() => setEditOp(op)} />
                  <PrintIcon
                    disabled={!isOformlena(op)}
                    title={isOformlena(op) ? "Печать (PDF)" : "Печать доступна после оформления операции"}
                    onClick={() => printOperation(op)}
                  />
                  <DeleteIcon onClick={() => confirm("Удалить операцию?", () => setOperations(prev => prev.filter(o => o.id !== op.id)))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewOp && <OperModal key={viewOp.id} op={viewOp} onClose={() => setViewOp(null)} onSave={() => setViewOp(null)} readOnly />}
      {editOp && (
        <OperModal
          key={editOp.id}
          op={editOp}
          onClose={() => setEditOp(null)}
          onSave={updated => {
            setOperations(prev => prev.map(o => o.id === updated.id ? updated : o));
            setEditOp(null);
            setSelected(null);
            show(`Операция ${updated.document || ""} — ${updated.stage}`);
          }}
        />
      )}
      {showNew && (
        <OperModal
          onClose={() => setShowNew(false)}
          onSave={o => {
            setOperations(prev => [o, ...prev]);
            setShowNew(false);
            show(`Операция создана — ${o.stage}`);
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
