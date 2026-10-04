import React from "react";
import styled from "styled-components";

import {Sized, FlexContainer} from "./styles.js";
import {SERVICES, PLATFORM_SETS, TRACK_ATTRIBUTES} from "./data.js";

const MenuButton = styled(Sized)`
    border: 0.5px solid;
`;

const MenuWindowContainer = styled.span`
    height: 100%;
    box-shadow: 0 0 6px 0px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
`;

const TRACK_ATTRIBUTES_NAME_MAP = Object.values(TRACK_ATTRIBUTES).reduce((acc, att) => {
    acc[att.name] = att;
    return acc;
}, {});

// TODO could move showMenu/setShowMenu inside here, as of writing they aren't used by the parent component.
function Menu({
    showMenu,
    setShowMenu,
    updateZoom,
    reset,
    select,
    setSelect,
    scale,
    setScale,
    attribute,
    setAttribute,
    setStation,
    ps,
    setPs,
    service,
    setService,
}) {
    const menuPadding = {plr: "8px"};
    const menuMargin = {mr: "8px"};

    return (
        <FlexContainer>
            {showMenu && (
                <MenuWindowContainer>
                    {/* TODO fix this dom tree generally. Better incorporate into flex. */}
                    <span>
                        <MenuButton as="button" {...menuMargin} {...menuPadding} onClick={() => updateZoom(1, true)}>
                            +
                        </MenuButton>
                        <MenuButton as="button" {...menuMargin} {...menuPadding} onClick={reset}>
                            Reset
                        </MenuButton>
                        <MenuButton as="button" {...menuPadding} onClick={() => updateZoom(-1, true)}>
                            -
                        </MenuButton>
                    </span>
                    <Sized as="label" {...menuMargin}>
                        Show Select Service?
                    </Sized>
                    <input
                        type="checkbox"
                        checked={select}
                        onClick={() => {
                            setSelect(!select);
                        }}
                    />
                    <Sized as="label" {...menuMargin}>
                        Scale Stations by Boardings?
                    </Sized>
                    <input
                        type="checkbox"
                        checked={scale}
                        onClick={() => {
                            setScale(!scale);
                        }}
                    />
                    <Sized as="label" {...menuMargin}>
                        Track Highlight
                    </Sized>
                    <select onChange={(event) => setAttribute(TRACK_ATTRIBUTES_NAME_MAP?.[event.target.value]?.attribute)}>
                        {[{attribute: null, name: "None", visible: true}, ...Object.values(TRACK_ATTRIBUTES)]
                            .filter(({visible}) => visible)
                            .map(({attribute: att, name}) => (
                                <option key={att} selected={att === attribute}>
                                    {name}
                                </option>
                            ))}
                    </select>
                    <Sized as="label" {...menuMargin}>
                        Station
                    </Sized>
                    <select
                        onChange={(event) => {
                            if (event.target.value === "None") {
                                setStation(null);
                            } else {
                                setStation(PLATFORM_SETS[event.target.value].stationKey);
                                setPs(event.target.value);
                            }
                        }}
                    >
                        {/* TODO change to stations? */}
                        {["None", ...Object.keys(PLATFORM_SETS).toSorted()].map((name) => (
                            // TODO this doesn't work, mouseenter/leave are not supported by option, need a custom component
                            <option
                                key={name}
                                // onMouseEnter={() => {
                                //     setPsHover(null);
                                // }}
                                // onMouseLeave={() => {
                                //     setPsHover(null);
                                // }}
                                selected={ps === name}
                            >
                                {name}
                            </option>
                        ))}
                    </select>
                    <Sized as="label" {...menuMargin}>
                        Service
                    </Sized>
                    <select
                        onChange={(event) => {
                            if (event.target.value === "None") {
                                setService(null);
                            } else {
                                setService(event.target.value);
                            }
                        }}
                    >
                        {["None", ...Object.keys(SERVICES)].map((name) => (
                            <option key={name} selected={service === name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </MenuWindowContainer>
            )}
            <MenuButton as="button" onClick={() => setShowMenu(!showMenu)}>
                {showMenu ? "<" : ">"}
            </MenuButton>
        </FlexContainer>
    );
}

export {Menu};
