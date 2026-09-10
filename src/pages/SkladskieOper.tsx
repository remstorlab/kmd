import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, PrintIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, Field, Input, Select, FileChip, useConfirm, ConfirmDialog,
} from "../components/ui";
import { SkladDoc, GPItem } from "../data/mock";
import { Inbox, Send, Repeat, Plus, X, LucideIcon } from "lucide-react";

// ── Hub ───────────────────────────────────────────────────────────────────────

export function SkladskieOperHub() {
  const { navigate } = useApp();
  const cards: { title: string; sub: string; icon: LucideIcon; page: "prihod-list" | "vydacha-list" | "dvizhenie-mat" }[] = [
    { title: "Приход на склад", sub: "Приходные ордера и накладные", icon: Inbox, page: "prihod-list" },
    { title: "Выдача со склада", sub: "Документы отгрузки", icon: Send, page: "vydacha-list" },
    { title: "Движение материала (операции)", sub: "Журнал операций", icon: Repeat, page: "dvizhenie-mat" },
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

// ── Приходный ордер modal ─────────────────────────────────────────────────────

type PrihodDocType = "Приходный ордер" | "Накладная";

function PrihodnyOrdModal({ onClose, onSave, doc }: { onClose: () => void; onSave: (d: SkladDoc) => void; doc?: SkladDoc | null; readOnly?: boolean }) {
  const ro = !!doc;
  const [docType, setDocType] = useState<PrihodDocType>("Приходный ордер");
  const isOrder = ro || docType === "Приходный ордер";
  const { toast, show, clear } = useToast();
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: doc?.number || "ПО-0342",
    date: doc?.date || today,
    otpravitel: doc?.sender || "ОО «АурумПоставка»",
    poluchatel: doc?.receiver || "Склад ДМ №1",
    schetFaktura: "СФ-2026-1234",
    schetFakturaData: today,
    dogovor: "ДОГ-2025-089",
    dogovorData: today,
    ligByDoc: "500.25",
    ligAccepted: "500.25",
    netAccepted: "498.12",
    nakladNumber: "НП-001234",
    nakladDate: today,
    zakazchik: "Монетный двор",
    skladOtpr: "СДМ",
    skladPoluch: "Склад ДМ №1",
    sotrudnik: "Ким Александр Юрьевич",
  }));

  // Приходный ордер state
  const [positions, setPositions] = useState([
    { nomenkl: "DM-001", name: "Слиток золота ЗлА-1", klass: "Слиток", code: "AU", kol: "1", proba: "999", lig: "500.25", net: "498.12", loc: "Сейф №1, Полка А" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nomenkl: "DM-001", klass: "Слиток", code: "AU", name: "", kol: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });

  const addPos = () => {
    setPositions(p => [...p, { nomenkl: form.nomenkl, name: form.name || "Позиция ДМ", klass: form.klass, code: form.code, kol: form.kol || "1", proba: form.proba, lig: form.lig, net: form.net, loc: `${form.sey}, ${form.polka}` }]);
    setShowAdd(false);
    setForm({ nomenkl: "DM-001", klass: "Слиток", code: "AU", name: "", kol: "", proba: "999", lig: "", net: "", sey: "Сейф №1", polka: "Полка А" });
  };

  // Накладная state
  const [nakladPositions, setNakladPositions] = useState([
    { nomenkl: "DM-005", name: "Слиток серебра СрБ-3", kol: "1", klass: "Слиток", code: "AG", loc: "Сейф №2, Полка Б" },
  ]);
  const [showAddNaklad, setShowAddNaklad] = useState(false);
  const [nakladForm, setNakladForm] = useState({ nomenkl: "", klass: "Слиток", code: "AU-585", name: "", kol: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });

  const addNakladPos = () => {
    setNakladPositions(p => [...p, { nomenkl: nakladForm.nomenkl || `DM-${Math.floor(Math.random() * 900 + 100)}`, name: nakladForm.name || "Позиция ДМ", kol: nakladForm.kol || "0", klass: nakladForm.klass, code: nakladForm.code, loc: `${nakladForm.sey}, ${nakladForm.polka}` }]);
    setShowAddNaklad(false);
    setNakladForm({ nomenkl: "", klass: "Слиток", code: "AU-585", name: "", kol: "", unit: "шт", sey: "Сейф №1", polka: "Полка А" });
  };

  const save = () => {
    const d: SkladDoc = isOrder ? {
      id: `sd-${Date.now()}`,
      date: new Date().toLocaleDateString("ru-RU"),
      type: "Приходный ордер",
      number: `ПО-${Math.floor(Math.random() * 900 + 100)}`,
      status: "Выполнено",
      sender: "ОО «АурумПоставка»",
      receiver: "Склад ДМ №1",
    } : {
      id: `sd-${Date.now()}`,
      date: new Date().toLocaleDateString("ru-RU"),
      type: "Накладная на приём ДМ",
      number: `НП-${Math.floor(Math.random() * 900 + 100)}`,
      status: "Выполнено",
      sender: "СДМ",
      receiver: "Склад ДМ №1",
    };
    onSave(d);
  };

  return (
    <Modal
      title={doc ? `Приходный ордер ${doc.number}` : (isOrder ? "Новый приходный ордер" : "Новая накладная на приём ДМ")}
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
      {isOrder ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Field label="Тип документа">
            {ro ? <Input value="Приходный ордер" disabled /> : <Select value={docType} options={["Приходный ордер", "Накладная"]} onChange={v => setDocType(v as PrihodDocType)} />}
          </Field>
          <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} disabled={ro} /></Field>
          <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={ro} /></Field>
          <Field label="Отправитель"><Select value={head.otpravitel} options={["ОО «АурумПоставка»", "АО «Металл Инвест»"]} onChange={v => setHead(h => ({ ...h, otpravitel: v }))} disabled={ro} /></Field>
          <Field label="Получатель"><Select value={head.poluchatel} options={["Склад ДМ №1", "Склад ДМ №2"]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} disabled={ro} /></Field>
          <Field label="№ счёт-фактуры"><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} disabled={ro} /></Field>
          <Field label="Дата счёт-фактуры"><Input value={head.schetFakturaData} onChange={v => setHead(h => ({ ...h, schetFakturaData: v }))} disabled={ro} /></Field>
          <Field label="Номер договора"><Input value={head.dogovor} onChange={v => setHead(h => ({ ...h, dogovor: v }))} disabled={ro} /></Field>
          <Field label="Дата договора"><Input value={head.dogovorData} onChange={v => setHead(h => ({ ...h, dogovorData: v }))} disabled={ro} /></Field>
          <Field label="Лигатурный вес по документу (г)"><Input value={head.ligByDoc} onChange={v => setHead(h => ({ ...h, ligByDoc: v }))} disabled={ro} /></Field>
          <Field label="Принято лигатурный вес (г)"><Input value={head.ligAccepted} onChange={v => setHead(h => ({ ...h, ligAccepted: v }))} disabled={ro} /></Field>
          <Field label="Принято чистый вес (г)"><Input value={head.netAccepted} onChange={v => setHead(h => ({ ...h, netAccepted: v }))} disabled={ro} /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Тип документа"><Select value={docType} options={["Приходный ордер", "Накладная"]} onChange={v => setDocType(v as PrihodDocType)} /></Field>
          <Field label="Номер"><Input value={head.nakladNumber} onChange={v => setHead(h => ({ ...h, nakladNumber: v }))} /></Field>
          <Field label="Дата"><Input value={head.nakladDate} onChange={v => setHead(h => ({ ...h, nakladDate: v }))} /></Field>
          <Field label="Заказчик"><Select value={head.zakazchik} options={["Монетный двор", "Национальный банк"]} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} /></Field>
          <Field label="Склад-отправитель"><Select value={head.skladOtpr} options={["СДМ", "Производственный цех"]} onChange={v => setHead(h => ({ ...h, skladOtpr: v }))} /></Field>
          <Field label="Склад-получатель"><Select value={head.skladPoluch} options={["Склад ДМ №1", "Склад ДМ №2"]} onChange={v => setHead(h => ({ ...h, skladPoluch: v }))} /></Field>
          <Field label="Сотрудник склада-получателя" full><Select value={head.sotrudnik} options={["Ким Александр Юрьевич", "Нурланов Асхат Бекович"]} onChange={v => setHead(h => ({ ...h, sotrudnik: v }))} /></Field>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <FileChip name={isOrder ? "Приходный ордер ПО-0342.pdf" : "Накладная_НП-001234.pdf"} onDownload={() => show("Загрузка файла...")} />
      </div>

      {isOrder ? (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции прихода</h3>
            {!ro && (
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
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
              <th className="px-3 py-2 text-left">Кол-во</th>
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
                  <td className="px-3 py-2">{p.kol}</td>
                  <td className="px-3 py-2">{p.proba}</td>
                  <td className="px-3 py-2">{p.lig}</td>
                  <td className="px-3 py-2">{p.net}</td>
                  <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  {!ro && <td className="px-3 py-2">
                    <button onClick={() => setPositions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </td>}
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
              <th className="px-3 py-2 text-left">Номенкл.№</th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Кол-во</th>
              <th className="px-3 py-2 text-left">Класс</th>
              <th className="px-3 py-2 text-left">Код материала</th>
              <th className="px-3 py-2 text-left">Размещение</th>
              <th className="w-16"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {nakladPositions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.kol}</td>
                  <td className="px-3 py-2">{p.klass}</td>
                  <td className="px-3 py-2 font-medium">{p.code}</td>
                  <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setNakladPositions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Добавить позицию ДМ" onClose={() => setShowAdd(false)} footer={<><Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn><Btn onClick={addPos}>Добавить</Btn></>}>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Номенкл. номер"><Select value={form.nomenkl} options={["DM-001", "DM-002", "DM-003", "DM-004"]} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} /></Field>
            <Field label="Класс"><Select value={form.klass} options={["Слиток", "Стружка", "Проба", "Раствор"]} onChange={v => setForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Код материала"><Select value={form.code} options={["AU", "AG", "PT", "PD"]} onChange={v => setForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Наименование" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Наименование позиции" /></Field>
            <Field label="Количество"><Input value={form.kol} onChange={v => setForm(f => ({ ...f, kol: v }))} placeholder="1" /></Field>
            <Field label="Масса лигатурная г"><Input value={form.lig} onChange={v => setForm(f => ({ ...f, lig: v }))} placeholder="0.00" /></Field>
            <Field label="Масса чистая г"><Input value={form.net} onChange={v => setForm(f => ({ ...f, net: v }))} placeholder="0.00" /></Field>
            <Field label="Проба"><Input value={form.proba} onChange={v => setForm(f => ({ ...f, proba: v }))} placeholder="999" /></Field>
            <Field label="Сейф"><Select value={form.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setForm(f => ({ ...f, sey: v }))} /></Field>
            <Field label="Полка"><Select value={form.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setForm(f => ({ ...f, polka: v }))} /></Field>
          </div>
        </Modal>
      )}

      {showAddNaklad && (
        <Modal title="Добавить позицию ДМ" onClose={() => setShowAddNaklad(false)} footer={<><Btn variant="secondary" onClick={() => setShowAddNaklad(false)}>Отмена</Btn><Btn onClick={addNakladPos}>Добавить</Btn></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Номенкл. номер"><Input value={nakladForm.nomenkl} onChange={v => setNakladForm(f => ({ ...f, nomenkl: v }))} placeholder="DM-XXX" /></Field>
            <Field label="Класс"><Select value={nakladForm.klass} options={["Слиток", "Стружка", "Проба", "Раствор"]} onChange={v => setNakladForm(f => ({ ...f, klass: v }))} /></Field>
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

// ── Выдача ГП modal ───────────────────────────────────────────────────────────

function VydachaGPModal({ onClose, onSave, doc, readOnly = false }: { onClose: () => void; onSave: (d: SkladDoc) => void; doc?: SkladDoc | null; readOnly?: boolean }) {
  const { gpItems } = useApp();
  const [head, setHead] = useState(() => ({
    number: doc?.number || "НО-0205",
    date: doc?.date || new Date().toLocaleDateString("ru-RU"),
    poluchatel: doc?.receiver || "ТД «Золото Казахстана»",
    schetFaktura: "СФ-2026-0199",
  }));

  const [positions, setPositions] = useState<{ nomenkl: string; name: string; code: string; location: string; qty: number }[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const availableItems = gpItems.filter(i => i.status === "На складе" && i.qty > 0);
  const itemLabel = (i: GPItem) => `${i.nomenkl} — ${i.name} (доступно: ${i.qty} ${i.unit})`;
  const [addForm, setAddForm] = useState({ label: availableItems[0] ? itemLabel(availableItems[0]) : "", qty: "1" });
  const selectedItem = availableItems.find(i => itemLabel(i) === addForm.label);

  const openAdd = () => {
    setAddForm({ label: availableItems[0] ? itemLabel(availableItems[0]) : "", qty: "1" });
    setShowAdd(true);
  };

  const addPosition = () => {
    if (!selectedItem) return;
    const qty = Math.max(1, Math.min(parseInt(addForm.qty, 10) || 1, selectedItem.qty));
    setPositions(prev => [...prev, { nomenkl: selectedItem.nomenkl, name: selectedItem.name, code: selectedItem.code, location: selectedItem.location, qty }]);
    setShowAdd(false);
  };

  const save = () => {
    const d: SkladDoc = doc ? {
      ...doc,
      number: head.number,
      date: head.date,
      receiver: head.poluchatel,
    } : {
      id: `vd-${Date.now()}`,
      date: head.date,
      type: "Накладная на отгрузку ГП",
      number: head.number,
      status: "В работе",
      sender: "Склад ГП",
      receiver: head.poluchatel,
    };
    onSave(d);
  };

  return (
    <Modal title="Накладная на отгрузку ГП" onClose={onClose} wide footer={
      readOnly
        ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
        : <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={save}>Оформить выдачу</Btn></>
    }>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Тип документа"><Select value="Накладная на отгрузку ГП" options={["Накладная на отгрузку ГП"]} disabled={readOnly} /></Field>
        <Field label="Номер"><Input value={head.number} onChange={v => setHead(h => ({ ...h, number: v }))} disabled={readOnly} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={readOnly} /></Field>
        <Field label="Получатель"><Select value={head.poluchatel} options={["ТД «Золото Казахстана»", "ИП Сейткали А.М."]} onChange={v => setHead(h => ({ ...h, poluchatel: v }))} disabled={readOnly} /></Field>
        <Field label="Счёт-фактура" full><Input value={head.schetFaktura} onChange={v => setHead(h => ({ ...h, schetFaktura: v }))} disabled={readOnly} /></Field>
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
              <th className="px-3 py-2 text-left">Номенкл.№</th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Код</th>
              <th className="px-3 py-2 text-left">Кол-во</th>
              <th className="px-3 py-2 text-left">Размещение</th>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {positions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-blue-600">{p.code}</td>
                  <td className="px-3 py-2">{p.qty}</td>
                  <td className="px-3 py-2 text-gray-500">{p.location}</td>
                  {!readOnly && <td className="px-3 py-2">
                    <button onClick={() => setPositions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Добавить позицию ГП" onClose={() => setShowAdd(false)} footer={<><Btn variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Btn><Btn onClick={addPosition}>Добавить</Btn></>}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Позиция (доступно на складе ГП)">
              <Select value={addForm.label} options={availableItems.map(itemLabel)} onChange={v => setAddForm({ label: v, qty: "1" })} />
            </Field>
            <Field label="Количество к выдаче">
              <Input value={addForm.qty} onChange={v => setAddForm(f => ({ ...f, qty: v }))} placeholder="1" />
            </Field>
          </div>
        </Modal>
      )}
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
              <Plus className="w-4 h-4" />
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
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const [viewDoc, setViewDoc] = useState<SkladDoc | null>(null);
  const [editDoc, setEditDoc] = useState<SkladDoc | null>(null);
  const [showNew, setShowNew] = useState(false);
  const perPage = 8;

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
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Дата</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Тип документа</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Номер</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Отправитель</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Получатель</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vydachaDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{doc.type}</td>
                <td className="px-4 py-3 text-blue-600 font-medium">{doc.number}</td>
                <td className="px-4 py-3 text-gray-600">{doc.sender}</td>
                <td className="px-4 py-3 text-gray-600">{doc.receiver}</td>
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
