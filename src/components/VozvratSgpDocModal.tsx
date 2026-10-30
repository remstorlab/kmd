import React, { useMemo, useState } from "react";
import {
  Btn, Modal, DeleteIcon, ExportBtn, useToast, Toast, Field, Input, Select, KlassCode, Toggle,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp,
  InfoField,
  NetAuAg, NET_AU_AG,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, spravValues, SGP, PRIHOD_SKLAD, DOC_VOZVRAT_SGP } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow } from "./StockPickerModal";
import { takeFromStock, isPartialIssue, restLigOk, issueShare, partLigMap } from "../data/stock";
import { useScreen } from "../router";
import { Plus } from "lucide-react";

// ── Возврат СГП №2: возврат позиций со склада СГП №2 на склад СДМ ────────────────
// Поля — как у накладной прихода; отправитель — всегда склад СГП №2, получатель — склад из справочника «Склады»
// (по умолчанию склад приёмки СДМ1). Позиции подбираются со склада СГП №2 с количеством к перемещению.
// При оформлении позиции встают на склад-получатель «На складе» без места хранения («-») — размещаются потом
// через «Изменить место хранения»; заказчик и признак собственности позиций сохраняются.

type VsPosition = VydachaDocPosition;
const NO_LOC = "-";
const ORGS = spravValues("Заказчики / Организации");

export default function VozvratSgpDocModal({ onClose, onSave, doc, readOnly = false, typeSelect }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
  typeSelect: React.ReactNode;
}) {
  const ro = readOnly;
  const posted = doc?.status === "Оформлено";
  const lockPos = ro || posted;
  const { gpItems, dmItems, setGpItems, setDmItems } = useApp();
  const createdStamp = useCreatedStamp();
  const { toast, show, clear } = useToast();
  // Вложенный экран: …/pick (подбор со склада СГП №2)
  const screen = useScreen();
  const showPick = screen.has("pick");
  const setShowPick = (open: boolean) => (open ? screen.open("pick") : screen.close("pick"));
  const today = new Date().toLocaleDateString("ru-RU");
  const receivers = spravValues("Склады").filter(s => s !== SGP);

  const [head, setHead] = useState(() => ({
    number: doc?.number || `ВС-${String(Math.floor(Math.random() * 900 + 100)).padStart(4, "0")}`,
    date: doc?.date || today,
    receiver: doc?.receiver || PRIHOD_SKLAD,
    zakazchik: doc?.zakazchik ?? ORGS[0],
    sotrudnik: "Ким Александр Юрьевич",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [ownProperty, setOwnProperty] = useState(doc?.ownProperty ?? true);
  const [info, setInfo] = useState(doc?.info ?? "");
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Возврат СГП №2_${doc.number}.pdf`)] : []));
  const [positions, setPositions] = useState<VsPosition[]>(() => doc?.positions ?? []);

  // Остатки склада СГП №2. Количество к перемещению вводится всегда: позиция без количества изделий
  // (или из одного изделия) — 1 шт.
  const stock = useMemo<StockRow[]>(() => [
    ...gpItems.filter(i => i.sklad === SGP && i.status === "На складе").map(i => ({ id: i.id, src: "gp" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: Math.max(i.qty, 1), unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem })),
    ...dmItems.filter(i => i.sklad === SGP && i.status === "На складе").map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: Math.max(i.qty, 1), unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem })),
  ], [gpItems, dmItems]);

  const itemOf = (p: VsPosition): GPItem | DMItem | undefined =>
    p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);

  // Заказчик и «Собственность заказчика» после выбора позиций — из позиций (цепочка от документа приёма на СДМ1),
  // только для чтения; до выбора позиций — выбираются вручную
  const posItems = positions.map(itemOf).filter((i): i is GPItem | DMItem => !!i?.zakazchik);
  const fromPositions = !posted && posItems.length > 0;
  const zakazchik = fromPositions ? Array.from(new Set(posItems.map(i => i.zakazchik!))).join(", ") : head.zakazchik;
  const isOwn = fromPositions ? posItems.every(i => i.ownProperty) : ownProperty;
  const lockZakazchik = ro || posted || fromPositions;

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

  const setIssue = (id: string, v: string) => setPositions(prev => prev.map(p => {
    if (p.id !== id) return p;
    const n = parseInt(v.replace(/[^\d]/g, ""), 10);
    return { ...p, issue: Number.isFinite(n) ? Math.min(Math.max(n, 0), p.qty) : 0 };
  }));
  const badIssue = positions.filter(p => p.issue < 1 || p.issue > p.qty);

  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => codeLabel(p.code),
    issue: p => p.issue,
    lig: p => p.lig ?? 0,
    net: p => p.net ?? 0,
  });

  // Доля выдаваемой части: при частичной выдаче — по введённому весу остатка на складе
  const share = (p: VsPosition, v: number | null) => (v == null ? 0 : v * issueShare(p));
  const setRestLig = (id: string, v: string) => setPositions(prev => prev.map(p => (p.id === id ? { ...p, restLig: v.replace(/[^\d.,]/g, "") } : p)));
  // Частичная выдача без корректного веса остатка не оформляется
  const badRest = positions.filter(p => isPartialIssue(p) && !restLigOk(p));
  const restCell = (p: VsPosition) => isPartialIssue(p) && (
    lockPos
      ? (p.restLig ? <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">остаток на складе: {p.restLig} г</div> : null)
      : (
        <div className="mt-1.5">
          <div className="text-[11px] text-gray-500 mb-0.5 whitespace-nowrap">Лиг. вес остатка на складе, г</div>
          <div className={`w-28 ${restLigOk(p) ? "" : "rounded-lg ring-1 ring-red-400"}`}>
            <Input value={p.restLig ?? ""} onChange={v => setRestLig(p.id, v)} placeholder={p.lig != null ? `< ${p.lig.toFixed(2)}` : "0.00"} />
          </div>
        </div>
      )
  );
  const totalQty = positions.reduce((s, p) => s + p.issue, 0);
  const totalLig = positions.reduce((s, p) => s + share(p, p.lig), 0);
  const totalNet = positions.reduce((s, p) => s + share(p, p.net), 0);

  const save = (status: DocStatus) => {
    if (badIssue.length) { show(`Укажите количество к перемещению: ${badIssue.map(p => p.name).join(", ")}`); return; }
    if (status === "Оформлено" && badRest.length) { show(`Укажите лигатурный вес остатка на складе (больше 0 и меньше веса позиции): ${badRest.map(p => p.name).join(", ")}`); return; }
    if (status === "Оформлено" && !posted) {
      if (positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = itemOf(p);
        return !it || it.sklad !== SGP || it.status !== "На складе" || Math.max(it.qty, 1) < p.issue;
      });
      if (lacking.length) { show(`Позиции недоступны на складе «${SGP}»: ${lacking.map(p => p.name).join(", ")}`); return; }
      const stamp = Date.now();
      const move = <T extends GPItem | DMItem>(it: T): T => ({ ...it, sklad: head.receiver, status: "На складе", location: NO_LOC });
      const partId = (it: { id: string }) => `${it.id}-vs${stamp}`;
      const gpTake = new Map(positions.filter(p => p.src === "gp").map(p => [p.id, p.issue]));
      const dmTake = new Map(positions.filter(p => p.src === "dm").map(p => [p.id, p.issue]));
      if (gpTake.size) setGpItems(prev => takeFromStock(prev, gpTake, move, partId, partLigMap(positions)).items);
      if (dmTake.size) setDmItems(prev => takeFromStock(prev, dmTake, move, partId, partLigMap(positions)).items);
    }
    onSave({
      id: doc?.id ?? `sd-${Date.now()}`,
      ...(doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : createdStamp()),
      date: head.date,
      type: DOC_VOZVRAT_SGP,
      number: head.number,
      status,
      sender: SGP,
      receiver: head.receiver,
      zakazchik,
      ownProperty: isOwn,
      info: info.trim() || undefined,
      positions,
    });
  };

  const pg = usePaged(sorted, "vozvrat-sgp-positions");
  return (
    <Modal
      title={`${DOC_VOZVRAT_SGP}${doc ? ` ${doc.number}` : ""}`}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : posted ? <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("Оформлено")}>Сохранить</Btn>
      </> : <>
        <div className="mr-auto"><Btn variant="success" onClick={() => save("Оформлено")}>Оформить</Btn></div>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("В работе")}>Сохранить</Btn>
      </>}
    >
      {posted && (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Документ оформлен: позиции возвращены со склада «{SGP}» на склад «{head.receiver}» без места хранения. Состав позиций изменить нельзя.
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {typeSelect}
        <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
        <Field label="Дата документа" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
        <Field label="Отправитель" required={!ro}><Input value={SGP} disabled /></Field>
        <Field label="Получатель" required={!ro}>
          <Select value={head.receiver} options={receivers.includes(head.receiver) ? receivers : [head.receiver, ...receivers]} onChange={h("receiver")} disabled={lockPos} />
        </Field>
        <Field label="Заказчик / Организация" required={!ro}>
          {lockZakazchik
            ? <Input value={zakazchik} disabled />
            : <Select value={head.zakazchik} options={Array.from(new Set([head.zakazchik, ...ORGS]))} onChange={h("zakazchik")} />}
        </Field>
        <Field label="Сотрудник склада-получателя" required={!ro} full><Select value={head.sotrudnik} options={Array.from(new Set([head.sotrudnik, ...spravValues("Подотчётные сотрудники")]))} onChange={h("sotrudnik")} disabled={ro} /></Field>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
          <Toggle checked={isOwn} onChange={setOwnProperty} disabled={lockZakazchik} label={isOwn ? "Да" : "Нет"} />
        </div>
        <InfoField value={info} onChange={setInfo} disabled={ro} />
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции возврата</h3>
          <div className="flex gap-2">
            {!lockPos && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            Нет позиций. Нажмите «+ Добавить позицию» и выберите позиции со склада «{SGP}»
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
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{NET_AU_AG}</SortTh>
              {!lockPos && <th className="w-12"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg.pageItems.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{codeLabel(p.code)}</td>
                  <td className="px-3 py-2">
                    {!lockPos ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-20 ${p.issue < 1 ? "rounded-lg ring-1 ring-red-400" : ""}`}>
                          <Input value={p.issue ? String(p.issue) : ""} onChange={v => setIssue(p.id, v)} placeholder="1" />
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">из {p.qty}</span>
                      </div>
                    ) : (p.issue || "—")}
                    {restCell(p)}
                  </td>
                  <td className="px-3 py-2">{p.lig == null ? "—" : share(p, p.lig).toFixed(2)}</td>
                  <td className="px-3 py-2 text-blue-600"><NetAuAg chem={p.chem} net={p.net} metal={p.code} k={issueShare(p)} /></td>
                  {!lockPos && <td className="px-3 py-2"><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></td>}
                </tr>
              ))}
              <FillerRows count={pg.fill} cols={8} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{totalQty}</td>
              <td className="px-3 py-2">{totalLig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600">{totalNet.toFixed(2)}</td>
              {!lockPos && <td></td>}
            </tr></tfoot>
          </table>
          {pg.pager}
        </>)}
      </div>

      {showPick && (
        <StockPickerModal
          qtyLabel="Кол-во к перемещению"
          title={`Добавить позиции со склада «${SGP}»`}
          rows={stock}
          already={already}
          showWeights
          emptyText={`Нет позиций на складе «${SGP}»`}
          onClose={() => setShowPick(false)}
          onAdd={addPicked}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
