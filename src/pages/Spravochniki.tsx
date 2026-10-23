import React, { useState, useEffect } from "react";
import { useLocation } from "react-router";
import {
  PageHeader, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Badge, Toggle,
  useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, SortTh, useSort, SearchInput, Pagination, usePerPage, FillerRows, fillerCount, statusColorClass, usePaged,
} from "../components/ui";
import { spravochniki, techOpLossNorms, TechOpLossNorm, MaterialCode, initialMaterialClasses, MaterialClass, StorageLocation, ChemElement, MassTolerance, initialStatusDicts, StatusDict, StatusItem, StatusColor, STATUS_COLORS } from "../data/mock";
import { useApp } from "../store/AppContext";
import { matchPage, useScreen } from "../router";
import { ArrowLeft, ArrowDownUp, Gem, Plus, Package, Scale, CircleDot, FileText, Building2, UserRound, Settings2, Tag, Shapes, MapPin, Warehouse, Layers, FlaskConical, Wrench, Ruler, LucideIcon } from "lucide-react";

type SpravKey = keyof typeof spravochniki;

// Адреса справочников: /spravochniki/<slug>
const DICT_SLUG: Record<SpravKey, string> = {
  "Единицы измерения": "edinicy-izmereniya",
  "Типы документов приёмки": "tipy-dokumentov-priemki",
  "Типы документов отгрузки": "tipy-dokumentov-otgruzki",
  "Типы документов движения материала": "tipy-dokumentov-dvizheniya",
  "Организации": "organizacii",
  "Подотчётные сотрудники": "podotchetnye-sotrudniki",
  "Типы операций": "tipy-operaciy",
  "Виды операций": "vidy-operaciy",
  "Склады": "sklady",
  "Технологические операции": "tehnologicheskie-operacii",
  "Тип списания": "tip-spisaniya",
  "Пробы": "proby",
};
export const SPRAV_SLUGS = {
  ...DICT_SLUG,
  "Коды материалов": "kody-materialov",
  "Классы материалов": "klassy-materialov",
  "Места хранения": "mesta-hraneniya",
  "Химический состав": "himicheskiy-sostav",
  "Допустимые отклонения от массы": "dopustimye-otkloneniya",
} as const;
// Справочники статусов: /spravochniki/status-<группа>
const statusSlug = (d: StatusDict) => `status-${d.group}`;
export const STATUS_SPRAV_SLUGS: Record<string, string> = Object.fromEntries(initialStatusDicts.map(d => [d.name, statusSlug(d)]));

// Экраны записей справочника: …/new, …/view/:key, …/edit/:key
function useRecordScreens<T>(items: T[], keyOf: (t: T) => string) {
  const screen = useScreen();
  const editKey = screen.after("edit");
  return {
    showAdd: screen.has("new"),
    viewItem: items.find(i => keyOf(i) === screen.after("view")) ?? null,
    editItem: items.find(i => keyOf(i) === editKey) ?? null,
    editKey,
    goAdd: () => screen.openTop("new"),
    goView: (i: T) => screen.openTop("view", keyOf(i)),
    goEdit: (i: T) => screen.openTop("edit", keyOf(i)),
    closeAll: () => screen.openTop(),
  };
}

const dictIcon: Record<SpravKey, LucideIcon> = {
  "Единицы измерения": Scale,
  "Типы документов приёмки": FileText,
  "Типы документов отгрузки": FileText,
  "Типы документов движения материала": FileText,
  "Организации": Building2,
  "Подотчётные сотрудники": UserRound,
  "Типы операций": Settings2,
  "Виды операций": Layers,
  "Склады": Warehouse,
  "Технологические операции": Wrench,
  "Тип списания": ArrowDownUp,
  "Пробы": Gem,
};

// Подпись поля «Значение» для справочников, где оно называется иначе
const VALUE_LABEL: Partial<Record<SpravKey, string>> = {
  "Технологические операции": "Наименование",
  "Тип списания": "Наименование",
  "Пробы": "Проба",
};
// Справочники только с номером строки и наименованием: номер присваивается автоматически, статуса нет
const NUMBERED: SpravKey[] = ["Тип списания", "Пробы"];

const emptyNorm: TechOpLossNorm = { unit: "", au: "", ag: "" };
const normCell = (v: string) => v || <span className="text-gray-400">—</span>;

function DictPage({ name, onBack }: { name: SpravKey; onBack: () => void }) {
  const dict = spravochniki[name];
  const valueLabel = VALUE_LABEL[name] ?? "Значение";
  // У технологических операций — нормативы допустимых потерь по золоту и серебру
  const withNorms = name === "Технологические операции";
  const numbered = NUMBERED.includes(name);
  const [items, setItems] = useState(dict.items);
  const [norms, setNorms] = useState(techOpLossNorms);
  const [form, setForm] = useState({ code: "", value: "", status: "Активно" });
  const [normForm, setNormForm] = useState(emptyNorm);
  const { showAdd, editItem, editKey, goAdd, goEdit, closeAll } = useRecordScreens(items, i => i.code);
  // Форма заполняется при открытии экрана добавления / редактирования (в т.ч. по прямой ссылке)
  useEffect(() => {
    if (editItem) { setForm(editItem); setNormForm(norms[editItem.code] ?? emptyNorm); }
    else if (showAdd) {
      const nextNo = String(items.reduce((m, i) => Math.max(m, parseInt(i.code, 10) || 0), 0) + 1);
      setForm({ code: numbered ? nextNo : "", value: "", status: "Активно" });
      setNormForm(emptyNorm);
    }
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { sorted, sort, toggleSort } = useSort(items, {
    code: i => i.code,
    value: i => i.value,
    status: i => i.status,
  });

  const openAdd = goAdd;
  const openEdit = goEdit;

  const save = () => {
    const next = editItem ? items.map(i => i.code === editItem.code ? form : i) : [...items, form];
    setItems(next);
    // Справочник — общий источник вариантов для полей форм, поэтому изменения пишем в него.
    if (!editItem) dict.count += 1;
    dict.items = next;
    if (withNorms) {
      // Нормативы читает раздел «Списание», поэтому также пишем их в общий источник
      techOpLossNorms[form.code] = normForm;
      setNorms({ ...techOpLossNorms });
    }
    closeAll();
    show("Запись сохранена");
  };

  const pg1 = usePaged(sorted, "sprav-dict");
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
            <SortTh sortKey="code" sort={sort} onSort={toggleSort}>{numbered ? "№" : "Код"}</SortTh>
            <SortTh sortKey="value" sort={sort} onSort={toggleSort}>{valueLabel}</SortTh>
            {withNorms && <>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Ед. изм. норматива</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Потери Au, %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Потери Ag, %</th>
            </>}
            {!numbered && <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>}
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pg1.pageItems.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-900">{item.value}</td>
                {withNorms && <>
                  <td className="px-4 py-3 text-gray-500">{normCell(norms[item.code]?.unit ?? "")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{normCell(norms[item.code]?.au ?? "")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{normCell(norms[item.code]?.ag ?? "")}</td>
                </>}
                {!numbered && <td className="px-4 py-3"><Badge label={item.status} group="zapisi-spravochnikov" /></td>}
                <td className="px-4 py-3"><EditIcon onClick={() => openEdit(item)} /></td>
              </tr>
            ))}
            <FillerRows count={pg1.fill} cols={7} />
          </tbody>
        </table>
        {pg1.pager}
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { closeAll(); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { closeAll(); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label={numbered ? "№" : "Код"} required={!numbered}><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem || numbered} /></Field>
            <Field label={valueLabel} required><Input value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} /></Field>
            {withNorms && <>
              <Field label="Единицы измерения норматива"><Input value={normForm.unit} onChange={v => setNormForm(f => ({ ...f, unit: v }))} placeholder="% к массе навески" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Допустимые потери — Золото, %"><Input value={normForm.au} onChange={v => setNormForm(f => ({ ...f, au: v }))} placeholder="Не установлен" /></Field>
                <Field label="Допустимые потери — Серебро, %"><Input value={normForm.ag} onChange={v => setNormForm(f => ({ ...f, ag: v }))} placeholder="Не установлен" /></Field>
              </div>
            </>}
            {!numbered && <Field label="Статус" required><Select value={form.status} options={["Активно", "Неактивно"]} onChange={v => setForm(f => ({ ...f, status: v }))} /></Field>}
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Справочник статусов: Наименование + Цвет ─────────────────────────────────

const colorLabel = (c: StatusColor) => STATUS_COLORS.find(x => x.value === c)?.label ?? c;

function StatusDictPage({ dict, onBack }: { dict: StatusDict; onBack: () => void }) {
  const { setStatusDicts } = useApp();
  const items = dict.items;
  const emptyForm = { name: "", color: "gray" as StatusColor };
  const [form, setForm] = useState(emptyForm);
  const { showAdd, editItem, editKey, goAdd, goEdit, closeAll } = useRecordScreens(items, i => i.id);
  useEffect(() => {
    if (editItem) setForm({ name: editItem.name, color: editItem.color });
    else if (showAdd) setForm(emptyForm);
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const { sorted, sort, toggleSort } = useSort(items, {
    name: i => i.name,
    color: i => colorLabel(i.color),
  });

  const setItems = (next: StatusItem[]) => setStatusDicts(prev => prev.map(d => (d.group === dict.group ? { ...d, items: next } : d)));
  const name = form.name.trim();
  const duplicate = items.some(i => i.name.toLowerCase() === name.toLowerCase() && i.id !== editItem?.id);
  const canSave = !!name && !duplicate;

  const save = () => {
    if (!canSave) return;
    setItems(editItem
      ? items.map(i => (i.id === editItem.id ? { ...i, name, color: form.color } : i))
      : [...items, { id: `${dict.group}-${Date.now()}`, name, color: form.color }]);
    closeAll();
    show("Запись сохранена");
  };
  const remove = (item: StatusItem) => confirm(`Удалить статус «${item.name}»?`, () => { setItems(items.filter(i => i.id !== item.id)); show("Статус удалён"); });

  const pg2 = usePaged(sorted, "sprav-status");
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / {dict.name}</div>

      <PageHeader
        title={dict.name}
        subtitle={`${items.length} значений · используется: ${dict.sections}`}
        actions={<Btn onClick={goAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
            <SortTh sortKey="color" sort={sort} onSort={toggleSort}>Цвет</SortTh>
            <th className="w-20"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pg2.pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><Badge label={item.name} group={dict.group} /></td>
                <td className="px-4 py-3 text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full border ${statusColorClass[item.color]}`} />
                    {colorLabel(item.color)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EditIcon onClick={() => goEdit(item)} />
                    <DeleteIcon onClick={() => remove(item)} />
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Нет записей</td></tr>
            )}
            <FillerRows count={pg2.fill} cols={3} />
          </tbody>
        </table>
        {pg2.pager}
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={closeAll}
          footer={<>
            <Btn variant="secondary" onClick={closeAll}>Отмена</Btn>
            <Btn onClick={save} disabled={!canSave}>Сохранить</Btn>
          </>}
        >
          <div className="space-y-4">
            <Field label="Наименование" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Наименование статуса" /></Field>
            {duplicate && <div className="-mt-2 text-xs text-red-600">Статус с таким наименованием уже есть</div>}
            <Field label="Цвет" required>
              <Select value={form.color} options={STATUS_COLORS.map(c => c.value)} optionLabel={v => colorLabel(v as StatusColor)} onChange={v => setForm(f => ({ ...f, color: v as StatusColor }))} />
            </Field>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Предпросмотр</label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColorClass[form.color]}`}>{name || "Статус"}</span>
            </div>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Коды материалов ────────────────────────────────────────────────────────────

function MaterialCodesPage({ onBack }: { onBack: () => void }) {
  const { materialCodes: items, setMaterialCodes: setItems } = useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<MaterialCode>({ code: "", name: "", shortName: "" });
  const { showAdd, editItem, editKey, goAdd, goEdit, closeAll } = useRecordScreens(items, i => i.code);
  useEffect(() => {
    if (editItem) setForm(editItem);
    else if (showAdd) setForm({ code: "", name: "", shortName: "" });
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const [perPage, setPerPage] = usePerPage("sprav-codes", 10);

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

  const openAdd = goAdd;
  const openEdit = goEdit;

  const save = () => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? form : i));
    } else {
      setItems(prev => [...prev, form]);
    }
    closeAll();
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
            <FillerRows count={fillerCount(sorted.length, page, perPage)} cols={4} />
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { closeAll(); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { closeAll(); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код" required><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem} placeholder="0000" /></Field>
            <Field label="Наименование" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
            <Field label="Краткое наименование" required><Input value={form.shortName} onChange={v => setForm(f => ({ ...f, shortName: v }))} /></Field>
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
  const [form, setForm] = useState<MaterialClass>({ code: "", name: "" });
  const { showAdd, viewItem, editItem, editKey, goAdd, goView, goEdit, closeAll } = useRecordScreens(items, i => i.code);
  const setViewItem = (i: MaterialClass | null) => (i ? goView(i) : closeAll());
  useEffect(() => {
    if (editItem) setForm(editItem);
    else if (showAdd) setForm({ code: "", name: "" });
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [perPage, setPerPage] = usePerPage("sprav-classes", 10);

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    code: i => i.code,
    name: i => i.name,
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const openAdd = goAdd;
  const openEdit = goEdit;

  const save = () => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? form : i));
    } else {
      setItems(prev => [...prev, form]);
    }
    closeAll();
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
            <FillerRows count={fillerCount(sorted.length, page, perPage)} cols={3} />
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { closeAll(); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { closeAll(); }}>Отмена</Btn>
              <Btn onClick={save}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код" required><Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} disabled={!!editItem} /></Field>
            <Field label="Наименование" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
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
  const { storageLocations: items, setStorageLocations: setItems } = useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editAvailable, setEditAvailable] = useState(true);
  const [form, setForm] = useState({ sklad: SKLAD_OPTIONS[0], seyfNum: "", polkaNum: "", available: true });
  const { showAdd, viewItem, editItem, editKey, goAdd, goView, goEdit, closeAll } = useRecordScreens(items, l => l.id);
  const setViewItem = (l: StorageLocation | null) => (l ? goView(l) : closeAll());
  const setEditItem = (l: StorageLocation | null) => (l ? goEdit(l) : closeAll());
  const setShowAdd = (open: boolean) => (open ? goAdd() : closeAll());
  useEffect(() => {
    if (editItem) setEditAvailable(editItem.available);
    else if (showAdd) setForm({ sklad: SKLAD_OPTIONS[0], seyfNum: "", polkaNum: "", available: true });
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [perPage, setPerPage] = usePerPage("sprav-locations", 10);

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

  const openAdd = goAdd;
  const openEdit = goEdit;

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
                <td className="px-4 py-3"><Badge label={loc.available ? "Доступно" : "Заблокировано"} group="mesta-hraneniya" /></td>
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
            <FillerRows count={fillerCount(sorted.length, page, perPage)} cols={5} />
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
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
            <Field label="Склад" required><Select value={form.sklad} options={SKLAD_OPTIONS} onChange={v => setForm(f => ({ ...f, sklad: v }))} /></Field>
            <Field label="Номер сейфа" required><Input value={form.seyfNum} onChange={v => setForm(f => ({ ...f, seyfNum: v }))} placeholder="2" /></Field>
            <Field label="Номер полки"><Input value={form.polkaNum} onChange={v => setForm(f => ({ ...f, polkaNum: v }))} placeholder="5" /></Field>
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

// ── Химический состав (элементы блока «Химический состав» в формах) ──────────

const emptyChem = (): ChemElement => ({ id: "", name: "", shortName: "", showDm: true, showShk: true });

function ChemElementsPage({ onBack }: { onBack: () => void }) {
  const { chemElements: items, setChemElements: setItems } = useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ChemElement>(emptyChem());
  const { showAdd, viewItem, editItem, editKey, goAdd, goView, goEdit, closeAll } = useRecordScreens(items, i => i.id);
  const setViewItem = (i: ChemElement | null) => (i ? goView(i) : closeAll());
  useEffect(() => {
    if (editItem) setForm(editItem);
    else if (showAdd) setForm(emptyChem());
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [perPage, setPerPage] = usePerPage("sprav-chem", 10);

  // № — порядковый номер в справочнике (в этом порядке поля выводятся в формах)
  const numOf = (e: ChemElement) => items.indexOf(e) + 1;

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.shortName.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    n: i => numOf(i),
    name: i => i.name,
    shortName: i => i.shortName,
    showDm: i => (i.showDm ? 1 : 0),
    showShk: i => (i.showShk ? 1 : 0),
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  type Flag = "showDm" | "showShk";
  const setFlag = (id: string, flag: Flag, v: boolean) => setItems(prev => prev.map(i => i.id === id ? { ...i, [flag]: v } : i));

  const canSave = !!form.name.trim() && !!form.shortName.trim();
  const save = () => {
    const name = form.name.trim();
    const shortName = form.shortName.trim();
    if (items.some(i => i.id !== editItem?.id && i.shortName.toLowerCase() === shortName.toLowerCase())) {
      show("Элемент с таким кратким наименованием уже существует");
      return;
    }
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...form, name, shortName } : i));
    } else {
      setItems(prev => [...prev, { ...form, id: `chem-${Date.now()}`, name, shortName }]);
    }
    closeAll();
    show("Запись сохранена");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / Химический состав</div>

      <PageHeader
        title="Химический состав"
        subtitle={`${items.length} значений · в ДМ: ${items.filter(i => i.showDm).length} · в ШК: ${items.filter(i => i.showShk).length}`}
        actions={<Btn onClick={goAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Наименование, обозначение..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="n" sort={sort} onSort={toggleSort}>№</SortTh>
            <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
            <SortTh sortKey="shortName" sort={sort} onSort={toggleSort}>Краткое наименование</SortTh>
            <SortTh sortKey="showDm" sort={sort} onSort={toggleSort}>Отображать в ДМ</SortTh>
            <SortTh sortKey="showShk" sort={sort} onSort={toggleSort}>Отображать в ШК</SortTh>
            <th className="w-24"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{numOf(item)}</td>
                <td className="px-4 py-3 text-gray-900">{item.name}</td>
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.shortName}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={item.showDm} onChange={e => setFlag(item.id, "showDm", e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" title="Отображать в формах позиций ДМ" />
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={item.showShk} onChange={e => setFlag(item.id, "showShk", e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" title="Отображать в шихтовых картах" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => setViewItem(item)} />
                    <EditIcon onClick={() => goEdit(item)} />
                    <DeleteIcon onClick={() => confirm(`Удалить элемент «${item.name}»?`, () => { setItems(prev => prev.filter(x => x.id !== item.id)); show("Элемент удалён"); })} />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Записи не найдены</td></tr>
            )}
            <FillerRows count={fillerCount(sorted.length, page, perPage)} cols={6} />
          </tbody>
        </table>
        <Pagination page={page} total={sorted.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={closeAll}
          footer={
            <>
              <Btn variant="secondary" onClick={closeAll}>Отмена</Btn>
              <Btn onClick={save} disabled={!canSave}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Наименование" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Золото" /></Field>
            <Field label="Краткое наименование (обозначение)" required><Input value={form.shortName} onChange={v => setForm(f => ({ ...f, shortName: v }))} placeholder="Au" /></Field>
            <ChemFlagCheckbox label="Отображать в ДМ (поле выводится в блоке «Химический состав» форм позиций ДМ)" checked={form.showDm} onChange={v => setForm(f => ({ ...f, showDm: v }))} />
            <ChemFlagCheckbox label="Отображать в ШК (колонка в таблице шихтовой карты и поле доп. материала)" checked={form.showShk} onChange={v => setForm(f => ({ ...f, showShk: v }))} />
          </div>
        </Modal>
      )}

      {viewItem && (
        <Modal title={`Химический элемент: ${viewItem.name}`} onClose={() => setViewItem(null)} footer={<Btn variant="secondary" onClick={() => setViewItem(null)}>Закрыть</Btn>}>
          <div className="space-y-4">
            <Field label="№"><Input value={String(numOf(viewItem))} disabled /></Field>
            <Field label="Наименование"><Input value={viewItem.name} disabled /></Field>
            <Field label="Краткое наименование (обозначение)"><Input value={viewItem.shortName} disabled /></Field>
            <ChemFlagCheckbox label="Отображать в ДМ" checked={viewItem.showDm} disabled />
            <ChemFlagCheckbox label="Отображать в ШК" checked={viewItem.showShk} disabled />
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Допустимые отклонения от массы (металл, диапазон взвешивания, допуск ±) ──

type TolForm = { metal: string; minKg: string; maxKg: string; plusG: string; minusG: string };
const ALL_TOL_METALS = "Все металлы";
const numIn = (s: string) => parseFloat(String(s).replace(",", "."));
const fmtNum = (v: number) => String(v).replace(".", ",");
const rangeOf = (t: MassTolerance) => `${fmtNum(t.minKg)}–${fmtNum(t.maxKg)} кг`;

function MassTolerancesPage({ onBack }: { onBack: () => void }) {
  const { massTolerances: items, setMassTolerances: setItems, chemElements } = useApp();
  const metalName = (id: string) => chemElements.find(e => e.id === id)?.name ?? id;
  const metalOptions = chemElements.map(e => e.id);
  const emptyForm = (): TolForm => ({ metal: chemElements[0]?.id ?? "", minKg: "", maxKg: "", plusG: "", minusG: "" });
  const [form, setForm] = useState<TolForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState(ALL_TOL_METALS);
  const [page, setPage] = useState(1);
  const { showAdd, viewItem, editItem, editKey, goAdd, goView, goEdit, closeAll } = useRecordScreens(items, i => i.id);
  useEffect(() => {
    if (editItem) setForm({ metal: editItem.metal, minKg: fmtNum(editItem.minKg), maxKg: fmtNum(editItem.maxKg), plusG: fmtNum(editItem.plusG), minusG: fmtNum(editItem.minusG) });
    else if (showAdd) setForm(emptyForm());
  }, [editKey, showAdd]);
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [perPage, setPerPage] = usePerPage("sprav-tolerances", 10);

  const usedMetals = Array.from(new Set(items.map(i => i.metal)));
  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase();
    return (metalFilter === ALL_TOL_METALS || i.metal === metalFilter)
      && (!q || metalName(i.metal).toLowerCase().includes(q) || rangeOf(i).includes(q));
  });
  const { sorted, sort, toggleSort } = useSort(filtered, {
    metal: i => metalName(i.metal),
    range: i => i.minKg,
    plus: i => i.plusG,
    minus: i => i.minusG,
  });
  // По умолчанию — по металлу и нижней границе диапазона
  const ordered = sort ? sorted : [...filtered].sort((a, b) => metalName(a.metal).localeCompare(metalName(b.metal), "ru") || a.minKg - b.minKg);
  const pageItems = ordered.slice((page - 1) * perPage, page * perPage);

  // Проверка формы: числа, нижняя граница меньше верхней, диапазоны одного металла не пересекаются
  const minKg = numIn(form.minKg), maxKg = numIn(form.maxKg), plusG = numIn(form.plusG), minusG = numIn(form.minusG);
  const numbersOk = [minKg, maxKg, plusG, minusG].every(v => Number.isFinite(v) && v >= 0);
  const rangeOk = numbersOk && minKg < maxKg;
  const overlap = rangeOk ? items.find(t => t.id !== editItem?.id && t.metal === form.metal && minKg < t.maxKg && t.minKg < maxKg) : undefined;
  const error = !numbersOk ? "" : !rangeOk ? "Нижний предел должен быть меньше верхнего" : overlap ? `Диапазон пересекается с записью ${metalName(overlap.metal)}, ${rangeOf(overlap)}` : "";
  const canSave = !!form.metal && numbersOk && rangeOk && !overlap;

  const save = () => {
    if (!canSave) return;
    const rec = { metal: form.metal, minKg, maxKg, plusG, minusG };
    if (editItem) setItems(prev => prev.map(i => (i.id === editItem.id ? { ...i, ...rec } : i)));
    else setItems(prev => [...prev, { id: `tol-${Date.now()}`, ...rec }]);
    closeAll();
    show("Запись сохранена");
  };

  const f = (k: keyof TolForm) => (v: string) => setForm(x => ({ ...x, [k]: v.replace(/[^\d.,]/g, "") }));

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / Допустимые отклонения от массы</div>

      <PageHeader
        title="Допустимые отклонения от массы"
        subtitle={`${items.length} значений · допуск при взвешивании по металлу и диапазону массы`}
        actions={<Btn onClick={goAdd}><Plus className="w-4 h-4" />Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3">
        <div className="w-72">
          <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Металл, диапазон..." />
        </div>
        <div className="w-56">
          <Field label="Металл">
            <Select value={metalFilter} options={[ALL_TOL_METALS, ...usedMetals]} onChange={v => { setMetalFilter(v); setPage(1); }} optionLabel={v => (v === ALL_TOL_METALS ? v : metalName(v))} />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh sortKey="metal" sort={sort} onSort={toggleSort}>Металл</SortTh>
            <SortTh sortKey="range" sort={sort} onSort={toggleSort}>Диапазон массы</SortTh>
            <SortTh sortKey="plus" sort={sort} onSort={toggleSort}>Допуск вверх (+), г</SortTh>
            <SortTh sortKey="minus" sort={sort} onSort={toggleSort}>Допуск вниз (−), г</SortTh>
            <th className="w-24"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-900">{metalName(item.metal)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{rangeOf(item)}</td>
                <td className="px-4 py-3 text-green-700 font-medium">+{fmtNum(item.plusG)}</td>
                <td className="px-4 py-3 text-red-600 font-medium">−{fmtNum(item.minusG)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => goView(item)} />
                    <EditIcon onClick={() => goEdit(item)} />
                    <DeleteIcon onClick={() => confirm(`Удалить допуск «${metalName(item.metal)}, ${rangeOf(item)}»?`, () => { setItems(prev => prev.filter(x => x.id !== item.id)); show("Запись удалена"); })} />
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Записи не найдены</td></tr>
            )}
            <FillerRows count={fillerCount(ordered.length, page, perPage)} cols={5} />
          </tbody>
        </table>
        <Pagination page={page} total={ordered.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={closeAll}
          footer={<>
            <Btn variant="secondary" onClick={closeAll}>Отмена</Btn>
            <Btn onClick={save} disabled={!canSave}>Сохранить</Btn>
          </>}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Металл" required full>
              <Select value={form.metal} options={metalOptions} onChange={v => setForm(x => ({ ...x, metal: v }))} optionLabel={metalName} />
            </Field>
            <Field label="Предел взвешивания от, кг" required><Input value={form.minKg} onChange={f("minKg")} placeholder="0" /></Field>
            <Field label="Предел взвешивания до, кг" required><Input value={form.maxKg} onChange={f("maxKg")} placeholder="0,2" /></Field>
            <Field label="Допуск вверх (+), г" required><Input value={form.plusG} onChange={f("plusG")} placeholder="0,02" /></Field>
            <Field label="Допуск вниз (−), г" required><Input value={form.minusG} onChange={f("minusG")} placeholder="0,02" /></Field>
          </div>
          {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
          <p className="mt-3 text-xs text-gray-500">Нижний предел входит в диапазон, верхний — нет (кроме последнего диапазона металла).</p>
        </Modal>
      )}

      {viewItem && (
        <Modal title={`Допуск: ${metalName(viewItem.metal)}, ${rangeOf(viewItem)}`} onClose={closeAll} footer={<>
          <Btn variant="secondary" onClick={() => goEdit(viewItem)}>Редактировать</Btn>
          <Btn variant="secondary" onClick={closeAll}>Закрыть</Btn>
        </>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Металл" full><Input value={metalName(viewItem.metal)} disabled /></Field>
            <Field label="Предел взвешивания от, кг"><Input value={fmtNum(viewItem.minKg)} disabled /></Field>
            <Field label="Предел взвешивания до, кг"><Input value={fmtNum(viewItem.maxKg)} disabled /></Field>
            <Field label="Допуск вверх (+), г"><Input value={fmtNum(viewItem.plusG)} disabled /></Field>
            <Field label="Допуск вниз (−), г"><Input value={fmtNum(viewItem.minusG)} disabled /></Field>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

function ChemFlagCheckbox({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-sm text-gray-700 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange?.(e.target.checked)} disabled={disabled} className="w-4 h-4 accent-blue-600" />
      {label}
    </label>
  );
}

export function Spravochniki() {
  const { storageLocations, chemElements, materialCodes, statusDicts, massTolerances, navigate } = useApp();
  // Справочник — /spravochniki/<slug>
  const { pathname } = useLocation();
  const { page, segs } = matchPage(pathname);
  const slug = page === "spravochnik-detail" ? segs[1] : undefined;
  const open = (s?: string) => (s ? navigate("spravochnik-detail", { dict: s }) : navigate("spravochniki"));
  const selected = (Object.keys(DICT_SLUG) as SpravKey[]).find(k => DICT_SLUG[k] === slug) ?? null;
  const showMaterialCodes = slug === SPRAV_SLUGS["Коды материалов"];
  const showMaterialClasses = slug === SPRAV_SLUGS["Классы материалов"];
  const showStorageLocations = slug === SPRAV_SLUGS["Места хранения"];
  const showChemElements = slug === SPRAV_SLUGS["Химический состав"];
  const setSelected = (k: SpravKey | null) => open(k ? DICT_SLUG[k] : undefined);
  const setShowMaterialCodes = (on: boolean) => open(on ? SPRAV_SLUGS["Коды материалов"] : undefined);
  const setShowMaterialClasses = (on: boolean) => open(on ? SPRAV_SLUGS["Классы материалов"] : undefined);
  const setShowStorageLocations = (on: boolean) => open(on ? SPRAV_SLUGS["Места хранения"] : undefined);
  const setShowChemElements = (on: boolean) => open(on ? SPRAV_SLUGS["Химический состав"] : undefined);
  const showMassTolerances = slug === SPRAV_SLUGS["Допустимые отклонения от массы"];

  const statusDict = statusDicts.find(d => statusSlug(d) === slug) ?? null;
  if (statusDict) {
    return <StatusDictPage key={statusDict.group} dict={statusDict} onBack={() => open()} />;
  }
  if (selected) {
    return <DictPage key={selected} name={selected} onBack={() => setSelected(null)} />;
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
  if (showMassTolerances) {
    return <MassTolerancesPage onBack={() => open()} />;
  }
  if (showChemElements) {
    return <ChemElementsPage onBack={() => setShowChemElements(false)} />;
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
          <p className="text-sm text-gray-400">{materialCodes.length} значений</p>
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
          <p className="text-sm text-gray-400">{storageLocations.length} значений</p>
        </button>
        <button
          onClick={() => setShowChemElements(true)}
          className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
        >
          <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Химический состав</h3>
          <p className="text-sm text-gray-400">{chemElements.length} значений</p>
        </button>
        <button
          onClick={() => open(SPRAV_SLUGS["Допустимые отклонения от массы"])}
          className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
        >
          <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Ruler className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Допустимые отклонения от массы</h3>
          <p className="text-sm text-gray-400">{massTolerances.length} значений</p>
        </button>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-8 mb-3">Статусы</h2>
      <div className="grid grid-cols-4 gap-4">
        {statusDicts.map(d => (
          <button
            key={d.group}
            onClick={() => open(statusSlug(d))}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
          >
            <div className="w-10 h-10 mb-3 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CircleDot className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{d.name}</h3>
            <p className="text-sm text-gray-400">{d.items.length} значений</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {d.items.slice(0, 4).map(i => <Badge key={i.id} label={i.name} group={d.group} />)}
              {d.items.length > 4 && <span className="text-xs text-gray-400 self-center">+{d.items.length - 4}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
