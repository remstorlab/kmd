import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Btn, Modal, DeleteIcon, EditIcon, useToast, Toast, Field, Input, KlassCode,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp, PosStatusBadge, probaText,
  InfoField,
  NetAuAg, NetAuAgTotal, NET_AU_AG, OborotValue, oborotRowCls, OBOROT_LABEL,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, PrikazPlavka, SDM1, SDM2, DOC_TREBOVANIE, SH_READY_TREB, docPrikazIds } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow, PickedRow } from "./StockPickerModal";
import { takeFromStock, partLigMap, partNomenklMap } from "../data/stock";
import { markIssuedElsewhere, prikazStatus, refreshReady } from "../data/shihta";
import { useIssuePositions, ensurePartNomenkl, RezervWarning } from "./IssueInputs";
import { useUsedNomenkl, nextNomenkl } from "./DMPositionFormModal";
import { useScreen } from "../router";
import DocLocationModal, { newLocOf, applyNewLocations, LocText } from "./DocLocationModal";
import { Plus, X, ChevronDown } from "lucide-react";

// ── Требование: перемещение позиций со склада на склад (СДМ1 → СДМ2) ─────────
// Позиции, принятые на склад приёмки (СДМ1) и зарезервированные под шихтовую карту, по требованию передаются
// на склад выдачи (СДМ2), откуда выдаются на плавку. Перемещение меняет только склад: место хранения, статус
// (в т. ч. «Резерв» под шихтовую карту) и остальные атрибуты сохраняются. Склады меняются только при оформлении;
// при частичном перемещении запись делится (data/stock.ts) — остаток остаётся на складе-отправителе.
// Приказы на плавку («Готово для Требования», можно несколько — все / ни одного): выбор добавляет все позиции резерва
// всех их шихтовых карт со склада-отправителя (по шихте — poShihte, целиком; не удаляются и не редактируются;
// снятие приказа убирает его позиции).
// «Добавить позицию» — дополнительные позиции склада-отправителя «На складе» (резерв ставится только шихтовой картой,
// поэтому позиции в резерве вручную не подбираются). «Сохранить» — позиции сохраняются в документе, склады не меняются;
// «Оформить» — все позиции перемещаются на склад-получатель на «Новое размещение» (по умолчанию — то же место, что
// текущее; меняется по карандашу позиции, см. DocLocationModal), статусы карт пересчитываются по складам позиций
// (все на СДМ2 — «Готово для плавки»). Удаление позиции из документа или неоформленного требования позиции не меняет.

type TrebPosition = VydachaDocPosition;
// Переместить можно позицию на складе или в резерве (резерв — только позиции по шихте)
const canMove = (status: string) => status === "На складе" || status === "Резерв";

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
  const { gpItems, dmItems, setGpItems, setDmItems, shihtovyeKarty, setShihtovyeKarty, shihtaPrikazy, skladDocs, alloyGrades } = useApp();
  const createdStamp = useCreatedStamp();
  const { toast, show, clear } = useToast();
  // Вложенный экран: …/pick (подбор со склада-отправителя)
  const screen = useScreen();
  const showPick = screen.has("pick");
  const setShowPick = (open: boolean) => (open ? screen.open("pick") : screen.close("pick"));
  const today = new Date().toLocaleDateString("ru-RU");



  const [head, setHead] = useState(() => ({
    number: doc?.number || `ТР-${String(Math.floor(Math.random() * 900 + 100)).padStart(4, "0")}`,
    date: doc?.date || today,
    // Отправитель — склад приёмки (СДМ1), получатель — склад выдачи (СДМ2); не редактируются
    sender: SDM1,
    receiver: SDM2,
  }));
  // Приказы на плавку (у старых документов — один приказ или приказ шихтовой карты)
  const [prikazIds, setPrikazIds] = useState<string[]>(() => {
    if (!doc) return [];
    const ids = docPrikazIds(doc);
    const old = shihtovyeKarty.find(k => k.id === doc.shihtaId)?.prikazId;
    return ids.length ? ids : old ? [old] : [];
  });
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [info, setInfo] = useState(doc?.info ?? "");
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Требование_${doc.number}.pdf`)] : []));
  const [positions, setPositions] = useState<TrebPosition[]>(() => doc?.positions ?? []);

  // Остатки склада-отправителя (позиции «На складе» и «Резерв» из обоих учётов). Количество к перемещению
  // вводится всегда (как в «Возврате СГП №2»): позиция без количества изделий (или из одного изделия) — 1 шт.
  const stock = useMemo<StockRow[]>(() => [
    ...gpItems.filter(i => i.sklad === head.sender && canMove(i.status) && i.qty > 0).map(i => ({ id: i.id, src: "gp" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: i.qty, unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem })),
    ...dmItems.filter(i => i.sklad === head.sender && canMove(i.status)).map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: Math.max(i.qty, 1), unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem, oborot: i.oborot ?? 0 })),
  ], [gpItems, dmItems, head.sender]);

  const itemOf = (p: TrebPosition): GPItem | DMItem | undefined =>
    p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);

  // Ручной подбор: только позиции «На складе» (резерв ставится только по шихтовой карте)
  const pickStock = useMemo(() => stock.filter(r => itemOf({ ...r, issue: 0 })?.status !== "Резерв"), [stock]);

  // Приказы на плавку: выбрать можно приказ «Готово для Требования» (есть позиции на СДМ1), не выбранный в другом
  // неоформленном требовании (такие видны в списке с пометкой). После оформления требования приказ — «Готово для
  // плавки» и в списке не показывается.
  const kartyOf = (id: string) => shihtovyeKarty.filter(k => k.prikazId === id && k.status !== "Выполнена");
  const statusOf = (p: PrikazPlavka) => prikazStatus(shihtovyeKarty.filter(k => k.prikazId === p.id));
  const takenBy = (id: string) => skladDocs.find(d => d.id !== doc?.id && d.type === DOC_TREBOVANIE && d.status !== "Оформлено" && docPrikazIds(d).includes(id));
  // Варианты: приказы «Готово для Требования» и уже выбранные; приказ, выбранный в другом неоформленном требовании,
  // показывается с пометкой и не выбирается
  const prikazy = shihtaPrikazy.filter(p => prikazIds.includes(p.id) || statusOf(p) === SH_READY_TREB);
  const byPrikaz = prikazIds.length > 0;
  const selPrikazy = prikazIds.map(id => shihtaPrikazy.find(p => p.id === id)).filter((p): p is PrikazPlavka => !!p);
  // Препятствия: приказ выбран в другом неоформленном требовании (и для сохранения), не в статусе
  // «Готово для Требования» (для оформления)
  const conflicts = selPrikazy.flatMap(p => { const d = takenBy(p.id); return d ? [`Приказ № ${p.number} уже выбран в требовании № ${d.number}`] : []; });
  const prikazConflict = conflicts.length ? conflicts.join("; ") : null;
  const notReady = selPrikazy.filter(p => statusOf(p) !== SH_READY_TREB)
    .map(p => `Приказ № ${p.number} в статусе «${statusOf(p)}» — перемещаются позиции приказа «${SH_READY_TREB}»`);
  const prikazBlock = prikazConflict ?? (notReady.length ? notReady.join("; ") : null);
  // Подсказка к приказу (метка в поле и строка списка): все поля приказа
  const prikazHint = (p: PrikazPlavka) => {
    const karty = kartyOf(p.id);
    const grade = alloyGrades.find(g => g.id === p.alloyId);
    return [
      `Приказ на плавку № ${p.number} от ${p.date}`,
      `Наименование: ${p.name}`,
      `Марка сплава: ${grade ? `${grade.name} (${grade.nd})` : "—"}`,
      `Назначение слитков: ${p.naznachenie || "—"}`,
      `Статус: ${statusOf(p)}`,
      `Шихтовые карты: ${karty.length ? karty.map(k => `плавка № ${k.plavkaNo}`).join(", ") : "—"}`,
      ...(p.note ? [`Примечание: ${p.note}`] : []),
      `Создан: ${p.createdBy}`,
    ].join("\n");
  };
  const rezervOf = (ids: string[]) => {
    const nomenkl = new Set(ids.flatMap(id => kartyOf(id)).flatMap(k => k.materials.map(m => m.nomenkl)).filter(Boolean));
    return stock.filter(r => nomenkl.has(r.nomenkl) && itemOf({ ...r, issue: 0 })?.status === "Резерв");
  };
  // Позиции по шихте: резерв всех карт выбранных приказов со склада-отправителя, целиком
  const shihtaRows = (ids: string[]): TrebPosition[] => rezervOf(ids).map(r => ({ ...r, issue: r.qty, poShihte: true }));
  // Выбор приказов: позиции по шихте пересобираются по выбранным приказам (добавленные вручную остаются);
  // ни одного приказа — позиции по шихте удаляются
  const choosePrikazy = (ids: string[]) => {
    setPrikazIds(ids);
    const rows = shihtaRows(ids);
    const rIds = new Set(rows.map(r => r.id));
    setPositions(prev => [...rows.map(r => ({ ...r, toLocation: prev.find(p => p.id === r.id)?.toLocation })), ...prev.filter(p => !p.poShihte && !rIds.has(p.id))]);
    const added = ids.filter(id => !prikazIds.includes(id));
    if (added.length === 1 && rezervOf(added).length === 0) show(`У шихтовых карт приказа нет позиций в резерве на складе «${head.sender}»`);
  };



  // Количество к перемещению (от 1 до количества изделий) и вес перемещаемой части при частичном перемещении —
  // вводятся в окне подбора (панель «К выдаче»)
  const iss = useIssuePositions(positions, setPositions);
  const usedNomenkl = useUsedNomenkl();
  // «Изменить» позицию: …/pick-edit/<id> — то же окно подбора с предвыбранной позицией
  const editId = screen.after("pick-edit");
  // Позиции по шихте не редактируются
  const editPos = editId ? positions.find(p => p.id === editId && !p.poShihte) ?? null : null;
  const already = Object.fromEntries(positions.filter(p => p.id !== editPos?.id).map(p => [p.id, p.issue]));
  const closePick = () => (editPos ? screen.close("pick-edit") : setShowPick(false));
  const addPicked = (picked: PickedRow[]) => {
    iss.applyPicked(picked, row => ({ ...row, issue: row.qty }));
    closePick();
    show(editPos ? "Позиция изменена" : `Добавлено позиций: ${picked.length}`);
  };

  // Позиции из резерва. Перемещение целиком (в т. ч. по приказу на плавку) меняет только склад: номенкл. № и резерв
  // сохраняются — карта остаётся действительной, в её строках обновляется склад (иначе приказ после требования
  // не выдать на плавку). Частичное перемещение делит запись (часть — с новым номером): шихтовые карты, которые
  // резервируют такие позиции (кроме выполненных), при оформлении возвращаются в «На редактировании» — как при выдаче.
  const rezPos = positions.filter(p => itemOf(p)?.status === "Резерв");
  const rezMovedWhole = new Set(rezPos.filter(p => !iss.line(p).partial).map(p => p.nomenkl));
  const rezNomenkl = new Set(rezPos.filter(p => iss.line(p).partial).map(p => p.nomenkl));
  const affectedKarty = rezNomenkl.size
    ? shihtovyeKarty.filter(k => k.status !== "Выполнена" && k.materials.some(m => rezNomenkl.has(m.nomenkl)))
    : [];

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
    location: p => p.location,
    toLocation: p => newLocOf(p),
    proba: p => p.proba ?? 0,
    status: p => itemOf(p)?.status ?? "",
  });

  const save = (status: DocStatus) => {
    const docId = doc?.id ?? `sd-${Date.now()}`;
    let finalPositions = positions;
    const err = iss.validate(status === "Оформлено" && !posted, "к перемещению");
    if (err) { show(err); return; }
    if (status === "Оформлено" && !posted) {
      if (prikazBlock) { show(prikazBlock); return; }
      if (byPrikaz) {
        // Состав резерва приказа на складе-отправителе мог измениться — по шихте перемещается весь резерв, целиком
        const rows = shihtaRows(prikazIds);
        const cur = positions.filter(p => p.poShihte);
        const ids = new Set(cur.map(p => p.id));
        if (rows.length !== cur.length || rows.some(r => !ids.has(r.id))) {
          const rIds = new Set(rows.map(r => r.id));
          setPositions(prev => [...rows.map(r => ({ ...r, toLocation: prev.find(p => p.id === r.id)?.toLocation })), ...prev.filter(p => !p.poShihte && !rIds.has(p.id))]);
          show("Резерв шихтовых карт приказа изменился — позиции обновлены, проверьте и оформите снова");
          return;
        }
      }
      if (positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = itemOf(p);
        return !it || it.sklad !== head.sender || !canMove(it.status) || Math.max(it.qty, 1) < p.issue;
      });
      if (lacking.length) { show(`Позиции недоступны на складе «${head.sender}»: ${lacking.map(p => p.name).join(", ")}`); return; }
      // Перемещение: склад-получатель и «Новое размещение» позиции; статус и прочие атрибуты сохраняются.
      // При частичном перемещении перемещаемая часть получает новый номенкл. № (если номер заняли — следующий
      // свободный). Позиции из резерва, перемещённые частично: шихтовые карты, которые их резервируют (кроме выполненных), возвращаются
      // в «На редактировании» с пометкой о выданных позициях; перемещённые целиком — остаются в резерве карты.
      const fixed = ensurePartNomenkl(positions, usedNomenkl(doc?.id), nextNomenkl);
      if (fixed.changed.length) show(`Номенкл. № части изменён. ${fixed.changed.join("; ")}`);
      finalPositions = fixed.positions;
      const stamp = Date.now();
      const move = <T extends GPItem | DMItem>(it: T): T => ({ ...it, sklad: head.receiver });
      const partId = (it: { id: string }) => `${it.id}-t${stamp}`;
      const gpPart = finalPositions.filter(p => p.src === "gp");
      const dmPart = finalPositions.filter(p => p.src === "dm");
      const gpTake = new Map(gpPart.map(p => [p.id, p.issue]));
      const dmTake = new Map(dmPart.map(p => [p.id, p.issue]));
      if (gpTake.size) setGpItems(prev => { const r = takeFromStock(prev, gpTake, move, partId, partLigMap(gpPart), partNomenklMap(gpPart)); return applyNewLocations(r.items, r.taken, gpPart); });
      // Склад ДМ после перемещения — по нему пересчитываются статусы карт
      const dmRes = dmTake.size ? takeFromStock(dmItems, dmTake, move, partId, partLigMap(dmPart), partNomenklMap(dmPart)) : null;
      const dmNext = dmRes ? applyNewLocations(dmRes.items, dmRes.taken, dmPart) : dmItems;
      if (dmTake.size) setDmItems(dmNext);
      const ids = new Set(affectedKarty.map(k => k.id));
      setShihtovyeKarty(prev => refreshReady(prev.map(k => {
        if (ids.has(k.id)) return markIssuedElsewhere(k, rezNomenkl, `${DOC_TREBOVANIE} № ${head.number}`);
        // Резерв перемещён целиком — в строках карты новый склад позиции
        if (k.status === "Выполнена" || !k.materials.some(m => rezMovedWhole.has(m.nomenkl))) return k;
        return { ...k, materials: k.materials.map(m => (rezMovedWhole.has(m.nomenkl) ? { ...m, sklad: head.receiver } : m)) };
      }), dmNext));
    } else if (status === "В работе" && prikazConflict) { show(prikazConflict); return; }
    onSave({
      id: docId,
      ...(doc?.createdAt ? { createdAt: doc.createdAt, createdBy: doc.createdBy } : createdStamp()),
      date: head.date,
      type: DOC_TREBOVANIE,
      number: head.number,
      status,
      sender: head.sender,
      receiver: head.receiver,
      prikazIds: prikazIds.length ? prikazIds : undefined,
      info: info.trim() || undefined,
      positions: finalPositions,
    });
  };

  const pg = usePaged(sorted, "trebovanie-positions");
  // Колонка действий: карандаш — «Изменение места хранения» (у всех позиций), удаление — у добавленных вручную
  const actCol = !lockPos && positions.length > 0;
  const locId = screen.after("mesto");
  const locPos = locId ? positions.find(p => p.id === locId) ?? null : null;
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
      {!posted && !ro && <RezervWarning karty={affectedKarty} />}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {typeSelect}
        <Field label="Номер" required={!ro}><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
        <Field label="Дата документа" required={!ro}><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
        <Field label="Отправитель"><Input value={head.sender} disabled /></Field>
        <Field label="Получатель"><Input value={head.receiver} disabled /></Field>
        <Field label="Приказ на плавку (все шихтовые карты)" full>
          <PrikazMultiSelect
            values={prikazIds}
            options={prikazy.map(p => ({
              id: p.id, number: p.number, date: p.date, name: p.name,
              hint: prikazHint(p),
              busy: takenBy(p.id)?.number,
            }))}
            onChange={choosePrikazy}
            disabled={lockPos}
          />
          {!lockPos && prikazBlock && <div className="text-xs text-red-600 mt-1">{prikazBlock}</div>}
        </Field>
        <InfoField value={info} onChange={setInfo} disabled={ro} />
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции к перемещению</h3>
          <div className="flex gap-2">
            {!lockPos && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
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
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код материала</SortTh>
              <SortTh sortKey="issue" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
              <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{NET_AU_AG}</SortTh>
              <SortTh sortKey="oborot" sort={sort} onSort={toggleSort} className="px-3 py-2">{OBOROT_LABEL}</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Текущее размещение</SortTh>
              <SortTh sortKey="toLocation" sort={sort} onSort={toggleSort} className="px-3 py-2">Новое размещение</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort} className="px-3 py-2">Статус</SortTh>
              {actCol && <th className="w-20"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pg.pageItems.map(p => {
                const status = itemOf(p)?.status;
                return (
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
                    <td className="px-3 py-2"><LocText sklad={posted ? head.sender : itemOf(p)?.sklad ?? p.sklad ?? head.sender} location={p.location} /></td>
                    <td className="px-3 py-2"><LocText sklad={head.receiver} location={newLocOf(p)} /></td>
                    <td className="px-3 py-2">{status ? <PosStatusBadge status={status} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>}</td>
                    {/* Карандаш — новое размещение; позиции по шихте не удаляются (снятие приказа убирает их) */}
                    {actCol && <td className="px-3 py-2"><div className="flex items-center gap-1">
                      <EditIcon title="Изменить место хранения" onClick={() => screen.open("mesto", p.id)} />
                      {!p.poShihte && <DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} />}
                    </div></td>}
                  </tr>
                );
              })}
              <FillerRows count={pg.fill} cols={13} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{iss.totals.qty}</td>
              <td></td>
              <td className="px-3 py-2">{iss.totals.lig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600"><NetAuAgTotal items={positions.map(p => ({ chem: p.chem, k: iss.line(p).share }))} /></td>
              <td colSpan={actCol ? 5 : 4}></td>
            </tr></tfoot>
          </table>
          {pg.pager}
        </>)}
      </div>

      {(showPick || editPos) && (
        <StockPickerModal
          issue={{ usedNomenkl: [...usedNomenkl(doc?.id), ...iss.partNomenkls(editPos?.id)], initial: editPos ? { [editPos.id]: iss.draftOf(editPos) } : undefined }}
          title={`Добавить позиции со склада «${head.sender}»`}
          rows={iss.pickerRows(pickStock, editPos)}
          already={already}
          showWeights
          emptyText={`Нет доступных позиций на складе «${head.sender}»`}
          onClose={closePick}
          onAdd={addPicked}
        />
      )}
      {locPos && !lockPos && !editPos && (
        <DocLocationModal
          position={locPos}
          fromSklad={itemOf(locPos)?.sklad ?? locPos.sklad ?? head.sender}
          toSklad={head.receiver}
          onClose={() => screen.close("mesto")}
          onSave={loc => { setPositions(prev => prev.map(x => (x.id === locPos.id ? { ...x, toLocation: loc } : x))); screen.close("mesto"); show(`Новое размещение: ${loc}`); }}
          onEditQty={locPos.poShihte ? undefined : () => screen.open("pick-edit", locPos.id)}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Множественный выбор приказов на плавку ──
// В поле — выбранные приказы метками «№ … от …» с крестиком (убрать из выбора); при наведении на метку — подсказка
// с полными данными приказа (наименование, марка сплава, назначение слитков, плавки, примечание). Пусто — «Не выбрано».
// Список: «Выбрать все» / «Снять все», строка приказа — номер, дата и наименование. Приказ, выбранный в другом
// неоформленном требовании, недоступен — с пометкой.
interface PrikazOption { id: string; number: string; date: string; name: string; hint: string; busy?: string }

function PrikazMultiSelect({ options, values, onChange, disabled = false }: {
  options: PrikazOption[]; values: string[]; onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const update = () => boxRef.current && setRect(boxRef.current.getBoundingClientRect());
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!boxRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const free = options.filter(o => !o.busy);
  const allOn = free.length > 0 && free.every(o => values.includes(o.id));
  const toggle = (id: string) => onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  const sel = values.map(id => options.find(o => o.id === id)).filter((o): o is PrikazOption => !!o);

  return (
    <>
      <div
        ref={boxRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(o => !o); } }}
        className={`w-full min-h-[38px] flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? "bg-gray-50 cursor-default" : "bg-white cursor-pointer"}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {sel.length === 0 && <span className="px-1 text-gray-400">Не выбрано</span>}
          {sel.map(o => (
            <span key={o.id} title={o.hint}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-800 whitespace-nowrap">
              № {o.number} от {o.date}
              {!disabled && (
                <button type="button" onClick={e => { e.stopPropagation(); toggle(o.id); }} className="text-blue-400 hover:text-red-600" title="Убрать приказ — его позиции удаляются из требования">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
      </div>
      {open && rect && createPortal(
        <div
          ref={listRef}
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 480), maxWidth: "calc(100vw - 32px)", zIndex: 1000 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg text-sm"
        >
          <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" className="accent-blue-600" checked={allOn} disabled={free.length === 0}
                onChange={() => onChange(allOn ? [] : free.map(o => o.id))} />
              Выбрать все
            </label>
            <button type="button" className="ml-auto text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline" disabled={values.length === 0} onClick={() => onChange([])}>Снять все</button>
          </div>
          <div className="max-h-72 overflow-auto py-1">
            {options.length === 0 && <div className="px-3 py-3 text-gray-400">Нет приказов «Готово для Требования»</div>}
            {options.map(o => (
              <label key={o.id} title={o.hint} className={`flex items-start gap-2 px-3 py-2 ${o.busy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-gray-50"}`}>
                <input type="checkbox" className="accent-blue-600 mt-0.5" checked={values.includes(o.id)} disabled={!!o.busy} onChange={() => toggle(o.id)} />
                <span className="min-w-0 break-words">
                  <span className="font-medium text-gray-900">№ {o.number} от {o.date}</span>
                  <span className="text-gray-600"> · {o.name}</span>
                  {o.busy && <span className="block text-xs text-red-600">выбран в требовании № {o.busy}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
