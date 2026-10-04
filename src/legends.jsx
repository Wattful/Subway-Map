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

function Legend({name, colors, onTrMouseEnter, onTrMouseLeave, SvgChild}) {
    // TODO could include onClick
    return (
        <LegendTable>
            <thead>
                <tr>
                    <th colSpan="2">{name}</th>
                </tr>
            </thead>
            {/* TODO use css grid! */}
            <tbody>
                {Object.entries(colors)
                    .filter(([option, _]) => option !== "null")
                    .map(([option, color]) => (
                        <tr
                            key={option}
                            onMouseEnter={() => {
                                onTrMouseEnter(option);
                            }}
                            onMouseLeave={() => {
                                onTrMouseLeave(option);
                            }}
                        >
                            <td>
                                {option}
                                <LegendCell w="12px" />
                            </td>
                            <td>
                                <LegendCell as="svg" xmlns="http://www.w3.org/2000/svg" w="30px" h="20px">
                                    <SvgChild color={color} />
                                </LegendCell>
                            </td>
                        </tr>
                    ))}
            </tbody>
        </LegendTable>
    );
}

function TrackLegend({data, setHighlightValue}) {
    const {name, colors} = data;
    return (
        <Legend
            name={name}
            colors={colors}
            onTrMouseEnter={(option) => {
                setHighlightValue(option);
            }}
            onTrMouseLeave={() => {
                setHighlightValue(null);
            }}
            SvgChild={TrackSvgChild}
        />
    );
}

function TrackSvgChild({color}) {
    return <line x1="0" y1="50%" x2="100" y2="50%" stroke={color} strokeWidth="2.5" />;
}

function PlatformSetLegend({colors}) {
    return <Legend name="Stations" colors={colors} onTrMouseEnter={() => {}} onTrMouseLeave={() => {}} SvgChild={PlatformSetSvgChild} />;
}

function PlatformSetSvgChild({color}) {
    return <DotEllipse fill={color} rx={DOT_SIZE} ry={DOT_SIZE} cx="50%" cy="50%" />;
}

export {TrackLegend, PlatformSetLegend};
