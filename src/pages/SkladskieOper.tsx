import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Btn, Modal, EyeIcon, EditIcon, DeleteIcon, PrintIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, FileChip, MultiFileUpload, useConfirm, ConfirmDialog,
  SortTh, useSort, parseRuDate, Badge,
} from "../components/ui";
import { SkladDoc, GPItem, DocStatus } from "../data/mock";
import { Inbox, Send, Repeat, Plus, X, LucideIcon } from "lucide-react";
import PrihodDocModal from "../components/PrihodDocModal";
import VydachaDocModal from "../components/VydachaDocModal";
import { useScreen } from "../router";

// ── Hub ───────────────────────────────────────────────────────────────────────

export function SkladskieOperHub() {
  const { navigate } = useApp();
  const cards: { title: string; sub: string; icon: LucideIcon; page: "prihod-list" | "vydacha-list" | "dvizhenie-mat" }[] = [
    { title: "Приход на склад", sub: "Приходные ордера и накладные", icon: Inbox, page: "prihod-list" },
    { title: "Выдача со склада", sub: "Документы отгрузки", icon: Send, page: "vydacha-list" },
    { title: "Движение материала (операции)", sub: "Журнал внутренних операций", icon: Repeat, page: "dvizhenie-mat" },
  ];
  return (
    <div>
      <PageHeader title="Складские операции" subtitle="Управление приёмом, выдачей и движением материалов" breadcrumb={["Складские операции"]} />
      <div className="grid grid-cols-3 gap-6">
        {cards.map(c => (
          <button key={c.page} onClick={() => navigate(c.page)} className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-shadow hover:border-blue-300">
            <div className="w-11 h-11 mb-4 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <c.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
            <p className="text-sm text-gray-500">{c.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Печать ярлыков ДМ modal (выбор прихода + позиций) ────────────────────────

const LABEL_TEMPLATES = [
  { nomenkl: "DM-001", name: "Слиток золота ЗлА-1", klass: "Слиток", weight: "500.25", ag: "0.05", cu: "0.02", fe: "–" },
  { nomenkl: "DM-002", name: "Слиток серебра СрА-2", klass: "Слиток", weight: "300.10", ag: "92.50", cu: "0.10", fe: "–" },
  { nomenkl: "DM-003", name: "Стружка золотая", klass: "Стружка", weight: "120.40", ag: "0.03", cu: "0.01", fe: "0.01" },
  { nomenkl: "DM-004", name: "Проба на анализ", klass: "Основная проба", weight: "12.40", ag: "0.02", cu: "–", fe: "–" },
  { nomenkl: "DM-005", name: "Слиток золота ЗлБ-2", klass: "Слиток", weight: "300.00", ag: "0.04", cu: "0.02", fe: "–" },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function getDocPositions(doc: SkladDoc) {
  const h = hashStr(doc.id);
  const count = 2 + (h % 2);
  const start = h % LABEL_TEMPLATES.length;
  return Array.from({ length: count }, (_, i) => ({ id: `${doc.id}-p${i}`, docNumber: doc.number, ...LABEL_TEMPLATES[(start + i) % LABEL_TEMPLATES.length] }));
}

function PrintLabelsModal({ docs, onClose, onPrint }: { docs: SkladDoc[]; onClose: () => void; onPrint: (count: number) => void }) {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [selectedPos, setSelectedPos] = useState<Set<string>>(new Set());

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const togglePos = (id: string) => {
    setSelectedPos(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const positions = docs.filter(d => selectedDocs.has(d.id)).flatMap(getDocPositions);
  const availableIds = new Set(positions.map(p => p.id));
  const effectiveSelected = new Set([...selectedPos].filter(id => availableIds.has(id)));

  return (
    <Modal
      title="Печать ярлыков ДМ"
      onClose={onClose}
      extraWide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn disabled={effectiveSelected.size === 0} onClick={() => onPrint(effectiveSelected.size)}>Печать выбранных</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Документы прихода</div>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
            {docs.length === 0 && <div className="text-sm text-gray-400 text-center py-6">Нет документов прихода</div>}
            {docs.map(d => (
              <label key={d.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${selectedDocs.has(d.id) ? "bg-blue-50/50" : ""}`}>
                <input type="checkbox" checked={selectedDocs.has(d.id)} onChange={() => toggleDoc(d.id)} className="w-4 h-4 accent-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{d.number}</div>
                  <div className="text-xs text-gray-500">{d.type} · {d.date}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Позиции для печати</div>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setSelectedPos(new Set(availableIds))} disabled={positions.length === 0} className="text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed">Выбрать все</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setSelectedPos(new Set())} disabled={effectiveSelected.size === 0} className="text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed">Снять все</button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
            {positions.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6 px-3">Выберите документ(ы) слева, чтобы увидеть позиции</div>
            )}
            {positions.map(p => (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${effectiveSelected.has(p.id) ? "bg-blue-50/50" : ""}`}>
                <input type="checkbox" checked={effectiveSelected.has(p.id)} onChange={() => togglePos(p.id)} className="w-4 h-4 accent-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.nomenkl} · <KlassCode value={p.klass} /> · {p.weight} г · Ag {p.ag} · Cu {p.cu} · Fe {p.fe}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-right">Выбрано: {effectiveSelected.size} из {positions.length}</div>
        </div>
      </div>
    </Modal>
  );
}

// ── Фильтры списка документов: Тип документа, Номер, Статус, Дата (период) ────

const ALL_TYPES = "Все типы";
const ALL_STATUSES = "Все статусы";
// Дата фильтра из <input type="date"> (yyyy-mm-dd) в число, сравнимое с parseRuDate
const isoToNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y * 100000000 + m * 1000000 + d * 10000;
};
const dateCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function useDocFilters(docs: SkladDoc[], onChange: () => void) {
  const { statusDicts } = useApp();
  const [type, setType] = useState(ALL_TYPES);
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // При изменении фильтра — на первую страницу
  const upd = <T,>(set: (v: T) => void) => (v: T) => { set(v); onChange(); };

  const types = [ALL_TYPES, ...Array.from(new Set(docs.map(d => d.type))).sort()];
  // Статусы — из справочника «Статусы складских документов»
  const dictStatuses = statusDicts.find(d => d.group === "dokumenty")?.items.map(i => i.name) ?? [];
  const statuses = [ALL_STATUSES, ...dictStatuses, ...docs.map(d => d.status).filter(st => !dictStatuses.includes(st))]
    .filter((v, i, a) => a.indexOf(v) === i);

  const q = number.trim().toLowerCase();
  const from = dateFrom ? isoToNum(dateFrom) : 0;
  const to = dateTo ? isoToNum(dateTo) + 9999 : Infinity;
  const filtered = docs.filter(d => {
    const dt = parseRuDate(d.date);
    return (type === ALL_TYPES || d.type === type)
      && (!q || d.number.toLowerCase().includes(q))
      && (status === ALL_STATUSES || d.status === status)
      && dt >= from && dt <= to;
  });

  const reset = () => { setType(ALL_TYPES); setNumber(""); setStatus(ALL_STATUSES); setDateFrom(""); setDateTo(""); onChange(); };

  const bar = (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-6 gap-3 items-end">
      <Field label="Тип документа"><Select value={type} options={types} onChange={upd(setType)} /></Field>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Номер</label>
        <SearchInput value={number} onChange={upd(setNumber)} placeholder="Поиск по номеру..." />
      </div>
      <Field label="Статус"><Select value={status} options={statuses} onChange={upd(setStatus)} /></Field>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Дата с</label>
        <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => upd(setDateFrom)(e.target.value)} className={dateCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Дата по</label>
        <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => upd(setDateTo)(e.target.value)} className={dateCls} />
      </div>
      <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
    </div>
  );
  return { filtered, bar };
}

// ── Список документов (общий шаблон) ─────────────────────────────────────────

function DocList({
  title,
  docs,
  addLabel,
  onSave,
  onUpdate,
  onDelete,
  showPrint,
}: {
  title: string;
  docs: SkladDoc[];
  addLabel: string;
  onSave: (d: SkladDoc) => void;
  onUpdate: (d: SkladDoc) => void;
  onDelete: (id: string) => void;
  showPrint?: boolean;
}) {
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const { filtered, bar } = useDocFilters(docs, () => setPage(1));
  // Экраны: …/new, …/view/:id, …/edit/:id, …/labels
  const screen = useScreen();
  const viewDoc = docs.find(d => d.id === screen.after("view")) ?? null;
  const editDoc = docs.find(d => d.id === screen.after("edit")) ?? null;
  const showModal = screen.has("new");
  const showPrintLabels = screen.has("labels");

  const { sorted, sort, toggleSort } = useSort(filtered, {
    date: d => parseRuDate(d.date),
    type: d => d.type,
    number: d => d.number,
    sender: d => d.sender,
    receiver: d => d.receiver,
    status: d => d.status,
  });
  const perPage = 8;
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Документы приёма и выдачи материала"
        breadcrumb={["Складские операции", title]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("new")}>
              <Plus className="w-4 h-4" />
              {addLabel}
            </Btn>
            {showPrint && <Btn variant="secondary" onClick={() => screen.openTop("labels")}>Печать ярлыков ДМ</Btn>}
            <ExportBtn onToast={show} />
          </>
        }
      />

      {bar}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Тип документа</SortTh>
              <SortTh sortKey="number" sort={sort} onSort={toggleSort}>Номер</SortTh>
              <SortTh sortKey="sender" sort={sort} onSort={toggleSort}>Отправитель</SortTh>
              <SortTh sortKey="receiver" sort={sort} onSort={toggleSort}>Получатель</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
                <td className="px-4 py-3"><Badge label={doc.status} group="dokumenty" /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => screen.openTop("view", doc.id)} />
                  <EditIcon onClick={() => screen.openTop("edit", doc.id)} />
                  <DeleteIcon onClick={() => confirm(`Удалить документ ${doc.number}?`, () => { onDelete(doc.id); show(`Документ ${doc.number} удалён`); })} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Документы не найдены</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <PrihodDocModal key={viewDoc.id} doc={viewDoc} onClose={() => screen.close("view")} onSave={() => screen.close("view")} readOnly />}
      {editDoc && (
        <PrihodDocModal
          key={editDoc.id}
          doc={editDoc}
          onClose={() => screen.close("edit")}
          onSave={d => { onUpdate(d); screen.close("edit"); show(`Документ ${d.number} обновлён`); }}
        />
      )}
      {showModal && (
        <PrihodDocModal
          onClose={() => screen.close("new")}
          onSave={d => { onSave(d); screen.close("new"); show(`Документ ${d.number} сохранён`); }}
        />
      )}
      {showPrintLabels && (
        <PrintLabelsModal
          docs={docs}
          onClose={() => screen.close("labels")}
          onPrint={count => { screen.close("labels"); show(`Печать ${count} ярлыков выполнена`); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function PrihodList() {
  const { skladDocs, setSkladDocs } = useApp();
  return (
    <DocList
      title="Приход на склад"
      docs={skladDocs}
      addLabel="Принять на склад"
      onSave={d => setSkladDocs(prev => [d, ...prev])}
      onUpdate={d => setSkladDocs(prev => prev.map(x => x.id === d.id ? d : x))}
      onDelete={id => setSkladDocs(prev => prev.filter(x => x.id !== id))}
      showPrint
    />
  );
}

export function VydachaList() {
  const { vydachaDocs, setVydachaDocs } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  // Экраны: …/new, …/view/:id, …/edit/:id
  const screen = useScreen();
  const viewDoc = vydachaDocs.find(d => d.id === screen.after("view")) ?? null;
  const editDoc = vydachaDocs.find(d => d.id === screen.after("edit")) ?? null;
  const showNew = screen.has("new");
  const perPage = 8;
  const { filtered, bar } = useDocFilters(vydachaDocs, () => setPage(1));

  const { sorted, sort, toggleSort } = useSort(filtered, {
    date: d => parseRuDate(d.date),
    type: d => d.type,
    number: d => d.number,
    sender: d => d.sender,
    receiver: d => d.receiver,
    status: d => d.status,
  });

  return (
    <div>
      <PageHeader
        title="Выдача со склада"
        subtitle="Документы отгрузки ГП и ДМ сторонним получателям"
        breadcrumb={["Складские операции", "Выдача со склада"]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("new")}>Выдать со склада</Btn>
            <ExportBtn onToast={show} />
          </>
        }
      />
      {bar}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Тип документа</SortTh>
              <SortTh sortKey="number" sort={sort} onSort={toggleSort}>Номер</SortTh>
              <SortTh sortKey="sender" sort={sort} onSort={toggleSort}>Отправитель</SortTh>
              <SortTh sortKey="receiver" sort={sort} onSort={toggleSort}>Получатель</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
                <td className="px-4 py-3"><Badge label={doc.status} group="dokumenty" /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => screen.openTop("view", doc.id)} />
                  <EditIcon onClick={() => screen.openTop("edit", doc.id)} />
                  <DeleteIcon onClick={() => confirm(`Удалить документ ${doc.number}?`, () => setVydachaDocs(prev => prev.filter(d => d.id !== doc.id)))} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Документы не найдены</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <VydachaDocModal key={viewDoc.id} doc={viewDoc} onClose={() => screen.close("view")} onSave={() => screen.close("view")} readOnly />}
      {editDoc && (
        <VydachaDocModal
          key={editDoc.id}
          doc={editDoc}
          onClose={() => screen.close("edit")}
          onSave={d => {
            setVydachaDocs(prev => prev.map(x => x.id === d.id ? d : x));
            screen.close("edit");
            show(`Документ ${d.number} обновлён`);
          }}
        />
      )}
      {showNew && (
        <VydachaDocModal
          onClose={() => screen.close("new")}
          onSave={d => {
            setVydachaDocs(prev => [d, ...prev]);
            screen.close("new");
            show("Выдача оформлена");
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
