import React, { useMemo, useState } from "react";
import {
  Btn, Modal, DeleteIcon, EditIcon, useToast, Toast, Field, Input, Select, KlassCode,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp,
  InfoField, PosStatusBadge, probaText,
  NetAuAg, NetAuAgTotal, NET_AU_AG, OborotValue, oborotRowCls, OBOROT_LABEL,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, MovedRecord, spravValues, SGP, PRIHOD_SKLAD, DOC_VOZVRAT_SGP } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow, PickedRow } from "./StockPickerModal";
import { takeFromStock, partLigMap, partNomenklMap, returnToStock } from "../data/stock";
import { useIssuePositions, ensurePartNomenkl } from "./IssueInputs";
import { useUsedNomenkl, nextNomenkl } from "./DMPositionFormModal";
import { useScreen } from "../router";
import { Plus } from "lucide-react";

// ── Возврат СГП №2: возврат позиций со склада СГП №2 на склад СДМ ────────────────
// Поля — как у накладной прихода; отправитель — всегда склад СГП №2, получатель — склад из справочника «Склады»
// (по умолчанию склад приёмки СДМ1). Позиции подбираются со склада СГП №2 с количеством к перемещению.
// При каждом сохранении позиции встают на склад-получатель «На складе» без места хранения («-») — размещаются потом
// через «Изменить место хранения»; заказчик и признак собственности позиций сохраняются.

type VsPosition = VydachaDocPosition;
const NO_LOC = "-";

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
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [info, setInfo] = useState(doc?.info ?? "");
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Возврат СГП №2_${doc.number}.pdf`)] : []));
  const [positions, setPositions] = useState<VsPosition[]>(() => doc?.positions ?? []);

  // Остатки склада СГП №2. Количество к перемещению вводится всегда: позиция без количества изделий
  // (или из одного изделия) — 1 шт.
  const stock = useMemo<StockRow[]>(() => [
    ...gpItems.filter(i => i.sklad === SGP && i.status === "На складе").map(i => ({ id: i.id, src: "gp" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: Math.max(i.qty, 1), unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem })),
    ...dmItems.filter(i => i.sklad === SGP && i.status === "На складе").map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: Math.max(i.qty, 1), unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem, oborot: i.oborot ?? 0 })),
  ], [gpItems, dmItems]);

  const itemOf = (p: VsPosition): GPItem | DMItem | undefined =>
    p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);
  // Текущая запись позиции: после сохранения — запись на складе-получателе (doc.moved), до — запись на СГП №2
  function currentOf(p: VsPosition): GPItem | DMItem | undefined {
    const to = doc?.moved?.find(m => m.src === p.src && m.from === p.id)?.to;
    const list: (GPItem | DMItem)[] = p.src === "gp" ? gpItems : dmItems;
    return (to ? list.find(i => i.id === to) : undefined) ?? list.find(i => i.id === p.id);
  }


  // Количество к возврату (от 1 до количества изделий) и вес возвращаемой части при частичном возврате —
  // вводятся в окне подбора (панель «К выдаче»)
  const iss = useIssuePositions(positions, setPositions);
  const usedNomenkl = useUsedNomenkl();
  // «Изменить» позицию: …/pick-edit/<id> — то же окно подбора с предвыбранной позицией
  const editId = screen.after("pick-edit");
  const editPos = editId ? positions.find(p => p.id === editId) ?? null : null;
  const already = Object.fromEntries(positions.filter(p => p.id !== editPos?.id).map(p => [p.id, p.issue]));
  const closePick = () => (editPos ? screen.close("pick-edit") : setShowPick(false));
  const addPicked = (picked: PickedRow[]) => {
    iss.applyPicked(picked, row => ({ ...row, issue: row.qty }));
    closePick();
    show(editPos ? "Позиция изменена" : `Добавлено позиций: ${picked.length}`);
  };

  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => codeLabel(p.code),
    issue: p => p.issue,
    oborot: p => p.oborot ?? 0,
    lig: p => p.lig ?? 0,
    net: p => p.net ?? 0,
    proba: p => p.proba ?? 0,
    location: p => currentOf(p)?.location ?? p.location,
    status: p => currentOf(p)?.status ?? "",
  });

  // Позиции перемещаются на склад-получатель при каждом сохранении («Сохранить» и «Оформить»).
  // Перед повторным перемещением отменяется перемещение прошлого сохранения (doc.moved): записи возвращаются
  // на СГП №2 и объединяются с остатком, затем позиции перемещаются заново по текущему составу документа.
  // Запись, которую на складе-получателе уже зарезервировали или выдали, не возвращается — её позиция не меняется.
  const save = (status: DocStatus) => {
    if (posted) return;
    const err = iss.validate(true, "к возврату");
    if (err) { show(err); return; }
    if (status === "Оформлено" && positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
    const kept: MovedRecord[] = [];
    const undo = <T extends GPItem | DMItem>(items: T[], src: MovedRecord["src"]): T[] => {
      let out = items;
      for (const m of (doc?.moved ?? []).filter(x => x.src === src)) {
        const it = out.find(i => i.id === m.to);
        if (!it || it.sklad === SGP) continue;
        if (it.status !== "На складе") { kept.push(m); continue; }
        out = out.map(i => (i.id === m.to ? { ...i, sklad: SGP, location: NO_LOC } : i));
        if (m.to !== m.from) out = returnToStock(out, new Set([m.to]), "На складе");
      }
      return out;
    };
    const gp0 = undo(gpItems, "gp");
    const dm0 = undo(dmItems, "dm");
    const locked = new Set(kept.map(m => m.from));
    // Номер возвращаемой части сохраняется между сохранениями (откат выше объединил часть с остатком);
    // если номер заняли — следующий свободный
    const fixed = ensurePartNomenkl(positions, usedNomenkl(doc?.id, [...gp0, ...dm0]), nextNomenkl);
    if (fixed.changed.length) show(`Номенкл. № части изменён. ${fixed.changed.join("; ")}`);
    const finalPositions = fixed.positions;
    const active = finalPositions.filter(p => !locked.has(p.id));
    const lacking = active.filter(p => {
      const it = p.src === "gp" ? gp0.find(i => i.id === p.id) : dm0.find(i => i.id === p.id);
      return !it || it.sklad !== SGP || it.status !== "На складе" || Math.max(it.qty, 1) < p.issue;
    });
    if (lacking.length) { show(`Позиции недоступны на складе «${SGP}»: ${lacking.map(p => p.name).join(", ")}`); return; }
    const stamp = Date.now();
    const move = <T extends GPItem | DMItem>(it: T): T => ({ ...it, sklad: head.receiver, status: "На складе", location: NO_LOC });
    const partId = (it: { id: string }) => `${it.id}-vs${stamp}`;
    const gpAct = active.filter(p => p.src === "gp");
    const dmAct = active.filter(p => p.src === "dm");
    const gpRes = takeFromStock(gp0, new Map(gpAct.map(p => [p.id, p.issue])), move, partId, partLigMap(gpAct), partNomenklMap(gpAct));
    const dmRes = takeFromStock(dm0, new Map(dmAct.map(p => [p.id, p.issue])), move, partId, partLigMap(dmAct), partNomenklMap(dmAct));
    setGpItems(gpRes.items);
    setDmItems(dmRes.items);
    const moved: MovedRecord[] = [
      ...kept,
      ...[...gpRes.taken].map(([from, to]) => ({ src: "gp" as const, from, to })),
      ...[...dmRes.taken].map(([from, to]) => ({ src: "dm" as const, from, to })),
    ];
    onSave({
      moved,
      id: doc?.id ?? `sd-${Date.now()}`,
      ...(doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : createdStamp()),
      date: head.date,
      type: DOC_VOZVRAT_SGP,
      number: head.number,
      status,
      sender: SGP,
      receiver: head.receiver,
      info: info.trim() || undefined,
      positions: finalPositions,
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
      {posted ? (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Документ оформлен: позиции возвращены со склада «{SGP}» на склад «{head.receiver}» без места хранения. Редактирование документа недоступно.
        </div>
      ) : !ro && (
        <div className="mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2.5">
          Позиции перемещаются на склад «{head.receiver}» при каждом сохранении документа. После «Оформить» документ закрывается для редактирования.
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
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="issue" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{NET_AU_AG}</SortTh>
              <SortTh sortKey="oborot" sort={sort} onSort={toggleSort} className="px-3 py-2">{OBOROT_LABEL}</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort} className="px-3 py-2">Статус</SortTh>
              {!lockPos && <th className="w-20"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg.pageItems.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${oborotRowCls(p.oborot, p.code)}`}>
                  <td className="px-3 py-2 text-gray-500 align-top">{iss.nomenklCell(p)}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{codeLabel(p.code)}</td>
                  <td className="px-3 py-2 align-top">{iss.qtyCell(p)}</td>
                  <td className="px-3 py-2">{probaText(p.proba)}</td>
                  <td className="px-3 py-2 align-top">{iss.ligCell(p)}</td>
                  <td className="px-3 py-2 text-blue-600"><NetAuAg chem={p.chem} k={iss.line(p).share} /></td>
                  <td className="px-3 py-2"><OborotValue value={p.oborot} code={p.code} /></td>
                  <td className="px-3 py-2 text-gray-500">{currentOf(p)?.location ?? p.location}</td>
                  <td className="px-3 py-2">{(() => { const st = currentOf(p)?.status; return st ? <PosStatusBadge status={st} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>; })()}</td>
                  {!lockPos && <td className="px-3 py-2"><div className="flex items-center gap-1"><EditIcon onClick={() => screen.open("pick-edit", p.id)} /><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></div></td>}
                </tr>
              ))}
              <FillerRows count={pg.fill} cols={12} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{iss.totals.qty}</td>
              <td></td>
              <td className="px-3 py-2">{iss.totals.lig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600"><NetAuAgTotal items={positions.map(p => ({ chem: p.chem, k: iss.line(p).share }))} /></td>
              <td colSpan={lockPos ? 3 : 4}></td>
            </tr></tfoot>
          </table>
          {pg.pager}
        </>)}
      </div>

      {(showPick || editPos) && (
        <StockPickerModal
          issue={{ usedNomenkl: [...usedNomenkl(doc?.id), ...iss.partNomenkls(editPos?.id)], initial: editPos ? { [editPos.id]: iss.draftOf(editPos) } : undefined }}
          title={`Добавить позиции со склада «${SGP}»`}
          rows={iss.pickerRows(stock, editPos)}
          already={already}
          showWeights
          emptyText={`Нет позиций на складе «${SGP}»`}
          onClose={closePick}
          onAdd={addPicked}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
