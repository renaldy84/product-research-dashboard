'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { backgroundColor: '#4f46e5', padding: 20, marginBottom: 20 },
  headerText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  headerSubtext: { color: '#c7d2fe', fontSize: 10, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 20 },
  box: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginRight: 8 },
  boxLast: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 },
  boxLabel: { fontSize: 8, color: '#6b7280', marginBottom: 4 },
  boxValue: { fontSize: 12, fontWeight: 'bold' },
  scoreGrid: { flexDirection: 'row', marginBottom: 20 },
  scoreBox: { flex: 1, backgroundColor: '#f3f4f6', padding: 8, borderRadius: 4, marginRight: 8, alignItems: 'center' },
  scoreValue: { fontSize: 18, fontWeight: 'bold' },
  scoreLabel: { fontSize: 7, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  h1: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginTop: 10, marginBottom: 6 },
  h2: { fontSize: 11, fontWeight: 'bold', color: '#374151', marginTop: 8, marginBottom: 4 },
  h3: { fontSize: 10, fontWeight: 'bold', color: '#4b5563', marginTop: 6, marginBottom: 3 },
  paragraph: { fontSize: 9, color: '#374151', lineHeight: 1.5, marginBottom: 6 },
  listItem: { fontSize: 9, color: '#374151', marginBottom: 3, paddingLeft: 12, flexDirection: 'row' },
  listBullet: { width: 12, fontSize: 9, color: '#374151' },
  listText: { flex: 1, fontSize: 9, color: '#374151', lineHeight: 1.4 },
  // Table styles
  table: { marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCell: { flex: 1, padding: 6, fontSize: 8, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  tableCellLast: { flex: 1, padding: 6, fontSize: 8 },
  tableCellHeader: { flex: 1, padding: 6, fontSize: 8, fontWeight: 'bold', borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  tableCellHeaderLast: { flex: 1, padding: 6, fontSize: 8, fontWeight: 'bold' },
  // Recommendation
  recommendationBox: { padding: 6, borderRadius: 3, marginBottom: 4 },
  recommendationText: { fontSize: 8 },
});

interface ProposalPDFProps {
  product: any;
  category: any;
  margin: number;
  summary: any;
}

// Clean markdown text - remove or fix common issues
function cleanMarkdownText(text: string): string {
  return text
    .replace(/^\s*[-*+]\s*/gm, '') // Remove bullet markers
    .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered list markers
    .replace(/^\s*>\s*/gm, '') // Remove blockquote markers
    .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .trim();
}

// Simple markdown to plain text
function markdownToText(text: string): string {
  if (!text) return '';
  
  // First clean the text
  let cleaned = cleanMarkdownText(text);
  
  // Convert to plain text with structure preserved
  const lines = cleaned.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    
    // Headers
    if (trimmed.startsWith('### ')) {
      result.push(trimmed.substring(4));
    } else if (trimmed.startsWith('## ')) {
      result.push(trimmed.substring(3));
    } else if (trimmed.startsWith('# ')) {
      result.push(trimmed.substring(2));
    } else {
      // Remove inline formatting but keep text
      let plain = trimmed
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // Bold+Italic
        .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
        .replace(/\*(.+?)\*/g, '$1') // Italic
        .replace(/`(.+?)`/g, '$1') // Code
        .replace(/_{3}(.+?)_{3}/g, '$1') // Bold+Italic underscore
        .replace(/_(.+?)_/g, '$1') // Italic underscore
        .replace(/^[-*+]\s+/, '') // Bullet
        .replace(/^\d+\.\s+/, ''); // Numbered list
      
      result.push(plain);
    }
  }
  
  return result.join('\n');
}

// Better markdown parser with proper structure
function parseMarkdown(text: string): Array<{type: string, content: string}> {
  if (!text) return [];
  
  const lines = text.split('\n');
  const elements: Array<{type: string, content: string}> = [];
  let currentParagraph = '';
  let inTable = false;
  let tableRows: string[][] = [];
  
  const isTableSeparator = (line: string): boolean => {
    const t = line.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return false;
    const cells = t.slice(1, -1).split('|');
    return cells.every(c => /^[\s:-]+$/.test(c.trim()));
  };
  
  const processParagraph = () => {
    if (currentParagraph.trim()) {
      // Check if it's a header
      const t = currentParagraph.trim();
      if (t.startsWith('### ')) {
        elements.push({ type: 'h3', content: t.substring(4) });
      } else if (t.startsWith('## ')) {
        elements.push({ type: 'h2', content: t.substring(3) });
      } else if (t.startsWith('# ')) {
        elements.push({ type: 'h1', content: t.substring(2) });
      } else if (t.startsWith('- ') || t.startsWith('* ')) {
        elements.push({ type: 'list', content: t.substring(2) });
      } else if (/^\d+\.\s/.test(t)) {
        elements.push({ type: 'list', content: t.replace(/^\d+\.\s/, '') });
      } else {
        elements.push({ type: 'paragraph', content: t });
      }
    }
    currentParagraph = '';
  };
  
  const flushTable = () => {
    if (tableRows.length > 1) {
      elements.push({ type: 'table', content: JSON.stringify(tableRows) });
    }
    tableRows = [];
    inTable = false;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      processParagraph();
      flushTable();
      continue;
    }
    
    // Skip table separators
    if (isTableSeparator(trimmed)) {
      continue;
    }
    
    // Table row
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').filter((_, idx) => idx > 0 && idx < trimmed.split('|').length - 1);
      tableRows.push(cells.map(c => c.trim()));
      inTable = true;
      continue;
    }
    
    // Flush table when we hit non-table content
    if (inTable) {
      flushTable();
    }
    
    // Continuation of paragraph (indented or inline content)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      processParagraph();
      elements.push({ type: 'list', content: trimmed.replace(/^[-*+]\s*/, '').replace(/^\d+\.\s*/, '') });
    } else {
      // Add to current paragraph or create new one
      if (currentParagraph) {
        currentParagraph += ' ' + trimmed;
      } else {
        currentParagraph = trimmed;
      }
    }
  }
  
  processParagraph();
  flushTable();
  
  return elements;
}

// Clean inline formatting
function cleanInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // Bold+Italic
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/`(.+?)`/g, '$1') // Code
    .replace(/_{3}(.+?)_{3}/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

export default function ProposalPDF({ product, category, margin, summary }: ProposalPDFProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const aiOpinionElements = parseMarkdown(product.ai_opinion);
  const marketingElements = parseMarkdown(product.marketing_strategy);

  const renderElement = (el: {type: string, content: string}, idx: number) => {
    const text = cleanInline(el.content);
    
    switch (el.type) {
      case 'h1':
        return <Text key={idx} style={styles.h1}>{text}</Text>;
      case 'h2':
        return <Text key={idx} style={styles.h2}>{text}</Text>;
      case 'h3':
        return <Text key={idx} style={styles.h3}>{text}</Text>;
      case 'paragraph':
        return <Text key={idx} style={styles.paragraph}>{text}</Text>;
      case 'list':
        return (
          <View key={idx} style={styles.listItem}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.listText}>{text}</Text>
          </View>
        );
      case 'table':
        try {
          const rows: string[][] = JSON.parse(el.content);
          if (rows.length < 2) return null;
          const headers = rows[0];
          const dataRows = rows.slice(1);
          return (
            <View key={idx} style={styles.table}>
              <View style={styles.tableRowHeader}>
                {headers.map((cell, ci) => (
                  <Text key={ci} style={ci === headers.length - 1 ? styles.tableCellHeaderLast : styles.tableCellHeader}>
                    {cleanInline(cell)}
                  </Text>
                ))}
              </View>
              {dataRows.map((row, ri) => (
                <View key={ri} style={styles.tableRow}>
                  {row.map((cell, ci) => (
                    <Text key={ci} style={ci === row.length - 1 ? styles.tableCellLast : styles.tableCell}>
                      {cleanInline(cell)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        } catch {
          return null;
        }
      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>{product.name}</Text>
          <Text style={styles.headerSubtext}>{category?.name || 'Business Proposal'}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.row}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Harga Modal</Text>
            <Text style={styles.boxValue}>{formatCurrency(product.cost_price)}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Harga Jual</Text>
            <Text style={styles.boxValue}>{formatCurrency(product.selling_price)}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Margin</Text>
            <Text style={styles.boxValue}>{margin.toFixed(1)}%</Text>
          </View>
          <View style={styles.boxLast}>
            <Text style={styles.boxLabel}>Overall Score</Text>
            <Text style={styles.boxValue}>{summary.scores.overall_score}</Text>
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          <View style={styles.scoreGrid}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{summary.scores.profit_margin}</Text>
              <Text style={styles.scoreLabel}>Profit Margin</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{summary.scores.market_potential}</Text>
              <Text style={styles.scoreLabel}>Market Potential</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{summary.scores.competition_level}</Text>
              <Text style={styles.scoreLabel}>Competition</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{summary.scores.uniqueness}</Text>
              <Text style={styles.scoreLabel}>Uniqueness</Text>
            </View>
          </View>
        </View>

        {/* AI Opinion */}
        {product.ai_opinion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Opinion</Text>
            {aiOpinionElements.map((el, idx) => renderElement(el, idx))}
          </View>
        )}

        {/* Marketing Strategy */}
        {product.marketing_strategy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marketing Strategy</Text>
            {marketingElements.map((el, idx) => renderElement(el, idx))}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {summary.scores.overall_score >= 70 && (
            <View style={[styles.recommendationBox, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.recommendationText, { color: '#166534' }]}>Produk ini memiliki potensi tinggi untuk dilaunch</Text>
            </View>
          )}
          {margin < 20 && (
            <View style={[styles.recommendationBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.recommendationText, { color: '#991b1b' }]}>Margin rendah, perlu negosiasi harga supplier</Text>
            </View>
          )}
          {summary.scores.market_potential >= 70 && (
            <View style={[styles.recommendationBox, { backgroundColor: '#dbeafe' }]}>
              <Text style={[styles.recommendationText, { color: '#1e40af' }]}>Market potential tinggi</Text>
            </View>
          )}
          {summary.scores.uniqueness >= 70 && (
            <View style={[styles.recommendationBox, { backgroundColor: '#f3e8ff' }]}>
              <Text style={[styles.recommendationText, { color: '#7e22ce' }]}>Uniqueness tinggi - differentiator jelas</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
