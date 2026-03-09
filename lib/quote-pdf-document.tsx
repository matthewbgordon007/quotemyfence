import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 90,
    color: '#94a3b8',
    fontSize: 8,
  },
  value: {
    flex: 1,
    color: '#334155',
  },
  mapContainer: {
    marginTop: 6,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapImage: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
  },
  segmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  segmentChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  segmentLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 1,
  },
  segmentValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 1,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  colourPhotoContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  colourPhoto: {
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colourPhotoCaption: {
    flex: 1,
    fontSize: 8,
    color: '#64748b',
  },
  quoteBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0f172a',
    marginTop: 6,
  },
  quoteText: {
    fontSize: 8,
    lineHeight: 1.55,
    color: '#334155',
    fontFamily: 'Helvetica',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  footerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  footerCompany: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 9,
  },
  footerContact: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  footerRight: {
    fontSize: 7,
    color: '#94a3b8',
    flexShrink: 0,
    textAlign: 'right',
    maxWidth: 140,
  },
});

type QuotePdfData = {
  contractor: { company_name: string; phone?: string | null; website?: string | null; logo_url?: string | null };
  customer: { first_name: string; last_name: string; email: string; phone?: string | null };
  property: { formatted_address: string; city?: string | null; province_state?: string | null; postal_zip?: string | null };
  fence: { total_length_ft: number; has_removal: boolean } | null;
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
  gates: { gate_type: string; quantity: number }[];
  designSummary: string | null;
  colourPhotoUrl?: string | null;
  colourName?: string | null;
  quoteText: string;
  savedAt: string | null;
  mapImageUrl?: string | null;
};

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  const {
    contractor,
    customer,
    property,
    fence,
    segments,
    gates,
    designSummary,
    colourPhotoUrl,
    colourName,
    quoteText,
    savedAt,
    mapImageUrl,
  } = data;

  const addressLine2 = [property?.city, property?.province_state, property?.postal_zip]
    .filter(Boolean)
    .join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {contractor.logo_url ? (
              <Image src={contractor.logo_url} style={styles.logo} />
            ) : null}
            <Text style={styles.companyName}>{contractor.company_name}</Text>
            <Text style={styles.tagline}>Professional Fence Quote</Text>
          </View>
        </View>

        {/* Prepared for */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared for</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{`${customer.first_name} ${customer.last_name}`}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{property.formatted_address}</Text>
          </View>
          {addressLine2 ? (
            <View style={styles.row}>
              <Text style={styles.label} />
              <Text style={styles.value}>{addressLine2}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{customer.email}</Text>
          </View>
          {customer.phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{customer.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Fence drawing map */}
        {mapImageUrl && segments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property layout</Text>
            <View style={styles.mapContainer}>
              <Image src={mapImageUrl} style={styles.mapImage} />
            </View>
          </View>
        )}

        {/* Line lengths - compact chips */}
        {segments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line lengths</Text>
            <View style={styles.segmentGrid}>
              {segments.map((seg, i) => (
                <View key={i} style={styles.segmentChip}>
                  <Text style={styles.segmentLabel}>Line {i + 1}</Text>
                  <Text style={styles.segmentValue}>
                    {seg.length_ft != null ? `${Number(seg.length_ft).toFixed(1)} ft` : '—'}
                  </Text>
                </View>
              ))}
              {fence && (
                <View style={styles.totalChip}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{fence.total_length_ft.toFixed(1)} ft</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Design & options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project details</Text>
          {designSummary ? (
            <View style={styles.row}>
              <Text style={styles.label}>Design</Text>
              <Text style={styles.value}>{designSummary}</Text>
            </View>
          ) : null}
          {colourPhotoUrl && (
            <View style={styles.colourPhotoContainer}>
              <Image src={colourPhotoUrl} style={styles.colourPhoto} />
              <Text style={styles.colourPhotoCaption}>
                {colourName ? `Selected colour: ${colourName}` : 'Selected material'}
              </Text>
            </View>
          )}
          {gates.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Gates</Text>
              <Text style={styles.value}>
                {gates.map((g) => `${g.quantity}× ${g.gate_type}`).join(', ')}
              </Text>
            </View>
          )}
          {fence?.has_removal && (
            <View style={styles.row}>
              <Text style={styles.label}>Removal</Text>
              <Text style={styles.value}>Included</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerCompany}>{contractor.company_name}</Text>
            {contractor.phone && (
              <Text style={styles.footerContact}>{contractor.phone}</Text>
            )}
            {contractor.website && (
              <Text style={styles.footerContact}>{contractor.website}</Text>
            )}
          </View>
          <Text style={styles.footerRight}>
            Valid 30 days. Thank you for your business.
          </Text>
        </View>
      </Page>

      {/* Page 2: Quote */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { marginBottom: 20 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{contractor.company_name}</Text>
            <Text style={styles.tagline}>Quote details</Text>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 56 }]}>
          <Text style={styles.sectionTitle}>Your quote</Text>
          {savedAt && (
            <Text style={{ fontSize: 7, color: '#94a3b8', marginBottom: 4 }}>
              Quoted {new Date(savedAt).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          )}
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>{quoteText}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerCompany}>{contractor.company_name}</Text>
            {contractor.phone && (
              <Text style={styles.footerContact}>{contractor.phone}</Text>
            )}
            {contractor.website && (
              <Text style={styles.footerContact}>{contractor.website}</Text>
            )}
          </View>
          <Text style={styles.footerRight}>
            Valid 30 days. Thank you for your business.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
