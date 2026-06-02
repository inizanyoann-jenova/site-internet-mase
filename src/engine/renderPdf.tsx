import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { CompanyInfo, Section, SelectedBlock } from './types';

const SECTION_TITLES: Record<Section, string> = {
  preambule: 'Préambule',
  principes: 'Nos principes essentiels en matière de SSE',
  engagement_securite: 'Nos engagements — Sécurité',
  engagement_sante: 'Nos engagements — Santé',
  engagement_environnement: 'Nos engagements — Environnement',
  axes_prioritaires: 'Nos axes prioritaires',
  amelioration_continue: "Notre démarche d'amélioration continue",
  diffusion: 'Diffusion de la politique',
};

const styles = StyleSheet.create({
  page: { paddingTop: 50, paddingBottom: 50, paddingHorizontal: 50 },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerCompany: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerLogo: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 6,
  },
  paragraph: { fontSize: 10, marginBottom: 5, lineHeight: 1.5 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { fontSize: 10, marginRight: 6 },
  bulletText: { fontSize: 10, flex: 1, lineHeight: 1.5 },
  footer: { marginTop: 40 },
  footerLine: { fontSize: 10, marginBottom: 6 },
  footerName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  footerItalic: { fontSize: 10, color: '#555555' },
});

function fillVariables(text: string, company: CompanyInfo): string {
  const map: Record<string, string> = {
    name: company.name,
    sector: company.sector,
    headcount: company.headcount,
    activities: company.activities,
    employerName: company.employerName,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in map ? map[key] : `{{${key}}}`,
  );
}

function BlockContent({ text, company }: { text: string; company: CompanyInfo }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{fillVariables(line.slice(2), company)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            {fillVariables(line, company)}
          </Text>
        );
      })}
    </>
  );
}

export function buildPdfDocument(blocks: SelectedBlock[], company: CompanyInfo) {
  const sections: Array<{ key: string; texts: string[] }> = [];
  let currentSection: string | null = null;

  for (const block of blocks) {
    if (block.section !== currentSection) {
      currentSection = block.section;
      sections.push({ key: block.section, texts: [] });
    }
    sections[sections.length - 1].texts.push(block.text);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>
          POLITIQUE SANTÉ, SÉCURITÉ ET ENVIRONNEMENT
        </Text>
        <Text style={styles.headerCompany}>{company.name}</Text>
        <Text style={styles.headerLogo}>
          [Emplacement réservé au logo de l'entreprise]
        </Text>

        {sections.map(({ key, texts }) => (
          <View key={key}>
            <Text style={styles.sectionTitle}>
              {SECTION_TITLES[key as Section] ?? key}
            </Text>
            {texts.map((text, i) => (
              <BlockContent key={i} text={text} company={company} />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            Fait à ……………………………, le ……………………………
          </Text>
          <Text style={styles.footerName}>{company.employerName}</Text>
          <Text style={styles.footerItalic}>
            Pour la direction de l'entreprise — (signature)
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadPolicyPdf(
  blocks: SelectedBlock[],
  company: CompanyInfo,
  filename = 'Politique-SSE.pdf',
): Promise<void> {
  const doc = buildPdfDocument(blocks, company);
  const blob = await pdf(doc).toBlob();
  const { saveAs } = await import('file-saver');
  saveAs(blob, filename);
}
