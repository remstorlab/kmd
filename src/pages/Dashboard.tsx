import React from "react";
import { useApp } from "../store/AppContext";
import { PageHeader, Badge } from "../components/ui";
import { Metal } from "../data/mock";
import { Coins, Repeat, Gem, Activity, Clock } from "lucide-react";

const metalName: Record<Metal, string> = {
  Au: "Золото",
  Ag: "Серебро",
  Pt: "Платина",
  Pd: "Палладий",
};

const metalColor: Record<Metal, string> = {
  Au: "bg-yellow-500",
  Ag: "bg-slate-400",
  Pt: "bg-blue-500",
  Pd: "bg-indigo-400",
};

const statusColor: Record<string, string> = {
  "На складе": "bg-green-500",
  "Резерв": "bg-yellow-500",
  "В обработке": "bg-blue-500",
  "Зарезервировано": "bg-yellow-500",
  "В подотчёте": "bg-blue-500",
};

function fmt(n: number, digits = 1) {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function StatCard({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 ${onClick ? "cursor-pointer hover:shadow-md hover:border-blue-300 transition-all" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

function BarRow({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(value > 0 ? 3 : 0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500 text-xs">{fmt(value)} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { dmItems, gpItems, podotchetniki, operations, logs, currentUser, navigate } = useApp();

  // ── Часть 1: всего на складе (ДМ), по видам металла ──────────────────────
  const dmByMetal = dmItems.reduce((acc, i) => {
    acc[i.metal] = (acc[i.metal] || 0) + i.netWeight;
    return acc;
  }, {} as Record<Metal, number>);
  const dmMetals = (Object.keys(dmByMetal) as Metal[]).sort((a, b) => dmByMetal[b] - dmByMetal[a]);
  const totalDM = Object.values(dmByMetal).reduce((s, v) => s + v, 0);
  const maxDM = Math.max(...Object.values(dmByMetal), 1);

  // ── Часть 2: выдано в оборот (у подотчётных лиц) ─────────────────────────
  const inCirculation = podotchetniki
    .filter(p => p.materials.length > 0)
    .map(p => ({ name: p.name, weight: p.materials.reduce((s, m) => s + m.weight, 0) }))
    .sort((a, b) => b.weight - a.weight);
  const issuedTotal = inCirculation.reduce((s, p) => s + p.weight, 0);
  const maxIssued = Math.max(...inCirculation.map(p => p.weight), 1);

  // ── Часть 3: готовая продукция на складе ─────────────────────────────────
  const gpByStatus = gpItems.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + i.qty;
    return acc;
  }, {} as Record<string, number>);
  const gpInStockQty = gpByStatus["На складе"] || 0;
  const gpTotalQty = Object.values(gpByStatus).reduce((s, v) => s + v, 0);
  const maxGpStatus = Math.max(...Object.values(gpByStatus), 1);

  const openOps = operations.filter(o => o.statusClose !== "Закрыто" && o.statusClose !== "Закрыто: списано").length;
  const recentLogs = logs.slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Добро пожаловать, ${currentUser?.name ?? ""}`}
        subtitle="Сводка по состоянию склада на текущий момент"
        breadcrumb={["Главная"]}
      />

      {/* Три части сводки */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Всего на складе (ДМ)"
          value={`${fmt(totalDM)} г`}
          sub={dmMetals.map(m => `${metalName[m]} ${fmt(dmByMetal[m])} г`).join(" · ")}
          onClick={() => navigate("ostatok-dm")}
        />
        <StatCard
          icon={<Repeat className="w-5 h-5" />}
          label="Выдано в оборот"
          value={`${fmt(issuedTotal)} г`}
          sub={`У ${inCirculation.length} подотчётных лиц`}
          onClick={() => navigate("podotchetniki")}
        />
        <StatCard
          icon={<Gem className="w-5 h-5" />}
          label="Готовая продукция на складе"
          value={`${gpInStockQty} шт`}
          sub={`Всего выпущено ${gpTotalQty} шт`}
          onClick={() => navigate("ostatok-gp")}
        />
      </div>

      {/* Визуальный дашборд */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">ДМ на складе по видам металла</h3>
          <div className="space-y-4">
            {dmMetals.map(m => (
              <BarRow key={m} label={metalName[m]} value={dmByMetal[m]} max={maxDM} unit="г" color={metalColor[m]} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Готовая продукция по статусам</h3>
          <div className="space-y-4">
            {Object.keys(gpByStatus).map(s => (
              <BarRow key={s} label={s} value={gpByStatus[s]} max={maxGpStatus} unit="шт" color={statusColor[s] || "bg-blue-600"} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">В обороте по подотчётным лицам</h3>
          {inCirculation.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Материалы никому не выданы</p>
          ) : (
            <div className="space-y-4">
              {inCirculation.map(p => (
                <BarRow key={p.name} label={p.name} value={p.weight} max={maxIssued} unit="г" color="bg-blue-600" />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Последние события</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              {openOps} операций в работе
            </span>
          </div>
          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2.5">
                <Clock className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-gray-800 truncate">{log.description}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {log.datetime} · {log.user}
                    <Badge label={log.type} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
