import React from "react";
import styled from "styled-components";

import {Sized, DotEllipse} from "./styles.js";

const DOT_SIZE = 3.5;

const LegendCell = styled(Sized)`
    display: inline-block;
`;

const LegendTable = styled.table`
    border: 0.5px solid;
    border-spacing: 10px;
    margin-bottom: 20px;
`;

// TODO this code needs to be majorly refactored (see eslint disables), but should determine look and feel first.
function Legend({name, entries, onTrMouseEnter, onTrMouseLeave, SvgChild, getSvgDimensions, leftCells, rightCells}) {
    // TODO could include onClick
    return (
        <LegendTable>
            <thead>
                <tr>
                    <th colSpan="1000">{name}</th>
                </tr>
            </thead>
            {/* TODO use css grid! */}
            <tbody>
                {entries
                    .filter((entry) => entry !== "null")
                    .map((entry) => (
                        <tr
                            key={entry}
                            onMouseEnter={() => {
                                onTrMouseEnter(entry);
                            }}
                            onMouseLeave={() => {
                                onTrMouseLeave(entry);
                            }}
                        >
                            {leftCells &&
                                leftCells.map((Cell, index) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <td key={index}>
                                        <LegendCell pl="10px">
                                            <Cell entry={entry} />
                                        </LegendCell>
                                    </td>
                                ))}
                            <td>
                                {entry}
                                <LegendCell w="12px" />
                            </td>
                            <td>
                                <LegendCell as="svg" xmlns="http://www.w3.org/2000/svg" {...getSvgDimensions(entry)}>
                                    <SvgChild entry={entry} />
                                </LegendCell>
                            </td>
                            {rightCells &&
                                rightCells.map((Cell, index) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <td key={index}>
                                        <LegendCell pl="10px">
                                            <Cell entry={entry} />
                                        </LegendCell>
                                    </td>
                                ))}
                        </tr>
                    ))}
            </tbody>
        </LegendTable>
    );
}

const getPercent = (num) => {
    if (num === undefined || num === 0) {
        return "0";
    }
    if (Math.abs(num - 1) < 0.00001) {
        return "100";
    }
    if (num < 0.001) {
        return "<0.1";
    }
    if (num > 0.999) {
        return ">99.9";
    }
    return (num * 100).toFixed(1);
};

const getMiles = (num) => {
    if (num === undefined || num === 0) {
        return "0";
    }
    if (num < 0.1) {
        return "<0.1";
    }
    return `~${num.toFixed(1)}`;
};

function TrackLegend({data, setHighlightValue}) {
    const {name, colors, hiddenLabels, setHiddenLabel, highlightLengths} = data;
    const total = Math.sumPrecise(Object.values(highlightLengths));
    const percentages = Object.fromEntries(Object.entries(highlightLengths).map(([bucket, length]) => [bucket, length / total]));
    return (
        <Legend
            name={name}
            entries={[...Object.keys(colors), "Total"]}
            onTrMouseEnter={(option) => {
                setHighlightValue(option);
            }}
            onTrMouseLeave={() => {
                setHighlightValue(null);
            }}
            // eslint-disable-next-line react/no-unstable-nested-components
            SvgChild={({entry}) => (entry === "Total" ? () => null : <TrackSvgChild color={colors[entry]} />)}
            getSvgDimensions={() => ({w: "30px", h: "20px"})}
            leftCells={[
                // eslint-disable-next-line react/no-unstable-nested-components
                ({entry}) =>
                    entry === "Total" ? (
                        () => null
                    ) : (
                        <input
                            type="checkbox"
                            checked={!hiddenLabels.has(entry)}
                            onClick={() => {
                                setHiddenLabel(entry, hiddenLabels.has(entry));
                            }}
                        />
                    ),
            ]}
            rightCells={[
                ({entry}) =>
                    entry === "Total" ? `${getMiles(total)} miles` : `${getMiles(highlightLengths[entry])} miles (${getPercent(percentages[entry])}%)`,
            ]}
        />
    );
}

function TrackSvgChild({color}) {
    return <line x1="0" y1="50%" x2="100" y2="50%" stroke={color} strokeWidth="2.5" />;
}

function PlatformSetLegend({data, stopsCount}) {
    return (
        <Legend
            name="Stations"
            entries={Object.keys(data)}
            onTrMouseEnter={() => {}}
            onTrMouseLeave={() => {}}
            // eslint-disable-next-line react/no-unstable-nested-components
            SvgChild={({entry}) => <PlatformSetSvgChild size={DOT_SIZE} color={data[entry]} />}
            getSvgDimensions={() => ({w: "30px", h: "20px"})}
            rightCells={[({entry}) => stopsCount[entry] ?? 0]}
        />
    );
}

function PlatformSetSvgChild({color, size}) {
    return <DotEllipse fill={color} rx={size} ry={size} cx="50%" cy="50%" />;
}

// TODO Consider laying the circles directly on top of one another
function StationScaleLegend({getSize}) {
    const levels = [100_000, 1_000_000, 10_000_000];
    const entries = levels.reduce((acc, level) => {
        acc[level.toLocaleString()] = getSize(level);
        return acc;
    }, {});
    const maxSize = Math.max(...Object.values(entries));
    return (
        <Legend
            name="Yearly Boardings"
            entries={Object.keys(entries)}
            onTrMouseEnter={() => {}}
            onTrMouseLeave={() => {}}
            // eslint-disable-next-line react/no-unstable-nested-components
            SvgChild={({entry}) => <PlatformSetSvgChild color="#ffffff" size={entries[entry]} />}
            getSvgDimensions={(entry) => ({w: `${maxSize * 3}px`, h: `${entries[entry] * 3}px`})}
        />
    );
}

export {TrackLegend, PlatformSetLegend, StationScaleLegend};
