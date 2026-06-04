'use strict';

// =========================================================
// DONNÉES PAR DÉFAUT (démo)
// =========================================================
const DEMO_DATA = {
  positions: [
    { id: 'p1', name: 'Opérateur Machine A', department: 'Production', isKey: true, minBackups: 2 },
    { id: 'p2', name: 'Opérateur Machine B', department: 'Production', isKey: true, minBackups: 2 },
    { id: 'p3', name: 'Régleur', department: 'Production', isKey: true, minBackups: 1 },
    { id: 'p4', name: 'Contrôle Qualité', department: 'Qualité', isKey: true, minBackups: 1 },
    { id: 'p5', name: 'Logistique / Cariste', department: 'Logistique', isKey: false, minBackups: 1 },
    { id: 'p6', name: 'Maintenance', department: 'Maintenance', isKey: true, minBackups: 1 },
    { id: 'p7', name: 'Conditionnement', department: 'Production', isKey: false, minBackups: 1 },
  ],
  employees: [
    { id: 'e1', name: 'Alice Martin', department: 'Production', primaryPositionId: 'p1', isAbsent: false, absenceReason: '', skills: { p1:3, p2:2, p3:1, p4:0, p5:0, p6:0, p7:2 } },
    { id: 'e2', name: 'Bob Dupont', department: 'Production', primaryPositionId: 'p2', isAbsent: true, absenceReason: 'Arrêt maladie', skills: { p1:2, p2:3, p3:2, p4:0, p5:0, p6:0, p7:1 } },
    { id: 'e3', name: 'Claire Bernard', department: 'Production', primaryPositionId: 'p3', isAbsent: false, absenceReason: '', skills: { p1:1, p2:1, p3:3, p4:1, p5:0, p6:1, p7:0 } },
    { id: 'e4', name: 'David Moreau', department: 'Qualité', primaryPositionId: 'p4', isAbsent: false, absenceReason: '', skills: { p1:0, p2:0, p3:0, p4:3, p5:1, p6:0, p7:2 } },
    { id: 'e5', name: 'Eva Rousseau', department: 'Logistique', primaryPositionId: 'p5', isAbsent: false, absenceReason: '', skills: { p1:0, p2:0, p3:0, p4:2, p5:3, p6:0, p7:1 } },
    { id: 'e6', name: 'François Petit', department: 'Maintenance', primaryPositionId: 'p6', isAbsent: false, absenceReason: '', skills: { p1:1, p2:1, p3:2, p4:0, p5:0, p6:3, p7:0 } },
    { id: 'e7', name: 'Gaëlle Simon', department: 'Production', primaryPositionId: 'p1', isAbsent: false, absenceReason: '', skills: { p1:2, p2:1, p3:0, p4:0, p5:2, p6:0, p7:3 } },
    { id: 'e8', name: 'Hugo Lambert', department: 'Production', primaryPositionId: 'p7', isAbsent: false, absenceReason: '', skills: { p1:1, p2:2, p3:1, p4:0, p5:1, p6:0, p7:2 } },
  ]
};

// =========================================================
// STATE
// =========================================================
let state = { positions: [], employees: [] };
let currentView = 'dashboard';
let activeFilter = 'all';

function loadState() {
  try {
    const saved = localStorage.getItem('polyvalence_v2');
    if (saved) { state = JSON.parse(saved); return true; }
  } catch(e) {}
  return false;
}

function saveState() {
  localStorage.setItem('polyvalence_v2', JSON.stringify(state));
}

function resetData() {
  if (!confirm('Réinitialiser toutes les données avec les données de démonstration ?')) return;
  localStorage.removeItem('polyvalence_v2');
  state = JSON.parse(JSON.stringify(DEMO_DATA));
  saveState();
  navigate(currentView);
}

// =========================================================
// UTILS
// =========================================================
function uid() {
  return '_' + Math.random().toString(36).slice(2, 9);
}

function getDepartments() {
  const depts = new Set([
    ...state.employees.map(e => e.department),
    ...state.positions.map(p => p.department)
  ]);
  return ['all', ...Array.from(depts).sort()];
}

function getAvatarColor(name) {
  const colors = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#9333ea','#c026d3'];
  let hash = 0;
  for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function levelLabel(level) {
  return ['–', 'En formation', 'Autonome', 'Expert / Formateur'][level] || '–';
}
function levelShort(level) {
  return ['–', 'F', 'A', 'E'][level] || '–';
}

// =========================================================
// CALCULATIONS — alertes & remplacements
// =========================================================

/** Employés disponibles (non absents) qui peuvent faire ce poste (lvl >= 1) */
function getAvailableForPosition(positionId) {
  return state.employees.filter(e =>
    !e.isAbsent &&
    e.primaryPositionId !== positionId && // On exclut le titulaire principal
    (e.skills[positionId] || 0) >= 2      // Au moins autonome
  );
}

/** Employés pouvant remplacer une personne sur ses postes (lvl >= 2) */
function getReplacementsFor(employeeId) {
  const emp = state.employees.find(e => e.id === employeeId);
  if (!emp) return [];
  const posIds = Object.entries(emp.skills)
    .filter(([pid, lvl]) => lvl >= 1)
    .map(([pid]) => pid);

  return posIds.map(pid => {
    const pos = state.positions.find(p => p.id === pid);
    if (!pos) return null;
    const empLevel = emp.skills[pid] || 0;
    const replacements = state.employees.filter(e =>
      e.id !== employeeId &&
      !e.isAbsent &&
      (e.skills[pid] || 0) >= 2
    );
    return { pos, empLevel, replacements };
  }).filter(Boolean);
}

/** Analyse de couverture pour les postes clés */
function getKeyPositionAlerts() {
  const alerts = [];
  for (const pos of state.positions) {
    if (!pos.isKey) continue;
    const available = getAvailableForPosition(pos.id);
    const needed = pos.minBackups || 1;
    const primaryHolder = state.employees.filter(e =>
      e.primaryPositionId === pos.id && !e.isAbsent
    );
    const totalCoverage = available.length + primaryHolder.length;
    // Count people who know this pos (lvl >= 2) regardless of primary
    const totalKnowing = state.employees.filter(e =>
      !e.isAbsent && (e.skills[pos.id] || 0) >= 2
    ).length;

    const absentPrimary = state.employees.filter(e =>
      e.primaryPositionId === pos.id && e.isAbsent
    );

    let status = 'ok'; // ok | warning | critical
    let reason = '';

    if (totalKnowing === 0) {
      status = 'critical'; reason = 'Aucune personne disponible pour ce poste';
    } else if (absentPrimary.length > 0 && available.length === 0) {
      status = 'critical'; reason = `Titulaire absent et aucun remplaçant disponible`;
    } else if (available.length < needed) {
      status = 'warning'; reason = `Seulement ${available.length} remplaçant(s) disponible(s) (minimum requis : ${needed})`;
    }

    if (status !== 'ok') {
      alerts.push({ pos, status, reason, available, absentPrimary });
    }
  }
  return alerts;
}

function getStats() {
  const absent = state.employees.filter(e => e.isAbsent).length;
  const keyPos = state.positions.filter(p => p.isKey).length;
  const alerts = getKeyPositionAlerts();
  const criticals = alerts.filter(a => a.status === 'critical').length;
  return {
    employees: state.employees.length,
    positions: state.positions.length,
    absent,
    keyPos,
    criticals,
    warnings: alerts.filter(a => a.status === 'warning').length
  };
}

// =========================================================
// NAVIGATION
// =========================================================
function navigate(view) {
  currentView = view;
  activeFilter = 'all';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const titles = { dashboard: 'Tableau de bord', matrix: 'Matrice de polyvalence', absences: 'Gestion des absences', employees: 'Employés', positions: 'Postes' };
  document.getElementById('topbar-title').textContent = titles[view] || view;
  document.getElementById('topbar-actions').innerHTML = getTopbarActions(view);
  document.getElementById('content').innerHTML = '';
  renders[view]();
}

function getTopbarActions(view) {
  if (view === 'employees') return `<button class="btn btn-primary btn-sm" onclick="openEmployeeModal()">+ Ajouter un employé</button>`;
  if (view === 'positions') return `<button class="btn btn-primary btn-sm" onclick="openPositionModal()">+ Ajouter un poste</button>`;
  if (view === 'matrix') return `<button class="btn btn-secondary btn-sm" onclick="window.print()">Imprimer</button>`;
  return '';
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrapper');
  if (window.innerWidth > 768) {
    sb.classList.toggle('hidden');
    mw.classList.toggle('full');
  } else {
    sb.classList.toggle('open');
  }
}

// =========================================================
// RENDERS
// =========================================================
const renders = { dashboard: renderDashboard, matrix: renderMatrix, absences: renderAbsences, employees: renderEmployees, positions: renderPositions };

// ---- DASHBOARD ----
function renderDashboard() {
  const stats = getStats();
  const alerts = getKeyPositionAlerts();
  const absentEmps = state.employees.filter(e => e.isAbsent);

  let alertsHtml = '';
  if (alerts.length === 0) {
    alertsHtml = `<div class="alert alert-success"><span class="alert-icon">✓</span><div><div class="alert-title">Tous les postes clés sont couverts</div><div class="alert-body">Aucune alerte de couverture pour le moment.</div></div></div>`;
  } else {
    for (const a of alerts) {
      const cls = a.status === 'critical' ? 'alert-danger' : 'alert-warning';
      const icon = a.status === 'critical' ? '⚠' : '!';
      const absentNames = a.absentPrimary.map(e => e.name).join(', ');
      const availNames = a.available.length > 0 ? a.available.map(e => `${e.name} (${levelLabel(e.skills[a.pos.id] || 0)})`).join(', ') : 'Aucun';
      alertsHtml += `
        <div class="alert ${cls}">
          <span class="alert-icon">${icon}</span>
          <div>
            <div class="alert-title">${a.pos.name} <span class="badge badge-${a.status === 'critical' ? 'red' : 'orange'}">${a.status === 'critical' ? 'CRITIQUE' : 'ATTENTION'}</span></div>
            <div class="alert-body">${a.reason}${absentNames ? `<br>Absent(s) : <b>${absentNames}</b>` : ''}<br>Remplaçants disponibles : <b>${availNames}</b></div>
          </div>
        </div>`;
    }
  }

  let absentHtml = '';
  if (absentEmps.length === 0) {
    absentHtml = `<p class="text-muted">Aucune absence en cours.</p>`;
  } else {
    absentHtml = absentEmps.map(e => {
      const repCount = getReplacementsFor(e.id).reduce((acc, r) => acc + r.replacements.length, 0);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--gray-100)">
        <div style="display:flex;align-items:center;gap:.6rem">
          <div class="emp-avatar" style="background:${getAvatarColor(e.name)}">${initials(e.name)}</div>
          <div>
            <div style="font-weight:600;font-size:13.5px">${e.name}</div>
            <div style="font-size:12px;color:var(--gray-400)">${e.absenceReason || 'Motif non précisé'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span class="badge ${repCount > 0 ? 'badge-green' : 'badge-red'}">${repCount} remplaçant(s)</span>
          <button class="btn btn-sm btn-secondary" onclick="navigate('absences')">Voir</button>
        </div>
      </div>`;
    }).join('');
  }

  // Coverage progress per key position
  const coverageHtml = state.positions.filter(p => p.isKey).map(pos => {
    const knowing = state.employees.filter(e => !e.isAbsent && (e.skills[pos.id] || 0) >= 2).length;
    const needed = pos.minBackups + 1;
    const pct = Math.min(100, Math.round((knowing / needed) * 100));
    const color = knowing === 0 ? 'var(--danger)' : knowing < pos.minBackups ? 'var(--warning)' : 'var(--success)';
    return `<div style="margin-bottom:.75rem">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:.3rem">
        <span style="font-weight:500">${pos.name}</span>
        <span style="color:${color};font-weight:600">${knowing} / ${needed} personnes</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${stats.employees}</div><div class="stat-label">Employés</div></div>
      <div class="stat-card"><div class="stat-value">${stats.positions}</div><div class="stat-label">Postes</div></div>
      <div class="stat-card ${stats.absent > 0 ? 'warning' : 'success'}"><div class="stat-value">${stats.absent}</div><div class="stat-label">Absences actuelles</div></div>
      <div class="stat-card ${stats.criticals > 0 ? 'danger' : stats.warnings > 0 ? 'warning' : 'success'}">
        <div class="stat-value">${stats.criticals + stats.warnings}</div><div class="stat-label">Alertes couverture</div>
      </div>
    </div>
    <div class="page-grid">
      <div>
        <div class="card mb-1">
          <div class="card-header">Alertes postes clés</div>
          <div class="card-body">${alertsHtml}</div>
        </div>
        <div class="card">
          <div class="card-header">Absences en cours <span class="badge badge-${absentEmps.length > 0 ? 'orange' : 'green'}">${absentEmps.length}</span></div>
          <div class="card-body">${absentHtml}</div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header">Couverture des postes clés</div>
          <div class="card-body">
            ${state.positions.filter(p => p.isKey).length === 0 ? '<p class="text-muted">Aucun poste clé défini.</p>' : coverageHtml}
          </div>
        </div>
      </div>
    </div>`;
}

// ---- MATRIX ----
function renderMatrix() {
  const dept = activeFilter;
  const positions = dept === 'all' ? state.positions : state.positions.filter(p => p.department === dept);
  const employees = dept === 'all' ? state.employees : state.employees.filter(e => e.department === dept);
  const depts = getDepartments();

  const filterHtml = depts.map(d => `<span class="filter-chip ${activeFilter === d ? 'active' : ''}" onclick="setMatrixFilter('${d}')">${d === 'all' ? 'Tous' : d}</span>`).join('');

  const legendHtml = `
    <div class="legend">
      <span class="legend-title">Niveaux :</span>
      <div class="legend-item"><div class="legend-dot" style="background:var(--level-0-bg);border:1.5px dashed var(--gray-200);color:var(--gray-300)">–</div> Pas de compétence</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--level-1-bg);border:1.5px solid var(--level-1-border);color:var(--level-1-text)">F</div> En formation</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--level-2-bg);border:1.5px solid var(--level-2-border);color:var(--level-2-text)">A</div> Autonome</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--level-3-bg);border:1.5px solid var(--level-3-border);color:var(--level-3-text)">E</div> Expert / Formateur</div>
      <div class="legend-item" style="margin-left:1rem"><div style="width:22px;height:22px;border:2px solid var(--primary);border-radius:4px"></div> Poste principal</div>
      <div class="legend-item"><div style="width:22px;height:22px;background:#7f1d1d;border-radius:4px"></div> Poste clé ★</div>
    </div>`;

  if (positions.length === 0 || employees.length === 0) {
    document.getElementById('content').innerHTML = `<div class="filter-bar">${filterHtml}</div>${legendHtml}<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon">◫</div><div class="empty-state-title">Aucune donnée à afficher</div><div class="empty-state-text">Ajoutez des employés et des postes pour construire la matrice.</div></div></div></div>`;
    return;
  }

  const headerCells = positions.map(p => `
    <th class="pos-header ${p.isKey ? 'key-pos' : ''}" title="${p.name} — ${p.department}${p.isKey ? ' (Poste clé)' : ''}">
      <span class="pos-header-name">${p.name}</span>
      ${p.isKey ? `<span class="pos-header-key">★ Clé</span>` : ''}
    </th>`).join('');

  const bodyRows = employees.map(emp => {
    const isPrimary = (posId) => emp.primaryPositionId === posId;
    const cells = positions.map(p => {
      const lvl = emp.skills[p.id] || 0;
      const tip = `${emp.name} — ${p.name} : ${levelLabel(lvl)}`;
      return `<td class="skill-cell lvl-${lvl} ${isPrimary(p.id) ? 'primary-pos' : ''}"
        onclick="cycleSkill('${emp.id}','${p.id}')"
        title="${tip}">
        <div class="skill-badge">${levelShort(lvl)}</div>
      </td>`;
    }).join('');

    const absentBadge = emp.isAbsent ? `<span class="emp-absent-badge">ABSENT</span>` : '';
    return `<tr class="${emp.isAbsent ? 'absent-emp-row' : ''}">
      <td class="emp-cell">
        <div class="emp-cell-inner">
          <div class="emp-avatar" style="background:${getAvatarColor(emp.name)}">${initials(emp.name)}</div>
          <div class="emp-info">
            <div class="emp-name">${emp.name}${absentBadge}</div>
            <div class="emp-dept">${emp.department}</div>
          </div>
        </div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="filter-bar">${filterHtml}</div>
    ${legendHtml}
    <div class="card">
      <div class="card-header">
        <span>Matrice — ${employees.length} employé(s) × ${positions.length} poste(s)</span>
        <span class="text-muted" style="font-size:12px">Cliquez sur une cellule pour modifier le niveau</span>
      </div>
      <div class="matrix-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner-cell">Employés ↓ / Postes →</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
}

function setMatrixFilter(dept) {
  activeFilter = dept;
  renderMatrix();
}

function cycleSkill(empId, posId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  const current = emp.skills[posId] || 0;
  emp.skills[posId] = (current + 1) % 4;
  saveState();
  renderMatrix();
}

// ---- ABSENCES ----
function renderAbsences() {
  const absentEmps = state.employees.filter(e => e.isAbsent);
  const presentEmps = state.employees.filter(e => !e.isAbsent);

  const absentSection = absentEmps.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-title">Aucune absence en cours</div></div>`
    : absentEmps.map(emp => renderAbsenceCard(emp)).join('');

  const presentRows = presentEmps.map(emp => `
    <tr>
      <td>
        <div class="flex-center gap-sm">
          <div class="emp-avatar" style="background:${getAvatarColor(emp.name)};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">${initials(emp.name)}</div>
          <div>
            <div style="font-weight:600">${emp.name}</div>
            <div style="font-size:12px;color:var(--gray-400)">${emp.department}</div>
          </div>
        </div>
      </td>
      <td>${state.positions.find(p => p.id === emp.primaryPositionId)?.name || '—'}</td>
      <td><span class="badge badge-green">Présent</span></td>
      <td><button class="btn btn-sm btn-warning" onclick="toggleAbsence('${emp.id}')">Déclarer absent</button></td>
    </tr>`).join('');

  document.getElementById('content').innerHTML = `
    <div class="page-grid">
      <div>
        <div class="card">
          <div class="card-header">Absences en cours <span class="badge badge-${absentEmps.length > 0 ? 'orange' : 'green'}">${absentEmps.length}</span></div>
          <div class="card-body">${absentSection}</div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header">Employés présents</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nom</th><th>Poste principal</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>${presentRows || '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:1.5rem">Tous les employés sont absents.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAbsenceCard(emp) {
  const replacements = getReplacementsFor(emp);
  const posMain = state.positions.find(p => p.id === emp.primaryPositionId);
  const repItems = replacements.map(r => {
    const hasRep = r.replacements.length > 0;
    const cls = !hasRep ? 'critical' : r.pos.isKey && r.replacements.length < (r.pos.minBackups || 1) ? 'warning' : 'ok';
    const repList = r.replacements.map(re =>
      `<div class="replacement-person">
        <div class="emp-avatar" style="background:${getAvatarColor(re.name)};width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;flex-shrink:0">${initials(re.name)}</div>
        <span>${re.name}</span>
        <span class="badge badge-${re.skills[r.pos.id] >= 3 ? 'green' : 'blue'}" style="font-size:10px">${levelLabel(re.skills[r.pos.id] || 0)}</span>
      </div>`
    ).join('');
    return `<div class="replacement-card ${cls}">
      <div class="replacement-pos">
        ${r.pos.name}
        ${r.pos.isKey ? '<span class="badge badge-red" style="font-size:10px">Poste clé</span>' : ''}
        <span class="badge ${cls === 'critical' ? 'badge-red' : cls === 'warning' ? 'badge-orange' : 'badge-green'}" style="font-size:10px">${r.replacements.length} remplaçant(s)</span>
      </div>
      <div class="replacement-list">
        ${hasRep ? repList : '<span class="text-danger">⚠ Aucun remplaçant disponible !</span>'}
      </div>
    </div>`;
  });

  return `<div class="card" style="margin-bottom:1rem">
    <div class="card-header" style="background:#fff5f5">
      <div class="flex-center gap-sm">
        <div class="emp-avatar" style="background:${getAvatarColor(emp.name)}">${initials(emp.name)}</div>
        <div>
          <div style="font-weight:700">${emp.name}</div>
          <div style="font-size:12px;color:var(--gray-500)">${emp.absenceReason || 'Motif non précisé'} — ${emp.department}</div>
        </div>
      </div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-sm btn-secondary" onclick="openAbsenceModal('${emp.id}')">Motif</button>
        <button class="btn btn-sm btn-success" onclick="returnEmployee('${emp.id}')">Retour</button>
      </div>
    </div>
    <div class="card-body">
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:.75rem">Remplacements disponibles pour les compétences de <b>${emp.name}</b> :</p>
      ${repItems.length > 0 ? repItems.join('') : '<p class="text-muted">Cet employé n\'a aucune compétence renseignée.</p>'}
    </div>
  </div>`;
}

function toggleAbsence(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  if (!emp.isAbsent) {
    openAbsenceModal(empId, true);
  } else {
    returnEmployee(empId);
  }
}

function returnEmployee(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  emp.isAbsent = false;
  emp.absenceReason = '';
  saveState();
  navigate(currentView);
}

function openAbsenceModal(empId, declareNew = false) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  document.getElementById('modal-title').textContent = declareNew ? `Déclarer une absence — ${emp.name}` : `Motif d'absence — ${emp.name}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Motif de l'absence</label>
      <select class="form-control" id="abs-reason">
        <option value="">Sélectionner...</option>
        <option value="Arrêt maladie" ${emp.absenceReason === 'Arrêt maladie' ? 'selected' : ''}>Arrêt maladie</option>
        <option value="Congés payés" ${emp.absenceReason === 'Congés payés' ? 'selected' : ''}>Congés payés</option>
        <option value="Formation" ${emp.absenceReason === 'Formation' ? 'selected' : ''}>Formation</option>
        <option value="Accident du travail" ${emp.absenceReason === 'Accident du travail' ? 'selected' : ''}>Accident du travail</option>
        <option value="Autre" ${emp.absenceReason === 'Autre' ? 'selected' : ''}>Autre</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-warning" onclick="confirmAbsence('${empId}')">Déclarer absent</button>
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    </div>`;
  openModal();
}

function confirmAbsence(empId) {
  const emp = state.employees.find(e => e.id === empId);
  const reason = document.getElementById('abs-reason').value;
  emp.isAbsent = true;
  emp.absenceReason = reason;
  saveState();
  closeModal();
  navigate(currentView);
}

// ---- EMPLOYEES ----
function renderEmployees() {
  const depts = getDepartments();
  const filterHtml = depts.map(d => `<span class="filter-chip ${activeFilter === d ? 'active' : ''}" onclick="setEmpFilter('${d}')">${d === 'all' ? 'Tous' : d}</span>`).join('');
  const filtered = activeFilter === 'all' ? state.employees : state.employees.filter(e => e.department === activeFilter);

  const rows = filtered.map(emp => {
    const pos = state.positions.find(p => p.id === emp.primaryPositionId);
    const skillCount = Object.values(emp.skills).filter(v => v >= 2).length;
    const expertCount = Object.values(emp.skills).filter(v => v === 3).length;
    return `<tr class="${emp.isAbsent ? 'absent-row' : ''}">
      <td>
        <div class="flex-center gap-sm">
          <div class="emp-avatar" style="background:${getAvatarColor(emp.name)}">${initials(emp.name)}</div>
          <div>
            <div class="emp-name">${emp.name}</div>
            <div style="font-size:12px;color:var(--gray-400)">${emp.department}</div>
          </div>
        </div>
      </td>
      <td>${pos ? pos.name : '<span class="text-muted">—</span>'}</td>
      <td><span class="badge badge-blue">${skillCount} poste(s)</span> ${expertCount > 0 ? `<span class="badge badge-green">${expertCount} expert</span>` : ''}</td>
      <td>${emp.isAbsent
        ? `<span class="badge badge-red">Absent — ${emp.absenceReason || '?'}</span>`
        : `<span class="badge badge-green">Présent</span>`}</td>
      <td>
        <div class="flex gap-sm">
          <button class="btn btn-sm btn-secondary" onclick="openEmployeeModal('${emp.id}')">Modifier</button>
          <button class="btn btn-sm ${emp.isAbsent ? 'btn-success' : 'btn-warning'}" onclick="toggleAbsence('${emp.id}')">${emp.isAbsent ? 'Retour' : 'Absent'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="filter-bar">${filterHtml}</div>
    <div class="card">
      <div class="card-header"><span>${filtered.length} employé(s)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Poste principal</th><th>Compétences</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:2rem" class="text-muted">Aucun employé. Cliquez sur "+ Ajouter".</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

function setEmpFilter(dept) { activeFilter = dept; renderEmployees(); }

function openEmployeeModal(empId = null) {
  const emp = empId ? state.employees.find(e => e.id === empId) : null;
  document.getElementById('modal-title').textContent = emp ? 'Modifier l\'employé' : 'Ajouter un employé';
  const depts = [...new Set(state.employees.map(e => e.department).concat(state.positions.map(p => p.department)))].sort();
  const deptOptions = depts.map(d => `<option value="${d}" ${emp?.department === d ? 'selected' : ''}>${d}</option>`).join('');
  const posOptions = state.positions.map(p => `<option value="${p.id}" ${emp?.primaryPositionId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');

  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nom complet *</label>
      <input class="form-control" id="emp-name" type="text" value="${emp?.name || ''}" placeholder="Prénom Nom">
    </div>
    <div class="form-group">
      <label class="form-label">Département *</label>
      <input class="form-control" id="emp-dept" type="text" list="dept-list" value="${emp?.department || ''}" placeholder="ex: Production">
      <datalist id="dept-list">${deptOptions}</datalist>
    </div>
    <div class="form-group">
      <label class="form-label">Poste principal</label>
      <select class="form-control" id="emp-pos">
        <option value="">— Sélectionner un poste —</option>
        ${posOptions}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveEmployee('${empId || ''}')">${emp ? 'Enregistrer' : 'Ajouter'}</button>
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    </div>`;
  openModal();
}

function saveEmployee(empId) {
  const name = document.getElementById('emp-name').value.trim();
  const dept = document.getElementById('emp-dept').value.trim();
  const posId = document.getElementById('emp-pos').value;
  if (!name || !dept) { alert('Nom et département requis.'); return; }

  if (empId) {
    const emp = state.employees.find(e => e.id === empId);
    emp.name = name; emp.department = dept; emp.primaryPositionId = posId || null;
  } else {
    const skills = {};
    state.positions.forEach(p => { skills[p.id] = 0; });
    state.employees.push({ id: uid(), name, department: dept, primaryPositionId: posId || null, isAbsent: false, absenceReason: '', skills });
  }
  saveState(); closeModal(); renderEmployees();
}

function deleteEmployee(empId) {
  showConfirm('Supprimer l\'employé', 'Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.', () => {
    state.employees = state.employees.filter(e => e.id !== empId);
    saveState(); renderEmployees();
  });
}

// ---- POSITIONS ----
function renderPositions() {
  const depts = getDepartments();
  const filterHtml = depts.map(d => `<span class="filter-chip ${activeFilter === d ? 'active' : ''}" onclick="setPosFilter('${d}')">${d === 'all' ? 'Tous' : d}</span>`).join('');
  const filtered = activeFilter === 'all' ? state.positions : state.positions.filter(p => p.department === activeFilter);

  const rows = filtered.map(pos => {
    const holders = state.employees.filter(e => e.primaryPositionId === pos.id);
    const knowing = state.employees.filter(e => (e.skills[pos.id] || 0) >= 2).length;
    const available = state.employees.filter(e => !e.isAbsent && (e.skills[pos.id] || 0) >= 2).length;
    const statusBadge = available === 0
      ? '<span class="badge badge-red">⚠ Critique</span>'
      : available < (pos.minBackups || 1)
        ? '<span class="badge badge-orange">Attention</span>'
        : '<span class="badge badge-green">Couvert</span>';

    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span style="font-weight:600">${pos.name}</span>
          ${pos.isKey ? '<span class="badge badge-red">★ Clé</span>' : ''}
        </div>
      </td>
      <td>${pos.department}</td>
      <td>${holders.map(e => `<span class="badge badge-blue" style="margin:1px">${e.name}</span>`).join('') || '<span class="text-muted">—</span>'}</td>
      <td>${knowing} / ${state.employees.length}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="flex gap-sm">
          <button class="btn btn-sm btn-secondary" onclick="openPositionModal('${pos.id}')">Modifier</button>
          <button class="btn btn-sm btn-danger" onclick="deletePosition('${pos.id}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="filter-bar">${filterHtml}</div>
    <div class="card">
      <div class="card-header"><span>${filtered.length} poste(s)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom du poste</th><th>Département</th><th>Titulaire(s)</th><th>Personnes formées</th><th>Couverture</th><th>Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:2rem" class="text-muted">Aucun poste. Cliquez sur "+ Ajouter".</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

function setPosFilter(dept) { activeFilter = dept; renderPositions(); }

function openPositionModal(posId = null) {
  const pos = posId ? state.positions.find(p => p.id === posId) : null;
  document.getElementById('modal-title').textContent = pos ? 'Modifier le poste' : 'Ajouter un poste';
  const depts = [...new Set(state.employees.map(e => e.department).concat(state.positions.map(p => p.department)))].sort();
  const deptOptions = depts.map(d => `<option value="${d}" ${pos?.department === d ? 'selected' : ''}>${d}</option>`).join('');

  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nom du poste *</label>
      <input class="form-control" id="pos-name" type="text" value="${pos?.name || ''}" placeholder="ex: Opérateur Machine A">
    </div>
    <div class="form-group">
      <label class="form-label">Département *</label>
      <input class="form-control" id="pos-dept" type="text" list="pos-dept-list" value="${pos?.department || ''}" placeholder="ex: Production">
      <datalist id="pos-dept-list">${deptOptions}</datalist>
    </div>
    <div class="form-group">
      <label class="form-check">
        <input type="checkbox" id="pos-key" ${pos?.isKey ? 'checked' : ''}>
        <span class="form-check-label"><b>Poste clé</b> — Nécessite une redondance obligatoire</span>
      </label>
    </div>
    <div class="form-group" id="backup-group" style="${pos?.isKey ? '' : 'display:none'}">
      <label class="form-label">Nombre minimum de remplaçants requis</label>
      <input class="form-control" id="pos-min" type="number" min="1" max="10" value="${pos?.minBackups || 1}">
      <div class="form-hint">Nombre de personnes (hors titulaire) devant maîtriser ce poste (niveau ≥ Autonome)</div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="savePosition('${posId || ''}')">${pos ? 'Enregistrer' : 'Ajouter'}</button>
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    </div>`;

  document.getElementById('pos-key').addEventListener('change', function() {
    document.getElementById('backup-group').style.display = this.checked ? '' : 'none';
  });
  openModal();
}

function savePosition(posId) {
  const name = document.getElementById('pos-name').value.trim();
  const dept = document.getElementById('pos-dept').value.trim();
  const isKey = document.getElementById('pos-key').checked;
  const minBackups = parseInt(document.getElementById('pos-min')?.value) || 1;
  if (!name || !dept) { alert('Nom et département requis.'); return; }

  if (posId) {
    const pos = state.positions.find(p => p.id === posId);
    pos.name = name; pos.department = dept; pos.isKey = isKey; pos.minBackups = minBackups;
  } else {
    const newPos = { id: uid(), name, department: dept, isKey, minBackups };
    state.positions.push(newPos);
    // Ajouter la compétence (niveau 0) pour tous les employés existants
    state.employees.forEach(e => { e.skills[newPos.id] = 0; });
  }
  saveState(); closeModal(); renderPositions();
}

function deletePosition(posId) {
  showConfirm('Supprimer le poste', 'Supprimer ce poste supprimera également toutes les compétences associées. Continuer ?', () => {
    state.positions = state.positions.filter(p => p.id !== posId);
    state.employees.forEach(e => { delete e.skills[posId]; if (e.primaryPositionId === posId) e.primaryPositionId = null; });
    saveState(); renderPositions();
  });
}

// =========================================================
// MODAL HELPERS
// =========================================================
function openModal() { document.getElementById('modal-overlay').classList.add('open'); }

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}

function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('open');
  const btn = document.getElementById('confirm-ok');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => { closeConfirm(); onConfirm(); });
}

function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); }

// =========================================================
// INIT
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!loadState()) {
    state = JSON.parse(JSON.stringify(DEMO_DATA));
    saveState();
  }

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  navigate('dashboard');
});
