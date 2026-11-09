import React from "react";
import { IssueLine, IssuePos } from "../data/stock";

// ── Частичная выдача: ячейки «Количество» и «Вес лигат.» таблиц позиций ──────
// Используются в документах «Выдача со склада», «Требование», «Возврат СГП №2» и в «Движении материала».
// Расчёт — IssueLine (data/stock.ts): компоненты только показывают и вводят значения.

const fmt2 = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2));

// Числовое поле с подсветкой ошибки (подсказка — во всплывающем title)
function NumField({ value, onChange, placeholder, invalid, title, width, decimal = false }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  title?: string;
  width: string;
  decimal?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, ""))}
      placeholder={placeholder}
      title={title}
      inputMode={decimal ? "decimal" : "numeric"}
      className={`${width} px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${invalid ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"}`}
    />
  );
}

// Количество к выдаче: поле ввода (у позиции больше одного изделия) или значение
export function IssueQtyCell({ line, editable, onChange }: {
  line: IssueLine;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  if (!editable || !line.qtyEditable) return <>{line.issue || "—"}</>;
  return (
    <NumField
      width="w-20"
      value={line.issue ? String(line.issue) : ""}
      onChange={onChange}
      placeholder="1"
      invalid={!line.qtyOk}
      title={line.qtyOk ? `Доступно: ${line.qty}` : line.error ?? undefined}
    />
  );
}

// Лиг. вес выдаваемой части: при частичной выдаче — поле ввода выданного веса и рассчитанный остаток на складе,
// иначе — вес позиции
export function IssueLigCell({ line, editable, onChange, value }: {
  line: IssueLine;
  editable: boolean;
  onChange: (v: string) => void;
  // Введённое значение (строка поля)
  value: string;
}) {
  if (!line.needsLig) return <>{fmt2(line.issuedLig)}</>;
  const rest = line.restLig;
  return (
    <div>
      {editable ? (
        <NumField
          width="w-28"
          decimal
          value={value}
          onChange={onChange}
          placeholder={`< ${fmt2(line.totalLig)}`}
          invalid={!line.ligOk}
          title={line.ligOk ? `Лиг. вес выдаваемой части, г (всего ${fmt2(line.totalLig)})` : line.error ?? undefined}
        />
      ) : fmt2(line.issuedLig)}
      <div className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
        остаток на складе: {rest == null ? "—" : `${rest.toFixed(2)} г`}
      </div>
    </div>
  );
}

// ── Хук для таблиц позиций документов ────────────────────────────────────────
// Позиции документа хранят полный вес позиции (lig, net) и выдаваемое количество / вес (issue, issueLig).

type DocIssuePos = IssuePos & { id: string; name: string; net: number | null };

export function useIssuePositions<P extends DocIssuePos>(
  positions: P[],
  setPositions: React.Dispatch<React.SetStateAction<P[]>>,
) {
  const line = (p: P) => IssueLine.of(p);
  const update = (id: string, patch: (p: P) => Partial<P>) =>
    setPositions(prev => prev.map(p => (p.id === id ? { ...p, ...patch(p) } : p)));
  // Количество — от 0 (ошибка) до количества изделий позиции
  const setIssue = (id: string, v: string) => update(id, p => {
    const n = parseInt(v, 10);
    return { issue: Number.isFinite(n) ? Math.min(Math.max(n, 0), p.qty) : 0 } as Partial<P>;
  });
  const setIssueLig = (id: string, v: string) => update(id, () => ({ issueLig: v } as Partial<P>));

  const badQty = positions.filter(p => !line(p).qtyOk);
  const badLig = positions.filter(p => !line(p).ligOk);
  const totals = positions.reduce(
    (t, p) => {
      const l = line(p);
      return { qty: t.qty + p.issue, lig: t.lig + (l.issuedLig ?? 0), net: t.net + (l.part(p.net) ?? 0) };
    },
    { qty: 0, lig: 0, net: 0 },
  );
  // Проверка перед сохранением: количество — всегда, выданный вес — при оформлении
  const validate = (oformit: boolean, qtyWord = "к выдаче"): string | null => {
    if (badQty.length) return `Укажите количество ${qtyWord}: ${badQty.map(p => p.name).join(", ")}`;
    if (oformit && badLig.length) return `Укажите лигатурный вес выдаваемой части (больше 0 и меньше веса позиции): ${badLig.map(p => p.name).join(", ")}`;
    return null;
  };

  // Ячейки строки таблицы
  const qtyCell = (p: P, editable: boolean) => <IssueQtyCell line={line(p)} editable={editable} onChange={v => setIssue(p.id, v)} />;
  const ligCell = (p: P, editable: boolean) => <IssueLigCell line={line(p)} editable={editable} value={p.issueLig ?? ""} onChange={v => setIssueLig(p.id, v)} />;

  return { line, setIssue, setIssueLig, totals, validate, qtyCell, ligCell };
}
