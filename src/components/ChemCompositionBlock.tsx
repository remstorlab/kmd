import React from "react";
import { Field, Input } from "./ui";
import { ChemComposition } from "../data/mock";
import { useApp } from "../store/AppContext";

// Блок «Химический состав (в чистоте), г» — поля формируются по справочнику «Химический состав»:
// выводятся только элементы с признаком «Отображать», подпись — «<Краткое наименование>, г.».
export default function ChemCompositionBlock({ value, onChange, disabled = false }: {
  value: ChemComposition | undefined;
  onChange?: (v: ChemComposition) => void;
  disabled?: boolean;
}) {
  const { chemElements } = useApp();
  const shown = chemElements.filter(e => e.visible);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Химический состав (в чистоте), г</h4>
      {shown.length ? (
        <div className="grid grid-cols-5 gap-3">
          {shown.map(e => (
            <Field key={e.id} label={`${e.shortName}, г.`}>
              <Input
                value={value?.[e.id] ?? (disabled ? "-" : "")}
                onChange={v => onChange?.({ ...value, [e.id]: v })}
                placeholder="-"
                disabled={disabled}
              />
            </Field>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400">Нет элементов с признаком «Отображать» в справочнике «Химический состав»</div>
      )}
    </div>
  );
}
