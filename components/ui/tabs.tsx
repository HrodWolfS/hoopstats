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
    // Sur mobile, les onglets défilent horizontalement plutôt que d'élargir
    // la page ; la marge négative laisse le dernier onglet aller jusqu'au bord.
    <div className="relative border-b border-white/[0.06] -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
      <div role="tablist" className="flex items-center gap-1 w-max">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={`relative shrink-0 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium transition ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t.label}
              <span
                className={`absolute left-3 right-3 -bottom-px h-px transition-all duration-300 ${isActive ? "bg-orange-400" : "bg-transparent left-1/2 right-1/2"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
