// src/components/cartographie/shared/MapPreview.tsx
import type { ProcessDefinition } from '../../../types/cartographie';

interface Props {
  processes: ProcessDefinition[];
  companyName: string;
  compact?: boolean;
}

function sortRealisation(processes: ProcessDefinition[]): ProcessDefinition[][] {
  const realisation = processes.filter((p) => p.type === 'realisation');
  if (realisation.length === 0) return [];

  const ordered: ProcessDefinition[] = [];
  const remaining = [...realisation];

  let current = remaining.filter((p) => !p.afterProcessId || !realisation.find((r) => r.id === p.afterProcessId));
  while (current.length > 0 && ordered.length < realisation.length) {
    current.forEach((p) => {
      if (!ordered.find((o) => o.id === p.id)) ordered.push(p);
    });
    const orderedIds = ordered.map((o) => o.id);
    current = remaining.filter((p) => !ordered.find((o) => o.id === p.id) && p.afterProcessId && orderedIds.includes(p.afterProcessId));
  }
  remaining.forEach((p) => { if (!ordered.find((o) => o.id === p.id)) ordered.push(p); });

  const groups: ProcessDefinition[][] = [];
  ordered.forEach((p) => {
    if (p.parallelGroupId) {
      const existing = groups.find((g) => g[0]?.parallelGroupId === p.parallelGroupId);
      if (existing) { existing.push(p); return; }
    }
    groups.push([p]);
  });
  return groups;
}

function ProcessBox({ process, compact }: { process: ProcessDefinition; compact?: boolean }) {
  const color = process.type === 'pilotage' ? '#3b82f6' :
                process.type === 'realisation' ? '#16a34a' : '#ca8a04';
  const bg = process.type === 'pilotage' ? '#dbeafe' :
             process.type === 'realisation' ? '#dcfce7' : '#fef9c3';

  return (
    <div
      className="rounded text-center"
      style={{
        border: `1px solid ${color}`,
        backgroundColor: bg,
        padding: compact ? '4px 8px' : '8px 12px',
        minWidth: compact ? 80 : 100,
      }}
    >
      <div style={{ fontSize: compact ? 9 : 11, fontWeight: 700, color }}>{process.name}</div>
      {!compact && process.pilotName && (
        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{process.pilotName}</div>
      )}
    </div>
  );
}

function Arrow({ label, compact }: { label?: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ flexShrink: 0 }}>
      {label && !compact && (
        <span style={{ fontSize: 8, color: '#16a34a', whiteSpace: 'nowrap', maxWidth: 60, textAlign: 'center', lineHeight: 1.2, marginBottom: 1 }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: compact ? 12 : 14, color: '#16a34a' }}>→</span>
    </div>
  );
}

export default function MapPreview({ processes, companyName, compact }: Props) {
  const pilotage = processes.filter((p) => p.type === 'pilotage');
  const realisationGroups = sortRealisation(processes);
  const support = processes.filter((p) => p.type === 'support');

  const borderStyle = '2px solid';

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%' }}>
      {!compact && (
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          Cartographie des Processus — {companyName}
        </div>
      )}

      {/* PILOTAGE */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 rounded mb-2 p-3"
        style={{ border: `${borderStyle} #3b82f6`, backgroundColor: '#eff6ff' }}
      >
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#1e40af', marginRight: 8, whiteSpace: 'nowrap' }}>
          PROCESSUS DE PILOTAGE
        </div>
        {pilotage.length === 0
          ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
          : pilotage.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)
        }
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#3b82f6', marginBottom: 4 }}>
        ↕ oriente et contrôle
      </div>

      {/* RÉALISATION ZONE with CLIENT left/right */}
      <div className="flex items-center gap-2 mb-2">
        {/* CLIENT left */}
        <div
          className="flex flex-shrink-0 flex-col items-center justify-center rounded text-center"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4', padding: compact ? '8px 4px' : '12px 8px', minWidth: compact ? 44 : 56 }}
        >
          <div style={{ fontSize: 16 }}>👤</div>
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534' }}>CLIENT</div>
          {!compact && <div style={{ fontSize: 8, color: '#166534' }}>Besoins</div>}
        </div>

        <Arrow label={realisationGroups[0]?.[0]?.inputElement} compact={compact} />

        {/* RÉALISATION */}
        <div
          className="flex-1 rounded p-3"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4' }}
        >
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534', marginBottom: 6, textAlign: 'center' }}>
            PROCESSUS DE RÉALISATION
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {realisationGroups.length === 0
              ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
              : realisationGroups.map((group, gi) => (
                <div key={gi} className="flex items-center gap-1">
                  {gi > 0 && <Arrow label={realisationGroups[gi - 1]?.[0]?.outputElement} compact={compact} />}
                  {group.length === 1
                    ? <ProcessBox process={group[0]} compact={compact} />
                    : (
                      <div className="flex flex-col gap-1 items-center">
                        <div style={{ fontSize: 8, color: '#94a3b8' }}>// parallèle</div>
                        {group.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)}
                      </div>
                    )
                  }
                </div>
              ))
            }
          </div>
        </div>

        <Arrow label={realisationGroups[realisationGroups.length - 1]?.[0]?.outputElement} compact={compact} />

        {/* CLIENT right */}
        <div
          className="flex flex-shrink-0 flex-col items-center justify-center rounded text-center"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4', padding: compact ? '8px 4px' : '12px 8px', minWidth: compact ? 44 : 56 }}
        >
          <div style={{ fontSize: 16 }}>😊</div>
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534' }}>CLIENT</div>
          {!compact && <div style={{ fontSize: 8, color: '#166534' }}>Satisfaction</div>}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#ca8a04', marginBottom: 4 }}>
        ↕ fournit les ressources
      </div>

      {/* SUPPORT */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 rounded p-3"
        style={{ border: `${borderStyle} #ca8a04`, backgroundColor: '#fffbeb' }}
      >
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#92400e', marginRight: 8, whiteSpace: 'nowrap' }}>
          PROCESSUS SUPPORT
        </div>
        {support.length === 0
          ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
          : support.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)
        }
      </div>
    </div>
  );
}
