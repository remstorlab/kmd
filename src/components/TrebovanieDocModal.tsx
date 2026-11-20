import React, { useMemo, useState } from "react";
import {
  Btn, Modal, DeleteIcon, EditIcon, useToast, Toast, Field, Input, Select, KlassCode, Toggle,
  MultiFileUpload, SortTh, useSort, useMaterialCodeLabel, usePaged, FillerRows, useCreatedStamp, PosStatusBadge, probaText,
  InfoField,
  NetAuAg, NetAuAgTotal, NET_AU_AG, OborotValue, oborotRowCls, OBOROT_LABEL,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, PrikazPlavka, spravValues, SDM1, SDM2, SGP, DOC_TREBOVANIE } from "../data/mock";
import { useApp } from "../store/AppContext";
import StockPickerModal, { StockRow, PickedRow } from "./StockPickerModal";
import { takeFromStock, partLigMap, partNomenklMap } from "../data/stock";
import { markIssuedElsewhere, prikazStatus } from "../data/shihta";
import { useIssuePositions, ensurePartNomenkl, RezervWarning } from "./IssueInputs";
import { useUsedNomenkl, nextNomenkl } from "./DMPositionFormModal";
import { useScreen } from "../router";
import { Plus } from "lucide-react";

// ── Требование: перемещение позиций со склада на склад (СДМ1 → СДМ2) ─────────
// Позиции, принятые на склад приёмки (СДМ1) и зарезервированные под шихтовую карту, по требованию передаются
// на склад выдачи (СДМ2), откуда выдаются на плавку. Перемещение меняет только склад: место хранения, статус
// (в т. ч. «Резерв» под шихтовую карту) и остальные атрибуты сохраняются. Склады меняются только при оформлении;
// при частичном перемещении запись делится (data/stock.ts) — остаток остаётся на складе-отправителе.
// По приказу на плавку («Новая») перемещается сразу весь резерв его карт (целиком, состав не правится); после
// оформления карты приказа получают отметку требования (karta.trebovanie), приказ — «Перемещено на СДМ №2»: выдаётся
// на плавку и в новом требовании не выбирается. Если часть карт уже перемещена, приказ «Новая» — новое требование
// перемещает оставшиеся на складе-отправителе позиции.

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
  const { gpItems, dmItems, setGpItems, setDmItems, shihtovyeKarty, setShihtovyeKarty, shihtaPrikazy, skladDocs } = useApp();
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
    // Приказ на плавку (у старых документов — приказ шихтовой карты)
    prikazId: doc?.prikazId ?? shihtovyeKarty.find(k => k.id === doc?.shihtaId)?.prikazId ?? "",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [ownProperty, setOwnProperty] = useState(doc?.ownProperty ?? true);
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

  // Приказы на плавку: перемещаются зарезервированные позиции всех их шихтовых карт — сразу все, целиком.
  // Выбрать можно оформленный приказ («Новая»), который ещё не перемещён (после оформления требования приказ —
  // «Перемещено на СДМ №2») и не выбран в другом неоформленном требовании.
  const kartyOf = (id: string) => shihtovyeKarty.filter(k => k.prikazId === id && k.status !== "Выполнена");
  const statusOf = (p: PrikazPlavka) => prikazStatus(shihtovyeKarty.filter(k => k.prikazId === p.id));
  const takenBy = (id: string) => skladDocs.find(d => d.id !== doc?.id && d.type === DOC_TREBOVANIE && d.status !== "Оформлено" && d.prikazId === id);
  const prikazy = shihtaPrikazy.filter(p => p.id === head.prikazId || (statusOf(p) === "Новая" && !takenBy(p.id)));
  const byPrikaz = !!head.prikazId;
  // Препятствия для приказа: выбран в другом неоформленном требовании (и для сохранения), не оформлен или уже
  // перемещён (для оформления)
  const selPrikaz = shihtaPrikazy.find(p => p.id === head.prikazId);
  const conflict = byPrikaz ? takenBy(head.prikazId) : undefined;
  const prikazConflict = conflict ? `Приказ № ${selPrikaz?.number ?? ""} уже выбран в требовании № ${conflict.number}` : null;
  const prikazBlock = prikazConflict ?? (selPrikaz && statusOf(selPrikaz) !== "Новая"
    ? `Приказ № ${selPrikaz.number} в статусе «${statusOf(selPrikaz)}» — перемещаются позиции оформленного приказа («Новая»)`
    : null);
  const prikazLabel = (id: string) => {
    const p = shihtaPrikazy.find(x => x.id === id);
    if (!p) return NO_KARTA;
    const pl = kartyOf(id).map(k => k.plavkaNo);
    return `Приказ № ${p.number} от ${p.date} · ${p.name}${pl.length ? ` (ШК плавок № ${pl.join(", ")})` : ""}`;
  };
  const rezervOf = (prikazId: string) => {
    const nomenkl = new Set(kartyOf(prikazId).flatMap(k => k.materials.map(m => m.nomenkl)).filter(Boolean));
    return stock.filter(r => nomenkl.has(r.nomenkl) && itemOf({ ...r, issue: 0 })?.status === "Резерв");
  };
  // Выбор приказа заполняет требование зарезервированными позициями всех его шихтовых карт со склада-отправителя
  // (позиции целиком; позиции ранее выбранного приказа заменяются)
  const choosePrikaz = (id: string) => {
    setHead(x => ({ ...x, prikazId: id }));
    // Приказ снят — позиции приказа убираются, требование заполняется вручную
    if (!id) { setPositions([]); return; }
    const rows = rezervOf(id);
    if (rows.length) {
      setPositions(rows.map(r => ({ ...r, issue: r.qty })));
      show(`Добавлены позиции резерва шихтовых карт приказа (${kartyOf(id).length} карт): ${rows.length}`);
    } else show(`У шихтовых карт приказа нет позиций в резерве на складе «${head.sender}»`);
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

  // Количество к перемещению (от 1 до количества изделий) и вес перемещаемой части при частичном перемещении —
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
    proba: p => p.proba ?? 0,
    status: p => itemOf(p)?.status ?? "",
  });

  const save = (status: DocStatus) => {
    const docId = doc?.id ?? `sd-${Date.now()}`;
    let finalPositions = positions;
    const err = iss.validate(status === "Оформлено" && !posted, "к перемещению");
    if (err) { show(err); return; }
    if (status === "Оформлено" && !posted) {
      if (head.sender === head.receiver) { show("Склад-отправитель и склад-получатель должны различаться"); return; }
      if (prikazBlock) { show(prikazBlock); return; }
      if (byPrikaz) {
        // Состав резерва приказа на складе-отправителе мог измениться — требование перемещает его целиком
        const rows = rezervOf(head.prikazId);
        const ids = new Set(positions.map(p => p.id));
        if (rows.length !== positions.length || rows.some(r => !ids.has(r.id))) {
          setPositions(rows.map(r => ({ ...r, issue: r.qty })));
          show("Резерв шихтовых карт приказа изменился — позиции обновлены, проверьте и оформите снова");
          return;
        }
      }
      // По приказу без позиций на складе-отправителе (резерв уже на складе-получателе) требование только отмечает приказ
      if (positions.length === 0 && !byPrikaz) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = itemOf(p);
        return !it || it.sklad !== head.sender || !canMove(it.status) || Math.max(it.qty, 1) < p.issue;
      });
      if (lacking.length) { show(`Позиции недоступны на складе «${head.sender}»: ${lacking.map(p => p.name).join(", ")}`); return; }
      // Перемещение: меняется только склад — место хранения, статус и прочие атрибуты сохраняются.
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
      if (gpTake.size) setGpItems(prev => takeFromStock(prev, gpTake, move, partId, partLigMap(gpPart), partNomenklMap(gpPart)).items);
      if (dmTake.size) setDmItems(prev => takeFromStock(prev, dmTake, move, partId, partLigMap(dmPart), partNomenklMap(dmPart)).items);
      const ids = new Set(affectedKarty.map(k => k.id));
      if (ids.size || rezMovedWhole.size) setShihtovyeKarty(prev => prev.map(k => {
        if (ids.has(k.id)) return markIssuedElsewhere(k, rezNomenkl, `${DOC_TREBOVANIE} № ${head.number}`);
        // Резерв перемещён целиком — в строках карты новый склад позиции
        if (k.status === "Выполнена" || !k.materials.some(m => rezMovedWhole.has(m.nomenkl))) return k;
        return { ...k, materials: k.materials.map(m => (rezMovedWhole.has(m.nomenkl) ? { ...m, sklad: head.receiver } : m)) };
      }));
      // Приказ перемещён: каждая действующая карта приказа получает отметку требования — приказ «Перемещено на СДМ №2»,
      // доступен для выдачи на плавку; в новом требовании не выбирается
      if (byPrikaz) setShihtovyeKarty(prev => prev.map(k => (k.prikazId === head.prikazId && k.status !== "Выполнена"
        ? { ...k, trebovanie: { id: docId, number: head.number } } : k)));
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
      prikazId: head.prikazId || undefined,
      zakazchik,
      ownProperty: isOwn,
      info: info.trim() || undefined,
      positions: finalPositions,
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
      {!posted && !ro && <RezervWarning karty={affectedKarty} />}
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
        <Field label="Приказ на плавку (все шихтовые карты)" full>
          <Select
            value={head.prikazId}
            options={["", ...prikazy.map(p => p.id)]}
            optionLabel={v => (v ? prikazLabel(v) : NO_KARTA)}
            onChange={choosePrikaz}
            disabled={lockPos}
          />
          {!lockPos && <div className="text-xs text-gray-500 mt-1">Оформленные приказы («Новая»), ещё не перемещённые требованием. Позиции резерва всех карт приказа перемещаются целиком</div>}
          {!lockPos && prikazBlock && <div className="text-xs text-red-600 mt-1">{prikazBlock}</div>}
        </Field>
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
            {!lockPos && !byPrikaz && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
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
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort} className="px-3 py-2">Статус</SortTh>
              {!lockPos && !byPrikaz && <th className="w-20"></th>}
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
                    <td className="px-3 py-2 text-gray-500">{p.location}</td>
                    <td className="px-3 py-2">{status ? <PosStatusBadge status={status} nomenkl={p.nomenkl} /> : <span className="text-gray-400">—</span>}</td>
                    {!lockPos && !byPrikaz && <td className="px-3 py-2"><div className="flex items-center gap-1"><EditIcon onClick={() => screen.open("pick-edit", p.id)} /><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></div></td>}
                  </tr>
                );
              })}
              <FillerRows count={pg.fill} cols={12} />
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{iss.totals.qty}</td>
              <td></td>
              <td className="px-3 py-2">{iss.totals.lig.toFixed(2)}</td>
              <td className="px-3 py-2 text-blue-600"><NetAuAgTotal items={positions.map(p => ({ chem: p.chem, k: iss.line(p).share }))} /></td>
              <td colSpan={lockPos || byPrikaz ? 3 : 4}></td>
            </tr></tfoot>
          </table>
          {pg.pager}
        </>)}
      </div>

      {(showPick || editPos) && (
        <StockPickerModal
          issue={{ usedNomenkl: [...usedNomenkl(doc?.id), ...iss.partNomenkls(editPos?.id)], initial: editPos ? { [editPos.id]: iss.draftOf(editPos) } : undefined }}
          title={`Добавить позиции со склада «${head.sender}»`}
          rows={iss.pickerRows(stock, editPos)}
          already={already}
          showWeights
          emptyText={`Нет доступных позиций на складе «${head.sender}»`}
          onClose={closePick}
          onAdd={addPicked}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
