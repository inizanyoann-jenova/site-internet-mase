// src/components/matrice/views/MatriceView.tsx
import { useMatrice } from '../MatriceContext';
import { computeRedundancy } from '../matrice.utils';

const LEVEL_COLORS = ['#8e9eab', '#e67e22', '#27ae60', '#2980b9'];
const LEVEL_LABELS = ['—', 'Formation', 'Autonome', 'Expert'];

export function MatriceView() {
  const { data, dispatch } = useMatrice();
  const { config, comps, employees } = data;
  const redundancy = computeRedundancy(comps, employees);

  const catGroups = config.categories.map(cat => ({
    cat,
    comps: comps.filter(c => c.categoryId === cat.id),
  })).filter(g => g.comps.length > 0);

  function cycleSkill(employeeId: string, compId: string, current: number) {
    dispatch({ type: 'SET_SKILL', employeeId, compId, level: (current + 1) % 4 });
  }

  if (comps.length === 0 || employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-sm">Ajoutez des compétences et des collaborateurs pour construire la matrice.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Légende */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: '#dee2e6', background: '#f8f9fa' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white text-sm" style={{ background: color }}>
              {i}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">{LEVEL_LABELS[i]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Matrice scrollable */}
      <div className="overflow-auto rounded-lg shadow" style={{ maxHeight: 'calc(100vh - 320px)', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {/* Ligne 1 : catégories */}
            <tr>
              <th
                rowSpan={2}
                style={{
                  background: '#0d2137', color: '#fff', padding: '10px 16px',
                  position: 'sticky', left: 0, top: 0, zIndex: 40,
                  borderRight: '3px solid #2563a8', borderBottom: '3px solid #2563a8',
                  minWidth: 200, textAlign: 'left', fontSize: 12,
                }}
              >
                Collaborateur / Compétence
              </th>
              {catGroups.map(({ cat, comps: cc }) => (
                <th
                  key={cat.id}
                  colSpan={cc.length}
                  style={{
                    background: cat.color, color: '#fff',
                    textAlign: 'center', padding: '6px 10px',
                    position: 'sticky', top: 0, zIndex: 21,
                    borderRight: '2px solid rgba(255,255,255,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                </th>
              ))}
            </tr>
            {/* Ligne 2 : compétences */}
            <tr>
              {catGroups.flatMap(({ cat, comps: cc }) =>
                cc.map(comp => (
                  <th
                    key={comp.id}
                    style={{
                      background: cat.color, color: '#fff',
                      padding: '6px 8px', textAlign: 'center',
                      position: 'sticky', top: 42, zIndex: 20,
                      borderRight: '1px solid rgba(255,255,255,0.2)',
                      borderBottom: '3px solid rgba(0,0,0,0.2)',
                      minWidth: 120, maxWidth: 130, fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {comp.name}
                    {comp.isKey && <span style={{ display: 'block', fontSize: 9, opacity: 0.8 }}>★ Poste clé</span>}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, rowIdx) => (
              <tr key={emp.id} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafbfd' }}>
                <td
                  style={{
                    position: 'sticky', left: 0, zIndex: 10, background: 'inherit',
                    padding: '8px 14px', borderRight: '3px solid #dee2e6',
                    borderBottom: '1px solid #f1f3f4',
                    boxShadow: '3px 0 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3a5c' }}>
                    {emp.name}
                    {emp.isAbsent && (
                      <span style={{ marginLeft: 6, background: '#fee2e2', color: '#c0392b', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700 }}>
                        ABSENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d', fontStyle: 'italic' }}>{emp.role}</div>
                </td>
                {catGroups.flatMap(({ comps: cc }) =>
                  cc.map(comp => {
                    const level = emp.skills[comp.id] ?? 0;
                    return (
                      <td
                        key={comp.id}
                        onClick={() => cycleSkill(emp.id, comp.id, level)}
                        title={`${emp.name} — ${comp.name} : ${LEVEL_LABELS[level]} (clic pour modifier)`}
                        style={{
                          background: LEVEL_COLORS[level],
                          textAlign: 'center', verticalAlign: 'middle',
                          cursor: 'pointer', userSelect: 'none',
                          width: 120, height: 56,
                          borderRight: '1px solid rgba(255,255,255,0.15)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          transition: 'filter 0.1s, transform 0.1s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.filter = 'brightness(0.8)';
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.filter = 'none';
                          (e.currentTarget as HTMLElement).style.transform = 'none';
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, display: 'block', lineHeight: 1 }}>{level}</span>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {LEVEL_LABELS[level]}
                        </span>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
            {/* Ligne redondance */}
            <tr>
              <td
                style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#343a40', color: '#fff',
                  padding: '8px 14px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  boxShadow: '3px 0 6px rgba(0,0,0,0.15)',
                }}
              >
                Redondance (niveau ≥ 2)
              </td>
              {catGroups.flatMap(({ comps: cc }) =>
                cc.map(comp => {
                  const count = redundancy[comp.id] ?? 0;
                  const isCrit = comp.isKey && count < comp.minBackups;
                  return (
                    <td
                      key={comp.id}
                      style={{
                        background: isCrit ? '#c0392b' : '#1e8449',
                        color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 15,
                        borderRight: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {count}
                      {comp.isKey && (
                        <span style={{ display: 'block', fontSize: 9, opacity: 0.8 }}>
                          / {comp.minBackups} req.
                        </span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
