"use client";

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="relative border-b border-white/[0.06]">
      <div className="flex items-center gap-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative px-4 py-3 text-sm font-medium transition ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t.label}
              <span
                className={`absolute left-3 right-3 -bottom-px h-px transition-all duration-300 ${isActive ? "bg-violet-400" : "bg-transparent left-1/2 right-1/2"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
