import React from "react";
import { Field, Input } from "./ui";
import { ChemComposition } from "../data/mock";
import { ChemPercent, gramOf, pctOf, pctFrom, pctSum } from "../data/chem";
import { useApp } from "../store/AppContext";

// Блок «Химический состав (в чистоте)» — поля формируются по справочнику «Химический состав»:
// выводятся элементы с признаком «Отображать в ДМ» (scope="dm", формы позиций ДМ)
// или «Отображать в ШК» (scope="shk", шихтовые карты), а также элементы, входящие в состав (напр. Cu — остаток сплава).
//
// Режимы:
//  • lig задан — расчёт по лигатурному весу: у каждого элемента граммы и % содержания (оба поля редактируемые:
//    изменили % — пересчитались граммы, изменили граммы — пересчитался %);
//  • percentOnly — только % содержания (напр. хим. состав партии: подставляется в новые позиции документа);
//  • иначе — только граммы.
export default function ChemCompositionBlock({ value, onChange, disabled = false, scope = "dm", lig, pct, percentOnly = false }: {
  value: ChemComposition | undefined;
  onChange?: (chem: ChemComposition, pct: ChemPercent) => void;
  disabled?: boolean;
  scope?: "dm" | "shk";
  // Лигатурный вес позиции, г — включает расчёт граммов по %
  lig?: number;
  // % содержания; не задан — выводится по граммам и лигатурному весу
  pct?: ChemPercent;
  percentOnly?: boolean;
  // Не используются (итог «Чистый вес» под составом убран); оставлены для совместимости вызовов
  main?: string;
  proba?: string;
  net?: number;
}) {
  const { chemElements } = useApp();
  const calc = lig !== undefined;
  const chem = value ?? {};
  const percent: ChemPercent = percentOnly ? chem : pct ?? (calc ? pctFrom(chem, lig) : {});
  const inComp = (id: string) => !!chem[id] || !!percent[id];
  const shown = chemElements.filter(e => (scope === "shk" ? e.showShk : e.showDm) || ((calc || percentOnly) && inComp(e.id)));

  const set = (rec: Record<string, string>, id: string, v: string) => {
    const next = { ...rec };
    if (v.trim()) next[id] = v; else delete next[id];
    return next;
  };
  const changeGram = (id: string, v: string) => {
    const g = set(chem, id, v);
    onChange?.(g, calc ? set(percent, id, pctOf(v, lig)) : percent);
  };
  const changePct = (id: string, v: string) => {
    const p = set(percent, id, v);
    if (percentOnly) onChange?.(p, p);
    else onChange?.(set(chem, id, calc ? gramOf(v, lig) : chem[id] ?? ""), p);
  };

  const title = percentOnly ? "Химический состав, % содержания в сплаве" : calc ? "Химический состав: граммы в чистоте и % содержания в сплаве" : "Химический состав (в чистоте), г";
  const sum = pctSum(percent);
  const hasPct = Object.keys(percent).length > 0;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {shown.length ? (
        <div className="grid grid-cols-5 gap-3">
          {shown.map(e => (
            <div key={e.id} className="space-y-1.5">
              {!percentOnly && (
                <Field label={`${e.shortName}, г.`}>
                  <Input value={chem[e.id] ?? (disabled ? "-" : "")} onChange={v => changeGram(e.id, v)} placeholder="-" disabled={disabled} />
                </Field>
              )}
              {(calc || percentOnly) && (
                <Field label={`${e.shortName}, %`}>
                  <Input value={percent[e.id] ?? (disabled ? "-" : "")} onChange={v => changePct(e.id, v)} placeholder="-" disabled={disabled} />
                </Field>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400">Нет элементов с признаком «{scope === "shk" ? "Отображать в ШК" : "Отображать в ДМ"}» в справочнике «Химический состав»</div>
      )}

      {(calc || percentOnly) && hasPct && Math.abs(sum - 100) > 0.005 && (
        <div className="text-xs text-amber-600 mt-2">Сумма содержания элементов: {sum.toFixed(2)} % (должно быть 100 %)</div>
      )}

    </div>
  );
}
