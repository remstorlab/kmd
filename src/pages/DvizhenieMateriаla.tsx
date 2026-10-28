import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, PosStatusBadge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, usePerPage, FillerRows, fillerCount, PageHeader,
  PrintIcon, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, MultiSelect, KlassSelect, KlassCode, SearchInput, Tabs, MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, MaterialCodeSelect, parseRuDate, ProbaChem, usePaged,
  CREATED_LABEL, CreatedCell, createdSortKey, useCreatedStamp,
} from "../components/ui";
import { MAIN_SKLAD, Operation, OperPosition, OperStage, OperLoss, lossWeight, baseMetal, techOpLossNorm, SPISANIE_POTERYA, SPISANIE_PRIROST, ShihtovayaKarta, opVydacha, opVozvrat, opLosses, opWeights, ChemComposition, isGPKlass, spravValues, DOC_TYPE_LKI, DOC_TYPE_NIOKR, initialMaterialClasses } from "../data/mock";
import { Plus } from "lucide-react";
import { takeFromStock, returnToStock } from "../data/stock";
import { useScreen, useTabParam } from "../router";
import ChemCompositionBlock from "../components/ChemCompositionBlock";
import DMPositionViewModal, { DMPositionView } from "../components/DMPositionViewModal";
import DMPositionFormModal, { PrihodPosition, emptyPosition, locOf, NO_LOC } from "../components/DMPositionFormModal";

// ── Добавить позицию ДМ со склада ─────────────────────────────────────────────



const ALL_KLASS = "Все классы";
const ALL_METALS = "Все металлы";
const ALL_LOCS = "Все места хранения";
const ALL_STATUSES = "Все статусы";

function AddDMPositionModal({ already = [], onClose, onAdd }: {
  // Уже добавленные в выдачу: id записей склада (srcId) или номенкл. № (позиции без ссылки) — повторно не предлагаются
  already?: string[];
  onClose: () => void;
  onAdd: (rows: Omit<OperPosition, "n">[]) => void;
}) {
  const { dmItems, shihtovyeKarty } = useApp();
  // Выбранные позиции (id) и количество к выдаче; без ввода — всё количество позиции
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const issueQty = (i: { id: string; qty: number }) => {
    if (i.qty <= 1) return i.qty;
    const n = parseInt(qtyById[i.id] ?? "", 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), i.qty) : i.qty;
  };
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [metal, setMetal] = useState(ALL_METALS);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [status, setStatus] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(false);

  type Item = (typeof dmItems)[number];
  // Позиции в резерве тоже можно выдать — тогда шихтовая карта, которая их резервирует, вернётся в «Редактирование».
  // Выдача — только со склада выдачи (СДМ2); позиции склада приёмки (СДМ1) сначала перемещаются по требованию
  const availableItems = dmItems.filter(i => i.sklad === MAIN_SKLAD && !isGPKlass(i.klass) && (i.status === "На складе" || i.status === "Резерв") && !already.includes(i.id) && !already.includes(i.nomenkl));
  const reservedBy = (nomenkl: string) => shihtovyeKarty.find(k => k.status !== "Выполнена" && k.materials.some(m => m.nomenkl === nomenkl));
  const affectedKarty = [...new Set(
    availableItems.filter(i => selected.has(i.id) && i.status === "Резерв").map(i => reservedBy(i.nomenkl)?.name).filter(Boolean),
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
      && (status.length === 0 || status.includes(i.status))
      && (!onlySelected || selected.has(i.id));
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: i => i.name,
    nomenkl: i => i.nomenkl,
    klass: i => i.klass,
    proba: i => i.proba,
    netWeight: i => i.netWeight,
    location: i => i.location,
    qty: i => i.qty,
  });

  const selectedCount = selected.size;
  const allChecked = filtered.length > 0 && filtered.every(i => selected.has(i.id));

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    filtered.forEach(i => (allChecked ? next.delete(i.id) : next.add(i.id)));
    return next;
  });

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setMetal(ALL_METALS); setLoc(ALL_LOCS); setStatus([]); setOnlySelected(false); };

  const add = () => {
    const chosen = availableItems.filter(i => selected.has(i.id));
    if (chosen.length === 0) return;
    // Частичная выдача: массы и хим. состав — пропорционально выдаваемому количеству;
    // запись склада делится при сохранении операции (applyVydacha)
    onAdd(chosen.map(i => {
      const q = issueQty(i);
      const k = i.qty > 0 ? q / i.qty : 1;
      const r2 = (v: number) => Math.round(v * k * 100) / 100;
      const chem = k === 1 || !i.chem ? i.chem
        : Object.fromEntries(Object.entries(i.chem).map(([el, v]) => {
          const n = parseFloat(String(v).replace(",", "."));
          return [el, Number.isFinite(n) ? r2(n).toFixed(2) : v];
        }));
      return {
        name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, qty: q || undefined, ves: r2(i.ligWeight),
        ag: chem?.ag || "-", cu: chem?.cu || "-", chem, loc: i.location, metal: i.metal, lig: r2(i.ligWeight), net: r2(i.netWeight),
        srcId: i.id,
      };
    }));
  };

  const pg5 = usePaged(sorted, "dm-add-pick");
  return (
    <Modal
      title={`Добавить позицию ДМ со склада «${MAIN_SKLAD}»`}
      onClose={onClose}
      largeWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0}>Добавить{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
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
        <Field label="Статус"><MultiSelect values={status} options={["На складе", "Резерв"]} onChange={setStatus} allLabel={ALL_STATUSES} /></Field>
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
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес чист.</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <th className="px-3 py-2 text-left">Статус</th>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество изделий</SortTh>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg5.pageItems.map(i => {
                const checked = selected.has(i.id);
                const karta = i.status === "Резерв" ? reservedBy(i.nomenkl) : undefined;
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(i.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 font-medium">{i.name}</td>
                    <td className="px-3 py-2 text-gray-500">{i.nomenkl}</td>
                    <td className="px-3 py-2"><KlassCode value={i.klass} /></td>
                    <td className="px-3 py-2"><ProbaChem proba={i.proba} chem={i.chem} /></td>
                    <td className="px-3 py-2">{i.netWeight}</td>
                    <td className="px-3 py-2 text-gray-500">{i.location}</td>
                    <td className="px-3 py-2">
                      <PosStatusBadge status={i.status} nomenkl={i.nomenkl} />
                      {karta && <div className="text-xs text-gray-400 mt-0.5" title={karta.name}>ШК {karta.plavkaNo}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {checked && i.qty > 1 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-20">
                            <Input value={qtyById[i.id] ?? String(i.qty)} onChange={v => setQtyById(prev => ({ ...prev, [i.id]: v.replace(/[^\d]/g, "") }))} placeholder={String(i.qty)} />
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">из {i.qty}</span>
                        </div>
                      ) : (i.qty || "—")}
                    </td>
                  </tr>
                );
              })}
              <FillerRows count={pg5.fill} cols={9} />
            </tbody>
          </table>
          {pg5.pager}
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

// ── Добавить позицию возврата: новые позиции, созданные кнопкой «Добавить позицию» ──

const DM_SKLAD = MAIN_SKLAD;

function VozvratPickModal({ reservedNomenkl, view, onClose, onAdd }: {
  // Номенклатурные номера позиций операции — новая позиция получает следующий свободный
  reservedNomenkl: string[];
  // Позиция операции в виде позиции склада ДМ (код материала, веса, статус)
  view: (p: OperPosition) => DMPositionView;
  onClose: () => void;
  onAdd: (rows: Omit<OperPosition, "n">[]) => void;
}) {
  const { storageLocations } = useApp();
  // Позиции, созданные в этой модалке; n — локальный номер строки
  const [created, setCreated] = useState<OperPosition[]>([]);
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
  const metals = [ALL_METALS, ...Array.from(new Set(created.map(p => view(p).metal).filter(Boolean))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(created.map(p => p.loc))).sort()];

  const filtered = created.filter(p => {
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
    const chosen = created.filter(p => selected.has(p.n));
    if (chosen.length === 0) return;
    onAdd(chosen.map(({ n, ...rest }) => rest));
  };

  // Новая позиция — та же форма, что при приёме на склад ДМ; добавленные позиции сразу отмечены
  const toOper = (p: PrihodPosition, n: number): OperPosition => {
    const lig = num(p.lig);
    const net = num(p.net);
    return {
      n,
      name: p.name,
      nomenkl: p.nomenkl,
      klass: p.klass,
      proba: num(p.proba),
      qty: parseInt(p.kol, 10) || undefined,
      ves: net || lig,
      lig,
      net,
      metal: p.code,
      ag: p.chem.ag || "-",
      cu: p.chem.cu || "-",
      chem: p.chem,
      loc: locOf(p),
    };
  };
  const addNew = (ps: PrihodPosition[]) => {
    const maxN = created.reduce((m, p) => Math.max(m, p.n), 0);
    const rows = ps.map((p, i) => toOper(p, maxN + i + 1));
    setCreated(prev => [...prev, ...rows]);
    setSelected(prev => new Set([...prev, ...rows.map(r => r.n)]));
    setShowAddNew(false);
  };
  const removeCreated = (n: number) => {
    setCreated(prev => prev.filter(p => p.n !== n));
    setSelected(prev => { const s = new Set(prev); s.delete(n); return s; });
  };

  const th = "px-3 py-2";
  const dash = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v);

  const pg6 = usePaged(sorted, "dm-vozvrat-pick");
  return (
    <Modal
      title="Добавить позицию возврата"
      onClose={onClose}
      largeWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={addSelected} disabled={selected.size === 0}>Добавить{selected.size > 0 ? ` (${selected.size})` : ""}</Btn>
      </>}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Новые позиции возврата</h3>
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
        <span>Найдено: {filtered.length} из {created.length}</span>
        <span>Выбрано: {selected.size}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          {created.length === 0 ? "Позиции не добавлены. Нажмите «+ Добавить позицию»" : "Нет позиций по заданным фильтрам"}
        </div>
      ) : (
        <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество изделий</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
              <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Вес лигат.</SortTh>
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>Вес чист.</SortTh>
              <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
              <th className="w-20"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg6.pageItems.map(p => {
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
                    <td className="px-3 py-2"><ProbaChem proba={p.proba} chem={v.chem} /></td>
                    <td className="px-3 py-2">{dash(v.ligWeight)}</td>
                    <td className="px-3 py-2">{dash(v.netWeight)}</td>
                    <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                    <td className="px-3 py-2">{v.status ? <PosStatusBadge status={v.status} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <EyeIcon onClick={() => setViewing(p)} />
                        <DeleteIcon onClick={() => removeCreated(p.n)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              <FillerRows count={pg6.fill} cols={12} />
            </tbody>
          </table>
          {pg6.pager}
        </div>
      )}

      {viewing && <DMPositionViewModal item={view(viewing)} onClose={() => setViewing(null)} />}
      {showAddNew && (
        <DMPositionFormModal
          mode="add"
          sklad={DM_SKLAD}
          initial={emptyPosition(storageLocations, DM_SKLAD, "Слиток", "1000")}
          reservedNomenkl={[...reservedNomenkl, ...created.map(p => p.nomenkl)]}
          onClose={() => setShowAddNew(false)}
          onSave={p => addNew([p])}
          onSaveMany={addNew}
        />
      )}
    </Modal>
  );
}

// ── Выдача по шихтовой карте ──────────────────────────────────────────────────

// Карта выдаётся на плавку со склада выдачи (СДМ2): её позиции в резерве на складе приёмки (СДМ1)
// нужно сначала переместить требованием — до этого карта недоступна для выбора.
function ShihtaPickModal({ onClose, onPick }: { onClose: () => void; onPick: (k: ShihtovayaKarta) => void }) {
  const { shihtovyeKarty, dmItems } = useApp();
  const available = shihtovyeKarty.filter(k => k.status === "Новая");
  const notMoved = (k: ShihtovayaKarta) => k.materials.filter(m => m.nomenkl && dmItems.some(i => i.nomenkl === m.nomenkl && i.status === "Резерв" && i.sklad !== MAIN_SKLAD));

  return (
    <Modal title="Выдача по шихтовой карте" wide onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Отмена</Btn>}>
      {available.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          Нет шихтовых карт в статусе «Новая»
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {available.map(k => {
            const wait = notMoved(k);
            return (
              <button
                key={k.id}
                onClick={() => onPick(k)}
                disabled={wait.length > 0}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <div>
                  <div className={`text-sm font-medium ${wait.length ? "text-gray-400" : "text-gray-900"}`}>{k.name}</div>
                  <div className="text-xs text-gray-400">{k.plavkaNo} · {k.date}</div>
                  {wait.length > 0 && (
                    <div className="text-xs text-orange-600 mt-0.5">
                      Позиции не перемещены на «{MAIN_SKLAD}» ({wait.map(m => m.name).join(", ")}) — оформите требование
                    </div>
                  )}
                </div>
                <Badge label={k.status} group="shihta" />
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Списание потерь ───────────────────────────────────────────────────────────

// name — технологическая операция из справочника «Технологические операции»; type — «Тип списания»; metal — код материала выдачи
type LossRow = OperLoss;

const docAccept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff";

const num = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
const fmt = (v: number) => v.toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 9);
// Дата строки потерь хранится в ISO (yyyy-mm-dd) для <input type="date">.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const newLoss = (metal = ""): LossRow => ({ id: uid(), date: todayIso(), name: "", ves: "", type: SPISANIE_POTERYA, metal });

// Документы списания демо-операции «Производство ГП»
const seedSpisanieFiles = () => [new File([], "Служебная_записка_потери_18082026.pdf"), new File([], "Акт_списания_18082026.pdf")];

// Списанный вес: потеря — «+», прирост — «−»
const sumLosses = (losses: LossRow[], pred: (l: LossRow) => boolean = () => true) =>
  losses.filter(pred).reduce((a, l) => a + lossWeight(l), 0);
// Фон поля «Вес» по типу списания
const vesBg = (type?: string) =>
  type === SPISANIE_PRIROST ? "bg-green-100" : type === SPISANIE_POTERYA ? "bg-red-100" : "bg-white";

function LossTable({ losses, codes, readOnly, onChange }: {
  losses: LossRow[];
  // Коды материалов позиций вкладки «Выдача»
  codes: string[];
  readOnly: boolean;
  onChange: (rows: LossRow[]) => void;
}) {
  const upd = (id: string, patch: Partial<LossRow>) => onChange(losses.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const codeLabel = useMaterialCodeLabel();
  const techOps = spravValues("Технологические операции");
  const types = spravValues("Тип списания");
  // Пустой вариант — «не выбрано»; значение не из списка (устаревшее) сохраняется в списке
  const optionsOf = (list: string[], v: string) => ["", ...(v && !list.includes(v) ? [v] : []), ...list];
  return (
    <>
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="px-3 py-2 text-left w-10">№</th>
          <th className="px-3 py-2 text-left w-44">Дата</th>
          <th className="px-3 py-2 text-left">Тех. операция</th>
          <th className="px-3 py-2 text-left w-48">Код материала</th>
          <th className="px-3 py-2 text-left w-36">Тип</th>
          <th className="px-3 py-2 text-left w-32">Вес, г</th>
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
                <Select value={l.name} options={optionsOf(techOps, l.name)} onChange={v => upd(l.id, { name: v })} optionLabel={v => v || "Выберите операцию"} disabled={readOnly} />
              </td>
              <td className="px-3 py-1.5">
                <Select value={l.metal ?? ""} options={optionsOf(codes, l.metal ?? "")} onChange={v => upd(l.id, { metal: v })} optionLabel={v => (v ? codeLabel(v) : "Выберите код")} disabled={readOnly} />
              </td>
              <td className="px-3 py-1.5">
                <Select value={l.type ?? ""} options={optionsOf(types, l.type ?? "")} onChange={v => upd(l.id, { type: v })} optionLabel={v => v || "Выберите тип"} disabled={readOnly} />
              </td>
              <td className="px-3 py-1.5">
                <input
                  value={l.ves}
                  onChange={e => upd(l.id, { ves: e.target.value })}
                  placeholder="0.00"
                  disabled={readOnly}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:text-gray-600 ${vesBg(l.type)}`}
                />
              </td>
              {!readOnly && <td className="px-2 py-1.5"><DeleteIcon onClick={() => onChange(losses.filter(x => x.id !== l.id))} /></td>}
            </tr>
          ))}
          {losses.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-3 text-center text-xs text-gray-400">Списания не указаны</td></tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <button
          onClick={() => onChange([...losses, newLoss(codes.length === 1 ? codes[0] : "")])}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />Добавить списание
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

type WeightRow = { label: string; vydano: number; spisano: number; vozvrat: number };

function SpisanieTab({ losses, setLosses, files, setFiles, vydacha, vozvrat, codeOf, readOnly }: {
  losses: LossRow[];
  setLosses: React.Dispatch<React.SetStateAction<LossRow[]>>;
  files: File[];
  setFiles: (f: File[]) => void;
  vydacha: OperPosition[];
  vozvrat: OperPosition[];
  // Код материала позиции
  codeOf: (p: OperPosition) => string;
  readOnly: boolean;
}) {
  const codeLabel = useMaterialCodeLabel();
  const ves = (rows: OperPosition[], code: string) => rows.filter(p => codeOf(p) === code).reduce((a, p) => a + p.ves, 0);
  // Строки сводки — по кодам материалов вкладки «Выдача»
  const codes = [...new Set(vydacha.map(codeOf).filter(Boolean))];
  const rows: WeightRow[] = codes.map(c => ({
    label: codeLabel(c),
    vydano: ves(vydacha, c),
    spisano: sumLosses(losses, l => l.metal === c),
    vozvrat: ves(vozvrat, c),
  }));
  // Списания без кода материала (или с кодом не из выдачи) попадают только во «Всего»
  const unassigned = sumLosses(losses, l => !codes.includes(l.metal ?? ""));
  if (unassigned !== 0) rows.push({ label: "Без кода материала", vydano: 0, spisano: unassigned, vozvrat: 0 });
  const total: WeightRow = {
    label: "Всего",
    vydano: vydacha.reduce((a, p) => a + p.ves, 0),
    spisano: sumLosses(losses),
    vozvrat: vozvrat.reduce((a, p) => a + p.ves, 0),
  };
  const th = "px-3 py-2 text-right font-medium";
  const cells = (r: WeightRow) => (
    <>
      <td className="px-3 py-2 text-right">{fmt(r.vydano)} г</td>
      <td className="px-3 py-2 text-right">{fmt(r.spisano)} г</td>
      <td className="px-3 py-2 text-right">{fmt(r.vozvrat)} г</td>
    </>
  );

  return (
    <>
      {/* Сводка по кодам материалов. Списано: потеря — «+», прирост — «−» */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm tabular-nums">
          <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <th className="px-3 py-2 text-left font-medium">Код материала</th>
            <th className={th}>Выдано в работу</th>
            <th className={th}>Списано</th>
            <th className={th}>Возврат</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.label}>
                <td className="px-3 py-2 text-blue-600 font-medium">{r.label}</td>
                {cells(r)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-2 text-center text-xs text-gray-400">Во вкладке «Выдача» нет позиций</td></tr>
            )}
            <tr className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
              <td className="px-3 py-2">{total.label}</td>
              {cells(total)}
            </tr>
          </tbody>
        </table>
      </div>

      <LossTable losses={losses} codes={codes} readOnly={readOnly} onChange={rows => setLosses(rows)} />

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
  const pg7 = usePaged(sorted, "oper-positions");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
          <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
          <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
          <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество изделий</SortTh>
          <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
          <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
          <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
          <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Вес лигат.</SortTh>
          <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>Вес чист.</SortTh>
          <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
          <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
          <th className={readOnly ? "w-10" : "w-20"}></th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {pg7.pageItems.map(p => {
            const v = view(p);
            return (
              <tr key={p.n} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.qty ?? "—"}</td>
                <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                <td className="px-3 py-2 text-blue-600 font-medium">{v.metal ? codeLabel(v.metal) : "—"}</td>
                <td className="px-3 py-2"><ProbaChem proba={p.proba} chem={v.chem} /></td>
                <td className="px-3 py-2">{dash(v.ligWeight)}</td>
                <td className="px-3 py-2">{dash(v.netWeight)}</td>
                <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                <td className="px-3 py-2">{v.status ? <PosStatusBadge status={v.status} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>}</td>
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
          <FillerRows count={pg7.fill} cols={11} />
        </tbody>
      </table>
      {pg7.pager}
    </div>
  );
}

// ── Вкладка «Итого»: позиции выдачи / возврата и списания с промежуточными итогами ──

// Лигатурный вес — основа расчёта итогов и списаний, поэтому колонка выделена
const ligCls = "bg-blue-50 font-semibold text-gray-900";
// Общая сетка колонок таблиц вкладки — колонки всех блоков стоят друг под другом
const ItogoCols = () => (
  <colgroup>
    <col style={{ width: "34%" }} />
    <col style={{ width: "18%" }} />
    <col style={{ width: "16%" }} />
    <col style={{ width: "16%" }} />
    <col style={{ width: "16%" }} />
  </colgroup>
);

function ItogoPositions({ title, rows, view, total }: {
  title: string;
  rows: OperPosition[];
  view: (p: OperPosition) => DMPositionView;
  total: number;
}) {
  const codeLabel = useMaterialCodeLabel();
  const dash = (v: number | null | undefined) => (v === null || v === undefined ? "—" : fmt(v));
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</div>
      <table className="w-full table-fixed text-sm tabular-nums">
        <ItogoCols />
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="px-3 py-2 text-left">Наименование</th>
          <th className="px-3 py-2 text-left">Класс</th>
          <th className="px-3 py-2 text-left">Код материала</th>
          <th className={`px-3 py-2 text-right ${ligCls}`}>Вес лигат.</th>
          <th className="px-3 py-2 text-right">Вес чист.</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(p => {
            const v = view(p);
            return (
              <tr key={p.n}>
                <td className="px-3 py-2 text-gray-900">{p.name}</td>
                <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                <td className="px-3 py-2 text-blue-600 font-medium">{v.metal ? codeLabel(v.metal) : "—"}</td>
                <td className={`px-3 py-2 text-right ${ligCls}`}>{fmt(p.ves)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{dash(v.netWeight)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-400">Позиции не добавлены</td></tr>
          )}
        </tbody>
        <tfoot><tr className="border-t border-gray-200 bg-gray-50">
          <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Итого {title.toLowerCase()}</td>
          <td className={`px-3 py-2 text-right ${ligCls}`}>{fmt(total)} г</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function ItogoLosses({ losses, total }: { losses: LossRow[]; total: number }) {
  const codeLabel = useMaterialCodeLabel();
  const { materialCodes } = useApp();
  // Норма потерь — из справочника «Технологические операции» по металлу кода материала
  const normOf = (l: LossRow) => {
    const n = l.name && l.metal ? techOpLossNorm(l.name, baseMetal(l.metal, materialCodes)) : undefined;
    return n ? `${n.value} ${n.unit}` : "—";
  };
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Списание</div>
      <table className="w-full table-fixed text-sm tabular-nums">
        <ItogoCols />
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="px-3 py-2 text-left">Тех. операция</th>
          <th className="px-3 py-2 text-left">Норма потерь</th>
          <th className="px-3 py-2 text-left">Код материала</th>
          <th className={`px-3 py-2 text-right ${ligCls}`}>Вес лигат.</th>
          <th></th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {losses.map(l => (
            <tr key={l.id}>
              <td className="px-3 py-2 text-gray-900">{l.name || "Без наименования"}</td>
              <td className="px-3 py-2 text-gray-600">{normOf(l)}</td>
              <td className="px-3 py-2 text-blue-600 font-medium">{l.metal ? codeLabel(l.metal) : "—"}</td>
              {/* Потеря — светло-красный фон, прирост — светло-зелёный */}
              <td className={`px-3 py-2 text-right font-semibold text-gray-900 ${vesBg(l.type)}`}>{fmt(num(l.ves))}</td>
              <td></td>
            </tr>
          ))}
          {losses.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-3 text-center text-xs text-gray-400">Списания не указаны</td></tr>
          )}
        </tbody>
        <tfoot><tr className="border-t border-gray-200 bg-gray-50">
          <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Итого списание</td>
          <td className={`px-3 py-2 text-right ${ligCls}`}>{fmt(total)} г</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// ── Operation modal ───────────────────────────────────────────────────────────

type TabName = "Выдача" | "Возврат" | "Списание" | "Итого";

const VID_LKI = "Анализ в ЛКИ";
const VID_NIOKR = "НИОКР";
// Типы документов, закреплённые за видом операции (только для него)
const VID_DOC_TYPE: Record<string, string> = { [VID_LKI]: DOC_TYPE_LKI, [VID_NIOKR]: DOC_TYPE_NIOKR };
const FIXED_DOC_TYPES = Object.values(VID_DOC_TYPE);

// Номер документа — сквозной целочисленный счётчик по всем операциям.
const nextDocNo = (ops: Operation[]) =>
  String(ops.reduce((m, o) => Math.max(m, parseInt(o.document, 10) || 0), 0) + 1);



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
  const docType = o.docType ?? VID_DOC_TYPE[o.vid];
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
    ["Наименование изделия", o.description],
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
  const izdelie = o.description?.trim() || uniq(voz.filter(p => isGPKlass(p.klass)).map(p => p.name)).join(", ");
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
  // Статус: «В работе» — все вкладки редактируются; «Завершено» — только просмотр.
  // Поля над вкладками заполняются при создании и после сохранения не редактируются.
  const done = op?.stage === "Завершено";
  const ro = readOnly || done;
  const headRo = ro || !!op;

  const [tab, setTab] = useTabParam<TabName>(
    { "Выдача": "vydacha", "Возврат": "vozvrat", "Списание": "spisanie", "Итого": "itogo" },
    "Выдача",
  );
  const [vid, setVid] = useState<string>(op?.vid || "Плавка");
  const [type, setType] = useState<string>(op?.type || "Выдача");
  const [description, setDescription] = useState(op?.description ?? "");
  const [vydacha, setVydacha] = useState<OperPosition[]>(() => (op ? opVydacha(op) : []));
  const [vozvrat, setVozvrat] = useState<OperPosition[]>(() => (op ? opVozvrat(op) : []));
  const [losses, setLosses] = useState<LossRow[]>(() => {
    const saved = op ? opLosses(op) : [];
    return saved.length ? saved : [newLoss()];
  });
  const [spisanieFiles, setSpisanieFiles] = useState<File[]>(() => op?.spisanieFiles ?? (op?.vid === "Производство ГП" ? seedSpisanieFiles() : []));
  // Вложенные экраны: …/add-position, …/vozvrat-pick, …/shihta-pick
  const screen = useScreen();
  const nested = (name: string) => [screen.has(name), (open: boolean) => (open ? screen.open(name) : screen.close(name))] as const;
  const [showAddDM, setShowAddDM] = nested("add-position");
  const [showVozvratPick, setShowVozvratPick] = nested("vozvrat-pick");
  const [showShihtaPick, setShowShihtaPick] = nested("shihta-pick");
  const [pickedShihtaId, setPickedShihtaId] = useState<string | null>(null);
  const { dmItems, setDmItems, setShihtovyeKarty, operations, currentUser } = useApp();
  const createdStamp = useCreatedStamp();
  // Документы вкладок «Выдача» / «Возврат»
  const [vydachaFiles, setVydachaFiles] = useState<File[]>(() =>
    op?.vydachaFiles ?? (op?.vid === "Плавка" ? [new File([], `Приказ-${op.document}.pdf`)] : []));
  const [vozvratFiles, setVozvratFiles] = useState<File[]>(() =>
    op?.vozvratFiles ?? (op && op.statusVozvrat !== "Не начат" ? [new File([], `МСЛ-${op.document}.pdf`)] : []));
  const { toast, show, clear } = useToast();

  const appendPositions = (target: "vydacha" | "vozvrat", rows: Omit<OperPosition, "n">[]) => {
    const setFn = target === "vydacha" ? setVydacha : setVozvrat;
    setFn(prev => {
      const maxN = prev.reduce((m, p) => Math.max(m, p.n), 0);
      return [...prev, ...rows.map((r, i) => ({ n: maxN + i + 1, ...r }))];
    });
  };

  // Запись склада ДМ, на которую ссылается позиция выдачи (srcId). У позиций без ссылки (демо-данные) —
  // по номенкл. №: сначала выданная в подотчёт запись, затем запись на складе / в резерве.
  const srcOf = (p: OperPosition) =>
    (p.srcId ? dmItems.find(i => i.id === p.srcId) : undefined)
    ?? dmItems.find(i => i.nomenkl === p.nomenkl && i.status === "В подотчёте")
    ?? dmItems.find(i => i.nomenkl === p.nomenkl && (i.status === "На складе" || i.status === "Резерв"));

  // Позиция операции в виде позиции склада ДМ: недостающие поля — из связанной записи склада
  const posView = (p: OperPosition): DMPositionView => {
    const dm = srcOf(p) ?? dmItems.find(i => i.nomenkl === p.nomenkl);
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
    docType: op ? (op.docType ?? VID_DOC_TYPE[op.vid] ?? "Приказ") : "",
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

  // «Накладная в ЛКИ» — единственный тип документа для «Анализ в ЛКИ», «Накладная на выдачу ДМ» — для «НИОКР»;
  // другим видам операций эти типы недоступны. «НИОКР» — всегда тип операции «Выдача».
  const fixedDocType = VID_DOC_TYPE[vid];
  const docTypeOptions = fixedDocType
    ? [fixedDocType]
    : withBlank(withCurrent(spravValues("Типы документов движения материала").filter(t => !FIXED_DOC_TYPES.includes(t)), head.docType));
  const changeVid = (v: string) => {
    setVid(v);
    if (VID_DOC_TYPE[v]) setHead(h => ({ ...h, docType: VID_DOC_TYPE[v] }));
    else if (FIXED_DOC_TYPES.includes(head.docType)) setHead(h => ({ ...h, docType: "" }));
    if (v === VID_NIOKR) changeType("Выдача");
  };
  // Тип «Выдача» — без возврата, «Возврат» — без выдачи: недоступная вкладка блокируется, её позиции очищаются.
  const changeType = (t: string) => {
    setType(t);
    if (t === "Выдача") setVozvrat([]);
    if (t === "Возврат") setVydacha([]);
  };
  const disabledTabs: TabName[] = type === "Выдача" ? ["Возврат"] : type === "Возврат" ? ["Выдача"] : [];
  const activeTab: TabName = disabledTabs.includes(tab) ? (type === "Возврат" ? "Возврат" : "Выдача") : tab;

  const vesVydacha = vydacha.reduce((a, p) => a + p.ves, 0);
  const vesVozvrat = vozvrat.reduce((a, p) => a + p.ves, 0);
  const vesSpisano = sumLosses(losses);
  const delta = +(vesVozvrat + vesSpisano - vesVydacha).toFixed(2);
  const deltaSign = delta >= 0 ? "+" : "−";
  const inNorm = Math.abs(delta) <= 5;


  // Позиции требуются только во вкладках, доступных для типа операции
  const oformitBlock =
    type !== "Возврат" && vydacha.length === 0 ? "Добавьте хотя бы одну позицию во вкладке «Выдача»"
      : type !== "Выдача" && vozvrat.length === 0 ? "Добавьте позиции во вкладке «Возврат»"
      : null;
  // Дельта вне допуска не запрещает оформление — только требует подтверждения (только для «Выдача-Возврат»)
  const [confirmOformit, setConfirmOformit] = useState(false);
  const oformit = () => (inNorm || type === "Выдача" || type === "Возврат" ? save(true) : setConfirmOformit(true));

  // Выданные позиции ДМ уходят в подотчёт. Если позиция была в резерве чужой шихтовой карты,
  // эта карта возвращается в «Редактирование» и пропадает из выбора ШК для плавки (там только «Новая»).
  // Выдача проводится при каждом сохранении: позиции, убранные из выдачи, возвращаются на склад.
  // При выдаче части количества запись склада делится (data/stock.ts): остаток остаётся на складе,
  // выданная часть — отдельная запись «В подотчёте»; позиция операции ссылается на неё (srcId).
  // Возвращает позиции выдачи с проставленными ссылками на записи склада.
  const applyVydacha = (): OperPosition[] => {
    const rows = vydacha.filter(p => !isGPKlass(p.klass));
    const prevIds = new Set((op ? opVydacha(op) : []).filter(p => !isGPKlass(p.klass)).map(p => srcOf(p)?.id).filter((id): id is string => !!id));
    const linked = new Map<number, string>();
    const pending = new Map<number, string>();
    const take = new Map<string, number>();
    for (const p of rows) {
      const it = srcOf(p);
      if (!it) continue;
      if (it.status === "В подотчёте") { linked.set(p.n, it.id); continue; }
      if (it.status !== "На складе" && it.status !== "Резерв") continue;
      take.set(it.id, (take.get(it.id) ?? 0) + (p.qty && it.qty > 0 ? p.qty : it.qty));
      pending.set(p.n, it.id);
    }
    const keep = new Set(linked.values());
    const ubrano = new Set([...prevIds].filter(id => !keep.has(id) && dmItems.find(i => i.id === id)?.status === "В подотчёте"));
    const izRezerva = dmItems.filter(i => i.status === "Резерв" && take.has(i.id));
    const stamp = Date.now();
    const { items, taken } = takeFromStock(
      returnToStock(dmItems, ubrano, "На складе"),
      take,
      i => ({ ...i, status: "В подотчёте" as const, location: NO_LOC }),
      i => `${i.id}-p${stamp}`,
    );
    setDmItems(items);
    const withSrc = vydacha.map(p => {
      const id = linked.get(p.n) ?? (pending.has(p.n) ? taken.get(pending.get(p.n)!) : undefined);
      return id ? { ...p, srcId: id } : p;
    });
    if (izRezerva.length === 0) return withSrc;
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
    return withSrc;
  };

  const buildOp = (next: OperStage, vydachaPos = vydacha): Operation => ({
    id: op?.id || `op-${Date.now()}`,
    // Отметка создания — при первом сохранении операции
    ...(op?.createdAt ? { createdAt: op.createdAt, createdBy: op.createdBy } : createdStamp()),
    date: head.date,
    type: type as any,
    vid: vid as any,
    positions: vydachaPos.length,
    document: head.document,
    responsible: head.responsible,
    stage: next,
    description,
    statusVydacha: "Выдано",
    statusVozvrat: next === "Завершено" ? "Полностью" : vozvrat.length > 0 ? "Частично" : "Не начат",
    statusClose: next !== "Завершено" ? "Не закрыто" : "Закрыто",
    vydachaPos,
    vozvratPos: vozvrat,
    vydachaFiles,
    vozvratFiles,
    losses,
    spisanieFiles,
    docType: head.docType,
    zakazchik: head.zakazchik,
    plavkaNo: vid === "Плавка" ? head.plavkaNo : undefined,
    vydal: head.vydal,
    poluchil: head.poluchil,
  });

  // «Сохранить» — операция «В работе», «Оформить» — «Завершено»
  const save = (oformit = false) => {
    const next: OperStage = oformit ? "Завершено" : "В работе";
    onSave(buildOp(next, applyVydacha()));
  };

  // Печать доступна для сохранённой операции — печатается текущее состояние формы.
  const canPrint = !!op;
  const printBtn = (
    <span className="self-center">
      <PrintIcon
        disabled={!canPrint}
        title={canPrint ? "Печать (PDF)" : "Печать доступна после сохранения операции"}
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
          {/* «Оформить» закрывает операцию — вынесена влево, отдельно от «Сохранить» */}
          <div className="mr-auto flex items-center gap-3">
            <Btn variant="success" onClick={oformit} disabled={!!oformitBlock}>Оформить</Btn>
            {oformitBlock && <span className="text-xs text-yellow-700">⚠ Оформление недоступно: {oformitBlock}</span>}
          </div>
          {printBtn}
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save()}>Сохранить</Btn>
        </>
      )}
    >
      {/* Статус операции */}
      {op && (
        <div className="flex items-center gap-2 mb-4">
          <Badge label={op.stage} group="operacii" />
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Field label="Тип операции" required={!headRo}>
          <Select value={type} options={withCurrent(spravValues("Типы операций"), type)} onChange={changeType} disabled={headRo || !!op || vid === VID_NIOKR} />
        </Field>
        <Field label="Вид операции" required={!headRo}>
          <Select value={vid} options={withCurrent(spravValues("Виды операций"), vid)} onChange={changeVid} disabled={headRo || !!op} />
        </Field>
        <Field label="Наименование изделия" full><Input value={description} onChange={setDescription} placeholder="Краткое описание операции" disabled={headRo} /></Field>
        <Field label="Тип документа" required={!headRo}><Select value={head.docType} options={docTypeOptions} onChange={v => setHead(h => ({ ...h, docType: v }))} disabled={headRo || !!fixedDocType} /></Field>
        <Field label="Номер документа"><Input value={head.document} disabled /></Field>
        <Field label="Дата операции" required={!headRo}><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={headRo} /></Field>
        <Field label="Заказчик"><Select value={head.zakazchik} options={withBlank(["Монетный двор"])} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} disabled={headRo} /></Field>
        <Field label="Подотчётное лицо" required={!headRo} full><Select value={head.responsible} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович", "Иванова Мария Сергеевна"])} onChange={v => setHead(h => ({ ...h, responsible: v }))} disabled={headRo} /></Field>
        {vid === "Плавка" && (
          <Field label="Номер плавки" required={!headRo}><Input value={head.plavkaNo} onChange={v => setHead(h => ({ ...h, plavkaNo: v }))} disabled={headRo} /></Field>
        )}
        <Field label="Выдал"><Input value={head.vydal} disabled /></Field>
        <Field label="Получил" required={!headRo}><Select value={head.poluchil} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович"])} onChange={v => setHead(h => ({ ...h, poluchil: v }))} disabled={headRo} /></Field>
      </div>

      {/* Tabs */}
      <Tabs tabs={["Выдача", "Возврат", "Списание", "Итого"]} active={activeTab} onChange={t => setTab(t as TabName)} disabled={disabledTabs} />

      {activeTab === "Выдача" && (
        <>
          {!ro && (
            <div className="flex gap-2 mb-3">
              {vid === "Плавка" ? (
                // Для плавки состав выдачи определяет только шихтовая карта.
                <Btn size="sm" onClick={() => setShowShihtaPick(true)}><Plus className="w-4 h-4" />Выдать по ШК</Btn>
              ) : (
                <Btn size="sm" onClick={() => setShowAddDM(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              )}
            </div>
          )}
          <OperPositionsTable
            rows={vydacha}
            view={posView}
            readOnly={ro}
            onView={p => screen.open("position", `vydacha-${p.n}`)}
            onDelete={p => setVydacha(prev => prev.filter(x => x.n !== p.n))}
          />
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
            <MultiFileUpload files={vydachaFiles} onChange={setVydachaFiles} accept={docAccept} disabled={ro} />
          </div>
        </>
      )}

      {activeTab === "Возврат" && (
        <>
          {!ro && (
            <div className="flex gap-2 mb-3">
              <Btn size="sm" onClick={() => setShowVozvratPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
            </div>
          )}
          <OperPositionsTable
            rows={vozvrat}
            view={posView}
            readOnly={ro}
            onView={p => screen.open("position", `vozvrat-${p.n}`)}
            onDelete={p => setVozvrat(prev => prev.filter(x => x.n !== p.n))}
          />
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
            <MultiFileUpload files={vozvratFiles} onChange={setVozvratFiles} accept={docAccept} disabled={ro} />
          </div>
        </>
      )}

      {activeTab === "Списание" && (
        <SpisanieTab
          losses={losses}
          setLosses={setLosses}
          files={spisanieFiles}
          setFiles={setSpisanieFiles}
          vydacha={vydacha}
          vozvrat={vozvrat}
          codeOf={p => posView(p).metal}
          readOnly={ro}
        />
      )}

      {activeTab === "Итого" && (
        <>
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mb-5 border ${inNorm ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2">
              <span className={inNorm ? "text-green-600" : "text-yellow-600"}>{inNorm ? "✓" : "⚠"}</span>
              <span className={`font-medium text-sm ${inNorm ? "text-green-800" : "text-yellow-800"}`}>
                Дельта: {deltaSign}{fmt(Math.abs(delta))} г (допуск: ±5 г) {inNorm ? "— В норме!" : "— Превышение!"}
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
              Операция — {vid}{description.trim() ? ` — ${description.trim()}` : ""}
            </div>
            <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">Выдано:</span> <b>{fmt(vesVydacha)} г</b></div>
              <div><span className="text-gray-500">Возврат:</span> <b>{fmt(vesVozvrat)} г</b></div>
              <div><span className="text-gray-500">Списано:</span> <b>{fmt(vesSpisano)} г</b></div>
              <div><span className="text-gray-500">Дельта:</span> <b>{deltaSign}{fmt(Math.abs(delta))} г</b></div>
            </div>
            <div className="p-4">
              <ItogoPositions title="Выдача" rows={vydacha} view={posView} total={vesVydacha} />
              <ItogoPositions title="Возврат" rows={vozvrat} view={posView} total={vesVozvrat} />
              <ItogoLosses losses={losses.filter(l => num(l.ves) > 0)} total={vesSpisano} />
            </div>
          </div>
        </>
      )}

      {showAddDM && (
        <AddDMPositionModal
          already={vydacha.map(p => p.srcId ?? p.nomenkl)}
          onClose={() => setShowAddDM(false)}
          onAdd={rows => { appendPositions("vydacha", rows); setShowAddDM(false); show("Позиции добавлены"); }}
        />
      )}
      {showVozvratPick && (
        <VozvratPickModal
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
              // Выдаётся запись склада, зарезервированная под карту (при частичном резерве — выделенная часть)
              const rez = m.nomenkl ? dmItems.find(i => i.nomenkl === m.nomenkl && i.status === "Резерв") : undefined;
              const dm = rez ?? dmItems.find(i => i.nomenkl === m.nomenkl);
              const part = rez ? 1 : dm && dm.qty > 0 ? (m.qty ?? 1) / dm.qty : 1;
              return { ...m, ag: "-", cu: "-", metal: dm?.metal, lig: m.ves, net: dm ? +(dm.netWeight * part).toFixed(2) : undefined, chem: m.chem ?? dm?.chem, srcId: rez?.id };
            }));
            setHead(h => ({ ...h, plavkaNo: k.plavkaNo }));
            setPickedShihtaId(k.id);
            setShowShihtaPick(false);
            show(`Позиции шихтовой карты «${k.name}» добавлены`);
          }}
        />
      )}
      {confirmOformit && (
        <ConfirmDialog
          title="Превышение допустимой дельты"
          message={`Разница между выданным и принятым весом ${deltaSign}${fmt(Math.abs(delta))} г превышает допуск ±5 г. Оформить операцию с такой разницей?`}
          confirmLabel="Продолжить"
          tone="primary"
          onCancel={() => setConfirmOformit(false)}
          onConfirm={() => { setConfirmOformit(false); save(true); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Реестр операций ───────────────────────────────────────────────────────────

const filterCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
// Дата фильтра из <input type="date"> (yyyy-mm-dd) в число, сравнимое с parseRuDate
const isoToNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y * 100000000 + m * 1000000 + d * 10000;
};

export function DvizhenieMateriаla() {
  const { operations, setOperations } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const [filterVid, setFilterVid] = useState("Все виды");
  const [filterType, setFilterType] = useState("Все типы");
  const [filterIzdelie, setFilterIzdelie] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  // При изменении фильтра — на первую страницу
  const upd = (set: (v: string) => void) => (v: string) => { set(v); setPage(1); };
  // Экраны: /dvizhenie-materiala/new, /view/:id, /edit/:id
  const screen = useScreen();
  const viewOp = operations.find(o => o.id === screen.after("view")) ?? null;
  const editOp = operations.find(o => o.id === screen.after("edit")) ?? null;
  const showNew = screen.has("new");
  const setViewOp = (o: Operation | null) => (o ? screen.openTop("view", o.id) : screen.close("view"));
  const setEditOp = (o: Operation | null) => (o ? screen.openTop("edit", o.id) : screen.close("edit"));
  const setShowNew = (open: boolean) => (open ? screen.openTop("new") : screen.close("new"));
  const [perPage, setPerPage] = usePerPage("dvizhenie", 8);

  const from = dateFrom ? isoToNum(dateFrom) : 0;
  const to = dateTo ? isoToNum(dateTo) + 9999 : Infinity;
  const filtered = operations.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || [o.document, o.responsible].some(v => v.toLowerCase().includes(q));
    const matchVid = filterVid === "Все виды" || o.vid === filterVid;
    const matchType = filterType === "Все типы" || o.type === filterType;
    const matchIzdelie = !filterIzdelie || (o.description ?? "").toLowerCase().includes(filterIzdelie.toLowerCase());
    const d = parseRuDate(o.date);
    return matchSearch && matchVid && matchType && matchIzdelie && d >= from && d <= to;
  });
  const resetFilters = () => {
    setSearch(""); setFilterVid("Все виды"); setFilterType("Все типы"); setFilterIzdelie(""); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const { sorted, sort, toggleSort } = useSort(filtered, {
    date: o => parseRuDate(o.date),
    type: o => o.type,
    vid: o => o.vid,
    description: o => o.description ?? "",
    document: o => o.document,
    responsible: o => o.responsible,
    stage: o => o.stage,
    created: o => createdSortKey(o),
  });

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
<Btn onClick={() => setShowNew(true)}>Новая операция</Btn>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Дата с</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => upd(setDateFrom)(e.target.value)} className={filterCls} />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Дата по</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => upd(setDateTo)(e.target.value)} className={filterCls} />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Документ / Подотчётник</label>
          <input value={search} onChange={e => upd(setSearch)(e.target.value)} placeholder="Поиск..." className={filterCls} />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование изделия</label>
          <input value={filterIzdelie} onChange={e => upd(setFilterIzdelie)(e.target.value)} placeholder="Поиск..." className={filterCls} />
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Тип операции</label>
          <select value={filterType} onChange={e => upd(setFilterType)(e.target.value)} className={filterCls}>
            {["Все типы", ...spravValues("Типы операций")].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Вид операции</label>
          <select value={filterVid} onChange={e => upd(setFilterVid)(e.target.value)} className={filterCls}>
            {["Все виды", ...spravValues("Виды операций")].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={resetFilters} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Сбросить</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Тип</SortTh>
              <SortTh sortKey="vid" sort={sort} onSort={toggleSort}>Вид операции</SortTh>
              <SortTh sortKey="description" sort={sort} onSort={toggleSort}>Наименование изделия</SortTh>
              <SortTh sortKey="document" sort={sort} onSort={toggleSort}>Документ</SortTh>
              <SortTh sortKey="responsible" sort={sort} onSort={toggleSort}>Подотчётник</SortTh>
              <SortTh sortKey="stage" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <SortTh sortKey="created" sort={sort} onSort={toggleSort}>{CREATED_LABEL}</SortTh>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(op => {
              return (
              <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{op.date}</td>
                <td className={`px-4 py-3 font-medium ${typeColor[op.type] || "text-gray-700"}`}>{op.type}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewOp(op)} className="text-blue-600 hover:underline">{op.vid}</button>
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-64">{op.description || <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-blue-600">{op.document}</td>
                <td className="px-4 py-3 text-gray-700">{op.responsible}</td>
                <td className="px-4 py-3 whitespace-nowrap"><Badge label={op.stage} group="operacii" /></td>
                <CreatedCell row={op} />
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewOp(op)} />
                  <EditIcon onClick={() => setEditOp(op)} />
                  <PrintIcon title="Печать (PDF)" onClick={() => printOperation(op, opWeights(op).spisanie)} />
                  <DeleteIcon onClick={() => confirm("Удалить операцию?", () => setOperations(prev => prev.filter(o => o.id !== op.id)))} />
                </td>
              </tr>
              );
            })}
            <FillerRows count={fillerCount(filtered.length, page, perPage)} cols={9} />
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
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
