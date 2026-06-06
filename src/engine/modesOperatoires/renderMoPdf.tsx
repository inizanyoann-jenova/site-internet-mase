import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ModeOperatoire } from '../../types/modesOperatoires';
import { OPERATION_TYPE_LABELS } from '../../types/modesOperatoires';

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return iso; }
}

const S = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', fontSize: 9, color: '#111827' },
  header: { marginBottom: 12, borderBottom: 2, borderBottomColor: '#1e3a8a', paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  subtitle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaBadge: { backgroundColor: '#f3f4f6', borderRadius: 4, padding: '3 6', fontSize: 8, color: '#374151' },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', borderBottom: 1, borderBottomColor: '#dbeafe', paddingBottom: 3, marginBottom: 5 },
  row2: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  listItem: { flexDirection: 'row', marginBottom: 2 },
  bullet: { width: 10, fontSize: 8 },
  itemText: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  tag: { backgroundColor: '#fee2e2', borderRadius: 3, padding: '2 4', fontSize: 7, color: '#991b1b', marginRight: 3, marginBottom: 3 },
  tagBlue: { backgroundColor: '#dbeafe', borderRadius: 3, padding: '2 4', fontSize: 7, color: '#1e3a8a', marginRight: 3, marginBottom: 3 },
  tagGreen: { backgroundColor: '#dcfce7', borderRadius: 3, padding: '2 4', fontSize: 7, color: '#14532d', marginRight: 3, marginBottom: 3 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
  table: { borderRadius: 4, border: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', padding: '4 6' },
  tableRow: { flexDirection: 'row', borderTop: 1, borderTopColor: '#f3f4f6', padding: '4 6' },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  phaseHeader: { padding: '4 6', marginBottom: 2, borderRadius: 3 },
  phasePrep: { backgroundColor: '#dbeafe' },
  phaseExec: { backgroundColor: '#fef9c3' },
  phaseFin: { backgroundColor: '#dcfce7' },
  phaseLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  stepRow: { flexDirection: 'row', padding: '3 6', borderBottom: 1, borderBottomColor: '#f3f4f6', alignItems: 'flex-start' },
  stepNum: { width: 16, fontSize: 8, color: '#6b7280' },
  stepConsigne: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  stepCritique: { backgroundColor: '#fef2f2', borderLeft: 2, borderLeftColor: '#dc2626', paddingLeft: 4 },
  stepActeur: { width: 80, fontSize: 7, color: '#9ca3af' },
  footer: { marginTop: 16, borderTop: 1, borderTopColor: '#e5e7eb', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#9ca3af' },
  approvalTable: { marginTop: 4 },
  approvalRow: { flexDirection: 'row', borderBottom: 1, borderBottomColor: '#f3f4f6', padding: '4 0' },
  approvalRole: { width: 80, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  approvalNom: { flex: 1, fontSize: 8, color: '#374151' },
  approvalDate: { width: 70, fontSize: 8, color: '#6b7280' },
});

function PhaseSection({ label, steps, style }: { label: string; steps: ModeOperatoire['phases']['preparation']; style: object }) {
  if (steps.length === 0) return null;
  return (
    <View>
      <View style={[S.phaseHeader, style]}>
        <Text style={S.phaseLabel}>{label}</Text>
      </View>
      {steps.map((step) => (
        <View key={step.id} style={[S.stepRow, step.critique ? S.stepCritique : {}]}>
          <Text style={S.stepNum}>{step.ordre}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.stepConsigne}>{step.consigne}</Text>
            {step.acteur && <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>{step.acteur}</Text>}
          </View>
          {step.outil && <Text style={S.stepActeur}>{step.outil}</Text>}
        </View>
      ))}
    </View>
  );
}

function MoPdfDocument({ mo }: { mo: ModeOperatoire }) {
  const typeLabel = OPERATION_TYPE_LABELS[mo.operationType] ?? mo.operationType;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* En-tête */}
        <View style={S.header}>
          <View style={S.headerRow}>
            <View>
              <Text style={S.title}>{mo.title}</Text>
              <Text style={S.subtitle}>{typeLabel} — {mo.reference} — {mo.version}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 8, color: '#6b7280' }}>Date : {formatDate(mo.documentDate)}</Text>
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>Statut : {mo.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={S.tagsRow}>
            {mo.habilitations.map((h) => (
              <Text key={h} style={S.tagBlue}>{h}</Text>
            ))}
          </View>
        </View>

        {/* Consignes SSE */}
        <View style={S.row2}>
          <View style={S.col}>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Risques identifiés</Text>
              {mo.consignesSSE.risques.map((r, i) => (
                <View key={i} style={S.listItem}>
                  <Text style={S.bullet}>•</Text>
                  <Text style={S.itemText}>{r}</Text>
                </View>
              ))}
            </View>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Règles de sécurité</Text>
              {mo.consignesSSE.reglesSecurite.map((r, i) => (
                <View key={i} style={S.listItem}>
                  <Text style={S.bullet}>•</Text>
                  <Text style={S.itemText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={S.col}>
            <View style={S.section}>
              <Text style={S.sectionTitle}>EPI obligatoires</Text>
              {mo.epis.filter((e) => e.obligatoire).map((e) => (
                <View key={e.id} style={S.listItem}>
                  <Text style={S.bullet}>☑</Text>
                  <Text style={S.itemText}>{e.designation}{e.norme ? ` (${e.norme})` : ''}</Text>
                </View>
              ))}
            </View>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Permis requis</Text>
              <View style={S.tagsRow}>
                {mo.consignesSSE.permisRequis.map((p) => (
                  <Text key={p} style={S.tag}>{p}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Phases de travail */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Phases de travail</Text>
          <PhaseSection label="PRÉPARATION" steps={mo.phases.preparation} style={S.phasePrep} />
          <PhaseSection label="EXÉCUTION" steps={mo.phases.execution} style={S.phaseExec} />
          <PhaseSection label="FIN DE TÂCHE" steps={mo.phases.finTache} style={S.phaseFin} />
        </View>

        {/* Urgences */}
        {mo.urgences.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Situations d'urgence</Text>
            {mo.urgences.map((u) => (
              <View key={u.id} style={{ marginBottom: 5, backgroundColor: '#fef2f2', borderRadius: 4, padding: '4 6' }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#991b1b', marginBottom: 2 }}>{u.scenario}</Text>
                <Text style={{ fontSize: 8, color: '#374151', lineHeight: 1.4 }}>{u.conduite}</Text>
                <View style={S.tagsRow}>
                  {u.contacts.map((c) => (
                    <Text key={c.id} style={S.tag}>{c.role} : {c.telephone}</Text>
                  ))}
                </View>
              </View>
            ))}
            {mo.pointRassemblement && (
              <Text style={{ fontSize: 8, color: '#374151', marginTop: 4 }}>
                Point de rassemblement : {mo.pointRassemblement}
              </Text>
            )}
          </View>
        )}

        {/* Tableau d'approbation */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Approbation</Text>
          <View style={S.approvalTable}>
            {mo.approvers.map((a) => (
              <View key={a.id} style={S.approvalRow}>
                <Text style={S.approvalRole}>{a.role}</Text>
                <Text style={S.approvalNom}>{a.nom || '___________________'}</Text>
                <Text style={S.approvalDate}>{a.date ? formatDate(a.date) : '__________'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Historique révisions */}
        {mo.revisions.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Historique des révisions</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                <Text style={S.tableCellBold}>Version</Text>
                <Text style={S.tableCellBold}>Date</Text>
                <Text style={S.tableCellBold}>Auteur</Text>
                <Text style={[S.tableCellBold, { flex: 2 }]}>Nature</Text>
              </View>
              {mo.revisions.map((r) => (
                <View key={r.id} style={S.tableRow}>
                  <Text style={S.tableCell}>{r.version}</Text>
                  <Text style={S.tableCell}>{formatDate(r.date)}</Text>
                  <Text style={S.tableCell}>{r.auteur}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{r.nature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={S.footer}>
          <Text style={S.footerText}>{mo.reference} — {mo.version} — Conforme MASE V2024 Chap. 3.3</Text>
          <Text style={S.footerText}>Révision : {mo.revisionFrequency ?? 'Annuelle'}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadMoPdf(mo: ModeOperatoire): Promise<void> {
  const doc = <MoPdfDocument mo={mo} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mo.reference ?? 'MO'}_${mo.version}_${mo.documentDate}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
