import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Btn, Modal, Field, Select, useToast, Toast, parseRuDate } from "./ui";
import { ChemComposition, Operation, OperPosition, baseMetal, isGPKlass, isStoneKlass, spravValues, opVydacha, opVozvrat } from "../data/mock";
import { useScreen } from "../router";

// ── Баланс наличия и движения ДМ по СДМ ──────────────────────────────────────
// Таблица 1: Факт / Баланс / Отклонение по сырью и сплавам для каждого металла.
//   Баланс — учётный остаток склада ДМ; Факт — по умолчанию равен балансу, уточняется по результатам взвешивания.
// Таблица 2: Остаток на начало, ПРИХОД, РАСХОД, Остаток на конец периода (масса в чистоте).
//   Движение — операции «Движения материала»: выдача в подотчёт — расход, возврат завершённой операции — приход.

const ALL_METALS = "Все металлы";
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const dateCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoToRu = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const isoToNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y * 100000000 + m * 1000000 + d * 10000;
};
const longDate = (iso: string) => {
  if (!iso) return "«____» ____________ 20___ г.";
  const [y, m, d] = iso.split("-");
  return `«${d}» ${MONTHS[Number(m) - 1]} ${y} г.`;
};
const num = (v: string | undefined) => {
  const n = parseFloat(String(v ?? "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
const fmtDelta = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`);

type Kind = "raw" | "alloy";
const KIND_LABEL: Record<Kind, string> = { raw: "Сырьё", alloy: "Сплавы" };

interface Mass { code: string; netWeight: number; chem?: ChemComposition }

export default function BalansDmModal({ onClose }: { onClose: () => void }) {
  const { dmItems, operations, materialCodes, chemElements } = useApp();
  const { toast, show, clear } = useToast();
  // Сформированный отчёт — …/balans-sdm/sformirovan
  const screen = useScreen();
  const generated = screen.has("sformirovan");
  const setGenerated = (on: boolean) => screen.toggle("sformirovan", on);

  const sklady = spravValues("Склады");
  const allMetals = chemElements.filter(e => e.showDm);

  // ── Параметры формирования ──
  // Период по умолчанию — с начала месяца самой ранней операции по сегодня
  const firstOp = operations.reduce((m, o) => Math.min(m, parseRuDate(o.date) || Infinity), Infinity);
  const defaultFrom = (() => {
    if (!Number.isFinite(firstOp)) { const d = new Date(); d.setDate(1); return isoOf(d); }
    const y = Math.floor(firstOp / 100000000), m = Math.floor(firstOp / 1000000) % 100;
    return `${y}-${pad(m)}-01`;
  })();
  const [sklad, setSklad] = useState(sklady[0] ?? "");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(() => isoOf(new Date()));
  const [metal, setMetal] = useState(ALL_METALS);
  // Фактические массы по результатам взвешивания: «<металл>|<raw|alloy>» → г
  const [fact, setFact] = useState<Record<string, string>>({});

  const metals = metal === ALL_METALS ? allMetals : allMetals.filter(m => m.name === metal);
  const canGenerate = !!sklad && !!dateFrom && !!dateTo && dateFrom <= dateTo;

  // Сырьё — чистые металлы, остальное — сплавы
  const kindOf = (code: string): Kind => (/чист/i.test(materialCodes.find(c => c.code === code)?.shortName ?? "") ? "raw" : "alloy");
  const massOf = (p: Mass, id: string) => {
    if (p.chem && Object.keys(p.chem).length > 0) return num(p.chem[id]);
    return baseMetal(p.code, materialCodes).toLowerCase() === id ? p.netWeight : 0;
  };

  // Учётный остаток склада ДМ (без ГП и камней; позиции в подотчёте — не на складе)
  const stock = dmItems.filter(i => !isGPKlass(i.klass) && !isStoneKlass(i.klass) && i.status !== "В подотчёте" && i.status !== "Закрыта");
  const stockMass = (id: string, kind?: Kind) =>
    stock.filter(i => !kind || kindOf(i.metal) === kind).reduce((s, i) => s + massOf({ code: i.metal, netWeight: i.netWeight, chem: i.chem }, id), 0);

  // Движение за период по операциям
  const from = dateFrom ? isoToNum(dateFrom) : 0;
  const to = dateTo ? isoToNum(dateTo) + 9999 : Infinity;
  const inPeriod = (o: Operation) => { const d = parseRuDate(o.date); return d >= from && d <= to; };
  const afterPeriod = (o: Operation) => parseRuDate(o.date) > to;
  const dmPos = (list: OperPosition[]) => list.filter(p => !isGPKlass(p.klass) && !isStoneKlass(p.klass));
  const posMass = (list: OperPosition[], id: string) =>
    dmPos(list).reduce((s, p) => s + massOf({ code: p.metal ?? "", netWeight: p.net ?? p.ves, chem: p.chem }, id), 0);
  // Выдача проводится при сохранении операции — выданы позиции любой сохранённой операции
  const issued = (_o: Operation) => true;
  const returned = (o: Operation) => o.stage === "Завершено";

  const opDoc = (o: Operation, what: string) => `${o.docType || "Документ"} № ${o.document} от ${o.date} — ${what} (${o.vid})`;
  const prihod = operations.filter(o => inPeriod(o) && returned(o) && dmPos(opVozvrat(o)).length > 0)
    .map(o => ({ doc: opDoc(o, "возврат"), list: opVozvrat(o) }));
  const rashod = operations.filter(o => inPeriod(o) && issued(o) && dmPos(opVydacha(o)).length > 0)
    .map(o => ({ doc: opDoc(o, "выдача в подотчёт"), list: opVydacha(o) }));
  // Движение после конца периода — для пересчёта текущего остатка на дату окончания
  const laterIn = operations.filter(o => afterPeriod(o) && returned(o)).map(o => opVozvrat(o));
  const laterOut = operations.filter(o => afterPeriod(o) && issued(o)).map(o => opVydacha(o));

  const sumLists = (lists: OperPosition[][], id: string) => lists.reduce((s, l) => s + posMass(l, id), 0);
  // Остаток на конец периода = текущий − приход после периода + расход после периода
  const endBalance = (id: string) => stockMass(id) - sumLists(laterIn, id) + sumLists(laterOut, id);
  const inSum = (id: string) => sumLists(prihod.map(x => x.list), id);
  const outSum = (id: string) => sumLists(rashod.map(x => x.list), id);
  const startBalance = (id: string) => endBalance(id) - inSum(id) + outSum(id);

  // Баланс по видам на дату окончания (пропорция текущего остатка по сырью / сплавам)
  const balanceKind = (id: string, kind: Kind) => {
    const total = stockMass(id);
    const end = endBalance(id);
    return total ? end * (stockMass(id, kind) / total) : kind === "alloy" ? end : 0;
  };
  const factKey = (id: string, kind: Kind) => `${id}|${kind}`;
  const factOf = (id: string, kind: Kind) => (fact[factKey(id, kind)] !== undefined ? num(fact[factKey(id, kind)]) : balanceKind(id, kind));

  const cell = "border border-black px-2 py-1";

  // Секция движения: первая ячейка «ПРИХОД:» / «РАСХОД:» объединена на все строки документов и строку итога
  const movement = (title: string, totalLabel: string, docs: { doc: string; list: OperPosition[] }[], total: (id: string) => number) => {
    const span = Math.max(docs.length, 1) + 1;
    const head = <td rowSpan={span} className={`${cell} text-left font-semibold align-top`}>{title}</td>;
    return (
      <>
        {docs.length === 0 ? (
          <tr>
            {head}
            <td className={`${cell} text-left text-gray-500`}>Нет документов за период</td>
            {metals.map(m => <td key={m.id} className={`${cell} text-right`}>-</td>)}
          </tr>
        ) : docs.map((x, i) => (
          <tr key={i}>
            {i === 0 && head}
            <td className={`${cell} text-left`}>{x.doc}</td>
            {metals.map(m => <td key={m.id} className={`${cell} text-right`}>{fmt(posMass(x.list, m.id))}</td>)}
          </tr>
        ))}
        <tr className="bg-gray-50">
          <td className={`${cell} text-right italic`}>{totalLabel}</td>
          {metals.map(m => <td key={m.id} className={`${cell} text-right font-semibold`}>{fmt(total(m.id))}</td>)}
        </tr>
      </>
    );
  };
  const toRu = isoToRu(dateTo);
  const fromRu = isoToRu(dateFrom);

  const SignRow = ({ role }: { role: string }) => (
    <div className="grid grid-cols-[220px_1fr_1fr_1fr] gap-6 items-end mb-3">
      <span>{role}</span>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(подпись)</span></div>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(дата)</span></div>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(Ф.И.О.)</span></div>
    </div>
  );

  return (
    <Modal
      title="Баланс наличия и движения ДМ по СДМ"
      onClose={onClose}
      extraWide
      footer={<>
        {generated && <Btn variant="secondary" onClick={() => show("Баланс отправлен на печать")}>Печать</Btn>}
        <Btn variant="secondary" onClick={() => show("Отчёт экспортирован")}>Экспорт</Btn>
        <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
      </>}
    >
      {/* Параметры формирования */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 grid grid-cols-6 gap-3 items-end">
        <Field label="Кладовая" required><Select value={sklad} options={sklady} onChange={setSklad} /></Field>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Период с<span className="text-red-500 ml-0.5">*</span></label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className={dateCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Период по<span className="text-red-500 ml-0.5">*</span></label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className={dateCls} />
        </div>
        <Field label="Драгоценный металл"><Select value={metal} options={[ALL_METALS, ...allMetals.map(m => m.name)]} onChange={setMetal} /></Field>
        <button onClick={() => { setSklad(sklady[0] ?? ""); setDateFrom(defaultFrom); setDateTo(isoOf(new Date())); setMetal(ALL_METALS); setFact({}); }}
          className="h-9 px-3 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить</button>
        <Btn onClick={() => setGenerated(true)} disabled={!canGenerate}>Сформировать</Btn>
      </div>

      {!generated ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
          Задайте параметры и нажмите «Сформировать» для формирования баланса
        </div>
      ) : (
        <div className="border border-gray-300 bg-white p-6 text-black text-xs">
          <div className="mb-5 leading-relaxed">
            <h2 className="text-center font-bold text-sm tracking-[0.4em] mb-1">БАЛАНС</h2>
            <p className="text-center text-sm">Наличия и движения драгоценных металлов</p>
            <p className="text-center text-sm">
              по кладовой № <span className="border-b border-black px-4">{sklad}</span>
              {" "}за <span className="border-b border-black px-4">{fromRu} – {toRu}</span>
            </p>
          </div>

          {/* Таблица 1: Факт / Баланс / Отклонение */}
          <div className="overflow-x-auto mb-2">
            <table className="w-full border-collapse border border-black text-center">
              <thead>
                <tr>
                  <th rowSpan={3} className={`${cell} align-middle font-semibold w-40`}>Наименование</th>
                  <th colSpan={metals.length * 3} className={`${cell} font-semibold`}>Металлы, г</th>
                </tr>
                <tr>{metals.map(m => <th key={m.id} colSpan={3} className={`${cell} font-semibold`}>{m.name}</th>)}</tr>
                <tr>
                  {metals.map(m => (
                    <React.Fragment key={m.id}>
                      <th className={`${cell} font-normal`}>Факт на {toRu}</th>
                      <th className={`${cell} font-normal`}>Баланс на {toRu}</th>
                      <th className={`${cell} font-normal`}>Отклонение +, −</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["raw", "alloy"] as Kind[]).map(kind => (
                  <tr key={kind}>
                    <td className={`${cell} text-left`}>{KIND_LABEL[kind]}</td>
                    {metals.map(m => {
                      const key = factKey(m.id, kind);
                      const bal = balanceKind(m.id, kind);
                      const delta = factOf(m.id, kind) - bal;
                      return (
                        <React.Fragment key={m.id}>
                          <td className={`${cell} p-0`}>
                            <input
                              value={fact[key] ?? fmt(bal)}
                              onChange={e => setFact(f => ({ ...f, [key]: e.target.value }))}
                              className="w-full px-2 py-1 text-right bg-yellow-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              title="Фактическая масса по результатам взвешивания"
                            />
                          </td>
                          <td className={`${cell} text-right`}>{fmt(bal)}</td>
                          <td className={`${cell} text-right ${Math.abs(delta) >= 0.005 ? "text-red-600 font-semibold" : ""}`}>{fmtDelta(delta)}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className={`${cell} text-left`}>Итого:</td>
                  {metals.map(m => {
                    const f = factOf(m.id, "raw") + factOf(m.id, "alloy");
                    const b = balanceKind(m.id, "raw") + balanceKind(m.id, "alloy");
                    return (
                      <React.Fragment key={m.id}>
                        <td className={`${cell} text-right`}>{fmt(f)}</td>
                        <td className={`${cell} text-right`}>{fmt(b)}</td>
                        <td className={`${cell} text-right ${Math.abs(f - b) >= 0.005 ? "text-red-600" : ""}`}>{fmtDelta(f - b)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 mb-6">«Факт» заполнен учётным остатком — при расхождении введите массу по результатам взвешивания, отклонение пересчитается.</p>

          {/* Таблица 2: Движение */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-black text-center">
              <thead>
                <tr>
                  <th rowSpan={metals.length > 1 ? 2 : 1} className={`${cell} align-middle font-semibold w-48`}>Наименование</th>
                  <th rowSpan={metals.length > 1 ? 2 : 1} className={`${cell} align-middle font-semibold`}>Наименование документа</th>
                  <th colSpan={metals.length} className={`${cell} font-semibold`}>Масса в чистоте (г){metals.length === 1 ? ` — ${metals[0].name.toLowerCase()}` : ""}</th>
                </tr>
                {metals.length > 1 && <tr>{metals.map(m => <th key={m.id} className={`${cell} font-normal`}>{m.name}</th>)}</tr>}
              </thead>
              <tbody>
                <tr className="font-semibold">
                  <td className={`${cell} text-left`}>Остаток на {fromRu}</td>
                  <td className={cell}></td>
                  {metals.map(m => <td key={m.id} className={`${cell} text-right`}>{fmt(startBalance(m.id))}</td>)}
                </tr>

                {movement("ПРИХОД:", "Итого приход", prihod, inSum)}
                {movement("РАСХОД:", "Итого расход", rashod, outSum)}

                <tr className="font-semibold">
                  <td className={`${cell} text-left`}>Остаток на {toRu}</td>
                  <td className={cell}></td>
                  {metals.map(m => <td key={m.id} className={`${cell} text-right`}>{fmt(endBalance(m.id))}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="max-w-4xl">
            <SignRow role="Начальник УИДМ" />
            <SignRow role="Начальник ПТО" />
            <SignRow role="Главный технолог-начальник КТО" />
            <SignRow role="Экономист ФЭО" />
            <SignRow role="Бухгалтер ОБУ" />
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Сформировано {longDate(isoOf(new Date()))}</p>
        </div>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
