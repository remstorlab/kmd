import React, { useState } from "react";
import {
  Btn, Modal, EyeIcon, EditIcon, DeleteIcon, ExportBtn, useToast, Toast,
  Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, MultiFileUpload, Toggle, SortTh, useSort,
} from "./ui";
import { SkladDoc, DocStatus, StorageLocation, spravochniki } from "../data/mock";
import { useApp } from "../store/AppContext";
import { Plus } from "lucide-react";

// ── Приём на склад: Приходный ордер / Накладная ──────────────────────────────
// Общая модалка для «Остатки на складе ДМ → Принять на склад» и «Приход на склад».

type PrihodDocType = "Приходный ордер" | "Накладная";

const SKLADY = spravochniki["Склады"].items.map(i => i.value);

export interface PrihodPosition {
  id: string;
  nomenkl: string;
  name: string;
  klass: string;
  code: string;
  kol: string;
  unit: string;
  proba: string;
  lig: string;
  net: string;
  seyf: string;
  polka: string;
  au: string;
  ag: string;
  pd: string;
  rh: string;
  pt: string;
}

const locOf = (p: PrihodPosition) => (p.polka ? `Сейф ${p.seyf}/Полка ${p.polka}` : p.seyf ? `Сейф ${p.seyf}` : "—");

// Места хранения склада из справочника «Места хранения»
const seyfsOf = (locs: StorageLocation[], sklad: string) =>
  Array.from(new Set(locs.filter(l => l.sklad === sklad && l.available).map(l => l.seyfNum)));
const polkasOf = (locs: StorageLocation[], sklad: string, seyf: string) =>
  locs.filter(l => l.sklad === sklad && l.seyfNum === seyf && l.available && l.polkaNum).map(l => l.polkaNum);

let posSeq = 0;
const newPosId = () => `pp-${Date.now()}-${posSeq++}`;

function emptyPosition(locs: StorageLocation[], sklad: string, klass: string, code: string): PrihodPosition {
  const seyf = seyfsOf(locs, sklad)[0] ?? "";
  return {
    id: newPosId(), nomenkl: "", name: "", klass, code, kol: "1", unit: "шт", proba: "999", lig: "", net: "",
    seyf, polka: polkasOf(locs, sklad, seyf)[0] ?? "", au: "-", ag: "-", pd: "-", rh: "-", pt: "-",
  };
}

// ── Позиция: добавление / просмотр / редактирование (с химическим составом) ──

function PositionModal({ mode, sklad, initial, onClose, onSave }: {
  mode: "add" | "edit" | "view";
  sklad: string;
  initial: PrihodPosition;
  onClose: () => void;
  onSave: (p: PrihodPosition) => void;
}) {
  const ro = mode === "view";
  const { storageLocations: locs } = useApp();
  const [form, setForm] = useState(initial);
  const set = (k: keyof PrihodPosition) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const seyfs = seyfsOf(locs, sklad);
  const seyfOptions = form.seyf && !seyfs.includes(form.seyf) ? [form.seyf, ...seyfs] : seyfs;
  const polkas = polkasOf(locs, sklad, form.seyf);
  const polkaOptions = form.polka && !polkas.includes(form.polka) ? [form.polka, ...polkas] : polkas;

  const changeSeyf = (seyf: string) => setForm(f => ({ ...f, seyf, polka: polkasOf(locs, sklad, seyf)[0] ?? "" }));

  const canSave = !!form.name.trim() && !!form.nomenkl.trim();
  const title = mode === "add" ? "Добавить позицию ДМ" : mode === "edit" ? "Редактирование позиции ДМ" : "Просмотр позиции ДМ";

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => onSave(form)} disabled={!canSave}>{mode === "add" ? "Добавить" : "Сохранить"}</Btn>
      </>}
    >
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Field label="Номенкл. номер"><Input value={form.nomenkl} onChange={set("nomenkl")} placeholder="НН-XXXXX" disabled={ro} /></Field>
        <Field label="Класс"><KlassSelect value={form.klass} onChange={set("klass")} disabled={ro} /></Field>
        <Field label="Код материала"><MaterialCodeSelect value={form.code} onChange={set("code")} disabled={ro} /></Field>
        <Field label="Наименование" full><Input value={form.name} onChange={set("name")} placeholder="Наименование позиции" disabled={ro} /></Field>
        <Field label="Количество"><Input value={form.kol} onChange={set("kol")} placeholder="1" disabled={ro} /></Field>
        <Field label="Ед. изм."><Select value={form.unit} options={["шт", "г", "кг"]} onChange={set("unit")} disabled={ro} /></Field>
        <Field label="Проба"><Input value={form.proba} onChange={set("proba")} placeholder="999" disabled={ro} /></Field>
        <Field label="Масса лигатурная, г"><Input value={form.lig} onChange={set("lig")} placeholder="0.00" disabled={ro} /></Field>
        <Field label="Масса чистая, г"><Input value={form.net} onChange={set("net")} placeholder="0.00" disabled={ro} /></Field>
        <Field label="Склад"><Input value={sklad} disabled /></Field>
        <Field label="Сейф">
          {seyfOptions.length ? <Select value={form.seyf} options={seyfOptions} onChange={changeSeyf} disabled={ro} /> : <Input value="Нет свободных мест" disabled />}
        </Field>
        <Field label="Полка">
          {polkaOptions.length ? <Select value={form.polka} options={polkaOptions} onChange={set("polka")} disabled={ro} /> : <Input value="—" disabled />}
        </Field>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Химический состав (в чистоте), г</h4>
        <div className="grid grid-cols-5 gap-3">
          <Field label="Au, г"><Input value={form.au} onChange={set("au")} placeholder="-" disabled={ro} /></Field>
          <Field label="Ag, г"><Input value={form.ag} onChange={set("ag")} placeholder="-" disabled={ro} /></Field>
          <Field label="Pd, г"><Input value={form.pd} onChange={set("pd")} placeholder="-" disabled={ro} /></Field>
          <Field label="Rh, г"><Input value={form.rh} onChange={set("rh")} placeholder="-" disabled={ro} /></Field>
          <Field label="Pt, г"><Input value={form.pt} onChange={set("pt")} placeholder="-" disabled={ro} /></Field>
        </div>
      </div>
    </Modal>
  );
}

// ── Документ прихода ─────────────────────────────────────────────────────────

export default function PrihodDocModal({ onClose, onSave, doc, readOnly = false }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
}) {
  const ro = readOnly;
  const { storageLocations } = useApp();
  const [docType, setDocType] = useState<PrihodDocType>(doc && doc.type !== "Приходный ордер" ? "Накладная" : "Приходный ордер");
  const isOrder = docType === "Приходный ордер";
  const { toast, show, clear } = useToast();
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: doc?.number || "ПО-0342",
    date: doc?.date || today,
    otpravitel: doc?.sender || "ООО «Аффинаж-Сервис»",
    poluchatel: doc?.receiver && SKLADY.includes(doc.receiver) ? doc.receiver : SKLADY[0],
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
    nakladNumber: doc?.number || "НП-001234",
    nakladDate: doc?.date || today,
    zakazchik: "Национальный банк",
    skladOtpr: doc?.sender || "СДМ",
    skladPoluch: doc?.receiver && SKLADY.includes(doc.receiver) ? doc.receiver : SKLADY[0],
    sotrudnik: "Петров А.Н.",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [ownProperty, setOwnProperty] = useState(true);

  // Документы (несколько файлов, отдельно для ордера и накладной)
  const [orderFiles, setOrderFiles] = useState<File[]>(() => [new File([], `Приходный ордер ${doc?.number || "ПО-0342"}.pdf`)]);
  const [nakladFiles, setNakladFiles] = useState<File[]>(() => [new File([], `Накладная_${doc?.number || "НП-001234"}.pdf`)]);

  // Позиции
  const [orderPositions, setOrderPositions] = useState<PrihodPosition[]>([
    { id: newPosId(), nomenkl: "НН-72101", name: "Слиток золотой стандартный", klass: "Слиток", code: "Au чистое", kol: "1", unit: "шт", proba: "999.9", lig: "1000.0", net: "999.9", seyf: "1", polka: "1", au: "999.9", ag: "-", pd: "-", rh: "-", pt: "-" },
    { id: newPosId(), nomenkl: "НН-72102", name: "Слиток серебряный", klass: "Слиток", code: "Ag чистое", kol: "1", unit: "шт", proba: "925.0", lig: "318.6", net: "294.7", seyf: "2", polka: "1", au: "-", ag: "294.7", pd: "-", rh: "-", pt: "-" },
  ]);
  const [nakladPositions, setNakladPositions] = useState<PrihodPosition[]>([
    { id: newPosId(), nomenkl: "AU-SL-12000", name: "Монета Атамекен", klass: "Готовая продукция", code: "Ag чистое", kol: "2000", unit: "шт", proba: "925", lig: "", net: "", seyf: "1", polka: "1", au: "-", ag: "-", pd: "-", rh: "-", pt: "-" },
    { id: newPosId(), nomenkl: "AU-SL-01000", name: "Орден Алтын алка", klass: "Готовая продукция", code: "Ag чистое", kol: "300", unit: "шт", proba: "925", lig: "", net: "", seyf: "1", polka: "2", au: "-", ag: "-", pd: "-", rh: "-", pt: "-" },
  ]);

  const positions = isOrder ? orderPositions : nakladPositions;
  const setPositions = isOrder ? setOrderPositions : setNakladPositions;
  const sklad = isOrder ? head.poluchatel : head.skladPoluch;

  const [posModal, setPosModal] = useState<{ mode: "add" | "edit" | "view"; pos: PrihodPosition } | null>(null);

  const savePos = (p: PrihodPosition) => {
    if (!posModal) return;
    if (posModal.mode === "add") setPositions(prev => [...prev, p]);
    else setPositions(prev => prev.map(x => x.id === p.id ? p : x));
    show(posModal.mode === "add" ? "Позиция добавлена" : "Позиция обновлена");
    setPosModal(null);
  };

  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => p.code,
    kol: p => parseFloat(p.kol) || 0,
    proba: p => parseFloat(p.proba) || 0,
    lig: p => parseFloat(p.lig) || 0,
    net: p => parseFloat(p.net) || 0,
    loc: p => locOf(p),
  });

  const save = (status: DocStatus) => {
    const d: SkladDoc = isOrder
      ? { id: doc?.id ?? `sd-${Date.now()}`, date: head.date, type: "Приходный ордер", number: head.number, status, sender: head.otpravitel, receiver: head.poluchatel }
      : { id: doc?.id ?? `sd-${Date.now()}`, date: head.nakladDate, type: "Накладная на приём ДМ", number: head.nakladNumber, status, sender: head.skladOtpr, receiver: head.skladPoluch };
    onSave(d);
  };

  const title = doc
    ? `${isOrder ? "Приходный ордер" : "Накладная на приём ДМ"} ${doc.number}`
    : isOrder ? "Приходный ордер" : "Накладная на приём ДМ";

  const typeSelect = (
    <Field label="Тип документа">
      <Select value={docType} options={["Приходный ордер", "Накладная"]} onChange={v => setDocType(v as PrihodDocType)} disabled={ro || !!doc} />
    </Field>
  );

  return (
    <Modal
      title={title}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save("Оформлено")}>Оформить</Btn>
          <Btn variant="secondary" onClick={() => save("Редактирование")}>Сохранить</Btn>
        </>
      )}
    >
      {isOrder ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер"><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
          <Field label="Дата"><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
          <Field label="Отправитель"><Select value={head.otpravitel} options={Array.from(new Set([head.otpravitel, "ООО «Аффинаж-Сервис»", "АО «Металл Инвест»", "ОО «АурумПоставка»"]))} onChange={h("otpravitel")} disabled={ro} /></Field>
          <Field label="Получатель"><Select value={head.poluchatel} options={SKLADY} onChange={h("poluchatel")} disabled={ro} /></Field>
          <Field label="№ счёт-фактуры"><Input value={head.schetFaktura} onChange={h("schetFaktura")} disabled={ro} /></Field>
          <Field label="Дата счёт-фактуры"><Input value={head.schetFakturaData} onChange={h("schetFakturaData")} disabled={ro} /></Field>
          <Field label="Номер договора"><Input value={head.dogovor} onChange={h("dogovor")} disabled={ro} /></Field>
          <Field label="Дата договора"><Input value={head.dogovorData} onChange={h("dogovorData")} disabled={ro} /></Field>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
            <Toggle checked={ownProperty} onChange={setOwnProperty} disabled={ro} label={ownProperty ? "Да" : "Нет"} />
          </div>
          <Field label="Номер паспорта"><Input value={head.pasport} onChange={h("pasport")} disabled={ro} /></Field>
          <Field label="Номер платёжного документа"><Input value={head.platDoc} onChange={h("platDoc")} disabled={ro} /></Field>
          <Field label="Дата платёжного документа"><Input value={head.platDocData} onChange={h("platDocData")} disabled={ro} /></Field>
          <Field label="Лигатурный вес по документу"><Input value={head.ligByDoc} onChange={h("ligByDoc")} disabled={ro} /></Field>
          <Field label="Масса по документу"><Input value={head.massByDoc} onChange={h("massByDoc")} disabled={ro} /></Field>
          <Field label="Принято лигатурный вес"><Input value={head.ligAccepted} onChange={h("ligAccepted")} disabled={ro} /></Field>
          <Field label="Принято чистый вес"><Input value={head.netAccepted} onChange={h("netAccepted")} disabled={ro} /></Field>
          <Field label="Цена за единицу, тг"><Input value={head.price} onChange={h("price")} disabled={ro} /></Field>
          <Field label="Сумма в тенге"><Input value={head.sum} onChange={h("sum")} disabled={ro} /></Field>
          <Field label="Позиция годового плана"><Input value={head.planPos} onChange={h("planPos")} disabled={ro} /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер"><Input value={head.nakladNumber} onChange={h("nakladNumber")} disabled={ro} /></Field>
          <Field label="Дата"><Input value={head.nakladDate} onChange={h("nakladDate")} disabled={ro} /></Field>
          <Field label="Заказчик"><Select value={head.zakazchik} options={["Национальный банк", "Монетный двор"]} onChange={h("zakazchik")} disabled={ro} /></Field>
          <Field label="Склад-отправитель"><Select value={head.skladOtpr} options={Array.from(new Set([head.skladOtpr, "СДМ", "Производственный цех"]))} onChange={h("skladOtpr")} disabled={ro} /></Field>
          <Field label="Склад-получатель"><Select value={head.skladPoluch} options={SKLADY} onChange={h("skladPoluch")} disabled={ro} /></Field>
          <Field label="Сотрудник склада-получателя" full><Select value={head.sotrudnik} options={["Петров А.Н.", "Ким Александр Юрьевич", "Нурланов Асхат Бекович"]} onChange={h("sotrudnik")} disabled={ro} /></Field>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
            <Toggle checked={ownProperty} onChange={setOwnProperty} disabled={ro} label={ownProperty ? "Да" : "Нет"} />
          </div>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        {isOrder
          ? <MultiFileUpload files={orderFiles} onChange={setOrderFiles} disabled={ro} />
          : <MultiFileUpload files={nakladFiles} onChange={setNakladFiles} disabled={ro} />}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">{isOrder ? "Позиции прихода" : "Позиции приёма"}</h3>
          <div className="flex gap-2">
            {!ro && (
              <Btn size="sm" onClick={() => setPosModal({ mode: "add", pos: emptyPosition(storageLocations, sklad, isOrder ? "Слиток" : "Готовая продукция", "Au чистое") })}>
                <Plus className="w-4 h-4" />Добавить позицию
              </Btn>
            )}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Нет позиций. Нажмите «+ Добавить позицию»</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="kol" sort={sort} onSort={toggleSort} className="px-3 py-2">Кол-во</SortTh>
              {isOrder && <>
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Лигат.</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый</SortTh>
              </>}
              <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <th className="w-24"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{p.code}</td>
                  <td className="px-3 py-2">{isOrder ? p.kol : `${p.kol} ${p.unit}`}</td>
                  {isOrder && <>
                    <td className="px-3 py-2">{p.proba}</td>
                    <td className="px-3 py-2 font-medium">{p.lig}</td>
                    <td className="px-3 py-2 text-blue-600">{p.net}</td>
                  </>}
                  <td className="px-3 py-2 text-gray-500">{locOf(p)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <EyeIcon onClick={() => setPosModal({ mode: "view", pos: p })} />
                      {!ro && <EditIcon onClick={() => setPosModal({ mode: "edit", pos: p })} />}
                      {!ro && <DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {posModal && (
        <PositionModal
          key={posModal.pos.id + posModal.mode}
          mode={posModal.mode}
          sklad={sklad}
          initial={posModal.pos}
          onClose={() => setPosModal(null)}
          onSave={savePos}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
