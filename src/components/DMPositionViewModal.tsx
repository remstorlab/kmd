import React from "react";
import { Badge, Btn, Modal, Field, Input, useMaterialCodeLabel } from "./ui";
import { ChemComposition } from "../data/mock";
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
}

const val = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

// Модалка «Просмотр позиции ДМ» — общая для склада ДМ и операций движения материала
export default function DMPositionViewModal({ item, onClose }: { item: DMPositionView; onClose: () => void }) {
  const codeLabel = useMaterialCodeLabel();
  return (
    <Modal title="Просмотр позиции ДМ" onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Закрыть</Btn>}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Наименование" full><Input value={item.name} disabled /></Field>
        <Field label="Номенкл. №"><Input value={item.nomenkl} disabled /></Field>
        <Field label="Класс"><Input value={item.klass} disabled /></Field>
        <Field label="Код материала"><Input value={item.metal ? codeLabel(item.metal) : "—"} disabled /></Field>
        <Field label="Количество"><Input value={val(item.qty)} disabled /></Field>
        <Field label="Проба"><Input value={val(item.proba)} disabled /></Field>
        <Field label="Лигатурный вес г"><Input value={val(item.ligWeight)} disabled /></Field>
        <Field label="Чистый вес г"><Input value={val(item.netWeight)} disabled /></Field>
        <Field label="Место хранения" full><Input value={item.location || "—"} disabled /></Field>
        <Field label="Статус">{item.status ? <Badge label={item.status} group="pozicii" /> : <Input value="—" disabled />}</Field>
      </div>
      <ChemCompositionBlock value={item.chem} disabled />
    </Modal>
  );
}
