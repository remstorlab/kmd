import React, { useMemo, useState } from "react";
import {
  Btn, Modal, DeleteIcon, ExportBtn, useToast, Toast, Field, Input, Select, KlassCode, Toggle,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp, PosStatusBadge,
  InfoField,
  NetAuAg, NET_AU_AG,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, spravValues, SDM1, SDM2, SGP, DOC_TREBOVANIE } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow } from "./StockPickerModal";
import { takeFromStock, isPartialIssue, restLigOk, issueShare, partLigMap } from "../data/stock";
import { useScreen } from "../router";
import { Plus } from "lucide-react";

// ── Требование: перемещение позиций со склада на склад (СДМ1 → СДМ2) ─────────
// Позиции, принятые на склад приёмки (СДМ1) и зарезервированные под шихтовую карту, по требованию передаются
// на склад выдачи (СДМ2), откуда выдаются на плавку. Перемещение меняет только склад: место хранения, статус
// (в т. ч. «Резерв» под шихтовую карту) и остальные атрибуты сохраняются. Склады меняются только при оформлении;
// при частичном перемещении запись делится (data/stock.ts) — остаток остаётся на складе-отправителе.

type TrebPosition = VydachaDocPosition;
// Переместить можно позицию на складе или в резерве
const canMove = (status: string) => status === "На складе" || status === "Резерв";
const NO_KARTA = "—";

export default function TrebovanieDocModal({ onClose, onSave, doc, readOnly = false, typeSelect }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
  typeSelect: React.ReactNode;
}) {
  const ro = readOnly;
  // Оформленное требование: позиции уже перемещены — состав и склады менять нельзя
  const posted = doc?.status === "Оформлено";
  const lockPos = ro || posted;
  const { gpItems, dmItems, setGpItems, setDmItems, shihtovyeKarty } = useApp();
  const createdStamp = useCreatedStamp();
  const { toast, show, clear } = useToast();
  // Вложенный экран: …/pick (подбор со склада-отправителя)
  const screen = useScreen();
  const showPick = screen.has("pick");
  const setShowPick = (open: boolean) => (open ? screen.open("pick") : screen.close("pick"));
  const today = new Date().toLocaleDateString("ru-RU");
  // Склады СДМ (СГП №2 — только через выдачу со склада и «Возврат СГП №2»)
  const sklady = spravValues("Склады").filter(s => s !== SGP);

  const [head, setHead] = useState(() => ({
    number: doc?.number || `ТР-${String(Math.floor(Math.random() * 900 + 100)).padStart(4, "0")}`,
    date: doc?.date || today,
    zakazchik: doc?.zakazchik ?? "Монетный двор",
    // Отправитель — склад приёмки (СДМ1), получатель — склад выдачи (СДМ2)
    sender: doc?.sender || SDM1,
    receiver: doc?.receiver || SDM2,
    sotrudnik: "Ким Александр Юрьевич",
    shihtaId: doc?.shihtaId ?? "",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [ownProperty, setOwnProperty] = useState(doc?.ownProperty ?? true);
  const [info, setInfo] = useState(doc?.info ?? "");
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Требование_${doc.number}.pdf`)] : []));
  const [positions, setPositions] = useState<TrebPosition[]>(() => doc?.positions ?? []);

  // Остатки склада-отправителя (позиции «На складе» и «Резерв» из обоих учётов)
  const stock = useMemo<StockRow[]>(() => [
    ...gpItems.filter(i => i.sklad === head.sender && canMove(i.status) && i.qty > 0).map(i => ({ id: i.id, src: "gp" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: i.qty, unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem })),
    ...dmItems.filter(i => i.sklad === head.sender && canMove(i.status)).map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem })),
  ], [gpItems, dmItems, head.sender]);

  const itemOf = (p: TrebPosition): GPItem | DMItem | undefined =>
    p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);

  // Шихтовые карты (кроме выполненных) — их зарезервированные позиции на складе-отправителе
  const karty = shihtovyeKarty.filter(k => k.status !== "Выполнена" || k.id === head.shihtaId);
  const kartaLabel = (id: string) => {
    const k = shihtovyeKarty.find(x => x.id === id);
    return k ? `${k.plavkaNo} · ${k.name}` : NO_KARTA;
  };
  const rezervOf = (kartaId: string) => {
    const k = shihtovyeKarty.find(x => x.id === kartaId);
    const nomenkl = new Set((k?.materials ?? []).map(m => m.nomenkl).filter(Boolean));
    return stock.filter(r => nomenkl.has(r.nomenkl) && itemOf({ ...r, issue: 0 })?.status === "Резерв");
  };
  // Выбор шихтовой карты заполняет требование её зарезервированными позициями со склада-отправителя
  // (позиции ранее выбранной карты заменяются)
  const chooseKarta = (id: string) => {
    setHead(x => ({ ...x, shihtaId: id }));
    if (!id) return;
    const rows = rezervOf(id);
    if (rows.length) {
      setPositions(rows.map(r => ({ ...r, issue: r.qty })));
      show(`Добавлены позиции резерва шихтовой карты: ${rows.length}`);
    } else show(`У шихтовой карты нет позиций в резерве на складе «${head.sender}»`);
  };

  // Заказчик и «Собственность заказчика» после выбора позиций берутся из них (из документов приёма)
  // и только для чтения; до выбора позиций — вводятся вручную
  const posItems = positions.map(itemOf).filter((i): i is GPItem | DMItem => !!i?.zakazchik);
  const fromPositions = !posted && posItems.length > 0;
  const zakazchik = fromPositions ? Array.from(new Set(posItems.map(i => i.zakazchik!))).join(", ") : head.zakazchik;
  const isOwn = fromPositions ? posItems.every(i => i.ownProperty) : ownProperty;
  const lockZakazchik = ro || posted || fromPositions;

  // Смена склада-отправителя: позиции другого склада убираются из требования
  const changeSender = (v: string) => {
    setHead(x => ({ ...x, sender: v }));
    setPositions(prev => prev.filter(p => p.sklad === v));
  };

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

  // Количество к перемещению — от 1 до количества изделий; без количества изделий позиция перемещается целиком
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

  // Доля выдаваемой части: при частичной выдаче — по введённому весу остатка на складе
  const share = (p: TrebPosition, v: number | null) => (v == null ? 0 : v * issueShare(p));
  const setRestLig = (id: string, v: string) => setPositions(prev => prev.map(p => (p.id === id ? { ...p, restLig: v.replace(/[^\d.,]/g, "") } : p)));
  // Частичная выдача без корректного веса остатка не оформляется
  const badRest = positions.filter(p => isPartialIssue(p) && !restLigOk(p));
  const restCell = (p: TrebPosition) => isPartialIssue(p) && (
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
      if (head.sender === head.receiver) { show("Склад-отправитель и склад-получатель должны различаться"); return; }
      if (positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = itemOf(p);
        return !it || it.sklad !== head.sender || !canMove(it.status) || it.qty < p.issue;
      });
      if (lacking.length) { show(`Позиции недоступны на складе «${head.sender}»: ${lacking.map(p => p.name).join(", ")}`); return; }
      // Перемещение: меняется только склад — место хранения, статус и прочие атрибуты сохраняются.
      // Резерв шихтовой карты остаётся резервом этой карты; дополнительно добавленные позиции (не из резерва карты)
      // просто встают на склад-получатель «На складе». Шихтовая карта документом не меняется.
      const stamp = Date.now();
      const move = <T extends GPItem | DMItem>(it: T): T => ({ ...it, sklad: head.receiver });
      const partId = (it: { id: string }) => `${it.id}-t${stamp}`;
      const gpTake = new Map(positions.filter(p => p.src === "gp").map(p => [p.id, p.issue]));
      const dmTake = new Map(positions.filter(p => p.src === "dm").map(p => [p.id, p.issue]));
      if (gpTake.size) setGpItems(prev => takeFromStock(prev, gpTake, move, partId, partLigMap(positions)).items);
      if (dmTake.size) setDmItems(prev => takeFromStock(prev, dmTake, move, partId, partLigMap(positions)).items);
    }
    onSave({
      id: doc?.id ?? `sd-${Date.now()}`,
      ...(doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : createdStamp()),
      date: head.date,
      type: DOC_TREBOVANIE,
      number: head.number,
      status,
      sender: head.sender,
      receiver: head.receiver,
      shihtaId: head.shihtaId || undefined,
      zakazchik,
      ownProperty: isOwn,
      info: info.trim() || undefined,
      positions,
    });
  };

  const skladOptions = (v: string) => (sklady.includes(v) ? sklady : [v, ...sklady]);
  const pg = usePaged(sorted, "trebovanie-positions");
  return (
    <Modal
      title={`${DOC_TREBOVANIE}${doc ? ` ${doc.number}` : ""}`}
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
      {posted ? (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Требование оформлено: позиции перемещены со склада «{head.sender}» на склад «{head.receiver}» с сохранением мест хранения и статусов. Состав позиций изменить нельзя.
        </div>
      ) : !ro && (
        <div className="mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2.5">
          При оформлении позиции перемещаются на склад-получатель: место хранения, статус (в т. ч. «Резерв» под шихтовую карту) и остальные атрибуты не меняются. Резерв шихтовой карты остаётся резервом карты; дополнительно добавленные позиции встают на склад-получатель «На складе» — шихтовая карта не меняется.
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {typeSelect}
        <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
        <Field label="Дата документа" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
        <Field label="Заказчик/Организация">
          {lockZakazchik
            ? <Input value={zakazchik} disabled />
            : <Select value={head.zakazchik} options={Array.from(new Set(["", head.zakazchik, ...spravValues("Заказчики / Организации")]))} optionLabel={v => v || "Не указан"} onChange={h("zakazchik")} />}
        </Field>
        <Field label="Отправитель" required={!ro}><Select value={head.sender} options={skladOptions(head.sender)} onChange={changeSender} disabled={lockPos} /></Field>
        <Field label="Получатель" required={!ro}><Select value={head.receiver} options={skladOptions(head.receiver)} onChange={h("receiver")} disabled={lockPos} /></Field>
        <Field label="Шихтовая карта" full>
          <Select
            value={head.shihtaId}
            options={["", ...karty.map(k => k.id)]}
            optionLabel={v => (v ? kartaLabel(v) : NO_KARTA)}
            onChange={chooseKarta}
            disabled={lockPos}
          />
        </Field>
        <Field label="Сотрудник склада-получателя" required={!ro} full><Select value={head.sotrudnik} options={Array.from(new Set([head.sotrudnik, ...spravValues("Подотчётные сотрудники")]))} onChange={h("sotrudnik")} disabled={ro} /></Field>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Собственность заказчика</label>
          <Toggle checked={isOwn} onChange={setOwnProperty} disabled={lockZakazchik} label={isOwn ? "Да" : "Нет"} />
        </div>
        <InfoField value={info} onChange={setInfo} disabled={ro} />
      </div>
      {!lockPos && head.sender === head.receiver && (
        <div className="mb-4 -mt-2 text-xs text-red-600">Склад-отправитель и склад-получатель должны различаться</div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции к перемещению</h3>
          <div className="flex gap-2">
            {!lockPos && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            Список позиций пуст. Выберите шихтовую карту или добавьте позиции со склада «{head.sender}»
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
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              <th className="px-3 py-2 text-left">Статус</th>
              {!lockPos && <th className="w-12"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg.pageItems.map(p => {
                const status = itemOf(p)?.status;
                return (
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
                    {restCell(p)}
                    </td>
                    <td className="px-3 py-2">{p.lig == null ? "—" : share(p, p.lig).toFixed(2)}</td>
                    <td className="px-3 py-2 text-blue-600"><NetAuAg chem={p.chem} net={p.net} metal={p.code} k={issueShare(p)} /></td>
                    <td className="px-3 py-2 text-gray-500">{p.location}</td>
                    <td className="px-3 py-2">{status ? <PosStatusBadge status={status} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>}</td>
                    {!lockPos && <td className="px-3 py-2"><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></td>}
                  </tr>
                );
              })}
              <FillerRows count={pg.fill} cols={10} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{totalQty}</td>
              <td className="px-3 py-2">{totalLig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600">{totalNet.toFixed(2)}</td>
              <td colSpan={lockPos ? 2 : 3}></td>
            </tr></tfoot>
          </table>
          {pg.pager}
        </>)}
      </div>

      {showPick && (
        <StockPickerModal
          qtyInput={r => r.qty > 1}
          qtyLabel="Кол-во к перемещению"
          title={`Добавить позиции со склада «${head.sender}»`}
          rows={stock}
          already={already}
          showWeights
          emptyText={`Нет доступных позиций на складе «${head.sender}»`}
          onClose={() => setShowPick(false)}
          onAdd={addPicked}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
