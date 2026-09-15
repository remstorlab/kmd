import React, { useState } from "react";
import { PageHeader, Btn, Modal, EditIcon, Badge, useToast, Toast, Field, Input, Select, SortTh, useSort, SearchInput, Pagination } from "../components/ui";
import { spravochniki, initialMaterialCodes, MaterialCode } from "../data/mock";
import { ArrowLeft, Plus, Package, Scale, FileText, Shapes, Building2, UserRound, Settings2, Tag, LucideIcon } from "lucide-react";

type SpravKey = keyof typeof spravochniki;

const dictIcon: Record<SpravKey, LucideIcon> = {
  "Номенклатуры": Package,
  "Единицы измерения": Scale,
  "Типы документов": FileText,
  "Классы материалов": Shapes,
  "Организации": Building2,
  "Подотчётные сотрудники": UserRound,
  "Типы операций": Settings2,
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

export function Spravochniki() {
  const [selected, setSelected] = useState<SpravKey | null>(null);
  const [showMaterialCodes, setShowMaterialCodes] = useState(false);

  if (selected) {
    return <DictPage name={selected} onBack={() => setSelected(null)} />;
  }
  if (showMaterialCodes) {
    return <MaterialCodesPage onBack={() => setShowMaterialCodes(false)} />;
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
      </div>
    </div>
  );
}
