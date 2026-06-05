// src/engine/cartographie/renderCartographyPdf.tsx
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ProcessDefinition } from '../../types/cartographie';

export interface CartographyPdfProps {
  processes: ProcessDefinition[];
  companyName: string;
  sector: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortRealisation(processes: ProcessDefinition[]): ProcessDefinition[][] {
  const realisation = processes.filter((p) => p.type === 'realisation');
  if (realisation.length === 0) return [];

  const ordered: ProcessDefinition[] = [];
  const remaining = [...realisation];

  let current = remaining.filter(
    (p) => !p.afterProcessId || !realisation.find((r) => r.id === p.afterProcessId),
  );
  while (current.length > 0 && ordered.length < realisation.length) {
    current.forEach((p) => { if (!ordered.find((o) => o.id === p.id)) ordered.push(p); });
    const orderedIds = ordered.map((o) => o.id);
    current = remaining.filter(
      (p) => !ordered.find((o) => o.id === p.id) && p.afterProcessId && orderedIds.includes(p.afterProcessId),
    );
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#64748b', marginBottom: 1 },
  badge: { fontSize: 8, color: '#ffffff', backgroundColor: '#1d4ed8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 14 },

  // Zone labels
  zoneLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginBottom: 6, textAlign: 'center', letterSpacing: 0.5 },
  zoneLabelGreen: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#166534', marginBottom: 6, textAlign: 'center', letterSpacing: 0.5 },
  zoneLabelYellow: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 6, textAlign: 'center', letterSpacing: 0.5 },

  // Pilotage zone
  pilotageZone: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, border: '1.5pt solid #3b82f6', backgroundColor: '#eff6ff', borderRadius: 6, padding: 10, marginBottom: 6 },

  // Arrow row
  arrowRow: { alignItems: 'center', marginBottom: 4 },
  arrowText: { fontSize: 9, color: '#64748b', textAlign: 'center' },

  // Realisation row
  realisationRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 6, gap: 4 },
  clientBox: { justifyContent: 'center', alignItems: 'center', border: '1.5pt solid #16a34a', backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 8, width: 44 },
  clientLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#166534', textAlign: 'center', marginTop: 2 },
  clientSubLabel: { fontSize: 6, color: '#166534', textAlign: 'center' },
  clientIcon: { fontSize: 12, textAlign: 'center' },
  arrowMid: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  arrowMidText: { fontSize: 10, color: '#16a34a' },
  arrowMidLabel: { fontSize: 6, color: '#16a34a', textAlign: 'center', maxWidth: 44 },
  realisationZone: { flex: 1, border: '1.5pt solid #16a34a', backgroundColor: '#f0fdf4', borderRadius: 6, padding: 8 },
  realisationInner: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 },
  parallelCol: { flexDirection: 'column', gap: 3, alignItems: 'center' },
  parallelLabel: { fontSize: 6, color: '#94a3b8', textAlign: 'center' },

  // Support zone
  supportZone: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, border: '1.5pt solid #ca8a04', backgroundColor: '#fffbeb', borderRadius: 6, padding: 10, marginTop: 4 },

  // Process box — pilotage
  boxP: { border: '1pt solid #3b82f6', backgroundColor: '#dbeafe', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center', minWidth: 70 },
  boxPName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#3b82f6', textAlign: 'center' },
  boxPPilot: { fontSize: 6.5, color: '#6b7280', textAlign: 'center', marginTop: 1 },

  // Process box — realisation
  boxR: { border: '1pt solid #16a34a', backgroundColor: '#dcfce7', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center', minWidth: 70 },
  boxRName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#16a34a', textAlign: 'center' },
  boxRPilot: { fontSize: 6.5, color: '#6b7280', textAlign: 'center', marginTop: 1 },

  // Process box — support
  boxS: { border: '1pt solid #ca8a04', backgroundColor: '#fef9c3', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center', minWidth: 70 },
  boxSName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ca8a04', textAlign: 'center' },
  boxSPilot: { fontSize: 6.5, color: '#6b7280', textAlign: 'center', marginTop: 1 },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5pt solid #e2e8f0', paddingTop: 6 },
  footerLeft: { fontSize: 7, color: '#94a3b8' },
  footerRight: { fontSize: 7, color: '#94a3b8' },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 1, textTransform: 'uppercase' },
  infoValue: { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function PilotageBox({ p }: { p: ProcessDefinition }) {
  return (
    <View style={s.boxP}>
      <Text style={s.boxPName}>{p.name}</Text>
      {p.pilotName ? <Text style={s.boxPPilot}>{p.pilotName}</Text> : null}
    </View>
  );
}

function RealisationBox({ p }: { p: ProcessDefinition }) {
  return (
    <View style={s.boxR}>
      <Text style={s.boxRName}>{p.name}</Text>
      {p.pilotName ? <Text style={s.boxRPilot}>{p.pilotName}</Text> : null}
    </View>
  );
}

function SupportBox({ p }: { p: ProcessDefinition }) {
  return (
    <View style={s.boxS}>
      <Text style={s.boxSName}>{p.name}</Text>
      {p.pilotName ? <Text style={s.boxSPilot}>{p.pilotName}</Text> : null}
    </View>
  );
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function CartographyDocument({
  processes,
  companyName,
  sector,
  headcount,
  sseManagerName,
  sseManagerRole,
  documentDate,
}: CartographyPdfProps) {
  const pilotage = processes.filter((p) => p.type === 'pilotage');
  const realisationGroups = sortRealisation(processes);
  const support = processes.filter((p) => p.type === 'support');

  const formattedDate = (() => {
    try { return new Date(documentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return documentDate; }
  })();

  return (
    <Document title={`Cartographie des Processus — ${companyName}`} author="MASE SSE">
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Cartographie des Processus</Text>
            <Text style={s.subtitle}>{companyName}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.badge}>MASE SSE</Text>
          </View>
        </View>

        {/* ── Info row ── */}
        <View style={s.infoGrid}>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Secteur d'activité</Text>
            <Text style={s.infoValue}>{sector}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Effectif</Text>
            <Text style={s.infoValue}>{headcount} personnes</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Responsable SSE</Text>
            <Text style={s.infoValue}>{sseManagerName}</Text>
            <Text style={{ fontSize: 7, color: '#64748b' }}>{sseManagerRole}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Date du document</Text>
            <Text style={s.infoValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── PILOTAGE ── */}
        <View style={s.pilotageZone}>
          <Text style={s.zoneLabel}>PROCESSUS DE PILOTAGE</Text>
          {pilotage.length === 0
            ? <Text style={{ fontSize: 8, color: '#94a3b8' }}>(aucun processus)</Text>
            : pilotage.map((p) => <PilotageBox key={p.id} p={p} />)
          }
        </View>

        <View style={s.arrowRow}>
          <Text style={s.arrowText}>↕  oriente et contrôle</Text>
        </View>

        {/* ── RÉALISATION with CLIENT ── */}
        <View style={s.realisationRow}>
          {/* CLIENT gauche */}
          <View style={s.clientBox}>
            <Text style={s.clientIcon}>👤</Text>
            <Text style={s.clientLabel}>CLIENT</Text>
            <Text style={s.clientSubLabel}>Besoins</Text>
          </View>

          {/* Flèche entrante */}
          <View style={s.arrowMid}>
            {realisationGroups[0]?.[0]?.inputElement
              ? <Text style={s.arrowMidLabel}>{realisationGroups[0][0].inputElement}</Text>
              : null
            }
            <Text style={s.arrowMidText}>→</Text>
          </View>

          {/* Zone réalisation */}
          <View style={s.realisationZone}>
            <Text style={s.zoneLabelGreen}>PROCESSUS DE RÉALISATION</Text>
            <View style={s.realisationInner}>
              {realisationGroups.length === 0
                ? <Text style={{ fontSize: 8, color: '#94a3b8' }}>(aucun processus)</Text>
                : realisationGroups.map((group, gi) => (
                  <View key={gi} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {gi > 0 && (
                      <View style={s.arrowMid}>
                        {realisationGroups[gi - 1]?.[0]?.outputElement
                          ? <Text style={s.arrowMidLabel}>{realisationGroups[gi - 1][0].outputElement}</Text>
                          : null
                        }
                        <Text style={s.arrowMidText}>→</Text>
                      </View>
                    )}
                    {group.length === 1
                      ? <RealisationBox p={group[0]} />
                      : (
                        <View style={s.parallelCol}>
                          <Text style={s.parallelLabel}>// parallèle</Text>
                          {group.map((p) => <RealisationBox key={p.id} p={p} />)}
                        </View>
                      )
                    }
                  </View>
                ))
              }
            </View>
          </View>

          {/* Flèche sortante */}
          <View style={s.arrowMid}>
            {realisationGroups[realisationGroups.length - 1]?.[0]?.outputElement
              ? <Text style={s.arrowMidLabel}>{realisationGroups[realisationGroups.length - 1][0].outputElement}</Text>
              : null
            }
            <Text style={s.arrowMidText}>→</Text>
          </View>

          {/* CLIENT droit */}
          <View style={s.clientBox}>
            <Text style={s.clientIcon}>😊</Text>
            <Text style={s.clientLabel}>CLIENT</Text>
            <Text style={s.clientSubLabel}>Satisfaction</Text>
          </View>
        </View>

        <View style={s.arrowRow}>
          <Text style={s.arrowText}>↕  fournit les ressources</Text>
        </View>

        {/* ── SUPPORT ── */}
        <View style={s.supportZone}>
          <Text style={s.zoneLabelYellow}>PROCESSUS SUPPORT</Text>
          {support.length === 0
            ? <Text style={{ fontSize: 8, color: '#94a3b8' }}>(aucun processus)</Text>
            : support.map((p) => <SupportBox key={p.id} p={p} />)
          }
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>Cartographie des Processus — {companyName} — {formattedDate}</Text>
          <Text style={s.footerRight}>Document généré via MASE SSE</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function generateAndDownloadCartographyPdf(props: CartographyPdfProps): Promise<void> {
  const blob = await pdf(<CartographyDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = props.companyName.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  a.download = `cartographie-processus-${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
