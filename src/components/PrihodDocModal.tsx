import React, { useEffect, useState } from "react";
import {
  Btn, Modal, EyeIcon, EditIcon, DeleteIcon, ExportBtn, useToast, Toast,
  Field, Input, Select, KlassCode, useMaterialCodeLabel, MultiFileUpload, Toggle, SortTh, useSort, probaText, NetAuAg, NET_AU_AG, usePaged, FillerRows, useCreatedStamp,
  InfoField,
  OborotValue, OBOROT_LABEL,
} from "./ui";
import { SkladDoc, DocStatus, DMItem, GPItem, spravValues, isGPKlass, PRIHOD_SKLAD, DOC_PRIHOD_ORDER, DOC_PRIHOD_NAKLAD, DOC_PRIHOD_AKT, DOC_TREBOVANIE, DOC_VOZVRAT_SGP, SGP } from "../data/mock";
import DMPositionFormModal, { PrihodPosition, locOf, emptyPosition, oborotFromForm } from "./DMPositionFormModal";
import TrebovanieDocModal from "./TrebovanieDocModal";
import VozvratSgpDocModal from "./VozvratSgpDocModal";
import { useApp } from "../store/AppContext";
import { Plus } from "lucide-react";
import { useScreen } from "../router";

// ── Приём на склад: Приходный ордер / Накладная / Требование ─────────────────
// Общая модалка для «Остатки на складе ДМ → Принять на склад» и «Приход на склад».
// Приходный ордер и накладная: получатель — склад из справочника «Склады», по умолчанию склад приёмки СДМ1;
// при оформлении позиции документа ставятся на склад-получатель. Требование — перемещение позиций
// со склада на склад (СДМ1 → СДМ2), см. TrebovanieDocModal.

type PrihodDocType = string;
type Props = {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
};

// Вложенные экраны типа документа: …/nakladnaya, …/trebovanie (без сегмента — приходный ордер)
const TYPE_FLAGS: Record<string, string> = { [DOC_PRIHOD_NAKLAD]: "nakladnaya", [DOC_PRIHOD_AKT]: "akt", [DOC_TREBOVANIE]: "trebovanie", [DOC_VOZVRAT_SGP]: "vozvrat-sgp" };

export default function PrihodDocModal(props: Props) {
  const { doc } = props;
  // Оформленный документ больше не редактируется — открывается только для просмотра
  const ro = !!props.readOnly || doc?.status === "Оформлено";
  props = { ...props, readOnly: ro };
  const screen = useScreen();
  // Тип документа — из справочника «Типы документов приёмки»
  const docType: PrihodDocType = doc
    ? ([DOC_PRIHOD_ORDER, DOC_PRIHOD_AKT, DOC_TREBOVANIE, DOC_VOZVRAT_SGP].includes(doc.type) ? doc.type : DOC_PRIHOD_NAKLAD)
    : screen.has("vozvrat-sgp") ? DOC_VOZVRAT_SGP : screen.has("trebovanie") ? DOC_TREBOVANIE : screen.has("akt") ? DOC_PRIHOD_AKT : screen.has("nakladnaya") ? DOC_PRIHOD_NAKLAD : DOC_PRIHOD_ORDER;
  const setDocType = (t: PrihodDocType) => screen.choose(Object.values(TYPE_FLAGS), TYPE_FLAGS[t]);
  const typeOptions = spravValues("Типы документов приёмки");
  const typeSelect = (
    <Field label="Тип документа" required={!ro}>
      <Select value={docType} options={typeOptions.includes(docType) ? typeOptions : [docType, ...typeOptions]} onChange={setDocType} disabled={ro || !!doc} />
    </Field>
  );
  return docType === DOC_TREBOVANIE
    ? <TrebovanieDocModal {...props} typeSelect={typeSelect} />
    : docType === DOC_VOZVRAT_SGP
      ? <VozvratSgpDocModal {...props} typeSelect={typeSelect} />
      : <PrihodForm {...props} docType={docType} typeSelect={typeSelect} />;
}

// Источник поля «Отправитель» зависит от типа документа: приходный ордер и накладная — общий справочник
// «Заказчики / Организации», требование — «Склады» (см. TrebovanieDocModal)
// Читаем справочник при каждом обращении — чтобы видеть добавленные и отключённые записи
const orgs = () => spravValues("Заказчики / Организации");

// Демо-позиции для документов из демо-данных (без сохранённых позиций)
export const DEMO_ORDER: PrihodPosition[] = [
  { id: "po-1", nomenkl: "5015301", name: "Слиток золотой стандартный", klass: "Слиток", code: "1000", kol: "1", unit: "шт", proba: "999.9", lig: "1000.00", net: "999.90", seyf: "1", polka: "1", chem: { au: "999.90" } },
  { id: "po-2", nomenkl: "5015302", name: "Слиток серебряный", klass: "Слиток", code: "2000", kol: "1", unit: "шт", proba: "925", lig: "318.60", net: "294.71", seyf: "2", polka: "1", chem: { ag: "294.71" } },
];
const DEMO_NAKLAD: PrihodPosition[] = [
  { id: "pn-1", nomenkl: "5015303", name: "Монета «Атамекен» Ag 925", klass: "Готовая продукция", code: "2000", kol: "200", unit: "шт", proba: "925", lig: "6220.00", net: "5753.50", seyf: "1", polka: "1", chem: { ag: "5753.50" } },
  { id: "pn-2", nomenkl: "5015304", name: "Орден «Алтын алка»", klass: "Готовая продукция", code: "0300", kol: "30", unit: "шт", proba: "750", lig: "672.00", net: "504.00", seyf: "1", polka: "2", chem: { au: "504.00", ag: "100.80", cu: "67.20" } },
];

// Реквизиты приходного ордера по умолчанию (поля шапки формы; используются и печатной формой)
export const ORDER_HEAD_DEFAULTS = {
  schetFaktura: "СФ-0091",
  dogovor: "ДОГ-2026-045",
  pasport: "ПМ-000456",
  platDoc: "ПД-001234",
  price: "32 500.00",
  planPos: "План-2026/Q3-AU",
};

// ── Документ прихода (приходный ордер / накладная) ───────────────────────────

function PrihodForm({ onClose, onSave, doc, readOnly = false, docType, typeSelect }: Props & { docType: PrihodDocType; typeSelect: React.ReactNode }) {
  const ro = readOnly;
  const { storageLocations, dmItems, gpItems, setDmItems, setGpItems } = useApp();
  const stamp = useCreatedStamp();
  // Вложенные экраны: …/position-new, …/position/:id, …/position-edit/:id
  const screen = useScreen();
  const isOrder = docType === DOC_PRIHOD_ORDER;
  // Акт — те же поля и позиции, что у накладной; отличаются тип и номер документа
  const isAkt = docType === DOC_PRIHOD_AKT;
  // Оформленный документ: позиции уже поставлены на склад — состав и склад-получатель не меняются
  const posted = doc?.status === "Оформлено";
  const lockPos = ro || posted;
  const { toast, show, clear } = useToast();
  const today = new Date().toLocaleDateString("ru-RU");
  // Склады СДМ (СГП №2 — только через выдачу со склада и «Возврат СГП №2»)
  const sklady = spravValues("Склады").filter(s => s !== SGP);

  const [head, setHead] = useState(() => ({
    number: doc?.number || "ПО-0342",
    date: doc?.date || today,
    otpravitel: doc?.sender || orgs()[0],
    // Получатель — склад из справочника «Склады»; по умолчанию склад приёмки (СДМ1)
    poluchatel: doc && sklady.includes(doc.receiver) ? doc.receiver : PRIHOD_SKLAD,
    ...ORDER_HEAD_DEFAULTS,
    schetFakturaData: today,
    dogovorData: today,
    platDocData: today,
    ligByDoc: "1 000.00 г",
    massByDoc: "999.90 г",
    ligAccepted: "999.50 г",
    netAccepted: "998.80 г",
    sum: "32 467 500.00",
    nakladNumber: doc?.number || "НП-001234",
    aktNumber: doc?.number || "АКТ-0043",
    nakladDate: doc?.date || today,
    zakazchik: doc?.sender || orgs()[0],
    sotrudnik: "Ким Александр Юрьевич",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  // При выборе типа «Приходный ордер» / «Накладная» получатель автоматически — склад приёмки (СДМ1)
  useEffect(() => {
    if (!doc) setHead(x => ({ ...x, poluchatel: PRIHOD_SKLAD }));
  }, [docType, doc]);
  const [ownProperty, setOwnProperty] = useState(true);
  const [info, setInfo] = useState(doc?.info ?? "");

  // Документы (несколько файлов, отдельно для ордера и накладной)
  const [orderFiles, setOrderFiles] = useState<File[]>(() => [new File([], `Приходный ордер ${doc?.number || "ПО-0342"}.pdf`)]);
  const [nakladFiles, setNakladFiles] = useState<File[]>(() =>
    [new File([], doc?.type === DOC_PRIHOD_AKT ? `Акт_${doc.number}.pdf` : `Накладная_${doc?.number || "НП-001234"}.pdf`)]);

  // Позиции: новый документ — без позиций (сохранить можно и пустым); сохранённый — свои позиции,
  // у демо-документов без сохранённых позиций — демо-набор.
  const initialPositions = (type: string, demo: PrihodPosition[]) =>
    !doc ? [] : doc.type !== type ? [] : doc.prihodPositions ?? demo;
  const [orderPositions, setOrderPositions] = useState<PrihodPosition[]>(() => initialPositions(DOC_PRIHOD_ORDER, DEMO_ORDER));
  const [nakladPositions, setNakladPositions] = useState<PrihodPosition[]>(() =>
    doc?.type === DOC_PRIHOD_AKT ? doc.prihodPositions ?? [] : initialPositions(DOC_PRIHOD_NAKLAD, DEMO_NAKLAD));

  // Хим. состав на партию — задаётся в документе и подставляется в каждую новую позицию

  const positions = isOrder ? orderPositions : nakladPositions;
  const setPositions = isOrder ? setOrderPositions : setNakladPositions;
  const sklad = head.poluchatel;

  const posModal: { mode: "add" | "edit" | "view"; pos: PrihodPosition } | null = (() => {
    if (screen.has("position-new")) {
      return { mode: "add", pos: emptyPosition(storageLocations, sklad, isOrder ? "Слиток" : "Готовая продукция", "1000") };
    }
    const view = positions.find(x => x.id === screen.after("position"));
    if (view) return { mode: "view", pos: view };
    const edit = positions.find(x => x.id === screen.after("position-edit"));
    return edit ? { mode: "edit", pos: edit } : null;
  })();
  const closePos = () => screen.close(posModal?.mode === "add" ? "position-new" : posModal?.mode === "edit" ? "position-edit" : "position");

  const savePos = (p: PrihodPosition) => {
    if (!posModal) return;
    if (posModal.mode === "add") setPositions(prev => [...prev, p]);
    else setPositions(prev => prev.map(x => x.id === p.id ? p : x));
    show(posModal.mode === "add" ? "Позиция добавлена" : "Позиция обновлена");
    closePos();
  };

  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => codeLabel(p.code),
    kol: p => parseFloat(p.kol) || 0,
    proba: p => parseFloat(p.proba) || 0,
    lig: p => parseFloat(p.lig) || 0,
    net: p => parseFloat(p.net) || 0,
    oborot: p => oborotFromForm(p.oborot),
    loc: p => locOf(p),
  });

  // Постановка на склад-получатель при каждом сохранении документа («Сохранить» и «Оформить»): позиции класса
  // «Готовая продукция» — в учёт ГП, остальные — в учёт ДМ; статус «На складе», место хранения — из позиции документа.
  // Запись склада привязана к позиции документа (id dm-<id> / gp-<id>): повторное сохранение обновляет её,
  // позиция, удалённая из документа, снимается со склада. Записи, которые уже зарезервированы или выданы, не меняются.
  // Возвращает наименования позиций, которые изменить на складе нельзя.
  const postToStock = (): string[] => {
    const kol = (p: PrihodPosition) => parseInt(p.kol, 10) || 0;
    const n = (v: string) => parseFloat(String(v).replace(",", ".")) || 0;
    // Заказчик — отправитель документа; признак «Собственность заказчика» — из шапки
    const zakazchik = isOrder ? head.otpravitel : head.zakazchik;
    const created = stamp();
    const gp: GPItem[] = positions.filter(p => isGPKlass(p.klass)).map(p => ({
      id: `gp-${p.id}`, name: p.name, nomenkl: p.nomenkl, qty: kol(p), unit: p.unit || "шт", klass: p.klass, code: p.code,
      location: locOf(p), sklad, status: "На складе", proba: n(p.proba), ligWeight: n(p.lig), netWeight: n(p.net), chem: p.chem, zakazchik, ownProperty, ...created,
    }));
    const dm: DMItem[] = positions.filter(p => !isGPKlass(p.klass)).map(p => ({
      id: `dm-${p.id}`, name: p.name, nomenkl: p.nomenkl, klass: p.klass, metal: p.code, qty: kol(p), proba: n(p.proba),
      ligWeight: n(p.lig), netWeight: n(p.net), location: locOf(p), sklad, status: "На складе", chem: p.chem, info: p.info || undefined, zakazchik, ownProperty, ...created,
      // Оборот — из позиции документа (по умолчанию при приёмке — 0)
      ...(oborotFromForm(p.oborot) ? { oborot: oborotFromForm(p.oborot) } : {}),
    }));
    const keepIds = new Set([...gp, ...dm].map(i => i.id));
    const prevIds = new Set((doc?.prihodPositions ?? []).flatMap(p => [`gp-${p.id}`, `dm-${p.id}`]));
    const busy: string[] = [];
    const sync = <T extends GPItem | DMItem>(items: T[], next: T[]): T[] => {
      const free = (i: T) => i.status === "На складе";
      // Удалённые из документа позиции снимаются со склада (если ещё не использованы)
      const out = items.filter(i => {
        if (!prevIds.has(i.id) || keepIds.has(i.id)) return true;
        if (free(i)) return false;
        busy.push(i.name);
        return true;
      });
      for (const n of next) {
        const idx = out.findIndex(i => i.id === n.id);
        if (idx < 0) out.push(n);
        // Запись, уже зарезервированная или выданная, остаётся как есть
        else if (free(out[idx])) out[idx] = { ...n, createdAt: out[idx].createdAt ?? n.createdAt, createdBy: out[idx].createdBy ?? n.createdBy };
      }
      return out;
    };
    const nextGp = sync(gpItems, gp);
    const nextDm = sync(dmItems, dm);
    if (busy.length) return busy;
    setGpItems(nextGp);
    setDmItems(nextDm);
    return busy;
  };

  // Документ сохраняется и оформляется в том числе без позиций
  const save = (status: DocStatus) => {
    if (posted) return;
    const busy = postToStock();
    // Позиция, уже зарезервированная или выданная со склада, в документе не меняется и не удаляется
    if (busy.length) { show(`Позиции уже зарезервированы или выданы со склада — изменить или удалить их нельзя: ${busy.join(", ")}`); return; }
    // Отметка создания — при первом сохранении документа, при редактировании сохраняется прежняя
    const created = doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : stamp();
    const base = { id: doc?.id ?? `sd-${Date.now()}`, ...created, status, receiver: sklad, info: info.trim() || undefined, prihodPositions: positions };
    const d: SkladDoc = isOrder
      ? { ...base, date: head.date, type: DOC_PRIHOD_ORDER, number: head.number, sender: head.otpravitel }
      : { ...base, date: head.nakladDate, type: isAkt ? DOC_PRIHOD_AKT : DOC_PRIHOD_NAKLAD, number: isAkt ? head.aktNumber : head.nakladNumber, sender: head.zakazchik };
    onSave(d);
  };

  const title = doc ? `${docType} ${doc.number}` : docType;
  const poluchatelSelect = (label: string) => (
    <Field label={label} required={!ro}>
      <Select value={head.poluchatel} options={sklady.includes(head.poluchatel) ? sklady : [head.poluchatel, ...sklady]} onChange={h("poluchatel")} disabled={lockPos} />
    </Field>
  );

  const pg10 = usePaged(sorted, "prihod-positions");
  return (
    <Modal
      title={title}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : posted ? (
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save("Оформлено")}>Сохранить</Btn>
        </>
      ) : (
        <>
          <div className="mr-auto"><Btn variant="success" onClick={() => save("Оформлено")}>Оформить</Btn></div>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save("В работе")}>Сохранить</Btn>
        </>
      )}
    >
      {posted ? (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Документ оформлен: позиции приняты на склад «{sklad}». Редактирование документа недоступно.
        </div>
      ) : !ro && (
        <div className="mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2.5">
          Позиции ставятся на склад «{sklad}» при каждом сохранении документа. После «Оформить» документ закрывается для редактирования.
        </div>
      )}
      {isOrder ? (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
          <Field label="Дата документа" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
          <Field label="Отправитель" required={!ro}><Select value={head.otpravitel} options={Array.from(new Set([head.otpravitel, ...orgs()]))} onChange={h("otpravitel")} disabled={ro} /></Field>
          {poluchatelSelect("Получатель")}
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
          <Field label="Принято лигатурный вес" required={!ro}><Input value={head.ligAccepted} onChange={h("ligAccepted")} disabled={ro} /></Field>
          <Field label="Принято чистый вес" required={!ro}><Input value={head.netAccepted} onChange={h("netAccepted")} disabled={ro} /></Field>
          <Field label="Цена за единицу, тг"><Input value={head.price} onChange={h("price")} disabled={ro} /></Field>
          <Field label="Сумма в тенге"><Input value={head.sum} onChange={h("sum")} disabled={ro} /></Field>
          <Field label="Позиция годового плана"><Input value={head.planPos} onChange={h("planPos")} disabled={ro} /></Field>
          <InfoField value={info} onChange={setInfo} disabled={ro} />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер" required={!ro}><Input value={isAkt ? head.aktNumber : head.nakladNumber} onChange={h(isAkt ? "aktNumber" : "nakladNumber")} disabled={ro} /></Field>
          <Field label="Дата документа" required={!ro}><Input value={head.nakladDate} onChange={h("nakladDate")} disabled={ro} /></Field>
          <Field label="Отправитель" required={!ro}><Select value={head.zakazchik} options={Array.from(new Set([head.zakazchik, ...orgs()]))} onChange={h("zakazchik")} disabled={ro} /></Field>
          {poluchatelSelect("Получатель")}
          <Field label="Сотрудник склада-получателя" required={!ro} full><Select value={head.sotrudnik} options={Array.from(new Set([head.sotrudnik, ...spravValues("Подотчётные сотрудники")]))} onChange={h("sotrudnik")} disabled={ro} /></Field>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
            <Toggle checked={ownProperty} onChange={setOwnProperty} disabled={ro} label={ownProperty ? "Да" : "Нет"} />
          </div>
          <InfoField value={info} onChange={setInfo} disabled={ro} />
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
            {!lockPos && (
              <Btn size="sm" onClick={() => screen.open("position-new")}>
                <Plus className="w-4 h-4" />Добавить позицию
              </Btn>
            )}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Нет позиций. Нажмите «+ Добавить позицию»</div>
        ) : (<>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="kol" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество</SortTh>
              {isOrder && <>
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{NET_AU_AG}</SortTh>
                <SortTh sortKey="oborot" sort={sort} onSort={toggleSort} className="px-3 py-2">{OBOROT_LABEL}</SortTh>
              </>}
              <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <th className="w-24"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg10.pageItems.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{codeLabel(p.code)}</td>
                  <td className="px-3 py-2">{p.kol || "—"}</td>
                  {isOrder && <>
                    <td className="px-3 py-2">{probaText(p.proba)}</td>
                    <td className="px-3 py-2 font-medium">{p.lig}</td>
                    <td className="px-3 py-2 text-blue-600"><NetAuAg chem={p.chem} /></td>
                    <td className="px-3 py-2"><OborotValue value={oborotFromForm(p.oborot)} /></td>
                  </>}
                  <td className="px-3 py-2 text-gray-500">{locOf(p)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <EyeIcon onClick={() => screen.open("position", p.id)} />
                      {!lockPos && <EditIcon onClick={() => screen.open("position-edit", p.id)} />}
                      {!lockPos && <DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} />}
                    </div>
                  </td>
                </tr>
              ))}
              <FillerRows count={pg10.fill} cols={11} />
            </tbody>
          </table>
          {pg10.pager}
        </>)}
      </div>

      {posModal && (
        <DMPositionFormModal
          key={posModal.mode === "add" ? "add" : posModal.pos.id + posModal.mode}
          mode={posModal.mode}
          sklad={sklad}
          initial={posModal.pos}
          reservedNomenkl={[...orderPositions, ...nakladPositions].map(p => p.nomenkl)}
          onClose={closePos}
          onSave={savePos}
          onSaveMany={ps => { setPositions(prev => [...prev, ...ps]); show(`Добавлено позиций: ${ps.length}`); closePos(); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
