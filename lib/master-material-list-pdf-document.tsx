import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { MasterMaterialListPdfRow, MasterMaterialListPdfSection } from '@/lib/master-material-list-pdf-data';

const COL_ADOBE = '#F4D4A4';
const COL_GREEN = '#92D050';
const COL_BLUE = '#B7DEE8';
const COL_WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000',
  },
  title: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 2,
  },
  address: {
    textAlign: 'center',
    fontSize: 10,
    marginBottom: 16,
  },
  table: {
    borderWidth: 1.5,
    borderColor: '#000',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderColor: '#000',
    backgroundColor: COL_ADOBE,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 18,
  },
  cellLabel: {
    width: '56%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderColor: '#000',
    textAlign: 'left',
  },
  cellAdobe: {
    width: '22%',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
  },
  cellExtras: {
    width: '22%',
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  headerAdobe: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

function rowBg(section: MasterMaterialListPdfSection): string {
  switch (section) {
    case 'structure':
    case 'totals':
      return COL_ADOBE;
    case 'accessory':
      return COL_GREEN;
    case 'hardware':
      return COL_BLUE;
    case 'spacer':
    case 'taxRow':
      return COL_WHITE;
    default:
      return COL_WHITE;
  }
}

export interface MasterMaterialListPdfDocumentProps {
  /** Second header line (e.g. colour + panel height). */
  subtitle: string;
  addressLine: string;
  /** Column header for the main qty column (matches Excel colour tab name). */
  colourColumnTitle: string;
  rows: MasterMaterialListPdfRow[];
}

export function MasterMaterialListPdfDocument({
  subtitle,
  addressLine,
  colourColumnTitle,
  rows,
}: MasterMaterialListPdfDocumentProps) {
  return (
    <Document title="Master Material List">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Master Material List</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.address}>{addressLine || '—'}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={[styles.cellLabel, { backgroundColor: COL_WHITE }]} />
            <View style={[styles.cellAdobe, { backgroundColor: COL_ADOBE }]}>
              <Text style={styles.headerAdobe}>{colourColumnTitle}</Text>
            </View>
            <View style={[styles.cellExtras, { backgroundColor: COL_WHITE }]}>
              <Text style={styles.headerAdobe}>Extras</Text>
            </View>
          </View>

          {rows.map((r, i) => {
            const bg = rowBg(r.section);
            const isSpacer = r.section === 'spacer';
            return (
                <View
                key={`${i}-${r.label || 'sp'}`}
                style={[
                  styles.row,
                  isSpacer ? { minHeight: 14, borderBottomWidth: 1 } : {},
                ]}
              >
                <View style={[styles.cellLabel, { backgroundColor: bg }]}>
                  <Text>{r.label}</Text>
                </View>
                <View style={[styles.cellAdobe, { backgroundColor: bg }]}>
                  <Text>{r.adobe}</Text>
                </View>
                <View style={[styles.cellExtras, { backgroundColor: bg }]}>
                  <Text>{r.extras}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
