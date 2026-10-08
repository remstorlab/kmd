import React, { useState } from "react";
import { Btn, Modal, Field, Input, Select, KlassSelect, MaterialCodeSelect } from "./ui";
import { StorageLocation, ChemComposition } from "../data/mock";
import ChemCompositionBlock from "./ChemCompositionBlock";
import { useApp } from "../store/AppContext";

// ── Позиция ДМ: добавление / просмотр / редактирование (с химическим составом) ──
// Единая форма для всех мест, где позиция ДМ создаётся вручную: приём на склад, возврат в движении материала.

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
  chem: ChemComposition;
}

export const locOf = (p: PrihodPosition) => (p.polka ? `Сейф ${p.seyf}/Полка ${p.polka}` : p.seyf ? `Сейф ${p.seyf}` : "—");

// Места хранения склада из справочника «Места хранения»
export const seyfsOf = (locs: StorageLocation[], sklad: string) =>
  Array.from(new Set(locs.filter(l => l.sklad === sklad && l.available).map(l => l.seyfNum)));
export const polkasOf = (locs: StorageLocation[], sklad: string, seyf: string) =>
  locs.filter(l => l.sklad === sklad && l.seyfNum === seyf && l.available && l.polkaNum).map(l => l.polkaNum);

// Номенклатурный номер — 7 цифр (напр. 5015390): следующий после максимального из уже занятых.
const NOMENKL_RE = /^\d{7}$/;
const NOMENKL_START = 5015390;
export function nextNomenkl(used: string[]): string {
  const max = used.filter(n => NOMENKL_RE.test(n)).reduce((m, n) => Math.max(m, Number(n)), NOMENKL_START - 1);
  return String(max + 1);
}

// Все занятые номенклатурные номера: склады ДМ и ГП + переданные (позиции ещё не сохранённых документов)
export function useNextNomenkl() {
  const { dmItems, gpItems } = useApp();
  return (reserved: string[] = []) => nextNomenkl([...dmItems.map(i => i.nomenkl), ...gpItems.map(i => i.nomenkl), ...reserved]);
}

let posSeq = 0;
const newPosId = () => `pp-${Date.now()}-${posSeq++}`;

export function emptyPosition(locs: StorageLocation[], sklad: string, klass: string, code: string): PrihodPosition {
  const seyf = seyfsOf(locs, sklad)[0] ?? "";
  return {
    id: newPosId(), nomenkl: "", name: "", klass, code, kol: "1", unit: "шт", proba: "999", lig: "", net: "",
    seyf, polka: polkasOf(locs, sklad, seyf)[0] ?? "", chem: {},
  };
}

export default function DMPositionFormModal({ mode, sklad, initial, reservedNomenkl = [], onClose, onSave }: {
  mode: "add" | "edit" | "view";
  sklad: string;
  initial: PrihodPosition;
  // Номера, уже выданные позициям текущего (несохранённого) документа — не повторяются
  reservedNomenkl?: string[];
  onClose: () => void;
  onSave: (p: PrihodPosition) => void;
}) {
  const ro = mode === "view";
  const { storageLocations: locs } = useApp();
  const genNomenkl = useNextNomenkl();
  // Номер присваивается автоматически при добавлении и не редактируется
  const [form, setForm] = useState(() => (mode === "add" && !initial.nomenkl ? { ...initial, nomenkl: genNomenkl(reservedNomenkl) } : initial));
  const set = (k: Exclude<keyof PrihodPosition, "chem" | "nomenkl">) => (v: string) => setForm(f => ({ ...f, [k]: v }));

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
        <Field label="Номенкл. номер"><Input value={form.nomenkl} disabled /></Field>
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
      <ChemCompositionBlock value={form.chem} onChange={chem => setForm(f => ({ ...f, chem }))} disabled={ro} />
    </Modal>
  );
}
