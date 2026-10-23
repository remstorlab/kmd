import React, { useState } from "react";
import {
  Btn, Modal, EyeIcon, EditIcon, DeleteIcon, ExportBtn, useToast, Toast,
  Field, Input, Select, KlassCode, useMaterialCodeLabel, MultiFileUpload, Toggle, SortTh, useSort, ProbaChem, usePaged, FillerRows,
} from "./ui";
import { SkladDoc, DocStatus, ChemComposition, spravValues, MAIN_SKLAD, DOC_PRIHOD_ORDER, DOC_PRIHOD_NAKLAD } from "../data/mock";
import DMPositionFormModal, { PrihodPosition, locOf, emptyPosition } from "./DMPositionFormModal";
import ChemCompositionBlock from "./ChemCompositionBlock";
import { useApp } from "../store/AppContext";
import { Plus } from "lucide-react";
import { useScreen } from "../router";

// ── Приём на склад: Приходный ордер / Накладная ──────────────────────────────
// Общая модалка для «Остатки на складе ДМ → Принять на склад» и «Приход на склад». Получатель — склад системы.

type PrihodDocType = string;
// Отправители приходного ордера — из справочника «Организации»
const ORGS = spravValues("Организации");

// Демо-позиции для документов из демо-данных (без сохранённых позиций)
const DEMO_ORDER: PrihodPosition[] = [
  { id: "po-1", nomenkl: "5015301", name: "Слиток золотой стандартный", klass: "Слиток", code: "1000", kol: "1", unit: "шт", proba: "999.9", lig: "1000.00", net: "999.90", seyf: "1", polka: "1", chem: { au: "999.90" } },
  { id: "po-2", nomenkl: "5015302", name: "Слиток серебряный", klass: "Слиток", code: "2000", kol: "1", unit: "шт", proba: "925", lig: "318.60", net: "294.71", seyf: "2", polka: "1", chem: { ag: "294.71" } },
];
const DEMO_NAKLAD: PrihodPosition[] = [
  { id: "pn-1", nomenkl: "5015303", name: "Монета «Атамекен» Ag 925", klass: "Готовая продукция", code: "2000", kol: "200", unit: "шт", proba: "925", lig: "6220.00", net: "5753.50", seyf: "1", polka: "1", chem: { ag: "5753.50" } },
  { id: "pn-2", nomenkl: "5015304", name: "Орден «Алтын алка»", klass: "Готовая продукция", code: "0300", kol: "30", unit: "шт", proba: "750", lig: "672.00", net: "504.00", seyf: "1", polka: "2", chem: { au: "504.00", ag: "100.80", cu: "67.20" } },
];

// ── Документ прихода ─────────────────────────────────────────────────────────

export default function PrihodDocModal({ onClose, onSave, doc, readOnly = false }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
}) {
  const ro = readOnly;
  const { storageLocations } = useApp();
  // Вложенные экраны: …/nakladnaya (тип документа), …/position-new, …/position/:id, …/position-edit/:id
  const screen = useScreen();
  // Тип документа — из справочника «Типы документов приёмки»: «Приходный ордер» или «Накладная»
  const docType: PrihodDocType = (doc ? doc.type !== DOC_PRIHOD_ORDER : screen.has("nakladnaya")) ? DOC_PRIHOD_NAKLAD : DOC_PRIHOD_ORDER;
  const setDocType = (t: PrihodDocType) => screen.toggle("nakladnaya", t !== DOC_PRIHOD_ORDER);
  const isOrder = docType === DOC_PRIHOD_ORDER;
  const { toast, show, clear } = useToast();
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: doc?.number || "ПО-0342",
    date: doc?.date || today,
    otpravitel: doc?.sender || ORGS[0],
    // Получатель — всегда склад системы
    poluchatel: MAIN_SKLAD,
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
    skladPoluch: MAIN_SKLAD,
    sotrudnik: "Ким Александр Юрьевич",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [ownProperty, setOwnProperty] = useState(true);

  // Документы (несколько файлов, отдельно для ордера и накладной)
  const [orderFiles, setOrderFiles] = useState<File[]>(() => [new File([], `Приходный ордер ${doc?.number || "ПО-0342"}.pdf`)]);
  const [nakladFiles, setNakladFiles] = useState<File[]>(() => [new File([], `Накладная_${doc?.number || "НП-001234"}.pdf`)]);

  // Позиции: новый документ — без позиций (сохранить можно и пустым); сохранённый — свои позиции,
  // у демо-документов без сохранённых позиций — демо-набор.
  const initialPositions = (type: string, demo: PrihodPosition[]) =>
    !doc ? [] : doc.type !== type ? [] : doc.prihodPositions ?? demo;
  const [orderPositions, setOrderPositions] = useState<PrihodPosition[]>(() => initialPositions(DOC_PRIHOD_ORDER, DEMO_ORDER));
  const [nakladPositions, setNakladPositions] = useState<PrihodPosition[]>(() => initialPositions(DOC_PRIHOD_NAKLAD, DEMO_NAKLAD));

  // Хим. состав на партию — задаётся в документе и подставляется в каждую новую позицию
  const [partyChemOn, setPartyChemOn] = useState(!!doc?.partyChem);
  const [partyChem, setPartyChem] = useState<ChemComposition>(() => doc?.partyChem ?? {});

  const positions = isOrder ? orderPositions : nakladPositions;
  const setPositions = isOrder ? setOrderPositions : setNakladPositions;
  const sklad = isOrder ? head.poluchatel : head.skladPoluch;

  const posModal: { mode: "add" | "edit" | "view"; pos: PrihodPosition } | null = (() => {
    if (screen.has("position-new")) {
      const pos = emptyPosition(storageLocations, sklad, isOrder ? "Слиток" : "Готовая продукция", "1000");
      return { mode: "add", pos: partyChemOn ? { ...pos, chem: { ...partyChem } } : pos };
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
    loc: p => locOf(p),
  });

  // Документ сохраняется и оформляется в том числе без позиций
  const save = (status: DocStatus) => {
    const base = { id: doc?.id ?? `sd-${Date.now()}`, status, receiver: MAIN_SKLAD, prihodPositions: positions, partyChem: partyChemOn ? partyChem : undefined };
    const d: SkladDoc = isOrder
      ? { ...base, date: head.date, type: DOC_PRIHOD_ORDER, number: head.number, sender: head.otpravitel }
      : { ...base, date: head.nakladDate, type: DOC_PRIHOD_NAKLAD, number: head.nakladNumber, sender: head.skladOtpr };
    onSave(d);
  };

  const title = doc ? `${docType} ${doc.number}` : docType;
  const typeOptions = spravValues("Типы документов приёмки");

  const typeSelect = (
    <Field label="Тип документа" required={!ro}>
      <Select value={docType} options={typeOptions.includes(docType) ? typeOptions : [docType, ...typeOptions]} onChange={setDocType} disabled={ro || !!doc} />
    </Field>
  );

  const pg10 = usePaged(sorted, "prihod-positions");
  return (
    <Modal
      title={title}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <>
          <div className="mr-auto"><Btn variant="success" onClick={() => save("Оформлено")}>Оформить</Btn></div>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save("Редактирование")}>Сохранить</Btn>
        </>
      )}
    >
      {isOrder ? (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
          <Field label="Дата" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
          <Field label="Отправитель" required={!ro}><Select value={head.otpravitel} options={Array.from(new Set([head.otpravitel, ...ORGS]))} onChange={h("otpravitel")} disabled={ro} /></Field>
          <Field label="Получатель" required={!ro}><Input value={MAIN_SKLAD} disabled /></Field>
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
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {typeSelect}
          <Field label="Номер" required={!ro}><Input value={head.nakladNumber} onChange={h("nakladNumber")} disabled={ro} /></Field>
          <Field label="Дата" required={!ro}><Input value={head.nakladDate} onChange={h("nakladDate")} disabled={ro} /></Field>
          <Field label="Заказчик" required={!ro}><Select value={head.zakazchik} options={["Национальный банк", "Монетный двор"]} onChange={h("zakazchik")} disabled={ro} /></Field>
          <Field label="Склад-отправитель" required={!ro}><Select value={head.skladOtpr} options={Array.from(new Set([head.skladOtpr, "СДМ", "Производственный цех"]))} onChange={h("skladOtpr")} disabled={ro} /></Field>
          <Field label="Склад-получатель" required={!ro}><Input value={MAIN_SKLAD} disabled /></Field>
          <Field label="Сотрудник склада-получателя" required={!ro} full><Select value={head.sotrudnik} options={Array.from(new Set([head.sotrudnik, ...spravValues("Подотчётные сотрудники")]))} onChange={h("sotrudnik")} disabled={ro} /></Field>
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

      {/* Хим. состав позиции: подставляется в каждую новую позицию документа (в позиции его можно изменить) */}
      {(!ro || partyChemOn) && (
        <div className="mb-4">
          {!ro && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
              <input type="checkbox" checked={partyChemOn} onChange={e => setPartyChemOn(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Задать хим. состав позиции
            </label>
          )}
          {partyChemOn && (
            <>
              <ChemCompositionBlock value={partyChem} onChange={setPartyChem} disabled={ro} />
              {!ro && <div className="text-xs text-gray-500 mt-1">Хим. состав партии автоматически заполняется в новых позициях документа</div>}
            </>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">{isOrder ? "Позиции прихода" : "Позиции приёма"}</h3>
          <div className="flex gap-2">
            {!ro && (
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
              <SortTh sortKey="kol" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество изделий</SortTh>
              {isOrder && <>
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес чист.</SortTh>
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
                    <td className="px-3 py-2"><ProbaChem proba={p.proba} chem={p.chem} /></td>
                    <td className="px-3 py-2 font-medium">{p.lig}</td>
                    <td className="px-3 py-2 text-blue-600">{p.net}</td>
                  </>}
                  <td className="px-3 py-2 text-gray-500">{locOf(p)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <EyeIcon onClick={() => screen.open("position", p.id)} />
                      {!ro && <EditIcon onClick={() => screen.open("position-edit", p.id)} />}
                      {!ro && <DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} />}
                    </div>
                  </td>
                </tr>
              ))}
              <FillerRows count={pg10.fill} cols={10} />
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
