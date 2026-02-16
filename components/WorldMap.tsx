"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { useMemo, useState } from "react";
import { geoCentroid } from "d3-geo";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type CountryStat = {
  country: string;
  country_code: string;
  total: number;
  unique_visitors: number;
};

interface WorldMapProps {
  data: CountryStat[];
}

const getFill = (value: number, max: number) => {
  if (!max || value <= 0) return "rgba(255, 255, 255, 0.08)";
  const intensity = Math.min(0.9, 0.2 + (value / max) * 0.8);
  return `rgba(241, 210, 133, ${intensity})`;
};

export default function WorldMap({ data }: WorldMapProps) {
  const countryMap = new Map<string, CountryStat>();
  data?.forEach((c) => {
    if (c.country_code) countryMap.set(c.country_code, c);
  });

  const maxValue = Math.max(0, ...data.map((d) => d.total || 0));
  const [hover, setHover] = useState<CountryStat | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
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
                const countryCode =
                  geo.properties.ISO_A2 ||
                  geo.properties.ISO_A2_EH ||
                  geo.properties["iso-a2"] ||
                  geo.properties.cca2 ||
                  geo.properties["country-code"] ||
                  geo.properties.id;

                const countryData = countryCode
                  ? countryMap.get(countryCode)
                  : null;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(countryData?.total || 0, maxValue)}
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
                    onMouseEnter={(evt) => {
                      if (!countryData) return;
                      const rect = (
                        evt.target as SVGPathElement
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
                const countryCode =
                  geo.properties.ISO_A2 ||
                  geo.properties.ISO_A2_EH ||
                  geo.properties["iso-a2"] ||
                  geo.properties.cca2 ||
                  geo.properties["country-code"] ||
                  geo.properties.id;

                const countryData = countryCode
                  ? countryMap.get(countryCode)
                  : null;

                if (!countryData || !countryData.total) return null;

                const [x, y] = geoCentroid(geo);

                return (
                  <Marker key={`${geo.rsmKey}-count`} coordinates={[x, y]}>
                    <circle r={3.5} fill="#f1d285" stroke="#000" strokeWidth={0.6} />
                    <text
                      textAnchor="middle"
                      y={-8}
                      className="map-count"
                    >
                      {countryData.total}
                    </text>
                  </Marker>
                );
              })}
            </>
          )}
        </Geographies>
      </ComposableMap>

      <div className="map-legend">
        {gradientStops.map((stop, idx) => (
          <span
            key={idx}
            className="map-legend-dot"
            style={{ background: stop }}
          />
        ))}
        <span className="map-legend-text">Low</span>
        <span className="map-legend-text">High</span>
      </div>

      {hover && hoverPos && (
        <div
          className="map-tooltip"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="map-tooltip-title">{hover.country}</div>
          <div className="map-tooltip-meta">
            Visits: {hover.total.toLocaleString()}
          </div>
          <div className="map-tooltip-meta">
            Readers: {hover.unique_visitors.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
