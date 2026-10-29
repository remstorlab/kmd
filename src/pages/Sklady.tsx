import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, PosStatusBadge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, usePerPage, FillerRows, fillerCount, usePaged, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, MultiSelect, KlassSelect, KlassCode, MaterialCodeSelect, useMaterialCodeLabel, FileChip, Toggle, SortTh, useSort, ProbaChem,
  CREATED_LABEL, CreatedCell, createdSortKey, useCreatedStamp,
} from "../components/ui";
import { GPItem, DMItem, SDM1, SDM2, SOGP } from "../data/mock";
import { Coins } from "lucide-react";
import DMPositionViewModal from "../components/DMPositionViewModal";
import DMPositionFormModal, { PrihodPosition, seyfsOf, polkasOf, formatLoc, parseLoc, NO_LOC } from "../components/DMPositionFormModal";
import { useScreen } from "../router";

// Позиции учёта ГП в виде позиций склада ДМ — склад один, показываются все классы.
const gpToDm = (i: GPItem): DMItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.code, qty: i.qty, proba: i.proba ?? 0, ligWeight: i.ligWeight ?? 0, netWeight: i.netWeight ?? 0, location: i.location, sklad: i.sklad, status: i.status, chem: i.chem, zakazchik: i.zakazchik, ownProperty: i.ownProperty, createdAt: i.createdAt, createdBy: i.createdBy });

// ── Склады ХАБ ───────────────────────────────────────────────────────────────

// Подразделы «Склады»: у каждого склада свой экран остатков (сотрудник склада видит только позиции своего склада)
export const SKLAD_PAGES: { page: "ostatok-sdm1" | "ostatok-sdm2" | "ostatok-sogp"; sklad: string; title: string; sub: string }[] = [
  { page: "ostatok-sdm1", sklad: SDM1, title: `Остатки материалов на ${SDM1}`, sub: "Склад приёмки: принятые позиции и резерв под шихтовые карты" },
  { page: "ostatok-sdm2", sklad: SDM2, title: `Остатки материалов на ${SDM2}`, sub: "Производственный склад: позиции для отгрузки и операций движения материала" },
  { page: "ostatok-sogp", sklad: SOGP, title: `Остатки на ${SOGP}`, sub: "Позиции, выданные с СДМ №2 по документам Выдачи" },
];

export function SkladyHub() {
  const { navigate } = useApp();

  return (
    <div>
      <PageHeader title="Склады" subtitle="Выберите раздел" breadcrumb={["Склады"]} />
      <div className="grid grid-cols-3 gap-6 max-w-5xl">
        {SKLAD_PAGES.map(s => (
          <div key={s.page} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(s.page)}>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
            <p className="text-sm text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Смена места хранения позиции ──────────────────────────────────────────────


function MoveLocationModal({ item, onClose, onSave }: { item: DMItem; onClose: () => void; onSave: (location: string, name: string) => void }) {
  const { storageLocations: locs } = useApp();
  const codeLabel = useMaterialCodeLabel();
  const cur = parseLoc(item.location);
  // Ячейки склада системы из справочника «Места хранения» (только доступные)
  const seyfs = seyfsOf(locs, item.sklad);
  const [seyf, setSeyf] = useState(seyfs.includes(cur.seyf) ? cur.seyf : seyfs[0] ?? NO_LOC);
  const polkas = polkasOf(locs, item.sklad, seyf);
  const [polka, setPolka] = useState(polkas.includes(cur.polka) ? cur.polka : polkas[0] ?? NO_LOC);
  const changeSeyf = (s: string) => { setSeyf(s); setPolka(polkasOf(locs, item.sklad, s)[0] ?? NO_LOC); };
  const next = seyf !== NO_LOC ? formatLoc(seyf, polka) : "";
  const same = cur.seyf !== NO_LOC && cur.seyf === seyf && cur.polka === polka;
  const [name, setName] = useState(item.name);
  const nameChanged = name.trim() !== item.name;
  // Сохранить можно, если изменено место хранения и/или наименование
  const canSave = !!name.trim() && (nameChanged || (!!next && !same));

  const attrs: [string, React.ReactNode][] = [
    ["Номенкл. №", item.nomenkl],
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
        <Btn onClick={() => onSave(same || !next ? item.location : next, name.trim())} disabled={!canSave}>Сохранить</Btn>
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

      <div className="mb-5">
        <Field label="Наименование" required><Input value={name} onChange={setName} placeholder="Наименование позиции" /></Field>
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Текущее место хранения</h4>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Склад"><Input value={item.sklad} disabled /></Field>
        {cur.seyf !== NO_LOC || !item.location || item.location === NO_LOC ? <>
          <Field label="Сейф"><Input value={cur.seyf} disabled /></Field>
          <Field label="Полка"><Input value={cur.polka} disabled /></Field>
        </> : (
          <div className="col-span-2"><Field label="Место хранения"><Input value={item.location} disabled /></Field></div>
        )}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Новое место хранения</h4>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Склад"><Input value={item.sklad} disabled /></Field>
        <Field label="Сейф" required>
          {seyfs.length ? <Select value={seyf} options={seyfs} onChange={changeSeyf} /> : <Input value="Нет свободных мест" disabled />}
        </Field>
        <Field label="Полка">
          {polkas.length ? <Select value={polka} options={polkas} onChange={setPolka} /> : <Input value="—" disabled />}
        </Field>
      </div>
      {same && !nameChanged && <div className="mt-3 text-xs text-gray-500">Измените наименование или выберите место хранения, отличное от текущего</div>}
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
  // Позиции объединения — постранично (по умолчанию 10); пустые строки сохраняют высоту таблицы
  const { pageItems, fill: fillers, pager } = usePaged(items, "merge-items", 10);
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
              <td className="px-3 py-1.5"><PosStatusBadge status={it.status} nomenkl={it.nomenkl} /></td>
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
      {pager}
    </div>
  );

  return (
    <DMPositionFormModal
      mode="add"
      sklad={items[0].sklad}
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

// ── Остатки на складе (СДМ №1 / СДМ №2) ─────────────────────────────────────
// Экран одного склада: только позиции со значением «Склад» = sklad. Приём и выдача здесь не оформляются —
// только в «Складских операциях» (Приход / Выдача); на экране — просмотр, смена места хранения и объединение.

export function OstatokSklad({ sklad }: { sklad: string }) {
  const { dmItems, setDmItems, gpItems, setGpItems } = useApp();
  const createdStamp = useCreatedStamp();
  // Позиции склада любого класса (в том числе «Готовая продукция») из учётов ДМ и ГП
  const skladItems = [...dmItems, ...gpItems.map(gpToDm)].filter(it => it.sklad === sklad);
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  // Код материала (по подписи из справочника) и проба — множественный выбор
  const [filterCode, setFilterCode] = useState<string[]>([]);
  const [filterProba, setFilterProba] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Экраны: /sklady/sdmN/view/:id, /sklady/sdmN/merge, /sklady/sdmN/mesto/:id
  const screen = useScreen();
  const viewItem = skladItems.find(it => it.id === screen.after("view")) ?? null;
  const showMerge = screen.has("merge");
  // Смена места хранения: …/mesto/:id
  const moveItem = skladItems.find(it => it.id === screen.after("mesto")) ?? null;
  // Позиция физически на складе — место хранения можно изменить
  // На СОГП мест хранения нет — позиции хранятся без места («-»)
  const noLocations = sklad === SOGP;
  const canMove = (it: DMItem) => !noLocations && (it.status === "На складе" || it.status === "Резерв");
  const saveLocation = (it: DMItem, location: string, name: string) => {
    // Позиция хранится в учёте ДМ или ГП — меняем там, где она есть
    if (dmItems.some(d => d.id === it.id)) setDmItems(prev => prev.map(d => (d.id === it.id ? { ...d, location, name } : d)));
    else setGpItems(prev => prev.map(g => (g.id === it.id ? { ...g, location, name } : g)));
    screen.close("mesto");
    show(location !== it.location ? `Место хранения изменено: ${location}` : `Наименование изменено: ${name}`);
  };

  const [perPage, setPerPage] = usePerPage("sklad-dm", 8);
  const filtered = skladItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchKlass = filterKlass === "Все классы" || it.klass === filterKlass;
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(it.status);
    const matchCode = filterCode.length === 0 || filterCode.includes(codeLabel(it.metal));
    const matchProba = filterProba.length === 0 || filterProba.includes(String(it.proba));
    return matchSearch && matchKlass && matchStatus && matchCode && matchProba;
  });
  // Варианты фильтров — из позиций этого склада
  const codeOptions = Array.from(new Set(skladItems.filter(it => it.metal).map(it => codeLabel(it.metal)))).sort();
  const probaOptions = Array.from(new Set(skladItems.filter(it => it.proba).map(it => String(it.proba)))).sort((a, b) => Number(a) - Number(b));
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
    sklad: it => it.sklad,
    status: it => it.status,
    created: it => createdSortKey(it),
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
  // На экране только позиции одного склада — объединяются позиции этого склада
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
      sklad,
      status: "На складе",
      chem: p.chem,
      info: p.info || undefined,
      ...(new Set(mergeItems.map(it => it.zakazchik)).size === 1 && mergeItems[0].zakazchik
        ? { zakazchik: mergeItems[0].zakazchik, ownProperty: mergeItems.every(it => it.ownProperty) }
        : {}),
      ...createdStamp(),
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
        title={`Остатки материалов на ${sklad}`}
        subtitle={noLocations ? `${sklad}: позиции, выданные со склада (без мест хранения)` : `${sklad}: актуальные позиции по сейфам и полкам`}
        breadcrumb={["Склады", `Остатки на ${sklad}`]}
        actions={
          <>
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Код материала</label>
          <MultiSelect values={filterCode} options={codeOptions} onChange={setFilterCode} allLabel="Все коды" />
        </div>
        <div className="min-w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Проба</label>
          <MultiSelect values={filterProba} options={probaOptions} onChange={setFilterProba} allLabel="Все пробы" />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <MultiSelect values={filterStatus} options={["На складе", "Резерв", "В подотчёте", "Закрыта"]} onChange={setFilterStatus} allLabel="Все статусы" />
        </div>
        <button onClick={() => { setSearch(""); setFilterKlass("Все классы"); setFilterStatus([]); setFilterCode([]); setFilterProba([]); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
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
              <SortTh sortKey="sklad" sort={sort} onSort={toggleSort}>Склад</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <SortTh sortKey="created" sort={sort} onSort={toggleSort}>{CREATED_LABEL}</SortTh>
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
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.sklad}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><PosStatusBadge status={item.status} nomenkl={item.nomenkl} /></td>
                <CreatedCell row={item} />
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => screen.openTop("view", item.id)} />
                    <EditIcon
                      onClick={() => screen.openTop("mesto", item.id)}
                      disabled={!canMove(item)}
                      title={canMove(item) ? "Изменить место хранения" : noLocations ? `На складе «${SOGP}» места хранения не ведутся` : "Позиция не на складе — место хранения не меняется"}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <FillerRows count={fillerCount(filtered.length, page, perPage)} cols={14} />
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {viewItem && (
        <DMPositionViewModal item={viewItem} onClose={() => screen.close("view")} />
      )}
      {moveItem && (
        <MoveLocationModal key={moveItem.id} item={moveItem} onClose={() => screen.close("mesto")} onSave={(loc, name) => saveLocation(moveItem, loc, name)} />
      )}
      {showMerge && mergeItems.length >= 2 && <MergeModal items={mergeItems} onClose={() => screen.close("merge")} onConfirm={doMerge} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function OstatokSdm1() {
  return <OstatokSklad key={SDM1} sklad={SDM1} />;
}

export function OstatokSdm2() {
  return <OstatokSklad key={SDM2} sklad={SDM2} />;
}

export function OstatokSogp() {
  return <OstatokSklad key={SOGP} sklad={SOGP} />;
}
