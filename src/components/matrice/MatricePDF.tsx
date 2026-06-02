// src/components/matrice/MatricePDF.tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { MatriceData } from './types';
import { computeRedundancy, getCoverageAlerts } from './matrice.utils';

const LEVEL_COLORS = ['#8e9eab', '#e67e22', '#27ae60', '#2980b9'];
const LEVEL_LABELS = ['—', 'Formation', 'Autonome', 'Expert'];

const s = StyleSheet.create({
  page1: { fontFamily: 'Helvetica', fontSize: 8, padding: 0, backgroundColor: '#eef2f7' },
  page2: { fontFamily: 'Helvetica', fontSize: 8, padding: 0, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0d2137', color: '#fff',
    padding: '8 16', marginBottom: 6,
  },
  headerCompany: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  headerTitle: { fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerDate: { fontSize: 7, color: 'rgba(255,255,255,0.5)' },
  content: { padding: '0 10 10 10' },
  legend: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 7, color: '#495057' },
  table: { width: '100%' },
  catRow: { flexDirection: 'row' },
  cornerCell: {
    backgroundColor: '#0d2137', color: '#fff',
    padding: '5 8', fontWeight: 'bold', fontSize: 7,
    width: 120, borderRight: '2 solid #2563a8', borderBottom: '2 solid #2563a8',
  },
  catCell: {
    color: '#fff', textAlign: 'center', padding: '4 2',
    fontWeight: 'bold', fontSize: 7,
    borderRight: '1 solid rgba(255,255,255,0.25)',
    borderBottom: '1 solid rgba(255,255,255,0.2)',
  },
  compCell: {
    color: '#fff', textAlign: 'center', padding: '3 2',
    fontSize: 6.5, borderRight: '1 solid rgba(255,255,255,0.2)',
    borderBottom: '2 solid rgba(0,0,0,0.2)',
  },
  empRow: { flexDirection: 'row', borderBottom: '0.5 solid #f1f3f4' },
  empCell: {
    width: 120, padding: '4 6',
    backgroundColor: '#fff', borderRight: '2 solid #dee2e6',
  },
  empName: { fontWeight: 'bold', fontSize: 7.5, color: '#1a3a5c' },
  empRole: { fontSize: 6, color: '#6c757d' },
  skillCell: { textAlign: 'center', justifyContent: 'center', alignItems: 'center', padding: '3 2' },
  skillNum: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  skillLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 5.5 },
  redundRow: { flexDirection: 'row', borderTop: '2 solid #495057' },
  redundLabel: {
    width: 120, backgroundColor: '#343a40', color: '#fff',
    padding: '4 6', fontWeight: 'bold', fontSize: 7,
  },
  redundCell: { textAlign: 'center', justifyContent: 'center', alignItems: 'center', padding: '2' },
  redundNum: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  redundSub: { color: 'rgba(255,255,255,0.75)', fontSize: 5.5 },
  footer: {
    position: 'absolute', bottom: 8, right: 12,
    fontSize: 6, color: '#9ca3af',
  },
  p2Content: { padding: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: '10 8', borderRadius: 4, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statLbl: { fontSize: 7, color: '#6b7280' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#0d2137', marginBottom: 8 },
  alertCard: {
    padding: '6 10', marginBottom: 5, borderRadius: 3,
    borderLeft: '3 solid transparent',
  },
  alertTitle: { fontWeight: 'bold', fontSize: 8 },
  alertBody: { fontSize: 7, marginTop: 1 },
  coverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  coverLabel: { width: 110, fontSize: 7, color: '#374151' },
  coverBarBg: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 2 },
  coverBarFill: { height: 6, borderRadius: 2 },
  coverCount: { width: 30, fontSize: 7, textAlign: 'right' },
});

interface Props { data: MatriceData }

export function MatricePDF({ data }: Props) {
  const { config, comps, employees } = data;
  const redundancy = computeRedundancy(comps, employees);
  const alerts = getCoverageAlerts(comps, employees);
  const date = new Date().toLocaleDateString('fr-FR');

  const catGroups = config.categories.map(cat => ({
    cat,
    comps: comps.filter(c => c.categoryId === cat.id),
  })).filter(g => g.comps.length > 0);

  const COMP_WIDTH = comps.length > 0 ? Math.max(50, Math.min(90, Math.floor(600 / comps.length))) : 70;

  return (
    <Document title={config.docTitle} author={config.company}>
      {/* PAGE 1 — Matrice colorée */}
      <Page size="A4" orientation="landscape" style={s.page1}>
        <View style={s.header}>
          <View>
            <Text style={s.headerCompany}>{config.company}</Text>
            <Text style={s.headerTitle}>{config.docTitle}</Text>
          </View>
          <Text style={s.headerDate}>Généré le {date}</Text>
        </View>

        <View style={s.content}>
          {/* Légende */}
          <View style={s.legend}>
            {LEVEL_LABELS.map((lbl, i) => (
              <View key={i} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: LEVEL_COLORS[i] }]} />
                <Text style={s.legendText}>{i} — {lbl}</Text>
              </View>
            ))}
          </View>

          {comps.length === 0 || employees.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#6b7280' }}>Aucune donnée à afficher.</Text>
          ) : (
            <View style={s.table}>
              {/* En-têtes catégories */}
              <View style={s.catRow}>
                <View style={s.cornerCell}><Text>Collaborateur / Compétence</Text></View>
                {catGroups.map(({ cat, comps: cc }) => (
                  <View key={cat.id} style={[s.catCell, { backgroundColor: cat.color, width: cc.length * COMP_WIDTH }]}>
                    <Text>{cat.name}</Text>
                  </View>
                ))}
              </View>
              {/* En-têtes compétences */}
              <View style={s.catRow}>
                <View style={[s.cornerCell, { borderBottom: '2 solid #2563a8', paddingVertical: 3 }]}>
                  <Text> </Text>
                </View>
                {catGroups.flatMap(({ cat, comps: cc }) =>
                  cc.map(comp => (
                    <View key={comp.id} style={[s.compCell, { backgroundColor: cat.color, width: COMP_WIDTH }]}>
                      <Text>{comp.name}</Text>
                      {comp.isKey && <Text style={{ fontSize: 5, opacity: 0.8 }}>★ Poste clé</Text>}
                    </View>
                  ))
                )}
              </View>
              {/* Lignes salariés */}
              {employees.map(emp => (
                <View key={emp.id} style={s.empRow}>
                  <View style={s.empCell}>
                    <Text style={s.empName}>{emp.name}{emp.isAbsent ? ' (ABSENT)' : ''}</Text>
                    <Text style={s.empRole}>{emp.role}</Text>
                  </View>
                  {catGroups.flatMap(({ comps: cc }) =>
                    cc.map(comp => {
                      const level = emp.skills[comp.id] ?? 0;
                      return (
                        <View key={comp.id} style={[s.skillCell, { backgroundColor: LEVEL_COLORS[level], width: COMP_WIDTH }]}>
                          <Text style={s.skillNum}>{level}</Text>
                          <Text style={s.skillLbl}>{LEVEL_LABELS[level]}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              ))}
              {/* Ligne redondance */}
              <View style={s.redundRow}>
                <View style={s.redundLabel}><Text>Redondance (niveau ≥ 2)</Text></View>
                {catGroups.flatMap(({ comps: cc }) =>
                  cc.map(comp => {
                    const count = redundancy[comp.id] ?? 0;
                    const isCrit = comp.isKey && count < comp.minBackups;
                    return (
                      <View key={comp.id} style={[s.redundCell, { backgroundColor: isCrit ? '#c0392b' : '#1e8449', width: COMP_WIDTH }]}>
                        <Text style={s.redundNum}>{count}</Text>
                        {comp.isKey && <Text style={s.redundSub}>/ {comp.minBackups} req.</Text>}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </View>
        <Text style={s.footer}>Confidentiel · Usage interne</Text>
      </Page>

      {/* PAGE 2 — Synthèse */}
      <Page size="A4" orientation="portrait" style={s.page2}>
        <View style={s.header}>
          <View>
            <Text style={s.headerCompany}>{config.company} — Analyse de couverture</Text>
            <Text style={s.headerTitle}>Postes clés · Redondance · Alertes</Text>
          </View>
          <Text style={s.headerDate}>Généré le {date}</Text>
        </View>

        <View style={s.p2Content}>
          {/* Stats */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: '#f0fdf4', borderTop: '4 solid #16a34a' }]}>
              <Text style={[s.statVal, { color: '#16a34a' }]}>{employees.length}</Text>
              <Text style={s.statLbl}>Collaborateurs</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#eff6ff', borderTop: '4 solid #1d4ed8' }]}>
              <Text style={[s.statVal, { color: '#1d4ed8' }]}>{comps.length}</Text>
              <Text style={s.statLbl}>Compétences</Text>
            </View>
            <View style={[s.statCard, {
              backgroundColor: alerts.length > 0 ? '#fef2f2' : '#f0fdf4',
              borderTop: `4 solid ${alerts.length > 0 ? '#dc2626' : '#16a34a'}`,
            }]}>
              <Text style={[s.statVal, { color: alerts.length > 0 ? '#dc2626' : '#16a34a' }]}>{alerts.length}</Text>
              <Text style={s.statLbl}>Alertes</Text>
            </View>
          </View>

          {/* Alertes */}
          <Text style={s.sectionTitle}>⚠ Compétences à risque</Text>
          {alerts.length === 0 ? (
            <View style={[s.alertCard, { backgroundColor: '#f0fdf4', borderLeftColor: '#16a34a' }]}>
              <Text style={[s.alertTitle, { color: '#16a34a' }]}>✅ Tous les postes clés sont couverts</Text>
            </View>
          ) : alerts.map(alert => (
            <View key={alert.comp.id} style={[s.alertCard, {
              backgroundColor: alert.status === 'critical' ? '#fef2f2' : '#fef9c3',
              borderLeftColor: alert.status === 'critical' ? '#c0392b' : '#ca8a04',
            }]}>
              <Text style={[s.alertTitle, { color: alert.status === 'critical' ? '#7f1d1d' : '#713f12' }]}>
                {alert.comp.name} — {alert.status === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
              </Text>
              <Text style={[s.alertBody, { color: alert.status === 'critical' ? '#9b1c1c' : '#92400e' }]}>
                {alert.reason}
                {alert.availableEmployees.length > 0 && ` · Disponibles : ${alert.availableEmployees.map(e => e.name).join(', ')}`}
              </Text>
            </View>
          ))}

          {/* Taux de couverture */}
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>📊 Taux de couverture par compétence</Text>
          {comps.map(comp => {
            const count = redundancy[comp.id] ?? 0;
            const total = employees.length;
            const pct = total > 0 ? Math.min(1, count / total) : 0;
            const color = count === 0 ? '#c0392b' : comp.isKey && count < comp.minBackups ? '#e67e22' : '#16a34a';
            return (
              <View key={comp.id} style={s.coverRow}>
                <Text style={s.coverLabel}>{comp.name}{comp.isKey ? ' ★' : ''}</Text>
                <View style={s.coverBarBg}>
                  <View style={[s.coverBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
                </View>
                <Text style={[s.coverCount, { color }]}>{count}/{total}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
