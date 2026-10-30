import React, { useMemo, useState } from "react";
import {
  Badge, Btn, Modal, DeleteIcon, ExportBtn, useToast, Toast, Field, Input, Select, KlassCode,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp,
  InfoField,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, spravValues, MAIN_SKLAD, SGP, DOC_OTGRUZKA_DM, DOC_PEREDACHA_GP } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow } from "./StockPickerModal";
import { takeFromStock } from "../data/stock";
import { useScreen } from "../router";
import { Plus } from "lucide-react";

// ── Выдача со склада: «Накладная» ─────────────────────────────────────────────
// Не связана с «Движением материала»: выдача со склада выдачи (СДМ2) на склад СГП №2 — в обоих типах документа.
// Тип документа — из справочника «Типы документов отгрузки»; набор полей общий, отличается печатная форма.
// Выдать можно любую позицию склада, независимо от класса. Заказчик / Организация — отдельное поле: по умолчанию
// заказчик выдаваемых позиций (из документа приёма на СДМ1, сохраняется через требование и объединение).

const ORGS = spravValues("Заказчики / Организации");

type VydachaPosition = VydachaDocPosition;

// Перемещение выдаваемого количества — только при оформлении накладной. Пока накладная «В работе»,
// позиции склада не меняются (статус и место хранения прежние). При оформлении выданная позиция встаёт на склад
// СГП №2 «На складе» без места хранения («-»); при частичной выдаче остаток остаётся на СДМ2 на своём месте
// с уменьшенным количеством, а выданная часть выделяется в отдельную запись на СГП №2 (data/stock.ts).
const NO_LOC = "-";
// Выдать можно позицию на складе или в резерве; «В подотчёте» и «Закрыта» — нет
const canIssue = (status: string) => status === "На складе" || status === "Резерв";

// ── Накладная на отгрузку ────────────────────────────────────────────────────

export default function VydachaDocModal({ onClose, onSave, doc, readOnly = false, preselectIds = [] }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
  // Позиции, отмеченные на складе перед «Выдать со склада», — сразу в позициях новой накладной
  preselectIds?: string[];
}) {
  const ro = readOnly;
  // Оформленная накладная: позиции уже выданы и закрыты — состав менять нельзя
  const issued = doc?.status === "Оформлено";
  const lockPos = ro || issued;
  const { gpItems, dmItems, setGpItems, setDmItems, shihtovyeKarty, setShihtovyeKarty } = useApp();
  const createdStamp = useCreatedStamp();
  const { toast, show, clear } = useToast();
  // Вложенные экраны: …/gp («Накладная на передачу ГП» в «Тип документа»), …/pick (подбор со склада)
  const screen = useScreen();
  const docType = doc?.type ?? (screen.has("gp") ? DOC_PEREDACHA_GP : DOC_OTGRUZKA_DM);
  const typeOptions = spravValues("Типы документов отгрузки");
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: doc?.number || `НО-${Math.floor(Math.random() * 900 + 100)}`,
    date: doc?.date || today,
    // Отправитель — всегда склад выдачи (СДМ2), получатель — склад СГП №2
    sender: MAIN_SKLAD,
    schetFaktura: "",
    schetFakturaDate: today,
    dogovor: "",
    doverennost: "",
    osnovanie: "",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [info, setInfo] = useState(doc?.info ?? "");
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Накладная_${doc.number}.pdf`)] : []));
  const showPick = screen.has("pick");
  const setShowPick = (open: boolean) => (open ? screen.open("pick") : screen.close("pick"));

  // Остатки склада выдачи (СДМ2) — позиции «На складе» и «Резерв» из обоих учётов, любого класса.
  // Выдача формируется только со СДМ2: позиции склада приёмки сначала перемещаются по требованию.
  const stock = useMemo<StockRow[]>(() => {
    const fromGp: StockRow[] = gpItems.filter(i => i.sklad === MAIN_SKLAD).map(i => ({ id: i.id, src: "gp", nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: i.qty, unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem }));
    const fromDm: StockRow[] = dmItems.filter(i => i.sklad === MAIN_SKLAD).map(i => ({ id: i.id, src: "dm", nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem }));
    const available = [
      ...gpItems.filter(i => canIssue(i.status)).map(i => i.id),
      ...dmItems.filter(i => canIssue(i.status)).map(i => i.id),
    ];
    return [...fromGp, ...fromDm].filter(r => available.includes(r.id) && (r.src === "dm" || r.qty > 0));
  }, [gpItems, dmItems]);

  // Новая накладная: отмеченные позиции склада добавляются на всё доступное количество — его можно уменьшить
  const [positions, setPositions] = useState<VydachaPosition[]>(() =>
    doc?.positions ?? stock.filter(r => preselectIds.includes(r.id)).map(r => ({ ...r, issue: r.qty })));

  // Позиции из резерва и шихтовые карты, которые их резервируют (кроме выполненных)
  const isRezerv = (p: VydachaPosition) =>
    (p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id))?.status === "Резерв";
  const rezNomenkl = new Set(positions.filter(isRezerv).map(p => p.nomenkl));
  const affectedKarty = rezNomenkl.size
    ? shihtovyeKarty.filter(k => k.status !== "Выполнена" && k.materials.some(m => rezNomenkl.has(m.nomenkl)))
    : [];

  // Заказчик / Организация: пока не выбран вручную — заказчик выдаваемых позиций (цепочка от приёма на СДМ1)
  const [zakazchikManual, setZakazchikManual] = useState<string | null>(doc?.zakazchik ?? null);
  const posZakazchiki = Array.from(new Set(positions
    .map(p => (p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id))?.zakazchik)
    .filter((z): z is string => !!z)));
  const zakazchik = zakazchikManual ?? posZakazchiki[0] ?? "";
  const zakazchikOptions = Array.from(new Set(["", ...(zakazchik ? [zakazchik] : []), ...posZakazchiki, ...ORGS]));

  const already = Object.fromEntries(positions.map(p => [p.id, p.issue]));

  const addPicked = (picked: { row: StockRow; qty: number }[]) => {
    setPositions(prev => {
      const next = [...prev];
      for (const { row, qty } of picked) {
        const idx = next.findIndex(p => p.id === row.id);
        if (idx >= 0) next[idx] = { ...next[idx], issue: Math.min(next[idx].issue + qty, row.qty) };
        else next.push({ ...row, issue: qty });
      }
      return next;
    });
    setShowPick(false);
    show(`Добавлено позиций: ${picked.length}`);
  };


  const changeType = (t: string) => screen.toggle("gp", t === DOC_PEREDACHA_GP);
  // Количество к выдаче — от 1 до количества изделий позиции; без количества изделий позиция выдаётся целиком
  const setIssue = (id: string, v: string) => setPositions(prev => prev.map(p => {
    if (p.id !== id) return p;
    const n = parseInt(v.replace(/[^\d]/g, ""), 10);
    return { ...p, issue: Number.isFinite(n) ? Math.min(Math.max(n, 0), p.qty) : 0 };
  }));
  const badIssue = positions.filter(p => p.qty > 0 && (p.issue < 1 || p.issue > p.qty));

  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => codeLabel(p.code),
    issue: p => p.issue,
    lig: p => p.lig ?? 0,
    net: p => p.net ?? 0,
    location: p => p.location,
  });

  const totalQty = positions.reduce((s, p) => s + p.issue, 0);
  // Массы выдаваемой части — пропорционально количеству (без количества изделий — вся масса позиции)
  const share = (p: VydachaPosition, v: number | null) => (v == null ? 0 : p.qty > 0 ? (v * p.issue) / p.qty : v);
  const totalLig = positions.reduce((s, p) => s + share(p, p.lig), 0);
  const totalNet = positions.reduce((s, p) => s + share(p, p.net), 0);

  const save = (status: DocStatus) => {
    // Списание выполняется один раз — при первом оформлении документа
    if (badIssue.length) { show(`Укажите количество к выдаче: ${badIssue.map(p => p.name).join(", ")}`); return; }
    if (status === "Оформлено" && !zakazchik) { show("Укажите заказчика / организацию"); return; }
    if (status === "Оформлено" && !issued) {
      if (positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);
        return !it || it.sklad !== MAIN_SKLAD || !canIssue(it.status) || it.qty < p.issue;
      });
      if (lacking.length) {
        show(`Недостаточно остатка на складе: ${lacking.map(p => p.name).join(", ")}`);
        return;
      }
      const stamp = Date.now();
      const gpIssue = new Map(positions.filter(p => p.src === "gp").map(p => [p.id, p.issue]));
      const dmIssue = new Map(positions.filter(p => p.src === "dm").map(p => [p.id, p.issue]));
      const partId = (it: { id: string }) => `${it.id}-v${stamp}`;
      // Выданная позиция — на склад СГП №2 без места хранения; заказчик позиции сохраняется (без него — из документа)
      const toSgp = <T extends GPItem | DMItem>(it: T): T => ({ ...it, sklad: SGP, status: "На складе", location: NO_LOC, zakazchik: it.zakazchik ?? zakazchik });
      if (gpIssue.size) setGpItems(prev => takeFromStock(prev, gpIssue, toSgp, partId).items);
      if (dmIssue.size) setDmItems(prev => takeFromStock(prev, dmIssue, toSgp, partId).items);
      // Выданные позиции из резерва: шихтовая карта, которая их резервировала, возвращается в «Редактирование»
      if (affectedKarty.length) {
        const ids = new Set(affectedKarty.map(k => k.id));
        setShihtovyeKarty(prev => prev.map(k => {
          if (!ids.has(k.id)) return k;
          const hit = k.materials.filter(m => rezNomenkl.has(m.nomenkl)).map(m => m.name);
          return { ...k, status: "Редактирование", vydannyePozicii: [...new Set([...(k.vydannyePozicii ?? []), ...hit])] };
        }));
      }
    }
    onSave({
      id: doc?.id ?? `vd-${Date.now()}`,
      ...(doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : createdStamp()),
      date: head.date,
      type: docType,
      number: head.number,
      status,
      sender: MAIN_SKLAD,
      receiver: SGP,
      zakazchik,
      info: info.trim() || undefined,
      positions,
    });
  };

  const pg12 = usePaged(sorted, "vydacha-positions");
  return (
    <Modal
      title={`Накладная${doc ? ` ${doc.number}` : ""}`}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : issued ? <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("Оформлено")}>Сохранить</Btn>
      </> : <>
        <div className="mr-auto"><Btn variant="success" onClick={() => save("Оформлено")}>Оформить</Btn></div>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("В работе")}>Сохранить</Btn>
      </>}
    >
      {!issued && !ro && affectedKarty.length > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
          ⚠ В выдаче есть позиции из резерва. После оформления шихтовая карта {affectedKarty.map(k => `«${k.name}»`).join(", ")} вернётся в статус «Редактирование» и станет недоступна для плавки.
        </div>
      )}
      {issued && (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Накладная оформлена: позиции выданы со склада «{MAIN_SKLAD}» на склад «{SGP}» (без места хранения). Состав позиций изменить нельзя.
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Field label="Тип документа" required={!ro}>
          <Select
            value={docType}
            options={typeOptions.includes(docType) ? typeOptions : [docType, ...typeOptions]}
            onChange={changeType}
            disabled={ro || !!doc}
          />
        </Field>
        <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
        <Field label="Дата документа" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
        <Field label="Отправитель" required={!ro}><Input value={MAIN_SKLAD} disabled /></Field>
        <Field label="Получатель" required={!ro}><Input value={SGP} disabled /></Field>
        <Field label="Заказчик / Организация" required={!ro}>
          <Select value={zakazchik} options={zakazchikOptions} optionLabel={v => v || "Выберите заказчика"} onChange={v => setZakazchikManual(v)} disabled={ro} />
        </Field>
        <Field label="Доверенность получателя"><Input value={head.doverennost} onChange={h("doverennost")} placeholder="№ и дата доверенности" disabled={ro} /></Field>
        <Field label="№ счёт-фактуры"><Input value={head.schetFaktura} onChange={h("schetFaktura")} placeholder="СФ-XXXX" disabled={ro} /></Field>
        <Field label="Дата счёт-фактуры"><Input value={head.schetFakturaDate} onChange={h("schetFakturaDate")} disabled={ro} /></Field>
        <Field label="Номер договора"><Input value={head.dogovor} onChange={h("dogovor")} placeholder="ДОГ-XXXX" disabled={ro} /></Field>
        <div className="col-span-3">
          <Field label="Основание выдачи" required={!ro}><Input value={head.osnovanie} onChange={h("osnovanie")} placeholder="Например: реализация по договору" disabled={ro} /></Field>
        </div>
        <InfoField value={info} onChange={setInfo} disabled={ro} />
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции для выдачи</h3>
          <div className="flex gap-2">
            {!lockPos && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            Список позиций для выдачи пуст
          </div>
        ) : (<>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код</SortTh>
              <SortTh sortKey="issue" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество изделий</SortTh>
              <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес чист.</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              {!lockPos && <th className="w-12"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg12.pageItems.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{codeLabel(p.code)}</td>
                  <td className="px-3 py-2">
                    {!lockPos && p.qty > 1 ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-20 ${p.issue < 1 ? "rounded-lg ring-1 ring-red-400" : ""}`}>
                          <Input value={p.issue ? String(p.issue) : ""} onChange={v => setIssue(p.id, v)} placeholder="1" />
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">из {p.qty}</span>
                      </div>
                    ) : (p.issue || "—")}
                  </td>
                  <td className="px-3 py-2">{p.lig == null ? "—" : share(p, p.lig).toFixed(2)}</td>
                  <td className="px-3 py-2 text-blue-600">{p.net == null ? "—" : share(p, p.net).toFixed(2)}</td>
                  <td className="px-3 py-2 text-gray-500">{p.location}</td>
                  {!lockPos && <td className="px-3 py-2"><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></td>}
                </tr>
              ))}
              <FillerRows count={pg12.fill} cols={9} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{totalQty}</td>
              <td className="px-3 py-2">{totalLig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600">{totalNet.toFixed(2)}</td>
              <td colSpan={lockPos ? 1 : 2}></td>
            </tr></tfoot>
          </table>
          {pg12.pager}
        </>)}
      </div>

      {showPick && (
        <StockPickerModal
          qtyInput={r => r.qty > 1}
          title={`Добавить позиции со склада «${MAIN_SKLAD}»`}
          rows={stock}
          already={already}
          showWeights
          emptyText="Нет доступных позиций на складе"
          onClose={() => setShowPick(false)}
          onAdd={addPicked}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
