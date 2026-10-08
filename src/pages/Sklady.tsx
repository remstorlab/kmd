import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, useMaterialCodeLabel, FileChip, Toggle, SortTh, useSort,
} from "../components/ui";
import { GPItem, DMItem, isGPKlass } from "../data/mock";
import { Gem, Coins, Plus } from "lucide-react";
import PrihodDocModal from "../components/PrihodDocModal";
import VydachaDocModal from "../components/VydachaDocModal";
import DMPositionViewModal from "../components/DMPositionViewModal";
import { useNextNomenkl } from "../components/DMPositionFormModal";
import { useScreen } from "../router";

// Приведение позиций между учётами ГП и ДМ — для разделения складов по классу материала.
const dmToGp = (i: DMItem): GPItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, qty: i.qty, unit: "шт", klass: i.klass, code: i.metal, location: i.location, status: i.status, proba: i.proba, ligWeight: i.ligWeight, netWeight: i.netWeight });
const gpToDm = (i: GPItem): DMItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.code, qty: i.qty, proba: i.proba ?? 0, ligWeight: i.ligWeight ?? 0, netWeight: i.netWeight ?? 0, location: i.location, status: i.status });

// ── Склады ХАБ ───────────────────────────────────────────────────────────────

export function SkladyHub() {
  const { navigate } = useApp();

  return (
    <div>
      <PageHeader title="Склады" subtitle="Выберите раздел" breadcrumb={["Склады"]} />
      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("ostatok-gp")}>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Gem className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Остатки на складе ГП</h3>
          <p className="text-sm text-gray-500">Готовая продукция</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("ostatok-dm")}>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Coins className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Остатки на складе ДМ</h3>
          <p className="text-sm text-gray-500">Драгоценные материалы</p>
        </div>
      </div>
    </div>
  );
}

// ── GP Item view modal ────────────────────────────────────────────────────────

function GPViewModal({ item, onClose }: { item: GPItem; onClose: () => void }) {
  const codeLabel = useMaterialCodeLabel();
  return (
    <Modal title="Просмотр позиции ГП" onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Закрыть</Btn>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Наименование"><Input value={item.name} disabled /></Field>
        <Field label="Номенклатурный №"><Input value={item.nomenkl} disabled /></Field>
        <Field label="Количество"><Input value={`${item.qty} ${item.unit}`} disabled /></Field>
        <Field label="Класс"><Input value={item.klass} disabled /></Field>
        <Field label="Код материала"><Input value={codeLabel(item.code)} disabled /></Field>
        <Field label="Место хранения"><Input value={item.location} disabled /></Field>
        <Field label="Статус"><Badge label={item.status} /></Field>
      </div>
    </Modal>
  );
}

// ── Остатки на складе ГП ──────────────────────────────────────────────────────

export function OstatokGP() {
  const { gpItems, setGpItems, dmItems, navigate, setSkladDocs, setVydachaDocs } = useApp();
  // Склад ГП: все позиции с классом «Готовая продукция», в том числе из учёта ДМ.
  const skladItems = [...gpItems, ...dmItems.map(dmToGp)].filter(it => isGPKlass(it.klass));
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();

  const [search, setSearch] = useState("");
  const [filterSklad, setFilterSklad] = useState("Все склады");
  const [filterCode, setFilterCode] = useState("Все коды");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Экраны: /sklady/gp/view/:id, /sklady/gp/prihod, /sklady/gp/vydacha
  const screen = useScreen();
  const viewItem = skladItems.find(it => it.id === screen.after("view")) ?? null;
  const showPrihod = screen.has("prihod");
  const showVydacha = screen.has("vydacha");

  const perPage = 8;

  const filtered = skladItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchSklad = filterSklad === "Все склады" || filterSklad === "Склад ГП";
    const matchCode = filterCode === "Все коды" || it.code === filterCode;
    const matchStatus = filterStatus === "Все статусы" || it.status === filterStatus;
    return matchSearch && matchSklad && matchCode && matchStatus;
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: it => it.name,
    nomenkl: it => it.nomenkl,
    qty: it => it.qty,
    klass: it => it.klass,
    code: it => codeLabel(it.code),
    proba: it => it.proba ?? 0,
    ligWeight: it => it.ligWeight ?? 0,
    netWeight: it => it.netWeight ?? 0,
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

  const handleDelete = (id: string) => {
    confirm("Удалить позицию?", () => setGpItems(prev => prev.filter(it => it.id !== id)));
  };

  return (
    <div>
      <PageHeader
        title="Остатки на складе ГП"
        subtitle="Актуальные позиции готовой продукции"
        breadcrumb={["Склады", "Остатки на складе ГП"]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("prihod")}>
              <Plus className="w-4 h-4" />
              Принять на склад
            </Btn>
            <Btn variant="secondary" onClick={() => screen.openTop("vydacha")}>Выдать со склада</Btn>
            <ExportBtn onToast={show} />
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Склад</label>
          <select value={filterSklad} onChange={e => setFilterSklad(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все склады", "Склад ГП", "Склад ДМ №1"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск по наименованию..." />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Код материала</label>
          <MaterialCodeSelect value={filterCode} onChange={setFilterCode} allLabel="Все коды" />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "На складе", "Резерв", "В подотчёте", "Закрыта"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterSklad("Все склады"); setFilterCode("Все коды"); setFilterStatus("Все статусы"); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Сбросить фильтры
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())} /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort}>Проба</SortTh>
              <SortTh sortKey="ligWeight" sort={sort} onSort={toggleSort}>Лигат. вес г</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort}>Чистый вес г</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                </td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3 text-gray-700"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{codeLabel(item.code)}</td>
                <td className="px-4 py-3">{item.proba ?? "—"}</td>
                <td className="px-4 py-3">{item.ligWeight ?? "—"}</td>
                <td className="px-4 py-3">{item.netWeight ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3">
                  <EyeIcon onClick={() => screen.openTop("view", item.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && <GPViewModal item={viewItem} onClose={() => screen.close("view")} />}
      {showPrihod && (
        <PrihodDocModal
          onlyNaklad
          nakladType="Накладная на приём ГП"
          onClose={() => screen.close("prihod")}
          onSave={d => { setSkladDocs(prev => [d, ...prev]); screen.close("prihod"); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {showVydacha && (
        <VydachaDocModal
          kind="ГП"
          onClose={() => screen.close("vydacha")}
          onSave={d => { setVydachaDocs(prev => [d, ...prev]); screen.close("vydacha"); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Merge DM modal ────────────────────────────────────────────────────────────

function MergeModal({ items, onClose, onConfirm }: { items: DMItem[]; onClose: () => void; onConfirm: () => void }) {
  const totalLig = items.reduce((s, i) => s + i.ligWeight, 0);
  const avgProba = Math.round(items.reduce((s, i) => s + i.proba * i.ligWeight, 0) / totalLig);
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0);

  return (
    <Modal
      title="Объединение позиций"
      onClose={onClose}
      wide
      footer={<><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={onConfirm}>Подтвердить объединение</Btn></>}
    >
      <div className="mb-4 space-y-2">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg text-sm">
            <div>
              <span className="font-medium text-gray-900">{it.name}</span>
              <span className="text-gray-400 ml-2">{it.nomenkl}</span>
            </div>
            <span className="text-gray-600">{it.ligWeight} г</span>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Итоговая позиция</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Класс:</span> <span className="font-medium">Слиток</span></div>
          <div><span className="text-gray-500">Средняя проба:</span> <span className="font-medium">{avgProba}</span></div>
          <div><span className="text-gray-500">Лигатурный вес:</span> <span className="font-medium">{totalLig.toFixed(2)} г</span></div>
          <div><span className="text-gray-500">Чистый вес:</span> <span className="font-medium">{totalNet.toFixed(2)} г</span></div>
        </div>
      </div>
    </Modal>
  );
}

// ── Остатки на складе ДМ ──────────────────────────────────────────────────────

export function OstatokDM() {
  const { dmItems, setDmItems, gpItems, setGpItems, setSkladDocs, setVydachaDocs } = useApp();
  // Склад ДМ: все позиции, класс которых не «Готовая продукция», в том числе из учёта ГП.
  const skladItems = [...dmItems, ...gpItems.map(gpToDm)].filter(it => !isGPKlass(it.klass));
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Экраны: /sklady/dm/view/:id, /sklady/dm/merge, /sklady/dm/prihod, /sklady/dm/vydacha
  const screen = useScreen();
  const viewItem = skladItems.find(it => it.id === screen.after("view")) ?? null;
  const showMerge = screen.has("merge");
  const showPrihod = screen.has("prihod");
  const showVydacha = screen.has("vydacha");

  const perPage = 8;
  const filtered = skladItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchKlass = filterKlass === "Все классы" || it.klass === filterKlass;
    const matchStatus = filterStatus === "Все статусы" || it.status === filterStatus;
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

  const genNomenkl = useNextNomenkl();
  // Закрытые (выданные) позиции в объединении не участвуют
  const selectedItems = skladItems.filter(it => selected.has(it.id) && it.status !== "Закрыта");
  // Экран объединения, открытый по прямой ссылке без выбора, показывает первые две доступные позиции
  const mergeItems = selectedItems.length >= 2 ? selectedItems : skladItems.filter(it => it.status !== "Закрыта").slice(0, 2);

  const doMerge = () => {
    const ids = new Set(mergeItems.map(it => it.id));
    const selectedItems = mergeItems;
    const totalLig = selectedItems.reduce((s, i) => s + i.ligWeight, 0);
    const avgProba = Math.round(selectedItems.reduce((s, i) => s + i.proba * i.ligWeight, 0) / totalLig);
    const totalNet = selectedItems.reduce((s, i) => s + i.netWeight, 0);
    const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0);
    const merged: DMItem = {
      id: `dm-merged-${Date.now()}`,
      name: `Объединённая позиция (${selectedItems.length} ед.)`,
      nomenkl: genNomenkl(),
      metal: selectedItems[0].metal,
      klass: "Слиток",
      qty: totalQty,
      proba: avgProba,
      ligWeight: totalLig,
      netWeight: totalNet,
      location: selectedItems[0].location,
      status: "На складе",
    };
    setDmItems(prev => [...prev.filter(it => !ids.has(it.id)), merged]);
    setGpItems(prev => prev.filter(it => !ids.has(it.id)));
    setSelected(new Set());
    screen.close("merge");
    show("Позиции объединены");
  };

  return (
    <div>
      <PageHeader
        title="Остатки материалов на складе ДМ"
        subtitle="Актуальные позиции по всем складам, сейфам и полкам"
        breadcrumb={["Склады", "Остатки на складе ДМ"]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("prihod")}>Принять на склад</Btn>
            <Btn variant="secondary" onClick={() => screen.openTop("vydacha")}>Выдать со склада</Btn>
            <Btn variant="secondary" disabled={selectedItems.length < 2} onClick={() => screen.openTop("merge")}>Объединить позиции</Btn>
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
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "На складе", "Резерв", "В подотчёте", "Закрыта"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterKlass("Все классы"); setFilterStatus("Все статусы"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Сбросить фильтры
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.filter(i => i.status !== "Закрыта").map(i => i.id)) : new Set())} /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort}>Проба</SortTh>
              <SortTh sortKey="ligWeight" sort={sort} onSort={toggleSort}>Лигат. вес г</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort}>Чистый вес г</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} disabled={item.status === "Закрыта"} title={item.status === "Закрыта" ? "Позиция закрыта — объединение недоступно" : undefined} /></td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{codeLabel(item.metal)}</td>
                <td className="px-4 py-3">{item.proba}</td>
                <td className="px-4 py-3">{item.ligWeight}</td>
                <td className="px-4 py-3">{item.netWeight}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3"><EyeIcon onClick={() => screen.openTop("view", item.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && (
        <DMPositionViewModal item={viewItem} onClose={() => screen.close("view")} />
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
          kind="ДМ"
          onClose={() => screen.close("vydacha")}
          onSave={d => { setVydachaDocs(prev => [d, ...prev]); screen.close("vydacha"); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
