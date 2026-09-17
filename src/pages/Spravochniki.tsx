import React, { useState } from "react";
import {
  PageHeader, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Badge, Toggle,
  useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, SortTh, useSort, SearchInput, Pagination,
} from "../components/ui";
import { spravochniki, initialMaterialCodes, MaterialCode, initialMaterialClasses, MaterialClass, initialStorageLocations, StorageLocation } from "../data/mock";
import { ArrowLeft, Plus, Package, Scale, FileText, Building2, UserRound, Settings2, Tag, Shapes, MapPin, Warehouse, LucideIcon } from "lucide-react";

type SpravKey = keyof typeof spravochniki;

const dictIcon: Record<SpravKey, LucideIcon> = {
  "Номенклатуры": Package,
  "Единицы измерения": Scale,
  "Типы документов": FileText,
  "Организации": Building2,
  "Подотчётные сотрудники": UserRound,
  "Типы операций": Settings2,
  "Склады": Warehouse,
};

function DictPage({ name, onBack }: { name: SpravKey; onBack: () => void }) {
  const dict = spravochniki[name];
  const [items, setItems] = useState(dict.items);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<{ code: string; value: string; status: string } | null>(null);
  const [form, setForm] = useState({ code: "", value: "", status: "Активно" });
  const { toast, show, clear } = useToast();
  const { sorted, sort, toggleSort } = useSort(items, {
    code: i => i.code,
    value: i => i.value,
    status: i => i.status,
  });

  const openAdd = () => {
    setForm({ code: "", value: "", status: "Активно" });
    setShowAdd(true);
  };
  const openEdit = (item: { code: string; value: string; status: string }) => {
    setForm(item);
    setEditItem(item);
  };

  const save = () => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? form : i));
    } else {
      setItems(prev => [...prev, form]);
    }
    setShowAdd(false);
    setEditItem(null);
    show("Запись сохранена");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / {name}</div>

      <PageHeader
        title={name}
        subtitle={`${dict.count} значений`}
        actions={<Btn onClick={openAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код</SortTh>
            <SortTh sortKey="value" sort={sort} onSort={toggleSort}>Значение</SortTh>
            <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-900">{item.value}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3"><EditIcon onClick={() => openEdit(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код"><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem} /></Field>
            <Field label="Значение"><Input value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} /></Field>
            <Field label="Статус"><Select value={form.status} options={["Активно", "Неактивно"]} onChange={v => setForm(f => ({ ...f, status: v }))} /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Коды материалов ────────────────────────────────────────────────────────────

function MaterialCodesPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState(initialMaterialCodes);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<MaterialCode | null>(null);
  const [form, setForm] = useState<MaterialCode>({ code: "", name: "", shortName: "" });
  const { toast, show, clear } = useToast();
  const perPage = 10;

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    return !q || i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    code: i => i.code,
    name: i => i.name,
    shortName: i => i.shortName,
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setForm({ code: "", name: "", shortName: "" });
    setShowAdd(true);
  };
  const openEdit = (item: MaterialCode) => {
    setForm(item);
    setEditItem(item);
  };

  const save = () => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? form : i));
    } else {
      setItems(prev => [...prev, form]);
    }
    setShowAdd(false);
    setEditItem(null);
    show("Запись сохранена");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / Коды материалов</div>

      <PageHeader
        title="Коды материалов"
        subtitle={`${items.length} значений`}
        actions={<Btn onClick={openAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Код, наименование..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код</SortTh>
            <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
            <SortTh sortKey="shortName" sort={sort} onSort={toggleSort}>Краткое наименование</SortTh>
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.shortName}</td>
                <td className="px-4 py-3"><EditIcon onClick={() => openEdit(item)} /></td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Записи не найдены</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код"><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem} placeholder="0000" /></Field>
            <Field label="Наименование"><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
            <Field label="Краткое наименование"><Input value={form.shortName} onChange={v => setForm(f => ({ ...f, shortName: v }))} /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Классы материалов ────────────────────────────────────────────────────────

function MaterialClassesPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState(initialMaterialClasses);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [viewItem, setViewItem] = useState<MaterialClass | null>(null);
  const [editItem, setEditItem] = useState<MaterialClass | null>(null);
  const [form, setForm] = useState<MaterialClass>({ code: "", name: "" });
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const perPage = 10;

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    code: i => i.code,
    name: i => i.name,
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setForm({ code: "", name: "" });
    setShowAdd(true);
  };
  const openEdit = (item: MaterialClass) => {
    setForm(item);
    setEditItem(item);
  };

  const save = () => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? form : i));
    } else {
      setItems(prev => [...prev, form]);
    }
    setShowAdd(false);
    setEditItem(null);
    show("Запись сохранена");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / Классы материалов</div>

      <PageHeader
        title="Классы материалов"
        subtitle={`${items.length} значений`}
        actions={<Btn onClick={openAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование</label>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Поиск по наименованию..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код</SortTh>
            <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
            <th className="w-24"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-900">{item.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => setViewItem(item)} />
                    <EditIcon onClick={() => openEdit(item)} />
                    <DeleteIcon onClick={() => confirm(`Удалить класс материала «${item.name}»?`, () => { setItems(prev => prev.filter(x => x.code !== item.code)); show("Класс материала удалён"); })} />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Записи не найдены</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код"><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem} /></Field>
            <Field label="Наименование"><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
          </div>
        </Modal>
      )}

      {viewItem && (
        <Modal title={`Класс материала: ${viewItem.name}`} onClose={() => setViewItem(null)} footer={<Btn variant="secondary" onClick={() => setViewItem(null)}>Закрыть</Btn>}>
          <div className="space-y-4">
            <Field label="Код"><Input value={viewItem.code} disabled /></Field>
            <Field label="Наименование"><Input value={viewItem.name} disabled /></Field>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Места хранения (Сейф/Полка, принадлежат складу из справочника «Склады») ──

const SKLAD_OPTIONS = spravochniki["Склады"].items.map(i => i.value);
const SKLAD_CODE: Record<string, string> = Object.fromEntries(spravochniki["Склады"].items.map(i => [i.value, i.code]));

function placeOf(loc: StorageLocation): string {
  return loc.polkaNum ? `Сейф № ${loc.seyfNum} / Полка № ${loc.polkaNum}` : `Сейф № ${loc.seyfNum}`;
}

function StorageLocationsPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState(initialStorageLocations);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [viewItem, setViewItem] = useState<StorageLocation | null>(null);
  const [editItem, setEditItem] = useState<StorageLocation | null>(null);
  const [editAvailable, setEditAvailable] = useState(true);
  const [form, setForm] = useState({ sklad: SKLAD_OPTIONS[0], seyfNum: "", polkaNum: "", available: true });
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const perPage = 10;

  const filtered = items.filter(loc => {
    const q = search.trim().toLowerCase();
    return !q || loc.sklad.toLowerCase().includes(q) || placeOf(loc).toLowerCase().includes(q) || loc.code.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    sklad: loc => loc.sklad,
    place: loc => placeOf(loc),
    code: loc => loc.code,
    available: loc => (loc.available ? 1 : 0),
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setForm({ sklad: SKLAD_OPTIONS[0], seyfNum: "", polkaNum: "", available: true });
    setShowAdd(true);
  };
  const openEdit = (loc: StorageLocation) => {
    setEditItem(loc);
    setEditAvailable(loc.available);
  };

  const saveEdit = () => {
    if (!editItem) return;
    setItems(prev => prev.map(l => l.id === editItem.id ? { ...l, available: editAvailable } : l));
    setEditItem(null);
    show("Место хранения обновлено");
  };

  const addLocation = () => {
    const seyfNum = form.seyfNum.trim();
    if (!seyfNum) { show("Укажите номер сейфа"); return; }
    const polkaNum = form.polkaNum.trim();

    if (items.some(l => l.sklad === form.sklad && l.seyfNum === seyfNum && l.polkaNum === polkaNum)) {
      show("Такое место хранения уже существует");
      return;
    }

    const skladCode = SKLAD_CODE[form.sklad] ?? form.sklad;
    const code = polkaNum ? `${skladCode}-С${seyfNum}-П${polkaNum}` : `${skladCode}-С${seyfNum}`;
    const loc: StorageLocation = { id: `sl-${Date.now()}`, sklad: form.sklad, seyfNum, polkaNum, code, available: form.available };
    setItems(prev => [...prev, loc]);
    setShowAdd(false);
    show("Место хранения добавлено");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / Места хранения</div>

      <PageHeader
        title="Места хранения"
        subtitle={`${items.length} значений`}
        actions={<Btn onClick={openAdd}><Plus className="w-4 h-4" />Добавить</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Склад, место, код..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="sklad" sort={sort} onSort={toggleSort}>Склад</SortTh>
            <SortTh sortKey="place" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
            <SortTh sortKey="code" sort={sort} onSort={toggleSort}>Код</SortTh>
            <SortTh sortKey="available" sort={sort} onSort={toggleSort}>Статус</SortTh>
            <th className="w-20"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(loc => (
              <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-900">{loc.sklad}</td>
                <td className="px-4 py-3 text-gray-700">{placeOf(loc)}</td>
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{loc.code}</td>
                <td className="px-4 py-3"><Badge label={loc.available ? "Доступно" : "Заблокировано"} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => setViewItem(loc)} />
                    <EditIcon onClick={() => openEdit(loc)} />
                    <DeleteIcon onClick={() => confirm(`Удалить место хранения «${loc.sklad} / ${placeOf(loc)}»?`, () => { setItems(prev => prev.filter(l => l.id !== loc.id)); show("Место хранения удалено"); })} />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Записи не найдены</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} />
      </div>

      {showAdd && (
        <Modal
          title="Добавить место хранения"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn>
              <Btn onClick={addLocation}>Добавить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Склад"><Select value={form.sklad} options={SKLAD_OPTIONS} onChange={v => setForm(f => ({ ...f, sklad: v }))} /></Field>
            <Field label="Номер сейфа"><Input value={form.seyfNum} onChange={v => setForm(f => ({ ...f, seyfNum: v }))} placeholder="2" /></Field>
            <Field label="Номер полки (необязательно)"><Input value={form.polkaNum} onChange={v => setForm(f => ({ ...f, polkaNum: v }))} placeholder="5" /></Field>
            <Toggle checked={form.available} onChange={v => setForm(f => ({ ...f, available: v }))} label="Доступно для использования" />
          </div>
        </Modal>
      )}

      {viewItem && (
        <Modal title={`Место хранения: ${placeOf(viewItem)}`} onClose={() => setViewItem(null)} footer={<Btn variant="secondary" onClick={() => setViewItem(null)}>Закрыть</Btn>}>
          <div className="space-y-4">
            <Field label="Склад"><Input value={viewItem.sklad} disabled /></Field>
            <Field label="Место хранения"><Input value={placeOf(viewItem)} disabled /></Field>
            <Field label="Код"><Input value={viewItem.code} disabled /></Field>
            <Toggle checked={viewItem.available} onChange={() => {}} label="Доступно для использования" disabled />
          </div>
        </Modal>
      )}

      {editItem && (
        <Modal
          title={`Место хранения: ${placeOf(editItem)}`}
          onClose={() => setEditItem(null)}
          footer={
            <>
              <Btn variant="secondary" onClick={() => setEditItem(null)}>Отмена</Btn>
              <Btn onClick={saveEdit}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Склад"><Input value={editItem.sklad} disabled /></Field>
            <Field label="Место хранения"><Input value={placeOf(editItem)} disabled /></Field>
            <Field label="Код"><Input value={editItem.code} disabled /></Field>
            <Toggle checked={editAvailable} onChange={setEditAvailable} label="Доступно для использования" />
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function Spravochniki() {
  const [selected, setSelected] = useState<SpravKey | null>(null);
  const [showMaterialCodes, setShowMaterialCodes] = useState(false);
  const [showMaterialClasses, setShowMaterialClasses] = useState(false);
  const [showStorageLocations, setShowStorageLocations] = useState(false);

  if (selected) {
    return <DictPage name={selected} onBack={() => setSelected(null)} />;
  }
  if (showMaterialCodes) {
    return <MaterialCodesPage onBack={() => setShowMaterialCodes(false)} />;
  }
  if (showMaterialClasses) {
    return <MaterialClassesPage onBack={() => setShowMaterialClasses(false)} />;
  }
  if (showStorageLocations) {
    return <StorageLocationsPage onBack={() => setShowStorageLocations(false)} />;
  }

  return (
    <div>
      <PageHeader
        title="Справочники"
        subtitle="Системные словари и классификаторы"
        breadcrumb={["Справочники"]}
      />

      <div className="grid grid-cols-4 gap-4">
        {(Object.entries(spravochniki) as [SpravKey, typeof spravochniki[SpravKey]][]).map(([key, val]) => {
          const Icon = dictIcon[key];
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
            >
              <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{key}</h3>
              <p className="text-sm text-gray-400">{val.count} значений</p>
            </button>
          );
        })}
        <button
          onClick={() => setShowMaterialCodes(true)}
          className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
        >
          <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Коды материалов</h3>
          <p className="text-sm text-gray-400">{initialMaterialCodes.length} значений</p>
        </button>
        <button
          onClick={() => setShowMaterialClasses(true)}
          className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
        >
          <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Shapes className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Классы материалов</h3>
          <p className="text-sm text-gray-400">{initialMaterialClasses.length} значений</p>
        </button>
        <button
          onClick={() => setShowStorageLocations(true)}
          className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
        >
          <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Места хранения</h3>
          <p className="text-sm text-gray-400">{initialStorageLocations.length} значений</p>
        </button>
      </div>
    </div>
  );
}
