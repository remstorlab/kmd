import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, MultiSelect, KlassSelect, KlassCode, MaterialCodeSelect, useMaterialCodeLabel, FileChip, Toggle, SortTh, useSort, ProbaChem,
} from "../components/ui";
import { GPItem, DMItem, MAIN_SKLAD } from "../data/mock";
import { Coins } from "lucide-react";
import PrihodDocModal from "../components/PrihodDocModal";
import VydachaDocModal from "../components/VydachaDocModal";
import DMPositionViewModal from "../components/DMPositionViewModal";
import DMPositionFormModal, { PrihodPosition, seyfsOf, polkasOf, formatLoc, parseLoc, NO_LOC } from "../components/DMPositionFormModal";
import { useScreen } from "../router";

// Позиции учёта ГП в виде позиций склада ДМ — склад один, показываются все классы.
const gpToDm = (i: GPItem): DMItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.code, qty: i.qty, proba: i.proba ?? 0, ligWeight: i.ligWeight ?? 0, netWeight: i.netWeight ?? 0, location: i.location, status: i.status, chem: i.chem });

// ── Склады ХАБ ───────────────────────────────────────────────────────────────

export function SkladyHub() {
  const { navigate } = useApp();

  return (
    <div>
      <PageHeader title="Склады" subtitle="Выберите раздел" breadcrumb={["Склады"]} />
      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("ostatok-dm")}>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Coins className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Остатки материалов на складе ДМ</h3>
          <p className="text-sm text-gray-500">{MAIN_SKLAD} — все позиции, включая готовую продукцию</p>
        </div>
      </div>
    </div>
  );
}

// ── Смена места хранения позиции ──────────────────────────────────────────────


function MoveLocationModal({ item, onClose, onSave }: { item: DMItem; onClose: () => void; onSave: (location: string) => void }) {
  const { storageLocations: locs } = useApp();
  const codeLabel = useMaterialCodeLabel();
  const cur = parseLoc(item.location);
  // Ячейки склада системы из справочника «Места хранения» (только доступные)
  const seyfs = seyfsOf(locs, MAIN_SKLAD);
  const [seyf, setSeyf] = useState(seyfs.includes(cur.seyf) ? cur.seyf : seyfs[0] ?? NO_LOC);
  const polkas = polkasOf(locs, MAIN_SKLAD, seyf);
  const [polka, setPolka] = useState(polkas.includes(cur.polka) ? cur.polka : polkas[0] ?? NO_LOC);
  const changeSeyf = (s: string) => { setSeyf(s); setPolka(polkasOf(locs, MAIN_SKLAD, s)[0] ?? NO_LOC); };
  const next = seyf !== NO_LOC ? formatLoc(seyf, polka) : "";
  const same = cur.seyf !== NO_LOC && cur.seyf === seyf && cur.polka === polka;

  const attrs: [string, React.ReactNode][] = [
    ["Номенкл. №", item.nomenkl],
    ["Наименование", item.name],
    ["Класс", <KlassCode value={item.klass} />],
    ["Код материала", codeLabel(item.metal)],
    ["Проба", item.proba || "—"],
    ["Вес лигат.", item.ligWeight],
  ];

  return (
    <Modal
      title="Изменение места хранения"
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => onSave(next)} disabled={!next || same}>Сохранить</Btn>
      </>}
    >
      {/* Позиция, у которой меняется место хранения */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
        {attrs.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-medium text-gray-900 truncate">{value}</div>
          </div>
        ))}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Текущее место хранения</h4>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Склад"><Input value={MAIN_SKLAD} disabled /></Field>
        {cur.seyf !== NO_LOC || !item.location || item.location === NO_LOC ? <>
          <Field label="Сейф"><Input value={cur.seyf} disabled /></Field>
          <Field label="Полка"><Input value={cur.polka} disabled /></Field>
        </> : (
          <div className="col-span-2"><Field label="Место хранения"><Input value={item.location} disabled /></Field></div>
        )}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Новое место хранения</h4>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Склад"><Input value={MAIN_SKLAD} disabled /></Field>
        <Field label="Сейф" required>
          {seyfs.length ? <Select value={seyf} options={seyfs} onChange={changeSeyf} /> : <Input value="Нет свободных мест" disabled />}
        </Field>
        <Field label="Полка">
          {polkas.length ? <Select value={polka} options={polkas} onChange={setPolka} /> : <Input value="—" disabled />}
        </Field>
      </div>
      {same && <div className="mt-3 text-xs text-gray-500">Выберите место хранения, отличное от текущего</div>}
    </Modal>
  );
}

// ── Merge DM modal ────────────────────────────────────────────────────────────

// Форма «Добавить позицию ДМ» с данными объединяемых позиций: массы и хим. состав суммируются,
// массы не редактируются; остальные поля (наименование, класс, код, проба, место и т.д.) — редактируемые.
function MergeModal({ items, onClose, onConfirm }: { items: DMItem[]; onClose: () => void; onConfirm: (p: PrihodPosition) => void }) {
  const totalLig = items.reduce((s, i) => s + i.ligWeight, 0);
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0);
  const same = <T,>(f: (i: DMItem) => T) => (items.every(i => f(i) === f(items[0])) ? f(items[0]) : undefined);
  // Химический состав — сумма по элементам
  const chem: Record<string, string> = {};
  for (const it of items) for (const [k, v] of Object.entries(it.chem ?? {})) {
    const n = parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(n)) chem[k] = String(+((parseFloat(chem[k] ?? "0") || 0) + n).toFixed(2));
  }
  const loc = parseLoc(items[0].location);
  // Количество изделий — сумма по позициям, где оно указано (поле остаётся редактируемым)
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const [initial] = useState<PrihodPosition>(() => ({
    // Наименование и проба не подставляются — вводятся вручную
    id: `merge-${Date.now()}`, nomenkl: "", name: "",
    klass: same(i => i.klass) ?? "Слиток", code: same(i => i.metal) ?? items[0].metal,
    kol: totalQty > 0 ? String(totalQty) : "", unit: "шт", proba: "",
    lig: totalLig.toFixed(2), net: totalNet.toFixed(2), seyf: loc.seyf, polka: loc.polka, chem,
  }));

  const codeLabel = useMaterialCodeLabel();
  const th = "px-3 py-1.5 text-left font-medium";
  // Позиции объединения — по 10 на странице; пустые строки сохраняют высоту таблицы
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const fillers = items.length > PER_PAGE ? PER_PAGE - pageItems.length : 0;
  const header = (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
        Объединяемые позиции ({items.length})
      </div>
      <table className="w-full text-sm tabular-nums">
        <thead><tr className="text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
          <th className={th}>Номенкл. №</th>
          <th className={th}>Наименование</th>
          <th className={th}>Количество изделий</th>
          <th className={th}>Класс</th>
          <th className={th}>Код материала</th>
          <th className={th}>Проба</th>
          <th className="px-3 py-1.5 text-right font-medium">Вес лигат.</th>
          <th className="px-3 py-1.5 text-right font-medium">Вес чист.</th>
          <th className={th}>Место хранения</th>
          <th className={th}>Статус</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {pageItems.map(it => (
            <tr key={it.id} className="h-8">
              <td className="px-3 py-1.5 text-gray-500">{it.nomenkl}</td>
              <td className="px-3 py-1.5 font-medium text-gray-900">{it.name}</td>
              <td className="px-3 py-1.5">{it.qty || "—"}</td>
              <td className="px-3 py-1.5"><KlassCode value={it.klass} /></td>
              <td className="px-3 py-1.5 text-blue-600 font-medium">{codeLabel(it.metal)}</td>
              <td className="px-3 py-1.5"><ProbaChem proba={it.proba} chem={it.chem} /></td>
              <td className="px-3 py-1.5 text-right">{it.ligWeight.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right">{it.netWeight.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-gray-500">{it.location}</td>
              <td className="px-3 py-1.5"><Badge label={it.status} group="pozicii" /></td>
            </tr>
          ))}
          {Array.from({ length: fillers }, (_, i) => <tr key={`f${i}`} className="h-8"><td colSpan={10}></td></tr>)}
        </tbody>
        <tfoot><tr className="bg-gray-50 font-semibold border-t border-gray-200">
          <td colSpan={6} className="px-3 py-1.5 text-xs uppercase text-gray-600">Итого</td>
          <td className="px-3 py-1.5 text-right">{totalLig.toFixed(2)}</td>
          <td className="px-3 py-1.5 text-right">{totalNet.toFixed(2)}</td>
          <td colSpan={2}></td>
        </tr></tfoot>
      </table>
      {items.length > PER_PAGE && <Pagination page={page} total={items.length} perPage={PER_PAGE} onPage={setPage} />}
    </div>
  );

  return (
    <DMPositionFormModal
      mode="add"
      sklad={MAIN_SKLAD}
      initial={initial}
      title="Объединение позиций"
      saveLabel="Подтвердить объединение"
      lockWeights
      extraWide
      fixedHeight
      header={header}
      onClose={onClose}
      onSave={onConfirm}
    />
  );
}

// ── Остатки на складе ДМ ──────────────────────────────────────────────────────

export function OstatokDM() {
  const { dmItems, setDmItems, gpItems, setGpItems, setSkladDocs, setVydachaDocs } = useApp();
  // Все позиции склада, любого класса (в том числе «Готовая продукция»), из учётов ДМ и ГП.
  const skladItems = [...dmItems, ...gpItems.map(gpToDm)];
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Экраны: /sklady/dm/view/:id, /sklady/dm/merge, /sklady/dm/prihod, /sklady/dm/vydacha
  const screen = useScreen();
  const viewItem = skladItems.find(it => it.id === screen.after("view")) ?? null;
  const showMerge = screen.has("merge");
  const showPrihod = screen.has("prihod");
  const showVydacha = screen.has("vydacha");
  // Отмеченные позиции (кроме «Закрыта» и «В подотчёте») — сразу попадают в накладную;
  // позиция из резерва при оформлении возвращает свою шихтовую карту в «Редактирование»
  const vydachaIds = skladItems.filter(it => selected.has(it.id) && (it.status === "На складе" || it.status === "Резерв")).map(it => it.id);
  // Смена места хранения: …/mesto/:id
  const moveItem = skladItems.find(it => it.id === screen.after("mesto")) ?? null;
  // Позиция физически на складе — место хранения можно изменить
  const canMove = (it: DMItem) => it.status === "На складе" || it.status === "Резерв";
  const saveLocation = (it: DMItem, location: string) => {
    // Позиция хранится в учёте ДМ или ГП — меняем там, где она есть
    if (dmItems.some(d => d.id === it.id)) setDmItems(prev => prev.map(d => (d.id === it.id ? { ...d, location } : d)));
    else setGpItems(prev => prev.map(g => (g.id === it.id ? { ...g, location } : g)));
    screen.close("mesto");
    show(`Место хранения изменено: ${location}`);
  };

  const perPage = 8;
  const filtered = skladItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchKlass = filterKlass === "Все классы" || it.klass === filterKlass;
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(it.status);
    return matchSearch && matchKlass && matchStatus;
  });
  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: it => it.name,
    nomenkl: it => it.nomenkl,
    klass: it => it.klass,
    metal: it => codeLabel(it.metal),
    qty: it => it.qty,
    proba: it => it.proba,
    ligWeight: it => it.ligWeight,
    netWeight: it => it.netWeight,
    location: it => it.location,
    status: it => it.status,
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Закрытые (выданные) позиции в объединении не участвуют
  // В объединении участвуют только позиции на складе: закрытые и выданные в подотчёт — нет
  const canMerge = (it: DMItem) => it.status !== "Закрыта" && it.status !== "В подотчёте";
  const selectedItems = skladItems.filter(it => selected.has(it.id) && canMerge(it));
  // Экран объединения, открытый по прямой ссылке без выбора, показывает первые две доступные позиции
  const mergeItems = selectedItems.length >= 2 ? selectedItems : skladItems.filter(canMerge).slice(0, 2);

  const doMerge = (p: PrihodPosition) => {
    const ids = new Set(mergeItems.map(it => it.id));
    const merged: DMItem = {
      id: `dm-merged-${Date.now()}`,
      name: p.name.trim(),
      nomenkl: p.nomenkl,
      metal: p.code,
      klass: p.klass,
      qty: parseInt(p.kol, 10) || 0,
      proba: parseFloat(p.proba) || 0,
      ligWeight: parseFloat(p.lig) || 0,
      netWeight: parseFloat(p.net) || 0,
      location: formatLoc(p.seyf, p.polka),
      status: "На складе",
      chem: p.chem,
    };
    setDmItems(prev => [...prev.filter(it => !ids.has(it.id)), merged]);
    setGpItems(prev => prev.filter(it => !ids.has(it.id)));
    setSelected(new Set());
    screen.close("merge");
    show(`Позиции объединены: ${merged.nomenkl}`);
  };

  return (
    <div>
      <PageHeader
        title="Остатки материалов на складе ДМ"
        subtitle={`${MAIN_SKLAD}: актуальные позиции по сейфам и полкам`}
        breadcrumb={["Склады", "Остатки на складе ДМ"]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("prihod")}>Принять на склад</Btn>
            <Btn variant="secondary" onClick={() => screen.openTop("vydacha")}>Выдать со склада{vydachaIds.length ? ` (${vydachaIds.length})` : ""}</Btn>
            <Btn variant="secondary" disabled={selectedItems.length < 2} onClick={() => screen.openTop("merge")}>Объединить позиции{selectedItems.length ? ` (${selectedItems.length})` : ""}</Btn>
            <ExportBtn onToast={show} />
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Класс материала</label>
          <KlassSelect value={filterKlass} onChange={setFilterKlass} allLabel="Все классы" />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <MultiSelect values={filterStatus} options={["На складе", "Резерв", "В подотчёте", "Закрыта"]} onChange={setFilterStatus} allLabel="Все статусы" />
        </div>
        <button onClick={() => { setSearch(""); setFilterKlass("Все классы"); setFilterStatus([]); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Сбросить фильтры
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left">
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.filter(canMerge).map(i => i.id)) : new Set())} />
                  <span className={`text-xs font-medium ${selectedItems.length ? "text-blue-600" : "text-gray-400"}`} title="Выбрано позиций">{selectedItems.length}</span>
                </label>
              </th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество изделий</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort}>Проба</SortTh>
              <SortTh sortKey="ligWeight" sort={sort} onSort={toggleSort}>Вес лигат.</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort}>Вес чист.</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id) && canMerge(item)} onChange={() => toggleSelect(item.id)} disabled={!canMerge(item)} title={canMerge(item) ? undefined : `Позиция «${item.status}» — объединение недоступно`} /></td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3">{item.qty || "—"}</td>
                <td className="px-4 py-3"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{codeLabel(item.metal)}</td>
                <td className="px-4 py-3"><ProbaChem proba={item.proba} chem={item.chem} /></td>
                <td className="px-4 py-3">{item.ligWeight}</td>
                <td className="px-4 py-3">{item.netWeight}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} group="pozicii" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => screen.openTop("view", item.id)} />
                    <EditIcon
                      onClick={() => screen.openTop("mesto", item.id)}
                      disabled={!canMove(item)}
                      title={canMove(item) ? "Изменить место хранения" : "Позиция не на складе — место хранения не меняется"}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && (
        <DMPositionViewModal item={viewItem} onClose={() => screen.close("view")} />
      )}
      {moveItem && (
        <MoveLocationModal key={moveItem.id} item={moveItem} onClose={() => screen.close("mesto")} onSave={loc => saveLocation(moveItem, loc)} />
      )}
      {showMerge && mergeItems.length >= 2 && <MergeModal items={mergeItems} onClose={() => screen.close("merge")} onConfirm={doMerge} />}
      {showPrihod && (
        <PrihodDocModal
          onClose={() => screen.close("prihod")}
          onSave={d => { setSkladDocs(prev => [d, ...prev]); screen.close("prihod"); show(`Документ ${d.number} сохранён`); }}
        />
      )}
      {showVydacha && (
        <VydachaDocModal
          preselectIds={vydachaIds}
          onClose={() => screen.close("vydacha")}
          onSave={d => { setVydachaDocs(prev => [d, ...prev]); setSelected(new Set()); screen.close("vydacha"); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
