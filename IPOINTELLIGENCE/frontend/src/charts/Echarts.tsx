import ReactECharts from "echarts-for-react";

export function Scatter({ data, xName, yName, identity = false }: { data: [number, number, string?][]; xName: string; yName: string; identity?: boolean }) {
  const xs = data.map((d) => d[0]);
  const min = Math.min(0, ...xs, ...data.map((d) => d[1]));
  const max = Math.max(...xs, ...data.map((d) => d[1]), 0.2);
  return (
    <ReactECharts
      style={{ height: "100%", width: "100%" }}
      option={{
        backgroundColor: "transparent",
        grid: { left: 48, right: 16, top: 24, bottom: 36 },
        tooltip: {
          formatter: (p: any) => `${p.data[2] || ""}<br/>${xName} ${(p.data[0] * 100).toFixed(1)}%<br/>${yName} ${(p.data[1] * 100).toFixed(1)}%`,
        },
        xAxis: { name: xName, nameLocation: "middle", nameGap: 24, axisLine: { lineStyle: { color: "#242630" } }, splitLine: { lineStyle: { color: "#16171d" } }, axisLabel: { color: "#4a4c59", fontFamily: "JetBrains Mono", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
        yAxis: { name: yName, axisLine: { lineStyle: { color: "#242630" } }, splitLine: { lineStyle: { color: "#16171d" } }, axisLabel: { color: "#4a4c59", fontFamily: "JetBrains Mono", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
        series: [
          {
            type: "scatter",
            data,
            symbolSize: 7,
            itemStyle: { color: "#ff2da6", opacity: 0.75 },
          },
          ...(identity
            ? [{ type: "line", data: [[min, min], [max, max]], symbol: "none", lineStyle: { color: "#4a4c59", type: "dashed", width: 1 } }]
            : []),
        ],
        textStyle: { fontFamily: "IBM Plex Sans", color: "#9b9ead" },
      }}
    />
  );
}

export function Hist({ values, name }: { values: number[]; name: string }) {
  const bins = 24;
  if (!values.length) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const counts = Array(bins).fill(0);
  values.forEach((v) => {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)));
    counts[i]++;
  });
  return (
    <ReactECharts
      style={{ height: "100%", width: "100%" }}
      option={{
        backgroundColor: "transparent",
        grid: { left: 36, right: 8, top: 16, bottom: 28 },
        xAxis: { type: "category", data: counts.map((_, i) => `${((lo + i * w) * 100).toFixed(0)}`), axisLabel: { color: "#4a4c59", fontSize: 9, fontFamily: "JetBrains Mono", rotate: 45 } },
        yAxis: { splitLine: { lineStyle: { color: "#16171d" } }, axisLabel: { color: "#4a4c59", fontSize: 9 } },
        series: [{ type: "bar", data: counts, itemStyle: { color: "#382044", borderColor: "#ff2da6", borderWidth: 0.5 } }],
        title: { text: name, left: 8, top: 0, textStyle: { color: "#4a4c59", fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 500 } },
      }}
    />
  );
}

export function Heat({ matrix, xLabels, yLabels, name }: { matrix: number[][]; xLabels: string[]; yLabels: string[]; name: string }) {
  const data: any[] = [];
  matrix.forEach((row, i) => row.forEach((v, j) => data.push([j, i, v])));
  return (
    <ReactECharts
      style={{ height: "100%", width: "100%" }}
      option={{
        backgroundColor: "transparent",
        title: { text: name, textStyle: { color: "#4a4c59", fontSize: 10, fontFamily: "JetBrains Mono" } },
        tooltip: {},
        grid: { left: 90, top: 28, bottom: 48, right: 16 },
        xAxis: { type: "category", data: xLabels, axisLabel: { color: "#9b9ead", fontSize: 9, rotate: 30 } },
        yAxis: { type: "category", data: yLabels, axisLabel: { color: "#9b9ead", fontSize: 9 } },
        visualMap: { min: 0, max: 1, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#0d0e12", "#382044", "#ff2da6"] }, textStyle: { color: "#4a4c59" } },
        series: [{ type: "heatmap", data, label: { show: true, fontSize: 9, fontFamily: "JetBrains Mono", color: "#f0f1f5", formatter: (p: any) => p.data[2] == null ? "" : Number(p.data[2]).toFixed(2) } }],
      }}
    />
  );
}
