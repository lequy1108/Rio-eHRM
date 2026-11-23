'use client';

import { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useDebounce } from '@/hooks/use-debounce';
import { useEmployeeOptions } from '@/lib/queries';

/** Chọn nhân viên, tìm trên server theo tên hoặc mã */
export function EmployeePicker({
  value,
  onChange,
  selectedLabel,
  excludeId,
  placeholder = 'Chọn nhân viên…',
  invalid,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  selectedLabel?: string;
  excludeId?: string;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);
  const { data = [], isFetching } = useEmployeeOptions(debounced);

  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={data.filter((o) => o.value !== excludeId)}
      onSearch={setSearch}
      loading={isFetching}
      selectedLabel={selectedLabel}
      placeholder={placeholder}
      searchPlaceholder="Gõ tên hoặc mã nhân viên…"
      invalid={invalid}
    />
  );
}
