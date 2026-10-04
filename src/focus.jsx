import React from "react";
import styled from "styled-components";

import {Sized, Fonted, Sign} from "./styles.js";
import {serviceTimeEqual, getDisambiguatedName as gdn} from "./objects.js";

import {ServiceTimeType, StructureType, PlatformService, ArrowDirection, ServiceTimeComponent} from "./enums.js";
import {MAX_RANK} from "./data.js";

import {BULLETS} from "./bullets.jsx";

const StyledFocusCloseButton = styled.button`
    padding: 4px;
    box-shadow: 0 0 6px 0px rgba(0, 0, 0, 0.3);
`;

function FocusCloseButton({close}) {
    return <StyledFocusCloseButton onClick={close}>X</StyledFocusCloseButton>;
}

const ServicePatternsContainer = styled.span`
    text-indent: 50px;
`;

const FocusContainer = styled.span`
    position: absolute;
    overflow-y: scroll;
    height: 100%;
    background-color: #ffffff;
    top: 0px;
    right: 0px;
    display: flex;
    align-items: flex-start;
`;

const FocusWindowContainer = styled.span`
    height: 100%;
    box-shadow: 0 0 6px 0px rgba(0, 0, 0, 0.3);
`;

const PsTab = styled(Fonted)`
    padding: 10px;
`;

function Focus({close, children}) {
    return (
        <FocusContainer
            onWheel={(e) => {
                e.stopPropagation();
            }}
        >
            <FocusCloseButton close={close} />
            <FocusWindowContainer>{children}</FocusWindowContainer>
        </FocusContainer>
    );
}

function ServiceFocus({servicesInformation, selected, setHover, setSelect, close}) {
    return (
        <Focus close={close}>
            <span>
                {servicesInformation.map(({service, subtitle, servicePatterns}, serviceIndex) => (
                    <>
                        {BULLETS[service]()} {subtitle}
                        <br />
                        <ServicePatternsContainer>
                            {servicePatterns.map(({serviceDescription}, patternIndex) => {
                                const isSelected = selected.subservice === serviceIndex && selected.pattern === patternIndex;
                                const child = (
                                    <div
                                        onMouseEnter={() => {
                                            setHover(serviceIndex, patternIndex);
                                        }}
                                        onMouseLeave={() => {
                                            setHover(null, null);
                                        }}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelect(null, null);
                                            } else {
                                                setSelect(serviceIndex, patternIndex);
                                            }
                                        }}
                                    >
                                        {serviceDescription}
                                    </div>
                                );
                                return isSelected ? <strong>{child}</strong> : child;
                            })}
                        </ServicePatternsContainer>
                        <br />
                    </>
                ))}
            </span>
        </Focus>
    );
}

function StationFocus({station, psName, setPsName, select, close}) {
    const {name, platformSets, boardings: initialBoardings, odt, rank: initialRank} = station;
    // TODO change once times square is added
    const boardings = typeof initialBoardings === "string" ? 0 /*STATIONS[initialBoardings].boardings*/ : initialBoardings;
    const rank = typeof boardings === "string" ? 0 /*STATIONS[initialBoardings].rank*/ : initialRank;
    const ordinal = (num) => {
        if (num % 10 === 1 && num % 100 !== 11) {
            return `${num}st`;
        } else if (num % 10 === 2 && num % 100 !== 12) {
            return `${num}nd`;
        } else if (num % 10 === 3 && num % 100 !== 13) {
            return `${num}rd`;
        } else {
            return `${num}th`;
        }
    };
    const bullets = new Set();
    for (const platformSet of Object.values(platformSets)) {
        for (const track of platformSet.tracks) {
            for (const {service, stops, serviceTime} of Object.values(track.service)) {
                if (!stops) {
                    continue;
                }
                // TODO order, NOTE: late nights and weekends omitted on purpose
                if (select || serviceTime.hasServiceForTime([ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS], ServiceTimeType.YES)) {
                    bullets.add(service);
                }
            }
        }
    }
    return (
        <Focus close={close}>
            <span>
                <Sign>
                    {name}
                    <br />
                    {Array.from(bullets)
                        .toSorted()
                        .map((bullet) => BULLETS[bullet]())}
                </Sign>
                {boardings.toLocaleString()} boardings (2023), {ordinal(rank)} of {MAX_RANK}
                <br />
                Opposite direction transfer: {{true: "Yes", false: "No", null: "N/A"}[odt]}
                <br />
                <br />
                {/*TODO tab titles*/}
                {Object.values(platformSets).length === 1 ? (
                    <Tab platformSet={platformSets[psName]} select={select} />
                ) : (
                    <>
                        {Object.values(platformSets).map((platformSet) => (
                            <PsTab
                                key={gdn(platformSet.name, platformSet.disambiguator)}
                                fontWeight={gdn(platformSet.name, platformSet.disambiguator) === psName ? "bold" : "normal"}
                                onClick={() => setPsName(gdn(platformSet.name, platformSet.disambiguator))}
                            >
                                {platformSet.lines
                                    .filter((lineName) => lineName !== null)
                                    .map((lineName) => lineName.slice(lineName.indexOf(" ")))
                                    .join(", ")}
                            </PsTab>
                        ))}
                        <br />
                        <Tab platformSet={platformSets[psName]} select={select} />
                    </>
                )}
                <br />
            </span>
        </Focus>
    );
}

const TrackDivider = styled(Sized)`
    border-top-width: 3px;
    border-color: #888888;
`;

const FloorDivider = styled.hr`
    margin-top: 20px;
    margin-bottom: 8px;
    height: 6px;
    border-top-width: 2px;
    background-color: white;
    border-bottom-width: 2px;
    border-color: #cccccc;
`;

function Tab({platformSet, select}) {
    const {name, type, opened, lines, layout, normal} = platformSet;
    // Ideas: render background as dark or brown color to represent the ground, render track description (ie "westbound local") to the side, by default show services lined up then expand
    return (
        <>
            {normal && <Label data={{label: lines.join(", "), type, opened}} />}
            {layout.map((floor, index) => (
                <>
                    {
                        layout.length > 1 && (
                            <>
                                <Fonted fontStyle="italic">
                                    Floor {type === StructureType.UNDERGROUND ? "B" : ""}
                                    {index + 1}
                                </Fonted>
                                <br />
                            </>
                        ) /*TODO label floor*/
                    }
                    {floor.map((element, index2) => (
                        <>
                            {element.category !== "Platform" && index2 === 0 && <TrackDivider />}
                            <Sized as="div" mtb="2px">
                                {element.category === "Label" && <Label data={element} />}
                                {element.category === "Track" && <Track track={element} psName={name} select={select} />}
                                {element.category === "Platform" && <Platform platform={element} />}
                                {element.category === "Misc" && element.description}
                            </Sized>
                            {element.category !== "Platform" && (index2 === floor.length - 1 || floor[index2 + 1].category !== "Platform") && (
                                <TrackDivider as="hr" mt="6px" />
                            )}
                        </>
                    ))}
                    {index !== layout.length - 1 && (
                        <>
                            {/* Idea: render this as stairs? */}
                            <FloorDivider />
                        </>
                    )}
                </>
            ))}
        </>
    );
}

function Label({data}) {
    const {label, type, opened} = data;
    const tostring = type || opened ? `(${type ? `${type}, ` : ""}${opened ? `Opened ${opened.toLocaleString()}` : ""})` : "";
    return (
        <Sized as="div" mb="4px">
            {" "}
            <Fonted fontWeight="bold">{label} Platforms</Fonted> {tostring}
        </Sized>
    );
}

const TrackComponent = styled.div`
    height: 24px;
    background:
        linear-gradient(
            to bottom,
            rgb(255 255 255 / 0%),
            rgb(255 0 153 / 0%) 4px,
            #e9e9e9 4px,
            #e9e9e9 8px,
            rgb(255 255 255 / 0%) 8px,
            rgb(255 0 153 / 0%) 16px,
            #e9e9e9 16px,
            #e9e9e9 20px,
            rgb(255 255 255 / 0%) 20px,
            rgb(255 255 255 / 0%) 24px
        ),
        repeating-linear-gradient(to right, #ffffff, #ffffff 12px, #c19a6b 12px, #c19a6b 20px);
`;

function Track({track, psName, select}) {
    const {type, direction, serviceDirection, service, summary, trackDescription, showTrack} = track;
    let hasService = false;
    const arrows = {
        [ArrowDirection.RIGHT]: "\u2192",
        [ArrowDirection.LEFT]: "\u2190",
    };
    const bound = direction === ArrowDirection.BOTH ? "" : `${serviceDirection}bound `;
    const sortServiceLines = ([_, a], [__, b]) => {
        const {service: serviceA, stops: stopsA, direction: directionA} = a;
        const {service: serviceB, stops: stopsB, direction: directionB} = b;
        if (directionA === directionB) {
            if (stopsA === stopsB) {
                // TODO sort by service time? (ie "all times" services before "late nights" services)
                return serviceA.localeCompare(serviceB);
            } else {
                return stopsA ? -1 : 1;
            }
        } else {
            return directionA === ArrowDirection.LEFT ? -1 : 1;
        }
    };
    const margin = {mtb: "5px"};
    return (
        <>
            <div>{summary ?? `${bound}${type}`}</div>
            <>
                {showTrack && <TrackComponent {...margin} />}
                {!trackDescription &&
                    Object.entries(service)
                        .toSorted(sortServiceLines)
                        .map(([key, serviceTimeStops]) => {
                            const {service: serviceName, stops, direction: entryDirection, serviceTime} = serviceTimeStops;
                            const stopDescription = () =>
                                stops ? <NextLastStops serviceTimeStops={serviceTimeStops} psName={psName} select={select} /> : " does not stop here";
                            if (select) {
                                hasService = true;
                                return (
                                    <Sized as="div" key={key} {...margin}>
                                        {arrows[entryDirection]}
                                        {BULLETS[serviceName]()}
                                        {` ${serviceTimeString(serviceTime, ServiceTimeType.YES)} ${serviceTimeString(serviceTime, ServiceTimeType.SELECT)}`}{" "}
                                        {stopDescription()}
                                    </Sized>
                                );
                            } else {
                                // Assumption that we will not receive a pattern with all times set to NO
                                if (serviceTime.hasServiceForTime([ServiceTimeComponent.ALL_TIMES], ServiceTimeType.YES)) {
                                    hasService = true;
                                    return (
                                        <Sized as="div" key={key} {...margin}>
                                            {arrows[entryDirection]}
                                            {BULLETS[serviceName]()}
                                            {` ${serviceTimeString(serviceTime, ServiceTimeType.YES)}`} {stopDescription()}
                                        </Sized>
                                    );
                                } else {
                                    return "";
                                }
                            }
                        })}
                {!hasService && (
                    <Sized as="div" {...margin}>
                        {trackDescription || "No regular service"}
                    </Sized>
                )}
            </>
        </>
    );
}

function NextLastStops({serviceTimeStops, psName, select}) {
    const {serviceTime, nextStopService, lastStopService} = serviceTimeStops;
    const getStopRep = (service, nextstop) => (
        <span>
            {Object.entries(service).map(([disambiguatedName, {time, name}], i, serviceTimes) => (
                <span key={disambiguatedName}>
                    {(() => {
                        const base = nextstop ? (name === "" ? "Termination track" : `Next stop ${name}`) : `, Last stop ${name}`;
                        if (!nextstop && disambiguatedName === psName) {
                            return "";
                        }
                        if (select) {
                            // TODO consolidate this with above?
                            // TODO eliminate INDIVIDUAL time strings if equal to track service time?
                            return (
                                base +
                                (serviceTimes.length > 1 /*&& !serviceTimeEqual(time, serviceTime)*/
                                    ? `${serviceTimeString(time, ServiceTimeType.YES)} ${serviceTimeString(time, ServiceTimeType.SELECT)} `
                                    : "")
                            );
                        } else {
                            return serviceTime.hasServiceForTime([ServiceTimeComponent.ALL_TIMES], ServiceTimeType.YES)
                                ? serviceTimes.length > 1 && !serviceTimeEqual(time, serviceTime)
                                    ? `${base} ${serviceTimeString(time, ServiceTimeType.YES)} `
                                    : base
                                : "";
                        }
                    })()}
                </span>
            ))}
        </span>
    );
    // TODO fix this once and for all
    return (
        <span>
            ({getStopRep(nextStopService, true)}
            {getStopRep(lastStopService, false)})
        </span>
    );
}

const PlatformDiv = styled(Sized)`
    box-sizing: content-box;
    background-color: #bcbcbc;
    align-content: center;
    border-color: #f7f443;
`;

function Platform({platform}) {
    const {type, accessible, service, description} = platform;
    const [serviceUp, serviceDown] = {
        [PlatformService.UP]: [true, false],
        [PlatformService.DOWN]: [false, true],
        [PlatformService.BOTH]: [true, true],
        [PlatformService.NONE]: [false, false],
    }[service];

    return (
        <PlatformDiv as="div" h="40px" pl="10px" bt={`${serviceUp ? "5" : "0"}px`} bb={`${serviceDown ? "5" : "0"}px`}>
            {`${type} Platform${accessible ? " (Accessible)" : ""}${service === PlatformService.NONE ? " (Not in Service)" : ""}${description ? `, ${description}` : ""}`}
        </PlatformDiv>
    );
}

function serviceTimeString(serviceTime, level) {
    const select = level === ServiceTimeType.SELECT;
    if (serviceTime === null) {
        return "";
    }
    const shorthand = serviceTime.getShorthand(level);
    if (Object.entries(shorthand).length === 0) {
        return "";
    }
    const getMessage = (message, plural) => (plural ? message : message[message.length - 1] === "s" ? message.slice(0, message.length - 1) : message);
    const humanReadableList = (ls) =>
        ls.length === 1 ? ls[0] : `${ls.slice(0, ls.length - 1).join(", ")}${ls.length > 2 ? "," : ""} and ${ls[ls.length - 1]}`;
    const getHumanReadableList = (sh, plural) => humanReadableList(Object.keys(shorthand).map((desc) => getMessage(desc, plural)));
    // TODO - could have hardcoded "except" here for except late nights or except rush
    //const useInverse = false;
    //return `${select ? "Select trips e" : "E"}xcept ${getHumanReadableList(([desc, el]) => el !== level, true)}`;
    return `${select ? "Select " : ""}${getHumanReadableList(shorthand, !select)}${select ? " trips" : ""}`;
}

export {StationFocus, ServiceFocus};
