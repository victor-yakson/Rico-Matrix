"use client";

import { useMemo, useState } from "react";
import { geoCentroid } from "d3-geo";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type WorldMapCountryStat = {
  country_code: string;
  country_name: string;
  unique_visitors: number;
};

type WorldMapProps = {
  data: WorldMapCountryStat[];
};

const getFill = (value: number, max: number) => {
  if (!max || value <= 0) return "rgba(255, 255, 255, 0.08)";
  const intensity = Math.min(0.92, 0.18 + (value / max) * 0.74);
  return `rgba(241, 210, 133, ${intensity})`;
};

export default function WorldMap({ data }: WorldMapProps) {
  const [hover, setHover] = useState<WorldMapCountryStat | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const countryMap = useMemo(() => {
    const map = new Map<string, WorldMapCountryStat>();
    for (const row of data) {
      if (row.country_code) {
        map.set(row.country_code.toUpperCase(), row);
      }
    }
    return map;
  }, [data]);

  const maxValue = useMemo(
    () => Math.max(0, ...data.map((entry) => entry.unique_visitors || 0)),
    [data]
  );

  const gradientStops = useMemo(
    () => [
      "rgba(241, 210, 133, 0.15)",
      "rgba(241, 210, 133, 0.35)",
      "rgba(241, 210, 133, 0.6)",
      "rgba(241, 210, 133, 0.85)",
    ],
    []
  );

  return (
    <div className="map-frame">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120 }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) => (
            <>
              {geographies.map((geo) => {
                const countryCode = (
                  geo.properties.ISO_A2 ||
                  geo.properties.ISO_A2_EH ||
                  geo.properties["iso-a2"] ||
                  geo.properties.cca2 ||
                  geo.properties["country-code"] ||
                  geo.properties.id ||
                  ""
                ).toString().toUpperCase();

                const countryData = countryCode
                  ? countryMap.get(countryCode)
                  : null;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(countryData?.unique_visitors || 0, maxValue)}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: "rgba(241, 210, 133, 0.95)",
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(event) => {
                      if (!countryData) return;
                      const rect = (
                        event.target as SVGPathElement
                      ).getBoundingClientRect();
                      setHover(countryData);
                      setHoverPos({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      setHoverPos(null);
                    }}
                  />
                );
              })}

              {geographies.map((geo) => {
                const countryCode = (
                  geo.properties.ISO_A2 ||
                  geo.properties.ISO_A2_EH ||
                  geo.properties["iso-a2"] ||
                  geo.properties.cca2 ||
                  geo.properties["country-code"] ||
                  geo.properties.id ||
                  ""
                ).toString().toUpperCase();

                const countryData = countryCode
                  ? countryMap.get(countryCode)
                  : null;

                if (!countryData || countryData.unique_visitors <= 0) return null;

                const [x, y] = geoCentroid(geo);

                return (
                  <Marker key={`${geo.rsmKey}-count`} coordinates={[x, y]}>
                    <circle
                      r={9}
                      fill="rgba(0, 212, 255, 0.12)"
                      stroke="rgba(0, 212, 255, 0.55)"
                      strokeWidth={0.8}
                    >
                      <animate
                        attributeName="r"
                        values="6;11;6"
                        dur="2.6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.7;0.1;0.7"
                        dur="2.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r={3.5} fill="#f1d285" stroke="#000" strokeWidth={0.6} />
                    <text textAnchor="middle" y={-8} className="map-count">
                      {countryData.unique_visitors}
                    </text>
                  </Marker>
                );
              })}
            </>
          )}
        </Geographies>
      </ComposableMap>

      <div className="map-legend">
        {gradientStops.map((stop, index) => (
          <span
            key={index}
            className="map-legend-dot"
            style={{ background: stop }}
          />
        ))}
        <span className="map-legend-text">Low</span>
        <span className="map-legend-text">High</span>
      </div>

      {hover && hoverPos ? (
        <div
          className="map-tooltip"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="map-tooltip-title">{hover.country_name}</div>
          <div className="map-tooltip-meta">
            Users: {hover.unique_visitors.toLocaleString()}
          </div>
          <div className="map-tooltip-meta">Country: {hover.country_code}</div>
        </div>
      ) : null}
    </div>
  );
}
