import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, PrintIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, Field, Input, Select, FileChip, useConfirm, ConfirmDialog,
} from "../components/ui";
import { SkladDoc } from "../data/mock";

// ── Hub ───────────────────────────────────────────────────────────────────────

export function SkladskieOperHub() {
  const { navigate } = useApp();
  const cards = [
    { title: "Приход на склад", sub: "Приходные ордера и накладные", icon: "📥", page: "prihod-list" as const },
    { title: "Выдача ГП", sub: "Документы отгрузки ГП", icon: "📤", page: "vydacha-list" as const },
    { title: "Движение материала (операции)", sub: "Журнал операций", icon: "↔️", page: "dvizhenie-mat" as const },
  ];
  return (
    <div>
      <PageHeader title="Складские операции" subtitle="Управление приёмом, выдачей и движением материалов" breadcrumb={["Складские операции"]} />
      <div className="grid grid-cols-3 gap-6">
        {cards.map(c => (
          <button key={c.page} onClick={() => navigate(c.page)} className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-shadow hover:border-blue-300">
            <div className="text-3xl mb-4">{c.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
            <p className="text-sm text-gray-500">{c.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Приходный ордер modal ─────────────────────────────────────────────────────

function PrihodnyOrdModal({ onClose, onSave, doc }: { onClose: () => void; onSave: (d: SkladDoc) => void; doc?: SkladDoc | null; readOnly?: boolean }) {
  const [positions, setPositions] = useState([
    { nomenkl: "DM-001", name: "Слиток золота ЗлА-1", klass: "Слиток", code: "AU", proba: "999", lig: "500.25", net: "498.12", loc: "Сейф №1, Полка А" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nomenkl: "DM-001", klass: "Слиток", code: "AU", name: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });
  const { toast, show, clear } = useToast();
  const ro = !!doc;

  const addPos = () => {
    setPositions(p => [...p, { nomenkl: form.nomenkl, name: form.name || "Позиция ДМ", klass: form.klass, code: form.code, proba: form.proba, lig: form.lig, net: form.net, loc: `${form.sey}, ${form.polka}` }]);
    setShowAdd(false);
    setForm({ nomenkl: "DM-001", klass: "Слиток", code: "AU", name: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });
  };

  const save = () => {
    const d: SkladDoc = {
      id: `sd-${Date.now()}`,
      date: new Date().toLocaleDateString("ru-RU"),
      type: "Приходный ордер",
      number: `ПО-${Math.floor(Math.random() * 900 + 100)}`,
      status: "Выполнено",
      sender: "ОО «АурумПоставка»",
      receiver: "Склад ДМ №1",
    };
    onSave(d);
  };

  return (
    <Modal
      title={doc ? `Приходный ордер ${doc.number}` : "Новый приходный ордер"}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <>
          <Btn variant="secondary" onClick={() => show("Печать ярлыков ДМ")}>Печать ярлыков ДМ</Btn>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn variant="secondary" onClick={save}>Сохранить и печать</Btn>
          <Btn onClick={save}>Сохранить</Btn>
        </>
      )}
    >
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Тип документа"><Input value="Приходный ордер" disabled /></Field>
        <Field label="Номер"><Input value={doc?.number || "ПО-0342"} disabled={ro} /></Field>
        <Field label="Дата"><Input value={doc?.date || "19.08.2026"} disabled={ro} /></Field>
        <Field label="Отправитель"><Select value={doc?.sender || "ОО «АурумПоставка»"} options={["ОО «АурумПоставка»", "АО «Металл Инвест»"]} disabled={ro} /></Field>
        <Field label="Получатель"><Select value={doc?.receiver || "Склад ДМ №1"} options={["Склад ДМ №1", "Склад ДМ №2"]} disabled={ro} /></Field>
        <Field label="№ счёт-фактуры"><Input value="СФ-2026-1234" disabled={ro} /></Field>
        <Field label="Дата счёт-фактуры"><Input value="15.08.2026" disabled={ro} /></Field>
        <Field label="Номер договора"><Input value="ДОГ-2025-089" disabled={ro} /></Field>
        <Field label="Дата договора"><Input value="01.01.2025" disabled={ro} /></Field>
        <Field label="Лигатурный вес по документу (г)"><Input value="500.25" disabled={ro} /></Field>
        <Field label="Принято лигатурный вес (г)"><Input value="500.25" disabled={ro} /></Field>
        <Field label="Принято чистый вес (г)"><Input value="498.12" disabled={ro} /></Field>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <FileChip name="Приходный ордер ПО-0342.pdf" onDownload={() => show("Загрузка файла...")} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции прихода</h3>
          {!ro && (
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setShowAdd(true)}>+ Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          )}
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <th className="px-3 py-2 text-left">Номенкл.№</th>
            <th className="px-3 py-2 text-left">Наименование</th>
            <th className="px-3 py-2 text-left">Класс</th>
            <th className="px-3 py-2 text-left">Код</th>
            <th className="px-3 py-2 text-left">Проба</th>
            <th className="px-3 py-2 text-left">Лигат.г</th>
            <th className="px-3 py-2 text-left">Чистый г</th>
            <th className="px-3 py-2 text-left">Размещение</th>
            {!ro && <th className="w-16"></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {positions.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.klass}</td>
                <td className="px-3 py-2 text-blue-600">{p.code}</td>
                <td className="px-3 py-2">{p.proba}</td>
                <td className="px-3 py-2">{p.lig}</td>
                <td className="px-3 py-2">{p.net}</td>
                <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                {!ro && <td className="px-3 py-2">
                  <button onClick={() => setPositions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors text-xs">✕</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Добавить позицию ДМ" onClose={() => setShowAdd(false)} footer={<><Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn><Btn onClick={addPos}>Добавить</Btn></>}>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Номенкл. номер"><Select value={form.nomenkl} options={["DM-001", "DM-002", "DM-003", "DM-004"]} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} /></Field>
            <Field label="Класс"><Select value={form.klass} options={["Слиток", "Стружка", "Проба", "Раствор"]} onChange={v => setForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Код материала"><Select value={form.code} options={["AU", "AG", "PT", "PD"]} onChange={v => setForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Наименование" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Наименование позиции" /></Field>
            <Field label="Масса лигатурная г"><Input value={form.lig} onChange={v => setForm(f => ({ ...f, lig: v }))} placeholder="0.00" /></Field>
            <Field label="Масса чистая г"><Input value={form.net} onChange={v => setForm(f => ({ ...f, net: v }))} placeholder="0.00" /></Field>
            <Field label="Проба"><Input value={form.proba} onChange={v => setForm(f => ({ ...f, proba: v }))} placeholder="999" /></Field>
            <Field label="Сейф"><Select value={form.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setForm(f => ({ ...f, sey: v }))} /></Field>
            <Field label="Полка"><Select value={form.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setForm(f => ({ ...f, polka: v }))} /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Выдача ГП modal ───────────────────────────────────────────────────────────

function VydachaGPModal({ onClose, onSave, readOnly = false }: { onClose: () => void; onSave: () => void; readOnly?: boolean }) {
  return (
    <Modal title="Накладная на отгрузку ГП" onClose={onClose} wide footer={
      readOnly
        ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
        : <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={onSave}>Оформить выдачу</Btn></>
    }>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Тип документа"><Select value="Накладная на отгрузку ГП" options={["Накладная на отгрузку ГП"]} disabled={readOnly} /></Field>
        <Field label="Номер"><Input value="НО-0205" disabled /></Field>
        <Field label="Дата"><Input value="19.08.2026" disabled /></Field>
        <Field label="Получатель"><Select value="ТД «Золото Казахстана»" options={["ТД «Золото Казахстана»", "ИП Сейткали А.М."]} disabled={readOnly} /></Field>
        <Field label="Счёт-фактура" full><Input value="СФ-2026-0199" disabled={readOnly} /></Field>
      </div>
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
        Список позиций для выдачи
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
  showPrint,
}: {
  title: string;
  docs: SkladDoc[];
  addLabel: string;
  onSave: (d: SkladDoc) => void;
  showPrint?: boolean;
}) {
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [viewDoc, setViewDoc] = useState<SkladDoc | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.number.toLowerCase().includes(search.toLowerCase()) || d.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Все статусы" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const perPage = 8;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Документы приёма и выдачи материала"
        breadcrumb={["Складские операции", title]}
        actions={
          <>
            <Btn onClick={() => setShowModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {addLabel}
            </Btn>
            {showPrint && <Btn variant="secondary" onClick={() => show("Печать ярлыков ДМ")}>Печать ярлыков ДМ</Btn>}
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
            {["Все статусы", "Выполнено", "В работе", "Закрыт"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterStatus("Все статусы"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Сбросить</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Дата</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Тип документа</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Номер</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Отправитель</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Получатель</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3"><Badge label={doc.status} /></td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewDoc(doc)} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <PrihodnyOrdModal doc={viewDoc} onClose={() => setViewDoc(null)} onSave={() => setViewDoc(null)} readOnly />}
      {showModal && (
        <PrihodnyOrdModal
          onClose={() => setShowModal(false)}
          onSave={d => { onSave(d); setShowModal(false); show(`Документ ${d.number} сохранён`); }}
        />
      )}
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
      showPrint
    />
  );
}

export function VydachaList() {
  const { vydachaDocs, setVydachaDocs } = useApp();
  const { toast, show, clear } = useToast();
  const [page, setPage] = useState(1);
  const [viewDoc, setViewDoc] = useState<SkladDoc | null>(null);
  const [showNew, setShowNew] = useState(false);
  const perPage = 8;

  return (
    <div>
      <PageHeader
        title="Выдача ГП"
        subtitle="Документы отгрузки готовой продукции"
        breadcrumb={["Складские операции", "Выдача ГП"]}
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
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Дата</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Тип документа</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Номер</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Отправитель</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Получатель</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vydachaDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3"><Badge label={doc.status} /></td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
                <td className="px-4 py-3 flex gap-1">
                  <EyeIcon onClick={() => setViewDoc(doc)} />
                  <PrintIcon onClick={() => show(`Документ ${doc.number} отправлен на печать`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={vydachaDocs.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewDoc && <VydachaGPModal onClose={() => setViewDoc(null)} onSave={() => setViewDoc(null)} readOnly />}
      {showNew && (
        <VydachaGPModal
          onClose={() => setShowNew(false)}
          onSave={() => {
            const d: SkladDoc = { id: `vd-${Date.now()}`, date: new Date().toLocaleDateString("ru-RU"), type: "Накладная на отгрузку ГП", number: `НО-${Math.floor(Math.random() * 900 + 100)}`, status: "В работе", sender: "Склад ГП", receiver: "ТД «Золото Казахстана»" };
            setVydachaDocs(prev => [d, ...prev]);
            setShowNew(false);
            show("Выдача оформлена");
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
