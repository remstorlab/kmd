import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Btn, Modal, EyeIcon, EditIcon, DeleteIcon, PrintIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, Field, Input, Select, KlassSelect, MaterialCodeSelect, FileChip, MultiFileUpload, useConfirm, ConfirmDialog,
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
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Дата с</label>
        <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => upd(setDateFrom)(e.target.value)} className={dateCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Дата по</label>
        <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => upd(setDateTo)(e.target.value)} className={dateCls} />
      </div>
      <Field label="Тип документа"><Select value={type} options={types} onChange={upd(setType)} /></Field>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Номер</label>
        <SearchInput value={number} onChange={upd(setNumber)} placeholder="Поиск по номеру..." />
      </div>
      <Field label="Статус"><Select value={status} options={statuses} onChange={upd(setStatus)} /></Field>
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
}: {
  title: string;
  docs: SkladDoc[];
  addLabel: string;
  onSave: (d: SkladDoc) => void;
  onUpdate: (d: SkladDoc) => void;
  onDelete: (id: string) => void;
}) {
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const { filtered, bar } = useDocFilters(docs, () => setPage(1));
  // Экраны: …/new, …/view/:id, …/edit/:id
  const screen = useScreen();
  const viewDoc = docs.find(d => d.id === screen.after("view")) ?? null;
  const editDoc = docs.find(d => d.id === screen.after("edit")) ?? null;
  const showModal = screen.has("new");

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
