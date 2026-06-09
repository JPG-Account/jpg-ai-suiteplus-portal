// Screen 05 · Schedule & Calendar
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";
import { scheduleEvents } from "../../../lib/data";

// Build a June 2026 calendar (Mon-Sun grid)
function buildCalendar() {
  const daysInJune = 30;
  // June 1, 2026 is Monday
  const cells: { day: number; dim: boolean; today: boolean; events: typeof scheduleEvents }[] = [];
  // Prev-month tail (May 26-31, 6 days dim)
  for (let d = 26; d <= 31; d++) cells.push({ day: d, dim: true, today: false, events: [] });
  // June 1-30
  for (let d = 1; d <= daysInJune; d++) {
    const iso = `2026-06-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dim: false, today: d === 5, events: scheduleEvents.filter((e) => e.date === iso) });
  }
  // Next month head (Jul 1-... to fill grid to multiple of 7)
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, dim: true, today: false, events: [] });
  return cells;
}

export default function SchedulePage() {
  const cells = buildCalendar();
  const upcoming = [...scheduleEvents].filter((e) => e.kind !== "draft").sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <TopBar
        crumbs={[{ label: "Schedule", bold: true }]}
        pill={{ tone: "amber", label: `${upcoming.length} upcoming` }}
      />
      <ActionBar
        title="Schedule"
        sub="Plan publishes and unpublishes across the site. Bind snippets, banners, and tile visibility to campaign windows. Approvals still apply — schedule fires the publish; dual-control is required up-front."
        actions={<>
          <button className="btn">{Icon.plus} Schedule action</button>
          <button className="btn primary">Calendar view {Icon.schedule}</button>
        </>}
      />
      <div className="content">
        <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:18}}>
          <div>
            <div style={{background:"#fff", border:"1px solid rgba(13,53,60,.08)", borderRadius:14, boxShadow:"var(--shadow-card)", padding:"14px 18px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"}}>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                <button className="btn ghost sm">{Icon.chevronUp}</button>
                <b style={{fontSize:18, color:"var(--ust-deep)", fontWeight:800, letterSpacing:"-.02em"}}>June 2026</b>
                <button className="btn ghost sm">{Icon.chevronDown}</button>
                <button className="btn sm">Today</button>
              </div>
              <div className="filters">
                <span className="chip active">All actions</span>
                <span className="chip">Publish</span>
                <span className="chip">Unpublish</span>
                <span className="chip">Expire</span>
              </div>
            </div>
            <div className="cal-grid">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                <div className="cal-h" key={d}>{d}</div>
              ))}
              {cells.map((c, i) => (
                <div className={`cal-cell ${c.dim ? "dim" : ""} ${c.today ? "today" : ""}`} key={i}>
                  <span className="d">{c.day}</span>
                  {c.events.map((e, j) => (
                    <span key={j} className={`cal-evt ${e.kind}`}>
                      {e.kind === "pub" && "▶ "}{e.kind === "unpub" && "▣ "}{e.kind === "exp" && "⚠ "}
                      {e.title.length > 24 ? e.title.slice(0, 22) + "…" : e.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:14}}>
            <div className="card">
              <div className="card-h"><h3>Upcoming · next 14d</h3><span className="meta">{upcoming.length} actions</span></div>
              <div style={{padding:0}}>
                {upcoming.map((e, i) => (
                  <div key={i} style={{padding:"14px 18px", borderBottom: i < upcoming.length - 1 ? "1px solid rgba(13,53,60,.06)" : 0}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                      <span className={`cal-evt ${e.kind}`}>{e.kind.toUpperCase()}</span>
                      <span style={{fontSize:"11.5px", color:"#7F8B92", fontVariantNumeric:"tabular-nums"}}>{new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} {e.time && `· ${e.time}`}</span>
                    </div>
                    <div style={{fontSize:"13.5px", color:"var(--ust-deep)", fontWeight:700, letterSpacing:"-.01em"}}>{e.title.replace(/ · .*/, "")}</div>
                    {e.detail && <div style={{fontSize:12, color:"#52646C", marginTop:4}}>{e.detail}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
