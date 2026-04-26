'use client';

import { useRef } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '@/context/inventory-context';

export function ArticlePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { items } = useInventory();
  const selectRef = useRef<HTMLSelectElement>(null);

  const add = (id: string) => {
    onChange([...selected, id]);
    if (selectRef.current) selectRef.current.value = '';
  };

  const remove = (index: number) =>
    onChange(selected.filter((_, i) => i !== index));

  if (items.length === 0) return (
    <p className="text-xs text-slate-400 italic">No inventory articles yet.</p>
  );

  return (
    <div className="space-y-2">
      <select
        ref={selectRef}
        defaultValue=""
        onChange={e => { if (e.target.value) add(e.target.value); }}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700"
      >
        <option value="" disabled>Select an article…</option>
        {items.map(item => (
          <option key={item.id} value={item.id}>
            {item.name} — {item.volume}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id, index) => {
            const item = items.find(i => i.id === id);
            return (
              <span key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg">
                {item?.name ?? 'Unknown'}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
