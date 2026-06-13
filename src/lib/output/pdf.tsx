/**
 * PDF generation for an individual rota (Section 13.2), laid out to match the
 * established CWA rota sheet. Uses @react-pdf/renderer (pure JS — no headless
 * browser, Cloudflare-friendly).
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
  busLabel,
  dateLine,
  dot,
  dotRange,
  portRange,
  SECTION_ORDER,
  SECTION_TITLES,
  type RotaOutputData,
} from "./types";

const NAVY = "#003865";
const TEAL = "#00a499";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, fontFamily: "Helvetica", color: "#1f2933" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 10 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 110, fontFamily: "Helvetica-Bold", color: NAVY },
  infoValue: { flex: 1 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, marginTop: 12, paddingBottom: 3 },
  hSection: { width: 130, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#5b6770" },
  hName: { width: 150, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#5b6770" },
  hTime: { width: 120, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#5b6770" },
  hPos: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#5b6770" },
  row: { flexDirection: "row", paddingVertical: 2.5 },
  cSection: { width: 130, fontFamily: "Helvetica-Bold", color: NAVY },
  cName: { width: 150 },
  cTime: { width: 120 },
  cPos: { flex: 1, color: "#5b6770" },
  footer: { marginTop: 16, borderTopWidth: 2, borderTopColor: TEAL, paddingTop: 8 },
});

function PersonRow({ section, name, time, pos }: { section: string; name: string; time: string; pos: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cSection}>{section}</Text>
      <Text style={styles.cName}>{name}</Text>
      <Text style={styles.cTime}>{time}</Text>
      <Text style={styles.cPos}>{pos}</Text>
    </View>
  );
}

function RotaDocument({ data }: { data: RotaOutputData }) {
  const { ship, shifts, shuttles } = data;
  const get = (role: (typeof SECTION_ORDER)[number]) =>
    shifts.filter((s) => s.role_type === role).sort((a, b) => a.shift_number - b.shift_number);

  return (
    <Document title={ship.ship_name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CRUISE WELCOME AMBASSADOR ROTA</Text>

        {[
          ["DATE", dateLine(ship.date)],
          ["SHIP", ship.ship_name],
          ["DOCK", ship.dock ?? ""],
          ["TIME IN PORT", portRange(ship.arrival_time, ship.departure_time)],
        ].map(([l, v]) => (
          <View key={l} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l}</Text>
            <Text style={styles.infoValue}>{v}</Text>
          </View>
        ))}

        <View style={styles.headerRow}>
          <Text style={styles.hSection}> </Text>
          <Text style={styles.hName}>NAME</Text>
          <Text style={styles.hTime}>TIME</Text>
          <Text style={styles.hPos}>POSITION</Text>
        </View>

        {SECTION_ORDER.map((role) => {
          const members = get(role);
          if (members.length === 0)
            return <PersonRow key={role} section={SECTION_TITLES[role]} name="" time="" pos="" />;
          return (
            <View key={role} wrap={false}>
              {members.map((s, i) => (
                <PersonRow
                  key={s.shift_number + "-" + i}
                  section={i === 0 ? SECTION_TITLES[role] : ""}
                  name={data.staffName(s.assigned_staff_id)}
                  time={role === "volunteer" ? dot(s.start_time) : dotRange(s.start_time, s.end_time)}
                  pos={s.location ?? ""}
                />
              ))}
            </View>
          );
        })}

        {/* Shuttles */}
        <View style={styles.headerRow}>
          <Text style={styles.hSection}> </Text>
          <Text style={styles.hName}>BUSES</Text>
          <Text style={styles.hTime}>TIMES</Text>
          <Text style={styles.hPos}>FREQUENCY</Text>
        </View>
        {shuttles.length === 0 ? (
          <PersonRow section="SHUTTLES" name="" time="" pos="" />
        ) : (
          shuttles.map((b, i) => (
            <View key={i} wrap={false}>
              <PersonRow
                section={i === 0 ? "SHUTTLES" : ""}
                name={busLabel(b)}
                time={`1st Bus ${dot(b.first_from_dock)}`}
                pos={b.frequency_minutes ? `Every ${b.frequency_minutes}minutes` : ""}
              />
              <PersonRow section="" name="" time={`Last Bus ${dot(b.last_from_city)}`} pos="" />
            </View>
          ))
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {[
            ["PAYMENT", data.payment || "TBC"],
            ["CAPACITY", ship.capacity?.toLocaleString() ?? ""],
            ["VBWC", data.vbwcHours || ""],
          ].map(([l, v]) => (
            <View key={l} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{l}</Text>
              <Text style={styles.infoValue}>{v}</Text>
            </View>
          ))}
        </View>
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
