import React, { useMemo, useState } from "react";

// HeroUI (adjust imports to your setup)
import {
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Accordion,
  AccordionItem,
  Divider,
  Switch,
} from "@heroui/react";

type Market = "HK" | "TW" | "ID" | "SG" | "MY" | "AU";

type Priority = "high" | "medium";
type Mode = "recurring" | "one_off";
type AlertType = "PRE_ALERT" | "START" | "PEAK" | "END";

type DestinationObj = { code: string; name: string };
type Destination = string | DestinationObj;

type TrendSignal = {
  key: string;
  trend_type: string; // key
  trend_type_name?: string; // optional if you denormalize
  source_markets?: Market[]; // optional means ALL
  destinations: Destination[];
  mode: Mode;

  start_mmdd?: string;
  end_mmdd?: string;
  peak_start_mmdd?: string;
  peak_end_mmdd?: string;

  start_date?: string; // YYYY-MM-DD
  end_date?: string;
  peak_start_date?: string;
  peak_end_date?: string;

  product_types?: string[];
  keywords?: string[];
  priority: Priority;
  summary: string;
};

type SignalState = "PEAK" | "ACTIVE" | "IN_PREALERT" | "UPCOMING_PREALERT" | "ENDED";

type ResolvedDates = {
  start: Date;
  end: Date;
  preAlert: Date;
  peakStart?: Date;
  peakEnd?: Date;
};

type Props = {
  signals: TrendSignal[];
  // optional: mapping trend_type -> display name
  trendTypeNameMap?: Record<string, string>;
  // if you have default_pre_alert_days per type
  defaultPreAlertDays?: number;
};

function isDestObj(d: Destination): d is DestinationObj {
  return typeof d === "object" && d !== null && "name" in d;
}

function formatDestinations(destinations: Destination[]) {
  if (!Array.isArray(destinations) || destinations.length === 0) return "—";
  const names = destinations
    .map((d) => (isDestObj(d) ? d.name : String(d)))
    .map((s) => s.trim())
    .filter(Boolean);
  return names.length ? names.join(" · ") : "—";
}

function parseMMDD(mmdd: string) {
  const [mm, dd] = mmdd.split("-").map((x) => parseInt(x, 10));
  return { mm, dd };
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function resolveRecurringWindow(today: Date, start_mmdd: string, end_mmdd: string, peak_start_mmdd?: string, peak_end_mmdd?: string) {
  const t = startOfDay(today);
  const year = t.getFullYear();

  const s0 = parseMMDD(start_mmdd);
  const e0 = parseMMDD(end_mmdd);

  let start = new Date(year, s0.mm - 1, s0.dd);
  let end = new Date(year, e0.mm - 1, e0.dd);

  // wrap-year
  if (end < start) end = new Date(year + 1, e0.mm - 1, e0.dd);

  // if already passed, shift forward one year
  if (t > end) {
    start = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
  }

  let peakStart: Date | undefined;
  let peakEnd: Date | undefined;

  if (peak_start_mmdd && peak_end_mmdd) {
    const ps0 = parseMMDD(peak_start_mmdd);
    const pe0 = parseMMDD(peak_end_mmdd);

    peakStart = new Date(start.getFullYear(), ps0.mm - 1, ps0.dd);
    peakEnd = new Date(start.getFullYear(), pe0.mm - 1, pe0.dd);
    if (peakEnd < peakStart) peakEnd = new Date(peakEnd.getFullYear() + 1, peakEnd.getMonth(), peakEnd.getDate());
    // ensure peak roughly aligns inside [start,end] (best-effort)
    if (peakStart < start) peakStart = start;
    if (peakEnd > end) peakEnd = end;
  }

  return { start, end, peakStart, peakEnd };
}

function resolveSignalDates(signal: TrendSignal, today: Date, preAlertDays: number): ResolvedDates | null {
  if (signal.mode === "one_off") {
    if (!signal.start_date || !signal.end_date) return null;
    const start = new Date(signal.start_date);
    const end = new Date(signal.end_date);
    const preAlert = addDays(start, -preAlertDays);

    const peakStart = signal.peak_start_date ? new Date(signal.peak_start_date) : undefined;
    const peakEnd = signal.peak_end_date ? new Date(signal.peak_end_date) : undefined;

    return { start, end, preAlert, peakStart, peakEnd };
  }

  if (!signal.start_mmdd || !signal.end_mmdd) return null;
  const { start, end, peakStart, peakEnd } = resolveRecurringWindow(
    today,
    signal.start_mmdd,
    signal.end_mmdd,
    signal.peak_start_mmdd,
    signal.peak_end_mmdd
  );
  const preAlert = addDays(start, -preAlertDays);
  return { start, end, preAlert, peakStart, peakEnd };
}

function computeState(today: Date, dates: ResolvedDates): SignalState {
  const t = startOfDay(today);
  const start = startOfDay(dates.start);
  const end = startOfDay(dates.end);
  const pre = startOfDay(dates.preAlert);

  const peakStart = dates.peakStart ? startOfDay(dates.peakStart) : undefined;
  const peakEnd = dates.peakEnd ? startOfDay(dates.peakEnd) : undefined;

  if (peakStart && peakEnd && t >= peakStart && t <= peakEnd) return "PEAK";
  if (t >= start && t <= end) return "ACTIVE";
  if (t >= pre && t < start) return "IN_PREALERT";
  if (t < pre) return "UPCOMING_PREALERT";
  return "ENDED";
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function daysDiff(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function StateBadge({ state }: { state: SignalState }) {
  const map: Record<SignalState, { label: string; bar: string; chip: string }> = {
    PEAK: { label: "PEAK", bar: "bg-red-500", chip: "border-red-200 text-red-700 bg-red-50" },
    ACTIVE: { label: "ACTIVE", bar: "bg-emerald-500", chip: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    IN_PREALERT: { label: "PRE-ALERT", bar: "bg-amber-500", chip: "border-amber-200 text-amber-700 bg-amber-50" },
    UPCOMING_PREALERT: { label: "UPCOMING", bar: "bg-sky-500", chip: "border-sky-200 text-sky-700 bg-sky-50" },
    ENDED: { label: "ENDED", bar: "bg-zinc-400", chip: "border-zinc-200 text-zinc-600 bg-zinc-50" },
  };

  const s = map[state];
  return (
    <div className="flex items-center gap-2">
      <span className={`h-8 w-1.5 rounded-full ${s.bar}`} />
      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${s.chip}`}>
        {s.label}
      </span>
    </div>
  );
}

function RowRightMeta({ state, today, dates }: { state: SignalState; today: Date; dates: ResolvedDates }) {
  const start = dates.start;
  const end = dates.end;
  const pre = dates.preAlert;

  let label = "";
  if (state === "PEAK" && dates.peakEnd) label = `Peak ends ${formatShortDate(dates.peakEnd)}`;
  else if (state === "ACTIVE") label = `Ends ${formatShortDate(end)}`;
  else if (state === "IN_PREALERT") label = `Starts ${formatShortDate(start)}`;
  else if (state === "UPCOMING_PREALERT") {
    const d = daysDiff(today, pre);
    label = `Alert in ${d}d`;
  } else label = `Ended ${formatShortDate(end)}`;

  return <div className="text-right text-xs font-semibold text-default-600">{label}</div>;
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "red" | "green" | "amber" }) {
  const toneMap = {
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  } as const;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2 ${toneMap[tone]} min-w-[220px]`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold">{title}</div>
      <Chip size="sm" variant="flat" className="text-xs">
        {count}
      </Chip>
    </div>
  );
}

export default function TrendRadarPage({ signals, trendTypeNameMap = {}, defaultPreAlertDays = 14 }: Props) {
  const today = useMemo(() => new Date(), []);

  // UI controls
  const [q, setQ] = useState("");
  const [market, setMarket] = useState<Market | "ALL">("ALL");
  const [horizon, setHorizon] = useState<"TODAY" | "7" | "14" | "30" | "ALL">("14");
  const [statusView, setStatusView] = useState<"ACTIVE" | "DRAFT" | "ALL">("ALL");
  const [includeBaseline, setIncludeBaseline] = useState(false);

  // show-more per section
  const [showMoreActive, setShowMoreActive] = useState(false);
  const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);

  const horizonDays = horizon === "TODAY" ? 0 : horizon === "7" ? 7 : horizon === "14" ? 14 : horizon === "30" ? 30 : null;

  // You can define baseline as: entry_pretrip OR outbound_planning OR full-year windows
  const isBaselineSignal = (s: TrendSignal) => {
    const tt = s.trend_type;
    const fullYear = s.mode === "recurring" && s.start_mmdd === "01-01" && s.end_mmdd === "12-31";
    return tt === "entry_pretrip" || tt === "outbound_planning" || fullYear;
  };

  const prepared = useMemo(() => {
    const lowerQ = q.trim().toLowerCase();

    const filtered = signals
      // statusView: adapt to your data if you have draft/active fields; otherwise ignore
      .filter(() => statusView !== "DRAFT") // skeleton: no draft logic
      .filter((s) => (includeBaseline ? true : !isBaselineSignal(s)))
      .filter((s) => {
        const sm = s.source_markets;
        if (market === "ALL") return true;
        if (!sm || sm.length === 0) return true; // treat empty as ALL
        return sm.includes(market as Market);
      })
      .map((s) => {
        const preAlertDays = defaultPreAlertDays;
        const dates = resolveSignalDates(s, today, preAlertDays);
        if (!dates) return null;

        const state = computeState(today, dates);
        const name = s.trend_type_name || trendTypeNameMap[s.trend_type] || s.trend_type;

        const destLabel = formatDestinations(s.destinations);
        const searchable = `${name} ${destLabel} ${s.summary ?? ""} ${(s.keywords ?? []).join(" ")}`.toLowerCase();

        return { s, name, destLabel, dates, state, preAlertDays, searchable };
      })
      .filter(Boolean) as Array<{
      s: TrendSignal;
      name: string;
      destLabel: string;
      dates: ResolvedDates;
      state: SignalState;
      preAlertDays: number;
      searchable: string;
    }>;

    const withSearch = lowerQ ? filtered.filter((x) => x.searchable.includes(lowerQ)) : filtered;

    // horizon filter: keep only signals whose next relevant date falls within horizon
    const withinHorizon =
      horizonDays == null
        ? withSearch
        : withSearch.filter((x) => {
            const { state, dates } = x;
            const relevant =
              state === "PEAK" || state === "ACTIVE"
                ? dates.end
                : state === "IN_PREALERT"
                ? dates.start
                : state === "UPCOMING_PREALERT"
                ? dates.preAlert
                : dates.end;

            const d = daysDiff(today, relevant);
            return d >= 0 && d <= horizonDays;
          });

    // sorting
    const stateWeight: Record<SignalState, number> = {
      PEAK: 0,
      ACTIVE: 1,
      IN_PREALERT: 2,
      UPCOMING_PREALERT: 3,
      ENDED: 4,
    };

    const priorityWeight: Record<Priority, number> = { high: 0, medium: 1 };

    withinHorizon.sort((a, b) => {
      const sw = stateWeight[a.state] - stateWeight[b.state];
      if (sw !== 0) return sw;

      const pw = priorityWeight[a.s.priority] - priorityWeight[b.s.priority];
      if (pw !== 0) return pw;

      // soonest relevant date
      const aDate =
        a.state === "IN_PREALERT" ? a.dates.start : a.state === "UPCOMING_PREALERT" ? a.dates.preAlert : a.dates.end;
      const bDate =
        b.state === "IN_PREALERT" ? b.dates.start : b.state === "UPCOMING_PREALERT" ? b.dates.preAlert : b.dates.end;

      return aDate.getTime() - bDate.getTime();
    });

    return withinHorizon;
  }, [signals, q, market, horizon, statusView, includeBaseline, defaultPreAlertDays, today, trendTypeNameMap]);

  const peak = prepared.filter((x) => x.state === "PEAK");
  const active = prepared.filter((x) => x.state === "ACTIVE");
  const upcoming = prepared.filter((x) => x.state === "IN_PREALERT" || x.state === "UPCOMING_PREALERT");

  // limits (progressive disclosure)
  const ACTIVE_LIMIT = 8;
  const UPCOMING_LIMIT = 12;

  const activeToShow = showMoreActive ? active : active.slice(0, ACTIVE_LIMIT);
  const upcomingToShow = showMoreUpcoming ? upcoming : upcoming.slice(0, UPCOMING_LIMIT);

  // expanded rows
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const renderRow = (x: (typeof prepared)[number]) => {
    const expanded = expandedKey === x.s.key;
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setExpandedKey(expanded ? null : x.s.key)}
          className="w-full text-left focus:outline-none"
        >
          <div className="grid w-full grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[140px_1fr_140px] sm:items-center">
            <StateBadge state={x.state} />

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-default-900">{x.name}</div>
              <div className="truncate text-xs text-default-500">{x.destLabel}</div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <RowRightMeta state={x.state} today={today} dates={x.dates} />
              <span className="text-default-400">{expanded ? "▲" : "▼"}</span>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            <Divider className="my-3" />

            <div className="text-sm text-default-700">{x.s.summary}</div>

            {Array.isArray(x.s.product_types) && x.s.product_types.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {x.s.product_types.slice(0, 6).map((pt) => (
                  <Chip key={pt} size="sm" variant="flat" className="text-xs">
                    {pt}
                  </Chip>
                ))}
              </div>
            )}

            {Array.isArray(x.s.keywords) && x.s.keywords.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer select-none text-xs font-semibold text-default-600">
                  Keywords ({x.s.keywords.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-default-600">
                  {x.s.keywords.slice(0, 20).map((kw) => (
                    <li key={kw}>{kw}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-4">
              <Button size="sm" variant="flat">
                Check related campaigns →
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-none flex-1 min-w-0 px-6 py-6">
      {/* HEADER */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-default-900">Trend Radar</div>
        <div className="mt-1 text-sm text-default-600">Daily intelligence scan of emerging seasonal spikes and market shifts.</div>

        <div className="mt-4 flex flex-wrap gap-3">
          <StatPill label="At Peak" value={peak.length} tone="red" />
          <StatPill label="Active" value={active.length} tone="green" />
          <StatPill label="Pre-alert" value={upcoming.length} tone="amber" />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="mb-5 rounded-xl border border-default-200 bg-background px-4 py-3">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Input
            value={q}
            onValueChange={setQ}
            placeholder="Search trends (name, destination...)"
            className="flex-1 min-w-[320px]"
            size="sm"
          />

          <Select
            selectedKeys={[market]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as any;
              setMarket(v);
            }}
            className="min-w-[180px]"
            size="sm"
            labelPlacement="outside"
          >
            <SelectItem key="ALL">All markets</SelectItem>
            {(["HK", "TW", "ID", "SG", "MY", "AU"] as Market[]).map((m) => (
              <SelectItem key={m}>{m}</SelectItem>
            ))}
          </Select>

          <Select
            selectedKeys={[horizon]}
            onSelectionChange={(keys) => setHorizon(Array.from(keys)[0] as any)}
            className="min-w-[180px]"
            size="sm"
          >
            <SelectItem key="TODAY">Today</SelectItem>
            <SelectItem key="7">Next 7 days</SelectItem>
            <SelectItem key="14">Next 14 days</SelectItem>
            <SelectItem key="30">Next 30 days</SelectItem>
            <SelectItem key="ALL">All</SelectItem>
          </Select>

          <div className="ml-auto flex items-center gap-3">
            <Switch size="sm" isSelected={includeBaseline} onValueChange={setIncludeBaseline}>
              Baseline
            </Switch>

            {/* Status segmented control skeleton (replace with your HeroUI segmented if available) */}
            <div className="inline-flex overflow-hidden rounded-lg border border-default-200">
              {(["ALL", "ACTIVE", "DRAFT"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusView(v)}
                  className={[
                    "px-3 py-1.5 text-xs font-semibold",
                    statusView === v ? "bg-default-100 text-default-900" : "bg-background text-default-600 hover:bg-default-50",
                  ].join(" ")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTIONS */}
      <Accordion
        selectionMode="multiple"
        defaultExpandedKeys={["peak", "active", "upcoming"]}
        className="w-full"
      >
        {/* PEAK */}
        <AccordionItem key="peak" aria-label="At Peak" title={<SectionHeader title="🔥 At Peak / Action Now" count={peak.length} />}>
          <div className="rounded-xl border border-default-200 bg-background">
            {peak.length === 0 ? (
              <div className="px-4 py-4 text-sm text-default-500">No trends currently at peak.</div>
            ) : (
              <div className="divide-y divide-default-200">
                {peak.map((x) => (
                  <div key={x.s.key}>{renderRow(x)}</div>
                ))}
              </div>
            )}
          </div>
        </AccordionItem>

        {/* ACTIVE */}
        <AccordionItem key="active" aria-label="Active Trends" title={<SectionHeader title="⚡ Active Trends" count={active.length} />}>
          <div className="rounded-xl border border-default-200 bg-background">
            {active.length === 0 ? (
              <div className="px-4 py-4 text-sm text-default-500">No active trends.</div>
            ) : (
              <>
                <div className="divide-y divide-default-200">{activeToShow.map((x) => <div key={x.s.key}>{renderRow(x)}</div>)}</div>
                {active.length > ACTIVE_LIMIT && (
                  <div className="flex items-center justify-center px-4 py-3">
                    <Button size="sm" variant="flat" onPress={() => setShowMoreActive((v) => !v)}>
                      {showMoreActive ? "Show less" : `Show more (${active.length - ACTIVE_LIMIT})`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionItem>

        {/* UPCOMING */}
        <AccordionItem key="upcoming" aria-label="Upcoming" title={<SectionHeader title="⏰ Upcoming (Pre-alert)" count={upcoming.length} />}>
          <div className="rounded-xl border border-default-200 bg-background">
            {upcoming.length === 0 ? (
              <div className="px-4 py-4 text-sm text-default-500">No upcoming pre-alert trends.</div>
            ) : (
              <>
                <div className="divide-y divide-default-200">{upcomingToShow.map((x) => <div key={x.s.key}>{renderRow(x)}</div>)}</div>
                {upcoming.length > UPCOMING_LIMIT && (
                  <div className="flex items-center justify-center px-4 py-3">
                    <Button size="sm" variant="flat" onPress={() => setShowMoreUpcoming((v) => !v)}>
                      {showMoreUpcoming ? "Show less" : `Show more (${upcoming.length - UPCOMING_LIMIT})`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}