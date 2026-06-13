/**
 * Server/client PDF generation for an individual rota (Section 13.2),
 * matching the Arcadia sample layout. Uses @react-pdf/renderer (pure JS —
 * Cloudflare-friendly, no headless browser).
 */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  hhmm,
  longDate,
  SECTION_ORDER,
  SECTION_TITLES,
  type RotaOutputData,
} from "./types";

const NAVY = "#003865";
const TEAL = "#00a499";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", color: "#1f2933" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center" },
  date: { fontSize: 11, textAlign: "center", marginTop: 2, marginBottom: 10 },
  summary: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#e2e5e9", padding: 8, marginBottom: 12 },
  summaryItem: { width: "33%", marginBottom: 4 },
  summaryLabel: { fontSize: 7, color: "#5b6770", textTransform: "uppercase" },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  sectionHeader: { backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 10, padding: 4, marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 3 },
  cName: { width: "45%" },
  cTime: { width: "30%" },
  cLoc: { width: "25%", color: "#5b6770" },
  footer: { marginTop: 14, borderTopWidth: 2, borderTopColor: TEAL, paddingTop: 6, flexDirection: "row", flexWrap: "wrap" },
  footerItem: { width: "33%", marginBottom: 3 },
});

function RotaDocument({ data }: { data: RotaOutputData }) {
  const { ship, shifts, shuttles } = data;
  return (
    <Document title={ship.ship_name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CRUISE WELCOME AMBASSADOR ROTA</Text>
        <Text style={styles.date}>{longDate(ship.date)}</Text>

        <View style={styles.summary}>
          {[
            ["Ship", ship.ship_name],
            ["Dock", ship.dock ?? "—"],
            ["Time in Port", `${hhmm(ship.arrival_time)} – ${hhmm(ship.departure_time)}`],
            ["Capacity", ship.capacity?.toLocaleString() ?? "—"],
            ["Cruise Line", ship.cruise_line ?? "—"],
            ["Season Ship #", String(ship.season_number ?? "—")],
          ].map(([l, v]) => (
            <View key={l} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{l}</Text>
              <Text style={styles.summaryValue}>{v}</Text>
            </View>
          ))}
        </View>

        {SECTION_ORDER.map((role) => {
          const rows = shifts
            .filter((s) => s.role_type === role)
            .sort((a, b) => a.shift_number - b.shift_number);
          if (rows.length === 0) return null;
          return (
            <View key={role} wrap={false}>
              <Text style={styles.sectionHeader}>{SECTION_TITLES[role]}</Text>
              {rows.map((s, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.cName}>{data.staffName(s.assigned_staff_id)}</Text>
                  <Text style={styles.cTime}>
                    {hhmm(s.start_time)}
                    {role !== "volunteer" && s.end_time ? ` – ${hhmm(s.end_time)}` : ""}
                  </Text>
                  <Text style={styles.cLoc}>{s.location ?? ""}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {shuttles.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionHeader}>BUSES / SHUTTLES</Text>
            {shuttles.map((b, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.cName}>
                  {b.bus_count} × {b.bus_type === "double_decker" ? "Double Decker" : "Single"}
                </Text>
                <Text style={styles.cTime}>
                  First {hhmm(b.first_from_dock)} · Last {hhmm(b.last_from_city)}
                </Text>
                <Text style={styles.cLoc}>Every {b.frequency_minutes ?? "—"} min</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.summaryLabel}>Payment</Text>
            <Text style={styles.summaryValue}>{data.payment || "TBC"}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.summaryLabel}>Capacity</Text>
            <Text style={styles.summaryValue}>{ship.capacity?.toLocaleString() ?? "—"}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.summaryLabel}>VBWC Opening Hours</Text>
            <Text style={styles.summaryValue}>{data.vbwcHours || "—"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadRotaPdf(data: RotaOutputData, fileName: string) {
  const blob = await pdf(<RotaDocument data={data} />).toBlob();
  triggerDownload(blob, `${fileName}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
