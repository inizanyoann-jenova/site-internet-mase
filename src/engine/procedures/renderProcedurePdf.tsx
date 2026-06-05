// src/engine/procedures/renderProcedurePdf.tsx
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ProcedureDoc, RiskLevel, ProcedureStatus } from '../../types/procedures';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function statusLabel(status: ProcedureStatus): string {
  switch (status) {
    case 'valide': return 'VALIDÉ';
    case 'archive': return 'ARCHIVÉ';
    default: return 'BROUILLON';
  }
}

function statusColor(status: ProcedureStatus): string {
  switch (status) {
    case 'valide': return '#059669';
    case 'archive': return '#6b7280';
    default: return '#d97706';
  }
}

function riskBorderColor(niveau: RiskLevel): string {
  switch (niveau) {
    case 'high': return '#dc2626';
    case 'med': return '#d97706';
    case 'low': return '#059669';
  }
}

function riskBgColor(niveau: RiskLevel): string {
  switch (niveau) {
    case 'high': return '#fef2f2';
    case 'med': return '#fffbeb';
    case 'low': return '#f0fdf4';
  }
}

function riskLabel(niveau: RiskLevel): string {
  switch (niveau) {
    case 'high': return 'ÉLEVÉ';
    case 'med': return 'MOYEN';
    case 'low': return 'FAIBLE';
  }
}

function riskTextColor(niveau: RiskLevel): string {
  switch (niveau) {
    case 'high': return '#dc2626';
    case 'med': return '#d97706';
    case 'low': return '#059669';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Page
  page: { padding: 25, fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff' },

  // ISO Header table
  isoHeader: { flexDirection: 'row', border: '1pt solid #cbd5e1', marginBottom: 12 },
  isoColLogo: { width: '23%', borderRight: '1pt solid #cbd5e1', padding: 6, justifyContent: 'center', alignItems: 'center' },
  isoColTitle: { width: '50%', borderRight: '1pt solid #cbd5e1', padding: 6, justifyContent: 'center', alignItems: 'center' },
  isoColMeta: { width: '27%', padding: 0 },

  logoText: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1e5f8e', textAlign: 'center' },
  logoSub: { fontSize: 7, color: '#64748b', textAlign: 'center', marginTop: 2 },

  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'center', marginBottom: 3 },
  docProcess: { fontSize: 8, color: '#64748b', textAlign: 'center' },

  metaRow: { flexDirection: 'row', borderBottom: '0.5pt solid #cbd5e1' },
  metaRowLast: { flexDirection: 'row' },
  metaLabel: { fontSize: 7, color: '#64748b', width: '45%', padding: 4, borderRight: '0.5pt solid #cbd5e1' },
  metaValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#1e293b', width: '55%', padding: 4 },

  // Section title
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e5f8e',
    backgroundColor: '#eef3f8',
    borderLeft: '3pt solid #1e5f8e',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 5,
    marginTop: 8,
    textTransform: 'uppercase',
  },

  // Body text
  bodyText: { fontSize: 9, color: '#374151', lineHeight: 1.4, marginBottom: 4 },

  // Grid row (domain / responsible / docs)
  gridRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  gridCell: { flex: 1, border: '0.5pt solid #e2e8f0', borderRadius: 2, padding: 5 },
  gridLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  gridValue: { fontSize: 8, color: '#1e293b' },

  // Risk row
  riskRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  riskAccent: { width: 4 },
  riskBody: { flex: 1, padding: 5 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  riskName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b', flex: 1 },
  riskBadge: { fontSize: 7, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 },
  riskControl: { fontSize: 7, color: '#6b7280' },

  // Table shared
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e5f8e', paddingVertical: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3 },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 3, backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 7, color: '#374151', paddingHorizontal: 4 },
  tableCellHeader: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 4 },

  // Approvers table columns
  approverColRole: { width: '30%' },
  approverColNom: { width: '35%' },
  approverColDate: { width: '35%' },

  // Revisions table columns
  revisionColVer: { width: '12%' },
  revisionColDate: { width: '18%' },
  revisionColAuteur: { width: '25%' },
  revisionColNature: { width: '45%' },

  // Steps table columns (page 2)
  stepsColNum: { width: '6%' },
  stepsColType: { width: '14%' },
  stepsColDesc: { width: '46%' },
  stepsColActeur: { width: '20%' },
  stepsColOutil: { width: '14%' },

  // Step decision sub-rows
  routeOui: { fontSize: 6.5, color: '#059669', marginTop: 2 },
  routeNon: { fontSize: 6.5, color: '#dc2626', marginTop: 1 },

  // Page 2 logigramme title
  logiTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e5f8e',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '0.5pt solid #e2e8f0',
    paddingTop: 4,
  },
  footerLeft: { fontSize: 7, color: '#94a3b8' },
  footerRight: { fontSize: 7, color: '#94a3b8' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function IsoHeader({ doc }: { doc: ProcedureDoc }) {
  const metaRows = [
    { label: 'Référence', value: doc.reference },
    { label: 'Version', value: doc.version },
    { label: 'Date', value: formatDate(doc.documentDate) },
    { label: 'Statut', value: statusLabel(doc.status) },
  ];

  return (
    <View style={s.isoHeader}>
      {/* Logo column */}
      <View style={s.isoColLogo}>
        <Text style={s.logoText}>MASE</Text>
        <Text style={s.logoSub}>SSE</Text>
      </View>

      {/* Title + process column */}
      <View style={s.isoColTitle}>
        <Text style={s.docTitle}>{doc.title}</Text>
        <Text style={s.docProcess}>{doc.processParent}</Text>
      </View>

      {/* Meta column */}
      <View style={s.isoColMeta}>
        {metaRows.map((row, i) => (
          <View key={row.label} style={i < metaRows.length - 1 ? s.metaRow : s.metaRowLast}>
            <Text style={s.metaLabel}>{row.label}</Text>
            <Text
              style={[
                s.metaValue,
                row.label === 'Statut' ? { color: statusColor(doc.status) } : {},
              ]}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Page 1: Procedure sheet ──────────────────────────────────────────────────

function Page1({ doc }: { doc: ProcedureDoc }) {
  return (
    <Page size="A4" orientation="portrait" style={s.page}>
      <IsoHeader doc={doc} />

      {/* Objectif */}
      <Text style={s.sectionTitle}>Objectif</Text>
      <Text style={s.bodyText}>{doc.objective}</Text>

      {/* Domaine / Responsable / Documents */}
      <Text style={s.sectionTitle}>Domaine d'application</Text>
      <View style={s.gridRow}>
        <View style={s.gridCell}>
          <Text style={s.gridLabel}>Domaine</Text>
          <Text style={s.gridValue}>{doc.domain}</Text>
        </View>
        <View style={s.gridCell}>
          <Text style={s.gridLabel}>Responsable</Text>
          <Text style={s.gridValue}>{doc.responsible}</Text>
        </View>
      </View>
      <View style={s.gridRow}>
        <View style={s.gridCell}>
          <Text style={s.gridLabel}>Documents entrants</Text>
          <Text style={s.gridValue}>{doc.docsIn}</Text>
        </View>
        <View style={s.gridCell}>
          <Text style={s.gridLabel}>Documents sortants</Text>
          <Text style={s.gridValue}>{doc.docsOut}</Text>
        </View>
      </View>

      {/* KPI */}
      <Text style={s.sectionTitle}>Indicateurs de performance (KPI)</Text>
      <Text style={s.bodyText}>{doc.kpi}</Text>

      {/* Risques */}
      <Text style={s.sectionTitle}>Risques associés</Text>
      {doc.risks.length === 0 ? (
        <Text style={s.bodyText}>Aucun risque renseigné.</Text>
      ) : (
        doc.risks.map((risk) => (
          <View key={risk.id} style={s.riskRow}>
            <View style={[s.riskAccent, { backgroundColor: riskBorderColor(risk.niveau) }]} />
            <View style={[s.riskBody, { backgroundColor: riskBgColor(risk.niveau) }]}>
              <View style={s.riskHeader}>
                <Text style={s.riskName}>{risk.risque}</Text>
                <Text style={[s.riskBadge, { color: riskTextColor(risk.niveau), backgroundColor: riskBgColor(risk.niveau) }]}>
                  {riskLabel(risk.niveau)}
                </Text>
              </View>
              <Text style={s.riskControl}>Contrôle : {risk.controle}</Text>
            </View>
          </View>
        ))
      )}

      {/* Approbateurs */}
      <Text style={s.sectionTitle}>Approbation</Text>
      <View style={s.tableHeader}>
        <Text style={[s.tableCellHeader, s.approverColRole]}>Rôle</Text>
        <Text style={[s.tableCellHeader, s.approverColNom]}>Nom</Text>
        <Text style={[s.tableCellHeader, s.approverColDate]}>Date / Signature</Text>
      </View>
      {doc.approvers.length === 0 ? (
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { width: '100%' }]}>—</Text>
        </View>
      ) : (
        doc.approvers.map((approver, i) => (
          <View key={approver.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCell, s.approverColRole]}>{approver.role}</Text>
            <Text style={[s.tableCell, s.approverColNom]}>{approver.nom || '—'}</Text>
            <Text style={[s.tableCell, s.approverColDate]}>{approver.date ? formatDate(approver.date) : '—'}</Text>
          </View>
        ))
      )}

      {/* Historique des révisions */}
      <Text style={s.sectionTitle}>Historique des révisions</Text>
      <View style={s.tableHeader}>
        <Text style={[s.tableCellHeader, s.revisionColVer]}>Version</Text>
        <Text style={[s.tableCellHeader, s.revisionColDate]}>Date</Text>
        <Text style={[s.tableCellHeader, s.revisionColAuteur]}>Auteur</Text>
        <Text style={[s.tableCellHeader, s.revisionColNature]}>Nature des modifications</Text>
      </View>
      {doc.revisions.length === 0 ? (
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { width: '100%' }]}>—</Text>
        </View>
      ) : (
        doc.revisions.map((rev, i) => (
          <View key={rev.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCell, s.revisionColVer]}>{rev.version}</Text>
            <Text style={[s.tableCell, s.revisionColDate]}>{formatDate(rev.date)}</Text>
            <Text style={[s.tableCell, s.revisionColAuteur]}>{rev.auteur || '—'}</Text>
            <Text style={[s.tableCell, s.revisionColNature]}>{rev.nature}</Text>
          </View>
        ))
      )}

      {/* Footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerLeft}>Document interne — MASE V2024</Text>
        <Text style={s.footerRight}>1 / 2</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Logigramme ───────────────────────────────────────────────────────

function Page2({ doc }: { doc: ProcedureDoc }) {
  return (
    <Page size="A4" orientation="portrait" style={s.page}>
      <IsoHeader doc={doc} />

      <Text style={s.logiTitle}>LOGIGRAMME DE LA PROCÉDURE</Text>

      {/* Steps table */}
      <View style={s.tableHeader}>
        <Text style={[s.tableCellHeader, s.stepsColNum]}>N°</Text>
        <Text style={[s.tableCellHeader, s.stepsColType]}>Type</Text>
        <Text style={[s.tableCellHeader, s.stepsColDesc]}>Description</Text>
        <Text style={[s.tableCellHeader, s.stepsColActeur]}>Acteur</Text>
        <Text style={[s.tableCellHeader, s.stepsColOutil]}>Outil</Text>
      </View>

      {doc.steps.length === 0 ? (
        <View style={s.tableRow}>
          <Text style={[s.tableCell, { width: '100%' }]}>Aucune étape renseignée.</Text>
        </View>
      ) : (
        doc.steps.map((step, i) => {
          const isDecision = step.type === 'decision';
          const rowStyle = isDecision
            ? [s.tableRow, { backgroundColor: '#fffbeb' }]
            : i % 2 === 0
            ? s.tableRow
            : s.tableRowAlt;

          const typeLabel = isDecision ? 'DECISION' : 'ACTIVITE';
          const typeColor = isDecision ? '#92400e' : '#1e5f8e';

          return (
            <View key={step.id} style={rowStyle}>
              {/* N° */}
              <Text style={[s.tableCell, s.stepsColNum, { fontFamily: 'Helvetica-Bold', color: typeColor }]}>
                {step.num}
              </Text>

              {/* Type */}
              <Text style={[s.tableCell, s.stepsColType, { fontFamily: 'Helvetica-Bold', color: typeColor }]}>
                {typeLabel}
              </Text>

              {/* Description */}
              <View style={[s.stepsColDesc, { paddingHorizontal: 4, paddingVertical: 3 }]}>
                <Text style={{ fontSize: 7, color: '#1e293b' }}>{step.activite}</Text>
                {isDecision && (
                  <>
                    {step.ouiLabel || step.routeNumOui ? (
                      <Text style={s.routeOui}>
                        OUI{step.ouiLabel ? ` — ${step.ouiLabel}` : ''}{step.routeTypeOui === 'goto' && step.routeNumOui ? ` → étape ${step.routeNumOui}` : step.routeTypeOui === 'end' ? ' → FIN' : ' → suivant'}
                      </Text>
                    ) : null}
                    {step.nonLabel || step.nonAction ? (
                      <Text style={s.routeNon}>
                        NON{step.nonAction ? ` — ${step.nonAction}` : ''}{step.routeTypeNon === 'goto' && step.routeNumNon ? ` → étape ${step.routeNumNon}` : step.routeTypeNon === 'end' ? ' → FIN' : ''}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>

              {/* Acteur */}
              <Text style={[s.tableCell, s.stepsColActeur]}>{step.acteur}</Text>

              {/* Outil */}
              <Text style={[s.tableCell, s.stepsColOutil]}>{step.outil || '—'}</Text>
            </View>
          );
        })
      )}

      {/* Footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerLeft}>Document interne — MASE V2024</Text>
        <Text style={s.footerRight}>2 / 2</Text>
      </View>
    </Page>
  );
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function ProcedureDocument({ doc }: { doc: ProcedureDoc }) {
  return (
    <Document title={`Procédure — ${doc.title}`} author="MASE SSE">
      <Page1 doc={doc} />
      <Page2 doc={doc} />
    </Document>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function generateAndDownloadProcedurePdf(doc: ProcedureDoc): Promise<void> {
  const blob = await pdf(<ProcedureDocument doc={doc} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = doc.title.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  a.download = `procedure-${slug}-${doc.reference}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
