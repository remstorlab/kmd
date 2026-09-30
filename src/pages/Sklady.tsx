import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, FileChip, Toggle, SortTh, useSort,
} from "../components/ui";
import { GPItem, DMItem, isGPKlass } from "../data/mock";
import { Gem, Coins, Plus } from "lucide-react";
import PrihodDocModal from "../components/PrihodDocModal";

// Приведение позиций между учётами ГП и ДМ — для разделения складов по классу материала.
const dmToGp = (i: DMItem): GPItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, qty: i.qty, unit: "шт", klass: i.klass, code: i.metal, location: i.location, status: i.status });
const gpToDm = (i: GPItem): DMItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.code, qty: i.qty, proba: 0, ligWeight: 0, netWeight: 0, location: i.location, status: i.status });

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
  return (
    <Modal title="Просмотр позиции ГП" onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Закрыть</Btn>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Наименование"><Input value={item.name} disabled /></Field>
        <Field label="Номенклатурный №"><Input value={item.nomenkl} disabled /></Field>
        <Field label="Количество"><Input value={`${item.qty} ${item.unit}`} disabled /></Field>
        <Field label="Класс"><Input value={item.klass} disabled /></Field>
        <Field label="Код материала"><Input value={item.code} disabled /></Field>
        <Field label="Место хранения"><Input value={item.location} disabled /></Field>
        <Field label="Статус"><Badge label={item.status} /></Field>
      </div>
    </Modal>
  );
}

// ── Выдача со склада GP modal ─────────────────────────────────────────────────

function VydachaGPModal({ gpItems, onClose, onSave }: { gpItems: GPItem[]; onClose: () => void; onSave: () => void }) {
  const [items, setItems] = useState<{ name: string; nomenkl: string; qty: string; klass: string; code: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nomenkl: gpItems[0]?.nomenkl || "", qty: "" });
  const [head, setHead] = useState(() => ({
    number: `НО-${Math.floor(Math.random() * 900 + 100)}`,
    date: new Date().toLocaleDateString("ru-RU"),
    poluchatel: "ТД «Золото Казахстана»",
    schetFaktura: "",
  }));

  const addItem = () => {
    const src = gpItems.find(i => i.nomenkl === form.nomenkl);
    if (!src) return;
    setItems(prev => [...prev, { name: src.name, nomenkl: src.nomenkl, qty: form.qty || "1", klass: src.klass, code: src.code }]);
    setShowAdd(false);
    setForm({ nomenkl: gpItems[0]?.nomenkl || "", qty: "" });
  };

  const { sorted: sortedItems, sort: itemsSort, toggleSort: toggleItemsSort } = useSort(items, {
    name: it => it.name,
    qty: it => parseFloat(it.qty) || 0,
    klass: it => it.klass,
    code: it => it.code,
  });

  return (
    <Modal
      title="Накладная на отгрузку ГП"
      onClose={onClose}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={onSave}>Оформить выдачу</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Тип документа"><Select value="Накладная на отгрузку ГП" options={["Накладная на отгрузку ГП"]} /></Field>
        <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} /></Field>
        <Field label="Получатель"><Select value={head.poluchatel} options={["ТД «Золото Казахстана»", "ИП Сейткали А.М."]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} /></Field>
        <Field label="Счёт-фактура" full><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} placeholder="Номер счёт-фактуры" /></Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции выдачи</h3>
          <div className="flex gap-2">
            <Btn size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Нет позиций. Нажмите «+ Добавить позицию»</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs">
              <SortTh sortKey="name" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="qty" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Кол-во</SortTh>
              <SortTh sortKey="klass" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Код</SortTh>
            </tr></thead>
            <tbody>{sortedItems.map((it, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2">{it.qty} шт</td>
                <td className="px-3 py-2"><KlassCode value={it.klass} /></td>
                <td className="px-3 py-2 text-blue-600">{it.code}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Добавить позицию для выдачи" onClose={() => setShowAdd(false)} footer={
          <>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn>
            <Btn onClick={addItem}>Добавить</Btn>
          </>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Номенкл. номер" full>
              <Select value={form.nomenkl} options={gpItems.map(i => i.nomenkl)} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} />
            </Field>
            <Field label="Количество"><Input value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} placeholder="0" /></Field>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── Остатки на складе ГП ──────────────────────────────────────────────────────

export function OstatokGP() {
  const { gpItems, setGpItems, dmItems, navigate, setSkladDocs } = useApp();
  // Склад ГП: все позиции с классом «Готовая продукция», в том числе из учёта ДМ.
  const skladItems = [...gpItems, ...dmItems.map(dmToGp)].filter(it => isGPKlass(it.klass));
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();

  const [search, setSearch] = useState("");
  const [filterSklad, setFilterSklad] = useState("Все склады");
  const [filterCode, setFilterCode] = useState("Все коды");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewItem, setViewItem] = useState<GPItem | null>(null);
  const [showPrihod, setShowPrihod] = useState(false);
  const [showVydacha, setShowVydacha] = useState(false);

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
    code: it => it.code,
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
            <Btn onClick={() => setShowPrihod(true)}>
              <Plus className="w-4 h-4" />
              Принять на склад
            </Btn>
            <Btn variant="secondary" onClick={() => setShowVydacha(true)}>Выдать со склада</Btn>
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
            {["Все статусы", "На складе", "Резерв", "В подотчёте"].map(o => <option key={o}>{o}</option>)}
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
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код материала</SortTh>
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
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3">{item.qty} {item.unit}</td>
                <td className="px-4 py-3 text-gray-700"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3">
                  <EyeIcon onClick={() => setViewItem(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && <GPViewModal item={viewItem} onClose={() => setViewItem(null)} />}
      {showPrihod && (
        <PrihodDocModal
          onlyNaklad
          nakladType="Накладная на приём ГП"
          onClose={() => setShowPrihod(false)}
          onSave={d => { setSkladDocs(prev => [d, ...prev]); setShowPrihod(false); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {showVydacha && (
        <VydachaGPModal
          gpItems={skladItems}
          onClose={() => setShowVydacha(false)}
          onSave={() => { setShowVydacha(false); show("Выдача оформлена"); }}
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

// ── Выдача со склада ДМ modal ─────────────────────────────────────────────────

function VydachaDMModal({ dmItems, onClose, onSave }: { dmItems: DMItem[]; onClose: () => void; onSave: () => void }) {
  const availableItems = dmItems.filter(i => i.status === "На складе");
  const [items, setItems] = useState<{ name: string; nomenkl: string; qty: string; klass: string; metal: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nomenkl: availableItems[0]?.nomenkl || "", qty: "" });
  const [head, setHead] = useState(() => ({
    number: `НО-${Math.floor(Math.random() * 900 + 100)}`,
    date: new Date().toLocaleDateString("ru-RU"),
    poluchatel: "ТД «Золото Казахстана»",
    schetFaktura: "",
  }));

  const addItem = () => {
    const src = availableItems.find(i => i.nomenkl === form.nomenkl);
    if (!src) return;
    setItems(prev => [...prev, { name: src.name, nomenkl: src.nomenkl, qty: form.qty || "1", klass: src.klass, metal: src.metal }]);
    setShowAdd(false);
    setForm({ nomenkl: availableItems[0]?.nomenkl || "", qty: "" });
  };

  const { sorted: sortedItems, sort: itemsSort, toggleSort: toggleItemsSort } = useSort(items, {
    name: it => it.name,
    qty: it => parseFloat(it.qty) || 0,
    klass: it => it.klass,
    metal: it => it.metal,
  });

  return (
    <Modal
      title="Накладная на отгрузку"
      onClose={onClose}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={onSave}>Оформить выдачу</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Тип документа"><Select value="Накладная на отгрузку" options={["Накладная на отгрузку"]} /></Field>
        <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} /></Field>
        <Field label="Получатель"><Select value={head.poluchatel} options={["ТД «Золото Казахстана»", "АО «Металл Инвест»"]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} /></Field>
        <Field label="Счёт-фактура" full><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} placeholder="Номер счёт-фактуры" /></Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции выдачи</h3>
          <div className="flex gap-2">
            <Btn size="sm" onClick={() => setShowAdd(true)} disabled={availableItems.length === 0}><Plus className="w-4 h-4" />Добавить позицию</Btn>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Нет позиций. Нажмите «+ Добавить позицию»</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs">
              <SortTh sortKey="name" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="qty" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Кол-во</SortTh>
              <SortTh sortKey="klass" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="metal" sort={itemsSort} onSort={toggleItemsSort} className="px-3 py-2">Металл</SortTh>
            </tr></thead>
            <tbody>{sortedItems.map((it, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2">{it.qty} шт</td>
                <td className="px-3 py-2"><KlassCode value={it.klass} /></td>
                <td className="px-3 py-2 text-blue-600">{it.metal}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Добавить позицию для выдачи" onClose={() => setShowAdd(false)} footer={
          <>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn>
            <Btn onClick={addItem}>Добавить</Btn>
          </>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Номенкл. номер" full>
              <Select value={form.nomenkl} options={availableItems.map(i => i.nomenkl)} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} />
            </Field>
            <Field label="Количество"><Input value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} placeholder="0" /></Field>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── Остатки на складе ДМ ──────────────────────────────────────────────────────

export function OstatokDM() {
  const { dmItems, setDmItems, gpItems, setGpItems, setSkladDocs } = useApp();
  // Склад ДМ: все позиции, класс которых не «Готовая продукция», в том числе из учёта ГП.
  const skladItems = [...dmItems, ...gpItems.map(gpToDm)].filter(it => !isGPKlass(it.klass));
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewItem, setViewItem] = useState<DMItem | null>(null);
  const [showMerge, setShowMerge] = useState(false);
  const [showPrihod, setShowPrihod] = useState(false);
  const [showVydacha, setShowVydacha] = useState(false);

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
    metal: it => it.metal,
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

  const selectedItems = skladItems.filter(it => selected.has(it.id));

  const doMerge = () => {
    const totalLig = selectedItems.reduce((s, i) => s + i.ligWeight, 0);
    const avgProba = Math.round(selectedItems.reduce((s, i) => s + i.proba * i.ligWeight, 0) / totalLig);
    const totalNet = selectedItems.reduce((s, i) => s + i.netWeight, 0);
    const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0);
    const merged: DMItem = {
      id: `dm-merged-${Date.now()}`,
      name: `Объединённая позиция (${selectedItems.length} ед.)`,
      nomenkl: `DM-M${Date.now().toString().slice(-4)}`,
      metal: selectedItems[0].metal,
      klass: "Слиток",
      qty: totalQty,
      proba: avgProba,
      ligWeight: totalLig,
      netWeight: totalNet,
      location: selectedItems[0].location,
      status: "На складе",
    };
    setDmItems(prev => [...prev.filter(it => !selected.has(it.id)), merged]);
    setGpItems(prev => prev.filter(it => !selected.has(it.id)));
    setSelected(new Set());
    setShowMerge(false);
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
            <Btn onClick={() => setShowPrihod(true)}>Принять на склад</Btn>
            <Btn variant="secondary" onClick={() => setShowVydacha(true)}>Выдать со склада</Btn>
            <Btn variant="secondary" disabled={selected.size < 2} onClick={() => setShowMerge(true)}>Объединить позиции</Btn>
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
            {["Все статусы", "На складе", "Резерв", "В подотчёте"].map(o => <option key={o}>{o}</option>)}
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
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())} /></th>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort}>Металл</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество</SortTh>
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
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{item.metal}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3">{item.proba}</td>
                <td className="px-4 py-3">{item.ligWeight}</td>
                <td className="px-4 py-3">{item.netWeight}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3"><EyeIcon onClick={() => setViewItem(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && (
        <Modal title="Просмотр позиции ДМ" onClose={() => setViewItem(null)} footer={<Btn variant="secondary" onClick={() => setViewItem(null)}>Закрыть</Btn>}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Наименование" full><Input value={viewItem.name} disabled /></Field>
            <Field label="Номенкл. №"><Input value={viewItem.nomenkl} disabled /></Field>
            <Field label="Класс"><Input value={viewItem.klass} disabled /></Field>
            <Field label="Металл"><Input value={viewItem.metal} disabled /></Field>
            <Field label="Количество"><Input value={String(viewItem.qty)} disabled /></Field>
            <Field label="Проба"><Input value={String(viewItem.proba)} disabled /></Field>
            <Field label="Лигатурный вес г"><Input value={String(viewItem.ligWeight)} disabled /></Field>
            <Field label="Чистый вес г"><Input value={String(viewItem.netWeight)} disabled /></Field>
            <Field label="Место хранения" full><Input value={viewItem.location} disabled /></Field>
            <Field label="Статус"><Badge label={viewItem.status} /></Field>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Химический состав (в чистоте), г</h4>
            <div className="grid grid-cols-5 gap-3">
              <Field label="Au, г"><Input value={viewItem.au ?? "-"} disabled /></Field>
              <Field label="Ag, г"><Input value={viewItem.ag ?? "-"} disabled /></Field>
              <Field label="Pd, г"><Input value={viewItem.pd ?? "-"} disabled /></Field>
              <Field label="Rh, г"><Input value={viewItem.rh ?? "-"} disabled /></Field>
              <Field label="Pt, г"><Input value={viewItem.pt ?? "-"} disabled /></Field>
            </div>
          </div>
        </Modal>
      )}
      {showMerge && <MergeModal items={selectedItems} onClose={() => setShowMerge(false)} onConfirm={doMerge} />}
      {showPrihod && (
        <PrihodDocModal
          onClose={() => setShowPrihod(false)}
          onSave={d => { setSkladDocs(prev => [d, ...prev]); setShowPrihod(false); show(`Документ ${d.number} сохранён`); }}
        />
      )}
      {showVydacha && (
        <VydachaDMModal
          dmItems={skladItems}
          onClose={() => setShowVydacha(false)}
          onSave={() => { setShowVydacha(false); show("Выдача оформлена"); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
