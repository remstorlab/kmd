import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, FileChip, Toggle, SortTh, useSort,
} from "../components/ui";
import { GPItem, DMItem } from "../data/mock";
import { Gem, Coins, Plus } from "lucide-react";

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

// ── Принять на склад GP modal ─────────────────────────────────────────────────

function PrihodGPModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [items, setItems] = useState<{ name: string; qty: string; klass: string; code: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", nomenkl: "", klass: "Монета", code: "AU-585", qty: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });
  const [head, setHead] = useState(() => ({
    number: `НП-${Math.floor(Math.random() * 900 + 100)}`,
    date: new Date().toLocaleDateString("ru-RU"),
    zakazchik: "Монетный двор",
    skladOtpr: "Производственный цех",
    skladPoluch: "Склад ГП",
    sotrudnik: "Ким Александр Юрьевич",
  }));

  const addItem = () => {
    setItems(prev => [...prev, { name: form.name || "Позиция ГП", qty: form.qty, klass: form.klass, code: form.code }]);
    setShowAdd(false);
    setForm({ name: "", nomenkl: "", klass: "Монета", code: "AU-585", qty: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });
  };

  const { sorted: sortedItems, sort: itemsSort, toggleSort: toggleItemsSort } = useSort(items, {
    name: it => it.name,
    qty: it => parseFloat(it.qty) || 0,
    klass: it => it.klass,
    code: it => it.code,
  });

  return (
    <Modal
      title="Накладная на приём ГП"
      onClose={onClose}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn variant="secondary" onClick={onSave}>Сохранить и печать</Btn>
          <Btn onClick={onSave}>Сохранить</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Тип документа"><Input value="Накладная на приём ГП" disabled /></Field>
        <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} /></Field>
        <Field label="Заказчик"><Select value={head.zakazchik} options={["Монетный двор", "ОО «АурумПоставка»"]} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} /></Field>
        <Field label="Склад-отправитель"><Select value={head.skladOtpr} options={["Производственный цех", "Ювелирный цех"]} onChange={v => setHead(h => ({ ...h, skladOtpr: v }))} /></Field>
        <Field label="Склад-получатель"><Select value={head.skladPoluch} options={["Склад ГП", "Склад ДМ №1"]} onChange={v => setHead(h => ({ ...h, skladPoluch: v }))} /></Field>
        <Field label="Сотрудник склада-получателя" full><Select value={head.sotrudnik} options={["Ким Александр Юрьевич", "Нурланов Асхат Бекович"]} onChange={v => setHead(h => ({ ...h, sotrudnik: v }))} /></Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции приёма</h3>
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
                <td className="px-3 py-2">{it.klass}</td>
                <td className="px-3 py-2 text-blue-600">{it.code}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Добавить позицию ГП" onClose={() => setShowAdd(false)} footer={
          <>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn>
            <Btn onClick={addItem}>Добавить</Btn>
          </>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Номенкл. номер"><Select value={form.nomenkl || "GP-KOL-585-01"} options={["GP-KOL-585-01", "GP-CEP-750-03", "GP-SER-585-07"]} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} /></Field>
            <Field label="Класс"><Select value={form.klass} options={["Монета", "Кольцо", "Браслет", "Цепочка"]} onChange={v => setForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Код материала"><Select value={form.code} options={["AU-585", "AU-750", "AU-999", "AG-925", "PT-950"]} onChange={v => setForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Наименование" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Введите наименование" /></Field>
            <Field label="Количество"><Input value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} placeholder="0" /></Field>
            <Field label="Ед. изм."><Select value={form.unit} options={["шт", "г", "кг"]} onChange={v => setForm(f => ({ ...f, unit: v }))} /></Field>
            <Field label="Сейф"><Select value={form.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setForm(f => ({ ...f, sey: v }))} /></Field>
            <Field label="Полка"><Select value={form.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setForm(f => ({ ...f, polka: v }))} /></Field>
          </div>
        </Modal>
      )}
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
                <td className="px-3 py-2">{it.klass}</td>
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
  const { gpItems, setGpItems, navigate } = useApp();
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

  const filtered = gpItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchSklad = filterSklad === "Все склады" || filterSklad === "Склад ГП";
    const matchCode = filterCode === "Все коды" || it.code.startsWith(filterCode.replace(" (все)", ""));
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
          <select value={filterCode} onChange={e => setFilterCode(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все коды", "AU", "AG", "PT", "PD"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "На складе", "Резерв", "В обработке"].map(o => <option key={o}>{o}</option>)}
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
                <td className="px-4 py-3 text-gray-700">{item.klass}</td>
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
      {showPrihod && <PrihodGPModal onClose={() => setShowPrihod(false)} onSave={() => { setShowPrihod(false); show("Накладная сохранена"); }} />}
      {showVydacha && (
        <VydachaGPModal
          gpItems={gpItems}
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
      title="Объединение номенклатур"
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

// ── Приём на склад ДМ modal (Приходный ордер / Накладная) ────────────────────

type PrihodDocType = "Приходный ордер" | "Накладная";

function PrihodDMModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [docType, setDocType] = useState<PrihodDocType>("Приходный ордер");
  const { toast, show, clear } = useToast();
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: "ПО-0342",
    date: today,
    otpravitel: "ООО «Аффинаж-Сервис»",
    poluchatel: "Склад №1",
    schetFaktura: "СФ-0091",
    schetFakturaData: today,
    dogovor: "ДОГ-2026-045",
    dogovorData: today,
    pasport: "ПМ-000456",
    platDoc: "ПД-001234",
    platDocData: today,
    ligByDoc: "1 000.00 г",
    massByDoc: "999.90 г",
    ligAccepted: "999.50 г",
    netAccepted: "998.80 г",
    price: "32 500.00",
    sum: "32 467 500.00",
    planPos: "План-2026/Q3-AU",
    nakladNumber: "НП-001234",
    nakladDate: today,
    zakazchik: "Национальный банк",
    skladOtpr: "СДМ",
    skladPoluch: "Склад ДМ №1",
    sotrudnik: "Петров А.Н.",
  }));

  // Приходный ордер state
  const [ownProperty, setOwnProperty] = useState(true);
  const [orderPositions, setOrderPositions] = useState([
    { nomenkl: "НН-72101", name: "Слиток золотой стандартный", klass: "Слиток", code: "Au", kol: "1", proba: "999.9", lig: "1000.0", net: "999.9", loc: "Сейф 1/Полка 1" },
    { nomenkl: "НН-72102", name: "Слиток серебряный", klass: "Слиток", code: "Ag", kol: "1", proba: "925.0", lig: "318.6", net: "294.7", loc: "Сейф 2/Полка 3" },
  ]);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({ nomenkl: "НН-72103", klass: "Слиток", code: "Au", name: "", kol: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });

  const addOrderPos = () => {
    setOrderPositions(p => [...p, { nomenkl: orderForm.nomenkl, name: orderForm.name || "Позиция ДМ", klass: orderForm.klass, code: orderForm.code, kol: orderForm.kol || "1", proba: orderForm.proba, lig: orderForm.lig, net: orderForm.net, loc: `${orderForm.sey}, ${orderForm.polka}` }]);
    setShowAddOrder(false);
    setOrderForm({ nomenkl: "НН-72103", klass: "Слиток", code: "Au", name: "", kol: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });
  };

  const { sorted: sortedOrderPositions, sort: orderPosSort, toggleSort: toggleOrderPosSort } = useSort(orderPositions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => p.code,
    kol: p => parseFloat(p.kol) || 0,
    proba: p => parseFloat(p.proba) || 0,
    lig: p => parseFloat(p.lig) || 0,
    net: p => parseFloat(p.net) || 0,
    loc: p => p.loc,
  });

  // Накладная state
  const [nakladPositions, setNakladPositions] = useState([
    { nomenkl: "AU-SL-12000", name: "Монета Атамекен", kol: "2000", klass: "Монета", code: "200", loc: "Сейф №1, Полка 5" },
    { nomenkl: "AU-SL-01000", name: "Орден Алтын алка", kol: "300", klass: "Орден", code: "200", loc: "Сейф №1, Полка 7" },
  ]);
  const [showAddNaklad, setShowAddNaklad] = useState(false);
  const [nakladForm, setNakladForm] = useState({ nomenkl: "", klass: "Монета", code: "AU-585", name: "", kol: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });

  const addNakladPos = () => {
    setNakladPositions(p => [...p, { nomenkl: nakladForm.nomenkl || `AU-SL-${Math.floor(Math.random() * 90000 + 10000)}`, name: nakladForm.name || "Позиция ДМ", kol: nakladForm.kol || "0", klass: nakladForm.klass, code: nakladForm.code, loc: `${nakladForm.sey}, ${nakladForm.polka}` }]);
    setShowAddNaklad(false);
    setNakladForm({ nomenkl: "", klass: "Монета", code: "AU-585", name: "", kol: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });
  };

  const { sorted: sortedNakladPositions, sort: nakladPosSort, toggleSort: toggleNakladPosSort } = useSort(nakladPositions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    kol: p => parseFloat(p.kol) || 0,
    klass: p => p.klass,
    code: p => p.code,
    loc: p => p.loc,
  });

  const isOrder = docType === "Приходный ордер";

  return (
    <Modal
      title={isOrder ? "Приходный ордер" : "Накладная на приём ДМ"}
      onClose={onClose}
      extraWide
      footer={isOrder ? (
        <>
          <Btn variant="secondary" onClick={() => show("Ярлыки отправлены на печать")}>Печать Ярлыков ДМ</Btn>
          <Btn variant="secondary" onClick={onSave}>Сохранить</Btn>
          <Btn onClick={onSave}>Сохранить и печать</Btn>
        </>
      ) : (
        <>
          <Btn variant="secondary" onClick={() => show("Ярлыки отправлены на печать")}>Сохранить и печать</Btn>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={onSave}>Сохранить</Btn>
        </>
      )}
    >
      {isOrder ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Field label="Тип документа"><Select value={docType} options={["Приходный ордер", "Накладная"]} onChange={v => setDocType(v as PrihodDocType)} /></Field>
          <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} /></Field>
          <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} /></Field>
          <Field label="Отправитель"><Select value={head.otpravitel} options={["ООО «Аффинаж-Сервис»", "АО «Металл Инвест»"]} onChange={v => setHead(h => ({ ...h, otpravitel: v }))} /></Field>
          <Field label="Получатель"><Select value={head.poluchatel} options={["Склад №1", "Склад №2"]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} /></Field>
          <Field label="№ счёт-фактуры"><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} /></Field>
          <Field label="Дата счёт-фактуры"><Input value={head.schetFakturaData} onChange={v => setHead(h => ({ ...h, schetFakturaData: v }))} /></Field>
          <Field label="Номер договора"><Input value={head.dogovor} onChange={v => setHead(h => ({ ...h, dogovor: v }))} /></Field>
          <Field label="Дата договора"><Input value={head.dogovorData} onChange={v => setHead(h => ({ ...h, dogovorData: v }))} /></Field>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
            <Toggle checked={ownProperty} onChange={setOwnProperty} label={ownProperty ? "Да" : "Нет"} />
          </div>
          <Field label="Номер паспорта"><Input value={head.pasport} onChange={v => setHead(h => ({ ...h, pasport: v }))} /></Field>
          <Field label="Номер платёжного документа"><Input value={head.platDoc} onChange={v => setHead(h => ({ ...h, platDoc: v }))} /></Field>
          <Field label="Дата платёжного документа"><Input value={head.platDocData} onChange={v => setHead(h => ({ ...h, platDocData: v }))} /></Field>
          <Field label="Лигатурный вес по документу"><Input value={head.ligByDoc} onChange={v => setHead(h => ({ ...h, ligByDoc: v }))} /></Field>
          <Field label="Масса по документу"><Input value={head.massByDoc} onChange={v => setHead(h => ({ ...h, massByDoc: v }))} /></Field>
          <Field label="Принято лигатурный вес"><Input value={head.ligAccepted} onChange={v => setHead(h => ({ ...h, ligAccepted: v }))} /></Field>
          <Field label="Принято чистый вес"><Input value={head.netAccepted} onChange={v => setHead(h => ({ ...h, netAccepted: v }))} /></Field>
          <Field label="Цена за единицу, тг"><Input value={head.price} onChange={v => setHead(h => ({ ...h, price: v }))} /></Field>
          <Field label="Сумма в тенге"><Input value={head.sum} onChange={v => setHead(h => ({ ...h, sum: v }))} /></Field>
          <Field label="Позиция годового плана"><Input value={head.planPos} onChange={v => setHead(h => ({ ...h, planPos: v }))} /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Тип документа"><Select value={docType} options={["Приходный ордер", "Накладная"]} onChange={v => setDocType(v as PrihodDocType)} /></Field>
          <Field label="Номер"><Input value={head.nakladNumber} onChange={v => setHead(h => ({ ...h, nakladNumber: v }))} /></Field>
          <Field label="Дата"><Input value={head.nakladDate} onChange={v => setHead(h => ({ ...h, nakladDate: v }))} /></Field>
          <Field label="Заказчик"><Select value={head.zakazchik} options={["Национальный банк", "Монетный двор"]} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} /></Field>
          <Field label="Склад-отправитель"><Select value={head.skladOtpr} options={["СДМ", "Производственный цех"]} onChange={v => setHead(h => ({ ...h, skladOtpr: v }))} /></Field>
          <Field label="Склад-получатель"><Select value={head.skladPoluch} options={["Склад ДМ №1", "Склад ДМ №2"]} onChange={v => setHead(h => ({ ...h, skladPoluch: v }))} /></Field>
          <Field label="Сотрудник склада-получателя" full><Select value={head.sotrudnik} options={["Петров А.Н.", "Ким Александр Юрьевич"]} onChange={v => setHead(h => ({ ...h, sotrudnik: v }))} /></Field>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <FileChip
          name={isOrder ? "Приходный ордер ПО-0342.pdf" : "Накладная_НП-001234.pdf"}
          onDownload={() => show("Загрузка файла...")}
        />
      </div>

      {isOrder ? (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции прихода</h3>
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setShowAddOrder(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="kol" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Кол-во</SortTh>
              <SortTh sortKey="proba" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="lig" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Лигат.</SortTh>
              <SortTh sortKey="net" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Чистый</SortTh>
              <SortTh sortKey="loc" sort={orderPosSort} onSort={toggleOrderPosSort} className="px-3 py-2">Размещение</SortTh>
              <th className="w-24"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedOrderPositions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.klass}</td>
                  <td className="px-3 py-2 text-blue-600">{p.code}</td>
                  <td className="px-3 py-2">{p.kol}</td>
                  <td className="px-3 py-2">{p.proba}</td>
                  <td className="px-3 py-2 font-medium">{p.lig}</td>
                  <td className="px-3 py-2 text-blue-600">{p.net}</td>
                  <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <EyeIcon onClick={() => show(`Позиция: ${p.name}`)} />
                      <EditIcon onClick={() => show(`Редактирование: ${p.name}`)} />
                      <DeleteIcon onClick={() => setOrderPositions(prev => prev.filter(x => x !== p))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции приёма</h3>
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setShowAddNaklad(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="kol" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Кол-во</SortTh>
              <SortTh sortKey="klass" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="loc" sort={nakladPosSort} onSort={toggleNakladPosSort} className="px-3 py-2">Размещение</SortTh>
              <th className="w-24"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedNakladPositions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.kol}</td>
                  <td className="px-3 py-2">{p.klass}</td>
                  <td className="px-3 py-2 font-medium">{p.code}</td>
                  <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <EyeIcon onClick={() => show(`Позиция: ${p.name}`)} />
                      <EditIcon onClick={() => show(`Редактирование: ${p.name}`)} />
                      <DeleteIcon onClick={() => setNakladPositions(prev => prev.filter(x => x !== p))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddOrder && (
        <Modal title="Добавить позицию ДМ" onClose={() => setShowAddOrder(false)} footer={
          <>
            <Btn variant="secondary" onClick={() => setShowAddOrder(false)}>Отмена</Btn>
            <Btn onClick={addOrderPos}>Добавить</Btn>
          </>
        }>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Номенкл. номер"><Input value={orderForm.nomenkl} onChange={v => setOrderForm(f => ({ ...f, nomenkl: v }))} /></Field>
            <Field label="Класс"><Select value={orderForm.klass} options={["Слиток", "Стружка", "Проба", "Раствор"]} onChange={v => setOrderForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Код материала"><Select value={orderForm.code} options={["Au", "Ag", "Pt", "Pd"]} onChange={v => setOrderForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Наименование" full><Input value={orderForm.name} onChange={v => setOrderForm(f => ({ ...f, name: v }))} placeholder="Наименование позиции" /></Field>
            <Field label="Количество"><Input value={orderForm.kol} onChange={v => setOrderForm(f => ({ ...f, kol: v }))} placeholder="1" /></Field>
            <Field label="Проба"><Input value={orderForm.proba} onChange={v => setOrderForm(f => ({ ...f, proba: v }))} placeholder="999" /></Field>
            <Field label="Масса лигатурная"><Input value={orderForm.lig} onChange={v => setOrderForm(f => ({ ...f, lig: v }))} placeholder="0.00" /></Field>
            <Field label="Масса чистая"><Input value={orderForm.net} onChange={v => setOrderForm(f => ({ ...f, net: v }))} placeholder="0.00" /></Field>
            <Field label="Сейф"><Select value={orderForm.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setOrderForm(f => ({ ...f, sey: v }))} /></Field>
            <Field label="Полка"><Select value={orderForm.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setOrderForm(f => ({ ...f, polka: v }))} /></Field>
          </div>
        </Modal>
      )}

      {showAddNaklad && (
        <Modal title="Добавить позицию ДМ" onClose={() => setShowAddNaklad(false)} footer={
          <>
            <Btn variant="secondary" onClick={() => setShowAddNaklad(false)}>Отмена</Btn>
            <Btn onClick={addNakladPos}>Добавить</Btn>
          </>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Номенкл. номер"><Input value={nakladForm.nomenkl} onChange={v => setNakladForm(f => ({ ...f, nomenkl: v }))} placeholder="AU-SL-XXXXX" /></Field>
            <Field label="Класс"><Select value={nakladForm.klass} options={["Монета", "Слиток", "Орден", "Медаль"]} onChange={v => setNakladForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Код материала"><Select value={nakladForm.code} options={["AU-585", "AU-750", "AU-999", "AG-925", "PT-950"]} onChange={v => setNakladForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Наименование" full><Input value={nakladForm.name} onChange={v => setNakladForm(f => ({ ...f, name: v }))} placeholder="Введите наименование" /></Field>
            <Field label="Количество"><Input value={nakladForm.kol} onChange={v => setNakladForm(f => ({ ...f, kol: v }))} placeholder="0" /></Field>
            <Field label="Ед. изм."><Select value={nakladForm.unit} options={["шт", "г", "кг"]} onChange={v => setNakladForm(f => ({ ...f, unit: v }))} /></Field>
            <Field label="Сейф"><Select value={nakladForm.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setNakladForm(f => ({ ...f, sey: v }))} /></Field>
            <Field label="Полка"><Select value={nakladForm.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setNakladForm(f => ({ ...f, polka: v }))} /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Остатки на складе ДМ ──────────────────────────────────────────────────────

export function OstatokDM() {
  const { dmItems, setDmItems, navigate } = useApp();
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewItem, setViewItem] = useState<DMItem | null>(null);
  const [showMerge, setShowMerge] = useState(false);
  const [showPrihod, setShowPrihod] = useState(false);

  const perPage = 8;
  const filtered = dmItems.filter(it => {
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

  const selectedItems = dmItems.filter(it => selected.has(it.id));

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
    setSelected(new Set());
    setShowMerge(false);
    show("Номенклатуры объединены");
  };

  return (
    <div>
      <PageHeader
        title="Остатки материалов на складе"
        subtitle="Актуальные позиции по всем складам, сейфам и полкам"
        breadcrumb={["Склады", "Остатки на складе ДМ"]}
        actions={
          <>
            <Btn onClick={() => setShowPrihod(true)}>Принять на склад</Btn>
            <Btn variant="secondary" onClick={() => navigate("dvizhenie-mat", { openNew: "1" })}>Выдать со склада</Btn>
            {selected.size >= 2 && (
              <Btn variant="secondary" onClick={() => setShowMerge(true)}>Объединить номенклатуры</Btn>
            )}
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
          <select value={filterKlass} onChange={e => setFilterKlass(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все классы", "Слиток", "Стружка", "Проба", "Раствор"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "На складе", "Зарезервировано", "В подотчёте"].map(o => <option key={o}>{o}</option>)}
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
                <td className="px-4 py-3">{item.klass}</td>
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
          <div className="grid grid-cols-2 gap-4">
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
        </Modal>
      )}
      {showMerge && <MergeModal items={selectedItems} onClose={() => setShowMerge(false)} onConfirm={doMerge} />}
      {showPrihod && (
        <PrihodDMModal
          onClose={() => setShowPrihod(false)}
          onSave={() => { setShowPrihod(false); show("Документ создан"); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
