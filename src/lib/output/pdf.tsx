/**
 * PDF generation for an individual rota — matches the established CWA rota
 * sheet: a centred title, then a 4-column grid (label · NAME · TIME · POSITION)
 * with the header block, sections, buses block and footer. Uses the shared line
 * model so it is identical to the Excel output. Pure JS (@react-pdf/renderer).
 */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { buildRotaLines, type RotaOutputData } from "./types";

const NAVY = "#003865";

const styles = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 11, fontFamily: "Helvetica", color: "#000" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 18 },
  row: { flexDirection: "row", minHeight: 16, alignItems: "center" },
  label: { width: 150, fontFamily: "Helvetica-Bold", textAlign: "center" },
  name: { width: 150 },
  time: { width: 110 },
  pos: { flex: 1 },
  colHead: { fontFamily: "Helvetica-Bold" },
});

function RotaDocument({ data }: { data: RotaOutputData }) {
  const { ship } = data;
  const lines = buildRotaLines(data);
  return (
    <Document title={ship.ship_name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CRUISE WELCOME AMBASSADOR ROTA</Text>
        {lines.map((l, i) => {
          const isColHead = l.name === "NAME" || l.name === "BUSES";
          const headStyle = isColHead ? styles.colHead : {};
          return (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{l.label}</Text>
              <Text style={[styles.name, headStyle]}>{l.name}</Text>
              <Text style={[styles.time, headStyle]}>{l.time}</Text>
              <Text style={[styles.pos, headStyle]}>{l.pos}</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function downloadRotaPdf(data: RotaOutputData, fileName: string) {
  const blob = await pdf(<RotaDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
