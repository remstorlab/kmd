import React, { useState } from "react";
import { Btn, Modal, Field, Input, Select, KlassSelect, MaterialCodeSelect } from "./ui";
import { StorageLocation, ChemComposition, spravValues } from "../data/mock";
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

// «-» — место хранения не задано (сейф / полка не выбраны, позиция в подотчёте)
export const NO_LOC = "-";
const isSet = (v: string) => !!v && v !== NO_LOC;

// Место хранения позиции записывается одной строкой по ячейке справочника «Места хранения»: «Сейф №1, Полка 2»
export const formatLoc = (seyf: string, polka: string) =>
  !isSet(seyf) ? NO_LOC : isSet(polka) ? `Сейф №${seyf}, Полка ${polka}` : `Сейф №${seyf}`;
// Обратный разбор строки места хранения (понимает и старый вид «Сейф 1/Полка 2»)
export const parseLoc = (loc: string) => {
  const m = /Сейф\s*№?\s*([^,/\s]+)\s*(?:[,/]\s*Полка\s*№?\s*([^,/\s]+))?/.exec(loc);
  return { seyf: m?.[1] ?? NO_LOC, polka: m?.[2] ?? NO_LOC };
};

export const locOf = (p: PrihodPosition) => formatLoc(p.seyf, p.polka);

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

// Новая позиция: сейф и полка не выбраны («-»), проба не задана
export function emptyPosition(_locs: StorageLocation[], _sklad: string, klass: string, code: string): PrihodPosition {
  return {
    id: newPosId(), nomenkl: "", name: "", klass, code, kol: "", unit: "шт", proba: "", lig: "", net: "",
    seyf: NO_LOC, polka: NO_LOC, chem: {},
  };
}

export default function DMPositionFormModal({ mode, sklad, initial, reservedNomenkl = [], onClose, onSave, onSaveMany, title: titleProp, saveLabel, lockWeights = false, header, extraWide = false, fixedHeight = false }: {
  mode: "add" | "edit" | "view";
  sklad: string;
  initial: PrihodPosition;
  // Номера, уже выданные позициям текущего (несохранённого) документа — не повторяются
  reservedNomenkl?: string[];
  onClose: () => void;
  onSave: (p: PrihodPosition) => void;
  // Добавление нескольких одинаковых позиций: номенклатурный номер +1 у каждой, остальные атрибуты те же.
  // Если не передан — признак «Добавить несколько одинаковых» не показывается.
  onSaveMany?: (ps: PrihodPosition[]) => void;
  // Для других сценариев на основе формы (напр. объединение позиций): свой заголовок и кнопка,
  // блок над полями, массы — только для чтения (рассчитаны заранее)
  title?: string;
  saveLabel?: string;
  lockWeights?: boolean;
  header?: React.ReactNode;
  // Ширина окна первого уровня (как у документов)
  extraWide?: boolean;
  fixedHeight?: boolean;
}) {
  const ro = mode === "view";
  const { storageLocations: locs } = useApp();
  const genNomenkl = useNextNomenkl();
  // Номер присваивается автоматически при добавлении и не редактируется
  const [form, setForm] = useState(() => (mode === "add" && !initial.nomenkl ? { ...initial, nomenkl: genNomenkl(reservedNomenkl) } : initial));
  const set = (k: Exclude<keyof PrihodPosition, "chem" | "nomenkl">) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const seyfs = seyfsOf(locs, sklad);
  // «-» — не выбрано; значение не из справочника сохраняется в списке
  const withNone = (list: string[], v: string) => [NO_LOC, ...(isSet(v) && !list.includes(v) ? [v] : []), ...list];
  const seyfOptions = withNone(seyfs, form.seyf);
  const polkaOptions = isSet(form.seyf) ? withNone(polkasOf(locs, sklad, form.seyf), form.polka) : [NO_LOC];

  // Проба — из справочника «Пробы»; значение не из справочника сохраняется в списке
  const probas = spravValues("Пробы");
  const probaOptions = ["", ...(form.proba && !probas.includes(form.proba) ? [form.proba] : []), ...probas];

  const changeSeyf = (seyf: string) => setForm(f => ({ ...f, seyf, polka: NO_LOC }));

  const [many, setMany] = useState(false);
  const [manyCount, setManyCount] = useState("2");
  const canMany = mode === "add" && !!onSaveMany;
  const count = parseInt(manyCount, 10) || 0;
  const badCount = canMany && many && (count < 2 || count > 100);
  const canSave = !!form.name.trim() && !!form.nomenkl.trim() && !badCount;

  const save = () => {
    if (!canSave) return;
    if (canMany && many && onSaveMany) {
      const first = Number(form.nomenkl);
      onSaveMany(Array.from({ length: count }, (_, i) => ({
        ...form, chem: { ...form.chem }, id: `${form.id}-${i + 1}`, nomenkl: String(first + i),
      })));
    } else onSave(form);
  };
  const lastNomenkl = String(Number(form.nomenkl) + Math.max(count, 1) - 1);
  const title = titleProp ?? (mode === "add" ? "Добавить позицию ДМ" : mode === "edit" ? "Редактирование позиции ДМ" : "Просмотр позиции ДМ");

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide={!extraWide}
      extraWide={extraWide}
      fixedHeight={fixedHeight}
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={save} disabled={!canSave}>{saveLabel ?? (mode === "add" ? (canMany && many && count >= 2 ? `Добавить (${count})` : "Добавить") : "Сохранить")}</Btn>
      </>}
    >
      {header}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Field label="Номенкл. номер"><Input value={form.nomenkl} disabled /></Field>
        <Field label="Класс" required={!ro}><KlassSelect value={form.klass} onChange={set("klass")} disabled={ro} /></Field>
        <Field label="Код материала" required={!ro}><MaterialCodeSelect value={form.code} onChange={set("code")} disabled={ro} /></Field>
        <Field label="Наименование" required={!ro} full><Input value={form.name} onChange={set("name")} placeholder="Наименование позиции" disabled={ro} /></Field>
        {/* Необязательное: сколько изделий входит в одну позицию */}
        <Field label="Количество изделий"><Input value={form.kol} onChange={v => set("kol")(v.replace(/[^\d]/g, ""))} placeholder="количество в пределах одной позиции" disabled={ro} /></Field>
        <Field label="Ед. изм." required={!ro}><Select value={form.unit} options={["шт", "г", "кг"]} onChange={set("unit")} disabled={ro} /></Field>
        <Field label="Проба" required={!ro}><Select value={form.proba} options={probaOptions} onChange={set("proba")} optionLabel={v => v || "Выберите пробу"} disabled={ro} /></Field>
        <Field label="Масса лигатурная, г" required={!ro && !lockWeights}><Input value={form.lig} onChange={set("lig")} placeholder="0.00" disabled={ro || lockWeights} /></Field>
        <Field label="Масса чистая, г" required={!ro && !lockWeights}><Input value={form.net} onChange={set("net")} placeholder="0.00" disabled={ro || lockWeights} /></Field>
        <Field label="Склад"><Input value={sklad} disabled /></Field>
        {/* Необязательные: «-» — место хранения не задано */}
        <Field label="Сейф"><Select value={form.seyf || NO_LOC} options={seyfOptions} onChange={changeSeyf} disabled={ro} /></Field>
        <Field label="Полка"><Select value={form.polka || NO_LOC} options={polkaOptions} onChange={set("polka")} disabled={ro || !isSet(form.seyf)} /></Field>
      </div>
      <ChemCompositionBlock value={form.chem} onChange={chem => setForm(f => ({ ...f, chem }))} disabled={ro} />
      {canMany && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={many} onChange={e => setMany(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Добавить несколько одинаковых
            </label>
            {many && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Количество позиций</span>
                <div className={`w-24 ${badCount ? "rounded-lg ring-1 ring-red-400" : ""}`}>
                  <Input value={manyCount} onChange={v => setManyCount(v.replace(/[^\d]/g, ""))} placeholder="2" />
                </div>
              </div>
            )}
          </div>
          {many && (
            <div className={`text-xs mt-2 ${badCount ? "text-red-600" : "text-gray-500"}`}>
              {badCount
                ? "Укажите количество позиций от 2 до 100"
                : `Будет создано ${count} позиций с одинаковыми атрибутами, номенкл. номера ${form.nomenkl} – ${lastNomenkl}`}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
