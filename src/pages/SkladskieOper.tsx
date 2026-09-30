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

// ── Выдача ГП modal ───────────────────────────────────────────────────────────

function VydachaGPModal({ onClose, onSave, doc, readOnly = false }: { onClose: () => void; onSave: (d: SkladDoc) => void; doc?: SkladDoc | null; readOnly?: boolean }) {
  const { gpItems } = useApp();
  const { toast, show, clear } = useToast();
  const [head, setHead] = useState(() => ({
    number: doc?.number || "НО-0205",
    date: doc?.date || new Date().toLocaleDateString("ru-RU"),
    poluchatel: doc?.receiver || "ТД «Золото Казахстана»",
    schetFaktura: "СФ-2026-0199",
  }));

  const [files, setFiles] = useState<File[]>([]);

  const [positions, setPositions] = useState<{ nomenkl: string; name: string; code: string; location: string; qty: number }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});

  const availableItems = gpItems.filter(i => i.status === "На складе" && i.qty > 0);
  const selectedCount = Object.keys(selectedQty).length;

  const { sorted: sortedPositions, sort: posSort, toggleSort: togglePosSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    code: p => p.code,
    qty: p => p.qty,
    location: p => p.location,
  });

  const { sorted: sortedAvailable, sort: availSort, toggleSort: toggleAvailSort } = useSort(availableItems, {
    nomenkl: i => i.nomenkl,
    name: i => i.name,
    code: i => i.code,
    qty: i => i.qty,
  });

  const openAdd = () => {
    setSelectedQty({});
    setShowAdd(true);
  };

  const toggleItem = (id: string) => {
    setSelectedQty(prev => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = "1";
      return next;
    });
  };

  const setItemQty = (id: string, v: string) => {
    setSelectedQty(prev => (id in prev ? { ...prev, [id]: v } : prev));
  };

  const addPositions = () => {
    const additions = availableItems
      .filter(i => i.id in selectedQty)
      .map((i): { nomenkl: string; name: string; code: string; location: string; qty: number } => {
        const raw = parseInt(selectedQty[i.id], 10) || 1;
        return { nomenkl: i.nomenkl, name: i.name, code: i.code, location: i.location, qty: Math.max(1, Math.min(raw, i.qty)) };
      });
    if (additions.length === 0) return;
    setPositions(prev => [...prev, ...additions]);
    setShowAdd(false);
  };

  const save = (targetStatus: DocStatus) => {
    const d: SkladDoc = doc ? {
      ...doc,
      number: head.number,
      date: head.date,
      receiver: head.poluchatel,
      status: targetStatus,
    } : {
      id: `vd-${Date.now()}`,
      date: head.date,
      type: "Накладная на отгрузку ГП",
      number: head.number,
      status: targetStatus,
      sender: "Склад ГП",
      receiver: head.poluchatel,
    };
    onSave(d);
  };

  return (
    <Modal title="Накладная на отгрузку ГП" onClose={onClose} wide footer={
      readOnly
        ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
        : (
          <>
            <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
            <Btn onClick={() => save("Оформлено")}>Оформить</Btn>
            <Btn variant="secondary" onClick={() => save("Редактирование")}>Сохранить</Btn>
          </>
        )
    }>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Тип документа"><Select value="Накладная на отгрузку ГП" options={["Накладная на отгрузку ГП"]} disabled={readOnly} /></Field>
        <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} disabled={readOnly} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={readOnly} /></Field>
        <Field label="Получатель"><Select value={head.poluchatel} options={["ТД «Золото Казахстана»", "ИП Сейткали А.М."]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} disabled={readOnly} /></Field>
        <Field label="Счёт-фактура" full><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} disabled={readOnly} /></Field>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        {readOnly && files.length === 0 ? (
          doc ? <FileChip name={`Накладная_${doc.number}.pdf`} onDownload={() => show("Загрузка файла...")} /> : <span className="text-sm text-gray-400">Файлы не прикреплены</span>
        ) : (
          <MultiFileUpload files={files} onChange={setFiles} disabled={readOnly} />
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции для выдачи</h3>
          {!readOnly && (
            <Btn size="sm" onClick={openAdd} disabled={availableItems.length === 0}><Plus className="w-4 h-4" />Добавить позицию</Btn>
          )}
        </div>
        {positions.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            Список позиций для выдачи пуст
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={posSort} onSort={togglePosSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="name" sort={posSort} onSort={togglePosSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="code" sort={posSort} onSort={togglePosSort} className="px-3 py-2">Код</SortTh>
              <SortTh sortKey="qty" sort={posSort} onSort={togglePosSort} className="px-3 py-2">Кол-во</SortTh>
              <SortTh sortKey="location" sort={posSort} onSort={togglePosSort} className="px-3 py-2">Размещение</SortTh>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPositions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-blue-600">{p.code}</td>
                  <td className="px-3 py-2">{p.qty}</td>
                  <td className="px-3 py-2 text-gray-500">{p.location}</td>
                  {!readOnly && <td className="px-3 py-2">
                    <button onClick={() => setPositions(prev => prev.filter(x => x !== p))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal
          title="Добавить позиции со склада ГП"
          onClose={() => setShowAdd(false)}
          footer={<>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn>
            <Btn onClick={addPositions} disabled={selectedCount === 0}>Добавить{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
          </>}
        >
          {availableItems.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
              Нет доступных позиций на складе ГП
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                  <th className="w-10 px-3 py-2"></th>
                  <SortTh sortKey="nomenkl" sort={availSort} onSort={toggleAvailSort} className="px-3 py-2">Номенкл.№</SortTh>
                  <SortTh sortKey="name" sort={availSort} onSort={toggleAvailSort} className="px-3 py-2">Наименование</SortTh>
                  <SortTh sortKey="code" sort={availSort} onSort={toggleAvailSort} className="px-3 py-2">Код</SortTh>
                  <SortTh sortKey="qty" sort={availSort} onSort={toggleAvailSort} className="px-3 py-2">Доступно</SortTh>
                  <th className="px-3 py-2 text-left w-32">Кол-во к выдаче</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedAvailable.map(i => {
                    const checked = i.id in selectedQty;
                    return (
                      <tr key={i.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(i.id)} className="w-4 h-4 accent-blue-600" />
                        </td>
                        <td className="px-3 py-2 text-gray-500">{i.nomenkl}</td>
                        <td className="px-3 py-2 font-medium">{i.name}</td>
                        <td className="px-3 py-2 text-blue-600">{i.code}</td>
                        <td className="px-3 py-2 text-gray-500">{i.qty} {i.unit}</td>
                        <td className="px-3 py-2">
                          <Input value={selectedQty[i.id] ?? ""} onChange={v => setItemQty(i.id, v)} placeholder="1" disabled={!checked} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [viewDoc, setViewDoc] = useState<SkladDoc | null>(null);
  const [editDoc, setEditDoc] = useState<SkladDoc | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrintLabels, setShowPrintLabels] = useState(false);

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.number.toLowerCase().includes(search.toLowerCase()) || d.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Все статусы" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });
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
            <Btn onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              {addLabel}
            </Btn>
            {showPrint && <Btn variant="secondary" onClick={() => setShowPrintLabels(true)}>Печать ярлыков ДМ</Btn>}
            <ExportBtn onToast={show} />
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Тип документа / Номер</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "Оформлено", "Редактирование"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterStatus("Все статусы"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Сбросить</button>
      </div>

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
                <td className="px-4 py-3"><Badge label={doc.status} /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewDoc(doc)} />
                  <EditIcon onClick={() => setEditDoc(doc)} />
                  <DeleteIcon onClick={() => confirm(`Удалить документ ${doc.number}?`, () => { onDelete(doc.id); show(`Документ ${doc.number} удалён`); })} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <PrihodDocModal doc={viewDoc} onClose={() => setViewDoc(null)} onSave={() => setViewDoc(null)} readOnly />}
      {editDoc && (
        <PrihodDocModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={d => { onUpdate(d); setEditDoc(null); show(`Документ ${d.number} обновлён`); }}
        />
      )}
      {showModal && (
        <PrihodDocModal
          onClose={() => setShowModal(false)}
          onSave={d => { onSave(d); setShowModal(false); show(`Документ ${d.number} сохранён`); }}
        />
      )}
      {showPrintLabels && (
        <PrintLabelsModal
          docs={docs}
          onClose={() => setShowPrintLabels(false)}
          onPrint={count => { setShowPrintLabels(false); show(`Печать ${count} ярлыков выполнена`); }}
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
  const [viewDoc, setViewDoc] = useState<SkladDoc | null>(null);
  const [editDoc, setEditDoc] = useState<SkladDoc | null>(null);
  const [showNew, setShowNew] = useState(false);
  const perPage = 8;

  const { sorted, sort, toggleSort } = useSort(vydachaDocs, {
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
        subtitle="Документы отгрузки готовой продукции"
        breadcrumb={["Складские операции", "Выдача со склада"]}
        actions={
          <>
            <Btn onClick={() => setShowNew(true)}>Выдать со склада</Btn>
            <ExportBtn onToast={show} />
          </>
        }
      />
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
            {sorted.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
                <td className="px-4 py-3"><Badge label={doc.status} /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewDoc(doc)} />
                  <EditIcon onClick={() => setEditDoc(doc)} />
                  <DeleteIcon onClick={() => confirm(`Удалить документ ${doc.number}?`, () => setVydachaDocs(prev => prev.filter(d => d.id !== doc.id)))} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={vydachaDocs.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <VydachaGPModal doc={viewDoc} onClose={() => setViewDoc(null)} onSave={() => setViewDoc(null)} readOnly />}
      {editDoc && (
        <VydachaGPModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={d => {
            setVydachaDocs(prev => prev.map(x => x.id === d.id ? d : x));
            setEditDoc(null);
            show(`Документ ${d.number} обновлён`);
          }}
        />
      )}
      {showNew && (
        <VydachaGPModal
          onClose={() => setShowNew(false)}
          onSave={d => {
            setVydachaDocs(prev => [d, ...prev]);
            setShowNew(false);
            show("Выдача оформлена");
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
