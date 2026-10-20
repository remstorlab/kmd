import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Btn, Modal, Field, Input, Select, Textarea, useToast, Toast, parseRuDate } from "./ui";
import { Operation, OperPosition, baseMetal, isGPKlass, isStoneKlass, spravValues, opVydacha } from "../data/mock";
import { useScreen } from "../router";

// ── Акт по итогам инвентаризации НЗП ─────────────────────────────────────────
// НЗП — драгоценные металлы, выданные в производство и ещё не возвращённые: позиции вкладки «Выдача»
// операций движения материала в статусе «В работе» на дату инвентаризации.
// Строки — металл по кладовым (подотчётным лицам); Остаток (баланс) — учётная масса в чистоте,
// Остаток (факт) — вводится по результатам инвентаризации; излишки / недостача — разница.

const ALL_METALS = "Все металлы";
const ALL_PERSONS = "Все подотчётные лица";
const ALL_VIDS = "Все виды операций";
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
const fmt = (v: number) => (Math.abs(v) < 0.005 ? "-" : v.toFixed(2));
const blank = (v: string, w = "px-16") => (v.trim() ? <span className="border-b border-black px-1">{v}</span> : <span className={`border-b border-black ${w}`}>&nbsp;</span>);

// Операция в производстве (НЗП): операция в работе, ещё не завершена
const inProduction = (o: Operation) => o.stage === "В работе";

export default function AktNzpModal({ onClose }: { onClose: () => void }) {
  const { operations, materialCodes, chemElements } = useApp();
  const { toast, show, clear } = useToast();
  // Сформированный акт — …/akt-nzp/sformirovan
  const screen = useScreen();
  const generated = screen.has("sformirovan");
  const setGenerated = (on: boolean) => screen.toggle("sformirovan", on);

  const allMetals = chemElements.filter(e => e.showDm);
  const persons = Array.from(new Set(operations.map(o => o.responsible).filter(Boolean))).sort();
  const vids = spravValues("Виды операций");

  // ── Реквизиты акта ──
  const [aktDate, setAktDate] = useState(() => isoOf(new Date()));
  const [regNo, setRegNo] = useState("");
  const [onDate, setOnDate] = useState(() => isoOf(new Date()));
  const [osnovanie, setOsnovanie] = useState("");
  // ── Комиссия ──
  const [predsedatel, setPredsedatel] = useState("");
  const [zam, setZam] = useState("");
  const [chleny, setChleny] = useState("");
  const [dokumenty, setDokumenty] = useState("");
  // ── Отбор ──
  const [metal, setMetal] = useState(ALL_METALS);
  const [person, setPerson] = useState(ALL_PERSONS);
  const [vid, setVid] = useState(ALL_VIDS);
  // ── Выводы комиссии ──
  const [otmechaet, setOtmechaet] = useState("");
  const [neobhodimo, setNeobhodimo] = useState("");
  // Остаток (факт): «<металл>|<подотчётное лицо>» → г
  const [fact, setFact] = useState<Record<string, string>>({});

  const canGenerate = !!aktDate && !!onDate && !!predsedatel.trim();
  const reset = () => {
    setAktDate(isoOf(new Date())); setRegNo(""); setOnDate(isoOf(new Date())); setOsnovanie("");
    setPredsedatel(""); setZam(""); setChleny(""); setDokumenty("");
    setMetal(ALL_METALS); setPerson(ALL_PERSONS); setVid(ALL_VIDS); setOtmechaet(""); setNeobhodimo(""); setFact({});
  };

  const metals = metal === ALL_METALS ? allMetals : allMetals.filter(m => m.name === metal);

  // Масса металла в позиции: из химсостава, иначе чистый вес по основному металлу кода материала
  const massOf = (p: OperPosition, id: string) => {
    if (p.chem && Object.keys(p.chem).length > 0) return num(p.chem[id]);
    return baseMetal(p.metal ?? "", materialCodes).toLowerCase() === id ? p.net ?? p.ves : 0;
  };

  // Операции НЗП на дату инвентаризации
  const to = onDate ? isoToNum(onDate) + 9999 : Infinity;
  const ops = operations.filter(o =>
    inProduction(o) && parseRuDate(o.date) <= to
    && (person === ALL_PERSONS || o.responsible === person)
    && (vid === ALL_VIDS || o.vid === vid));
  const opPersons = Array.from(new Set(ops.map(o => o.responsible || "Не указано"))).sort();
  const dmPos = (o: Operation) => opVydacha(o).filter(p => !isGPKlass(p.klass) && !isStoneKlass(p.klass));
  const balanceOf = (id: string, who: string) =>
    ops.filter(o => (o.responsible || "Не указано") === who).reduce((s, o) => s + dmPos(o).reduce((a, p) => a + massOf(p, id), 0), 0);

  // Строки: металл → кладовые (подотчётные лица) с ненулевым остатком
  const groups = metals.map(m => ({
    metal: m,
    rows: opPersons.map(who => ({ who, key: `${m.id}|${who}`, bal: balanceOf(m.id, who) })).filter(r => r.bal > 0),
  })).filter(g => g.rows.length > 0);

  const factOf = (key: string, bal: number) => (fact[key] !== undefined ? num(fact[key]) : bal);
  const totals = (rows: { key: string; bal: number }[]) => rows.reduce((t, r) => {
    const f = factOf(r.key, r.bal);
    return { fact: t.fact + f, bal: t.bal + r.bal, plus: t.plus + Math.max(f - r.bal, 0), minus: t.minus + Math.max(r.bal - f, 0) };
  }, { fact: 0, bal: 0, plus: 0, minus: 0 });
  const allRows = groups.flatMap(g => g.rows);
  const total = totals(allRows);

  const cell = "border border-black px-2 py-1";
  const onRu = isoToRu(onDate);
  let n = 0;

  const SignRow = ({ role }: { role: string }) => (
    <div className="grid grid-cols-[200px_120px_120px_1fr] gap-6 items-end mb-4 max-w-3xl">
      <span>{role}</span>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(подпись)</span></div>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(дата)</span></div>
      <div className="text-center"><div className="border-b border-black h-5"></div><span className="text-[10px]">(Ф.И.О.)</span></div>
    </div>
  );

  const label = (text: string, required = false) => (
    <label className="block text-xs font-medium text-gray-500 mb-1">{text}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
  );
  const section = "text-xs font-semibold text-gray-500 uppercase tracking-wide col-span-6 -mb-1";

  return (
    <Modal
      title="Акт по итогам инвентаризации НЗП"
      onClose={onClose}
      extraWide
      footer={<>
        {generated && <Btn variant="secondary" onClick={() => show("Акт отправлен на печать")}>Печать</Btn>}
        <Btn variant="secondary" onClick={() => show("Отчёт экспортирован")}>Экспорт</Btn>
        <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
      </>}
    >
      {/* Параметры формирования */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 grid grid-cols-6 gap-3 items-end">
        <div className={section}>Реквизиты акта</div>
        <div>{label("Дата акта", true)}<input type="date" value={aktDate} onChange={e => setAktDate(e.target.value)} className={dateCls} /></div>
        <Field label="Регистрационный №"><Input value={regNo} onChange={setRegNo} placeholder="№ акта" /></Field>
        <div>{label("Инвентаризация на дату", true)}<input type="date" value={onDate} onChange={e => setOnDate(e.target.value)} className={dateCls} /></div>
        <div className="col-span-3"><Field label="Основание"><Input value={osnovanie} onChange={setOsnovanie} placeholder="Приказ № … от …" /></Field></div>

        <div className={section}>Комиссия</div>
        <div className="col-span-2"><Field label="Председатель комиссии" required><Input value={predsedatel} onChange={setPredsedatel} placeholder="Ф.И.О." /></Field></div>
        <div className="col-span-2"><Field label="Зам. председателя комиссии"><Input value={zam} onChange={setZam} placeholder="Ф.И.О." /></Field></div>
        <div className="col-span-2"><Field label="Члены комиссии"><Input value={chleny} onChange={setChleny} placeholder="Ф.И.О. через запятую" /></Field></div>
        <div className="col-span-6"><Field label="Комиссия рассмотрела следующие документы"><Input value={dokumenty} onChange={setDokumenty} placeholder="Перечень документов" /></Field></div>

        <div className={section}>Отбор данных</div>
        <Field label="Драгоценный металл"><Select value={metal} options={[ALL_METALS, ...allMetals.map(m => m.name)]} onChange={setMetal} /></Field>
        <div className="col-span-2"><Field label="Кладовая (подотчётное лицо)"><Select value={person} options={[ALL_PERSONS, ...persons]} onChange={setPerson} /></Field></div>
        <Field label="Вид операции"><Select value={vid} options={[ALL_VIDS, ...vids]} onChange={setVid} /></Field>
        <div className="col-span-2" />

        <div className={section}>Выводы комиссии</div>
        <div className="col-span-3">{label("Комиссия отмечает")}<Textarea value={otmechaet} onChange={setOtmechaet} rows={2} placeholder="Результаты анализа итогов инвентаризации" /></div>
        <div className="col-span-3">{label("Комиссия считает необходимым")}<Textarea value={neobhodimo} onChange={setNeobhodimo} rows={2} placeholder="Каждый пункт с новой строки" /></div>

        <div className="col-span-6 flex justify-end gap-2">
          <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить</button>
          <Btn onClick={() => setGenerated(true)} disabled={!canGenerate}>Сформировать</Btn>
        </div>
      </div>

      {!generated ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
          Заполните реквизиты и нажмите «Сформировать» для формирования акта
        </div>
      ) : (
        <div className="border border-gray-300 bg-white p-6 text-black text-xs leading-relaxed">
          {/* Шапка */}
          <div className="w-96 text-center mb-6">
            <p className="font-bold">АКТ</p>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="border-b border-black">{isoToRu(aktDate) || " "}</div><span className="text-[10px]">(дата)</span></div>
              <div><div className="border-b border-black">№ {regNo || " "}</div><span className="text-[10px]">(регистрационный №)</span></div>
            </div>
            <p>по итогам инвентаризации НЗП</p>
            <p>драгоценных металлов и драгоценных</p>
            <p>камней, числящихся на РГП «КМД НБ РК»</p>
            <p>г. Усть-Каменогорск</p>
          </div>

          <p className="mb-3">Основание: {blank(osnovanie, "px-40")}</p>
          <div className="mb-3 space-y-0.5">
            <p>Комиссия в составе:</p>
            <p>Председателя комиссии {blank(predsedatel)}</p>
            <p>Зам. председателя комиссии {blank(zam)}</p>
            <p>Членов комиссии: {blank(chleny, "px-40")}</p>
          </div>
          <p>Комиссия рассмотрела следующие документы {blank(dokumenty, "px-40")}</p>
          <p className="mb-4 text-justify">
            Комиссия, рассмотрев приведённые выше документы, вывела результаты инвентаризации, которые представлены в таблице
            {metal !== ALL_METALS ? ` (${metal.toLowerCase()})` : ""}{person !== ALL_PERSONS ? `, кладовая: ${person}` : ""}{vid !== ALL_VIDS ? `, вид операции: ${vid}` : ""}.
          </p>

          {/* Таблица результатов */}
          <div className="overflow-x-auto mb-2">
            <table className="w-full border-collapse border border-black text-center">
              <thead>
                <tr>
                  <th className={`${cell} font-semibold w-12`}>№ п/п</th>
                  <th className={`${cell} font-semibold`}>Находится на учёте</th>
                  <th className={`${cell} font-semibold w-36`}>Остаток на {onRu} (факт), г</th>
                  <th className={`${cell} font-semibold w-36`}>Остаток на {onRu} (баланс), г</th>
                  <th className={`${cell} font-semibold w-32`}>Излишки, г</th>
                  <th className={`${cell} font-semibold w-32`}>Недостача, г</th>
                </tr>
                <tr>{[1, 2, 3, 4, 5, 6].map(i => <th key={i} className={`${cell} font-normal py-0.5`}>{i}</th>)}</tr>
              </thead>
              <tbody>
                {groups.length === 0 && (
                  <tr><td colSpan={6} className={`${cell} text-gray-500 py-4`}>Нет драгоценных металлов в НЗП по заданным параметрам</td></tr>
                )}
                {groups.map(g => {
                  const t = totals(g.rows);
                  return (
                    <React.Fragment key={g.metal.id}>
                      <tr className="bg-gray-50 font-semibold">
                        <td className={cell}></td>
                        <td className={`${cell} text-left`}>{g.metal.name} по кладовым</td>
                        <td className={`${cell} text-right`}>{fmt(t.fact)}</td>
                        <td className={`${cell} text-right`}>{fmt(t.bal)}</td>
                        <td className={`${cell} text-right`}>{fmt(t.plus)}</td>
                        <td className={`${cell} text-right`}>{fmt(t.minus)}</td>
                      </tr>
                      {g.rows.map(r => {
                        n += 1;
                        const f = factOf(r.key, r.bal);
                        return (
                          <tr key={r.key}>
                            <td className={cell}>{n}</td>
                            <td className={`${cell} text-left pl-6`}>{r.who}</td>
                            <td className={`${cell} p-0`}>
                              <input
                                value={fact[r.key] ?? r.bal.toFixed(2)}
                                onChange={e => setFact(x => ({ ...x, [r.key]: e.target.value }))}
                                className="w-full px-2 py-1 text-right bg-yellow-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                title="Фактический остаток по результатам инвентаризации"
                              />
                            </td>
                            <td className={`${cell} text-right`}>{r.bal.toFixed(2)}</td>
                            <td className={`${cell} text-right ${f > r.bal + 0.004 ? "text-green-700 font-semibold" : ""}`}>{fmt(Math.max(f - r.bal, 0))}</td>
                            <td className={`${cell} text-right ${r.bal > f + 0.004 ? "text-red-600 font-semibold" : ""}`}>{fmt(Math.max(r.bal - f, 0))}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <tr className="font-bold">
                  <td className={cell}></td>
                  <td className={`${cell} text-left`}>Итого:</td>
                  <td className={`${cell} text-right`}>{fmt(total.fact)}</td>
                  <td className={`${cell} text-right`}>{fmt(total.bal)}</td>
                  <td className={`${cell} text-right`}>{fmt(total.plus)}</td>
                  <td className={`${cell} text-right`}>{fmt(total.minus)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 mb-6">«Факт» заполнен учётным остатком — введите массу по результатам инвентаризации, излишки и недостача пересчитаются.</p>

          <p className="mb-1">
            Рассмотрев представленные документы и проанализировав итоги инвентаризации по состоянию на {longDate(onDate)} комиссия отмечает:
          </p>
          <p className="mb-4 whitespace-pre-line">{otmechaet.trim() || <span className="border-b border-black inline-block w-full">&nbsp;</span>}</p>

          <p className="mb-1">Комиссия считает необходимым:</p>
          <div className="mb-8">
            {(neobhodimo.trim() ? neobhodimo.split("\n").filter(s => s.trim()) : [""]).map((t, i) => (
              <p key={i} className="flex gap-3"><span>{i + 1}.</span>{t ? <span>{t}</span> : <span className="border-b border-black flex-1">&nbsp;</span>}</p>
            ))}
          </div>

          <SignRow role="Председатель комиссии" />
          <SignRow role="Зам. пред. комиссии" />
          <SignRow role="Члены комиссии:" />
          <SignRow role="" />
        </div>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
