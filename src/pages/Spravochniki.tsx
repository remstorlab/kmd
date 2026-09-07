import React, { useState } from "react";
import { PageHeader, Btn, Modal, EditIcon, Badge, useToast, Toast, Field, Input, Select } from "../components/ui";
import { spravochniki } from "../data/mock";

type SpravKey = keyof typeof spravochniki;

function DictPage({ name, onBack }: { name: SpravKey; onBack: () => void }) {
  const dict = spravochniki[name];
  const [items, setItems] = useState(dict.items);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<{ code: string; value: string; status: string } | null>(null);
  const { toast, show, clear } = useToast();

  const save = (item: { code: string; value: string; status: string }) => {
    if (editItem) {
      setItems(prev => prev.map(i => i.code === editItem.code ? item : i));
    } else {
      setItems(prev => [...prev, item]);
    }
    setShowAdd(false);
    setEditItem(null);
    show("Запись сохранена");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Назад к справочникам
      </button>

      <div className="text-xs text-gray-500 mb-4">Справочники / {name}</div>

      <PageHeader
        title={name}
        subtitle={`${dict.count} значений`}
        actions={<Btn onClick={() => setShowAdd(true)}>+ Добавить запись</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Код</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Значение</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Статус</th>
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                <td className="px-4 py-3 text-gray-900">{item.value}</td>
                <td className="px-4 py-3"><Badge label={item.status} /></td>
                <td className="px-4 py-3"><EditIcon onClick={() => setEditItem(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editItem) && (
        <Modal
          title={editItem ? "Редактировать запись" : "Добавить запись"}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          footer={
            <>
              <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Отмена</Btn>
              <Btn onClick={() => save({ code: editItem?.code || "", value: editItem?.value || "", status: "Активно" })}>Сохранить</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Код"><Input value={editItem?.code || ""} onChange={v => editItem && setEditItem({ ...editItem, code: v })} disabled={!!editItem} /></Field>
            <Field label="Значение"><Input value={editItem?.value || ""} onChange={v => editItem && setEditItem({ ...editItem, value: v })} /></Field>
            <Field label="Статус"><Select value="Активно" options={["Активно", "Неактивно"]} /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function Spravochniki() {
  const [selected, setSelected] = useState<SpravKey | null>(null);

  if (selected) {
    return <DictPage name={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Справочники"
        subtitle="Системные словари и классификаторы"
        breadcrumb={["Справочники"]}
      />

      <div className="grid grid-cols-4 gap-4">
        {(Object.entries(spravochniki) as [SpravKey, typeof spravochniki[SpravKey]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all hover:border-blue-300 group"
          >
            <div className="text-2xl mb-3">{val.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{key}</h3>
            <p className="text-sm text-gray-400">{val.count} значений</p>
          </button>
        ))}
      </div>
    </div>
  );
}
