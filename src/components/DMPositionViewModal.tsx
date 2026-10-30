import React from "react";
import { Badge, PosStatusBadge, Btn, Modal, Field, Input, useMaterialCodeLabel } from "./ui";
import { ChemComposition, isStoneKlass } from "../data/mock";
import { mainElementOf } from "../data/chem";
import { useApp } from "../store/AppContext";
import ChemCompositionBlock from "./ChemCompositionBlock";

// Позиция ДМ для просмотра: все поля позиции склада ДМ и химический состав
export interface DMPositionView {
  name: string;
  nomenkl: string;
  klass: string;
  metal: string;
  qty?: number | null;
  proba?: number | null;
  ligWeight?: number | null;
  netWeight?: number | null;
  location: string;
  status?: string;
  chem?: ChemComposition;
  info?: string;
}

const val = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

// Модалка «Просмотр позиции ДМ» — общая для склада ДМ и операций движения материала
export default function DMPositionViewModal({ item, onClose }: { item: DMPositionView; onClose: () => void }) {
  const codeLabel = useMaterialCodeLabel();
  const { materialCodes } = useApp();
  return (
    <Modal title="Просмотр позиции ДМ" wide onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Закрыть</Btn>}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Field label="Наименование" full><Input value={item.name} disabled /></Field>
        <Field label="Номенкл. №"><Input value={item.nomenkl} disabled /></Field>
        <Field label="Класс"><Input value={item.klass} disabled /></Field>
        <Field label="Код материала"><Input value={item.metal ? codeLabel(item.metal) : "—"} disabled /></Field>
        <Field label="Количество изделий"><Input value={val(item.qty)} disabled /></Field>
        <Field label="Проба"><Input value={val(item.proba)} disabled /></Field>
        <Field label="Лигатурный вес г"><Input value={val(item.ligWeight)} disabled /></Field>
        <Field label="Чистый вес г"><Input value={val(item.netWeight)} disabled /></Field>
        <Field label="Место хранения" full><Input value={item.location || "—"} disabled /></Field>
        <Field label="Доп. информация" full><Input value={item.info || "—"} disabled /></Field>
        <Field label="Статус">{item.status ? <PosStatusBadge status={item.status} nomenkl={item.nomenkl} /> : <Input value="—" disabled />}</Field>
      </div>
      {!isStoneKlass(item.klass) && <ChemCompositionBlock value={item.chem} disabled lig={item.ligWeight ?? 0} main={item.metal ? mainElementOf(item.metal, materialCodes) : undefined} proba={item.proba ? String(item.proba) : ""} net={item.netWeight ?? undefined} />}
    </Modal>
  );
}
