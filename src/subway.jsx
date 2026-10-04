import React, {useState, useEffect, useMemo, useCallback} from "react";
import {BrowserRouter, Route, Routes, useSearchParams} from "react-router-dom";
import styled from "styled-components";

import {Menu} from "./menu.jsx";
import {TrackLegend, PlatformSetLegend} from "./legends.jsx";
import {StationFocus, ServiceFocus} from "./focus.jsx";

import {SERVICES, STATIONS, PLATFORM_SETS, TRACK_ATTRIBUTES, MIN_BOARDINGS} from "./data.js";
import {BULLETS} from "./bullets.jsx";
import {TRACK_SEGMENTS} from "./tsdata.js";
import {ServiceTimeType, ServiceTimeComponent} from "./enums.js";
import {getDisambiguatedName as gdn} from "./objects.js";
import {AbsolutePositioned, RelativePositioned, Sized, FlexContainer, DotEllipse, Sign} from "./styles.js";

// https://stackoverflow.com/questions/36862334/get-viewport-window-height-in-reactjs
const useWindowDimensions = () => {
    const [windowDimensions, setWindowDimensions] = useState({x: window.innerWidth, y: window.innerHeight});
    useEffect(() => {
        function handleResize() {
            setWindowDimensions({x: window.innerWidth, y: window.innerHeight});
        }

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);
    return windowDimensions;
};

// https://www.joshwcomeau.com/snippets/react-hooks/use-mouse-position/
const useMousePosition = () => {
    const [mousePosition, setMousePosition] = React.useState({x: null, y: null});
    useEffect(() => {
        const updateMousePosition = (ev) => {
            setMousePosition({x: ev.clientX, y: ev.clientY});
        };

        window.addEventListener("mousemove", updateMousePosition);
        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
        };
    }, []);
    return mousePosition;
};

const BACKGROUND_SRC = require("./shoreline.png");

const PS_COLORS = {
    true: "#fffb00", // Stops
    false: "#ff0000", // Does not stop
    undefined: "#ffffff", // Does not run through
};

const MainSvg = styled(Sized)`
    cursor: ${(props) => props.cursor};
`;

// TODO this really shouldn't need to be a flex container, but I can't figure out why the SVG is positioned incorrectly if I disable flex.
const MainSpan = styled(FlexContainer)`
    overflow: hidden;
    height: 100vh;
    align-items: center;
    justify-content: center;
`;

const MenuContainer = styled.span`
    position: absolute;
    height: 100%;
    top: 0px;
    left: 0px;
`;

const MenuFlexContainer = styled.span`
    display: flex;
    height: 100%;
    align-items: flex-start;
`;

const getBullets = (platformSets, select, line = null) => {
    const bullets = new Set();
    for (const platformSet of platformSets) {
        for (const track of platformSet.tracks) {
            for (const {service, stops, serviceTime} of Object.values(track.service)) {
                if (!stops) {
                    continue;
                }
                // TODO order NOTE: late nights and weekends omitted on purpose
                if (
                    (select || serviceTime.hasServiceForTime([ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS], ServiceTimeType.YES)) &&
                    (line === null || track.line === line)
                ) {
                    bullets.add(service);
                }
            }
        }
    }
    // TODO order bullets and return list?
    return bullets;
};

const cxy = (callback) => ({x: callback("x"), y: callback("y")});

const boolParsing = (input) => input === "true" || false;
const objectHasParsing = (input, obj) => (Object.hasOwn(obj, input) ? input : null);
const arrayHasParsing = (input, arr) => (!isNaN(parseInt(input)) && arr[parseInt(input)] !== undefined ? parseInt(input) : null);

function Subway({}) {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/*" element={<SubwayMap />} />
                <Route path="/" element={<SubwayMap />} />
            </Routes>
        </BrowserRouter>
    );
}

function SubwayMap({}) {
    // URL-BASED
    const [searchParams, setSearchParams] = useSearchParams();
    const updateSearchParam = (key, value) => {
        setSearchParams((prev) => {
            if (value === null || value === undefined || value === false) {
                prev.delete(key);
            } else {
                prev.set(key, value);
            }
            return prev;
        });
    };
    const useSimpleURLParam = (key, parse) => [parse(searchParams.get(key)), (value) => updateSearchParam(key, value)];

    const [attribute, setAttribute] = useSimpleURLParam("attribute", (input) => objectHasParsing(input, TRACK_ATTRIBUTES));
    const [select, setSelect] = useSimpleURLParam("select", boolParsing);
    const [scale, setScale] = useSimpleURLParam("scale", boolParsing);

    const useFocusParams = (spec) => {
        let found = false;
        return Object.entries(spec).reduce((acc, [key, parses]) => {
            acc[key] = useFocusParam(key, parses, Object.keys(spec), found);
            if (acc[key][0][0] !== null) {
                found = true;
            }
            return acc;
        }, {});
    };
    // Return an arbitrary number of params from a single comma-separated param.
    // For a param to parse, it must parse and all its parent params must also parse.
    // Setting a child param does not overwrite parent params. Setting a parent param does overwrite child params.
    const useFocusParam = (key, parses, overwrites, truncate) => {
        const [rawVal, setRawVal] = useSimpleURLParam(key, (input) => input);
        const setAndOverwrite = (value) => {
            for (const overwrite of overwrites) {
                if (overwrite !== key) {
                    updateSearchParam(overwrite, null);
                }
            }
            setRawVal(value);
        };
        const rawTokens = rawVal === null ? [] : rawVal.split(",");
        const retVal = [];
        for (let i = 0; i < parses.length; i++) {
            const parsedVal = (i !== 0 && retVal[i - 1][0] === null) || truncate ? null : parses[i](rawTokens.slice(0, i + 1));
            // Here we call searchParams.get to get the current value, this allows us to set multiple params at once.
            retVal.push([
                parsedVal,
                (value) => {
                    let newValue;
                    if (value === null) {
                        newValue = i === 0 ? null : searchParams.get(key).split(",", i).join(",");
                    } else {
                        newValue = `${i === 0 ? "" : `${searchParams.get(key).split(",", i).join(",")},`}${value}`;
                    }
                    setAndOverwrite(newValue);
                },
            ]);
        }
        return retVal;
    };

    const {
        station: [[station, setStation], [ps, setPs]],
        service: [[service, setService], [selectedSubservice, setSelectedSubservice], [selectedPattern, setSelectedPattern]],
    } = useFocusParams({
        station: [(input) => objectHasParsing(input[0], STATIONS), (input) => objectHasParsing(input[1], STATIONS[input[0]].platformSets)],
        service: [
            (input) => objectHasParsing(input[0], SERVICES),
            (input) => arrayHasParsing(input[1], SERVICES[input[0]]),
            (input) => arrayHasParsing(input[2], SERVICES[input[0]][input[1]].servicePatterns),
        ],
    });

    // GENERAL
    const [showMenu, setShowMenu] = useState(false);
    const [psHover, setPsHover] = useState([null, false]);
    const [subserviceHover, setSubserviceHover] = useState(null);
    const [patternHover, setPatternHover] = useState(null);
    const [lineHover, setLineHover] = useState(null);
    const [highlightValue, setHighlightValue] = useState(null);

    // PANNING/ZOOMING
    const [svgDimensions, setSvgDimensions] = useState(null);
    const windowDimensions = useWindowDimensions();
    const mousePosition = useMousePosition();
    const [baseTranslate, setBaseTranslate] = useState(null);
    const [startDragPosition, setStartDragPosition] = useState(null);
    const translate = useMemo(
        () =>
            startDragPosition
                ? cxy((axis) => baseTranslate[axis] + mousePosition[axis] - startDragPosition[axis])
                : {
                      ...baseTranslate,
                  },
        [mousePosition, baseTranslate, startDragPosition],
    );
    // The background image is high resolution and scaled down using a "base zoom" value (unless you have an extremely high res monitor, in which case it's scaled up)
    const baseZoom = useMemo(
        () => (svgDimensions === null ? null : Math.min(windowDimensions.x / svgDimensions.x, windowDimensions.y / svgDimensions.y)),
        [svgDimensions, windowDimensions],
    );
    const [zoom, setZoom] = useState(null);
    const reset = useCallback(() => {
        setZoom(baseZoom);
        setBaseTranslate(cxy((axis) => ((1 - baseZoom) * svgDimensions[axis]) / 2));
    }, [baseZoom, svgDimensions]);
    useEffect(() => {
        if (baseZoom !== null && zoom === null) {
            reset();
        }
    }, [baseZoom, zoom]);

    // Absolute position of 0, 0 in the SVG coordinate system if SVG is unzoomed and unpanned
    const initialOrigin = useMemo(
        () => (svgDimensions === null ? null : cxy((axis) => windowDimensions[axis] / 2 - svgDimensions[axis] / 2)),
        [svgDimensions, windowDimensions],
    );
    const absoluteCoordsToSvgCoords = useCallback(
        (coords) => cxy((axis) => (coords[axis] - initialOrigin[axis] - baseTranslate[axis]) / zoom),
        [initialOrigin, baseTranslate, zoom],
    );
    const svgCoordsToAbsoluteCoords = useCallback(
        (coords) => cxy((axis) => coords[axis] * zoom + initialOrigin[axis] + baseTranslate[axis]),
        [initialOrigin, baseTranslate, zoom],
    );

    const updateZoom = useCallback(
        (delta, ignoreMouse) => {
            if (startDragPosition) {
                return;
            }
            const multiplier = delta < 0 ? 0.8 : 1.25;
            const newZoom = multiplier * zoom;
            if ((newZoom < 0.75 * baseZoom && multiplier < 1) || (newZoom > 10 * baseZoom && multiplier > 1)) {
                return;
            }
            const zoomTarget = ignoreMouse ? cxy((axis) => windowDimensions[axis] / 2) : mousePosition;
            // Target position within the SVG's coordinate system, should remain constant after scrolling.
            const targetPositionOverSvg = absoluteCoordsToSvgCoords(zoomTarget);
            setZoom(newZoom);
            // Assume that targetPositionOverSvg is constant then solve the equation for baseTranslate subsituting in the new zoom value
            setBaseTranslate(cxy((axis) => zoomTarget[axis] - initialOrigin[axis] - targetPositionOverSvg[axis] * newZoom));
        },
        [absoluteCoordsToSvgCoords, windowDimensions, mousePosition, startDragPosition, baseZoom, zoom],
    );
    useEffect(() => {
        const onScroll = (e) => updateZoom(-e.deltaY, false);
        window.addEventListener("wheel", onScroll);
        return () => {
            window.removeEventListener("wheel", onScroll);
        };
    }, [updateZoom]);

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setSvgDimensions({y: img.naturalHeight, x: img.naturalWidth});
        };
        img.src = BACKGROUND_SRC;
    }, []);
    if (svgDimensions === null || zoom === null) {
        return null;
    }

    const pattern = patternHover === null ? selectedPattern : patternHover;
    const subservice = subserviceHover === null ? selectedSubservice : subserviceHover;

    const highlight = attribute || pattern !== null ? {...TRACK_ATTRIBUTES[pattern === null ? attribute : "service"], highlightValue} : null;

    return (
        <MainSpan>
            <MainSvg
                as="svg"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                xmlSpace="preserve"
                id="svg2"
                height={svgDimensions.y}
                width={svgDimensions.x}
                viewBox={`0 0 ${svgDimensions.x} ${svgDimensions.y}`}
                version="1.1"
                onMouseDown={() => {
                    setStartDragPosition({...mousePosition});
                }}
                onMouseUp={() => {
                    setBaseTranslate({...translate});
                    setStartDragPosition(null);
                }}
                cursor={startDragPosition ? "grabbing" : "grab"}
                w="100vw"
                h="100vh"
                mw={`${svgDimensions.x}px`}
                mh={`${svgDimensions.y}px`}
            >
                <g transform={`matrix(${zoom} 0 0 ${zoom} ${translate.x} ${translate.y})`}>
                    <image x="0" y="0" width="100%" xlinkHref={BACKGROUND_SRC} />

                    {Object.values(TRACK_SEGMENTS)
                        .filter((segment) => segment.visible)
                        .map((segment) => {
                            const {id, d, ...attributes} = segment;
                            if (pattern !== null) {
                                const segmentServiceLabel = SERVICES[service][subservice].servicePatterns[pattern].route.find(
                                    ({serviceSegment}) => serviceSegment === attributes.service_segment,
                                );
                                attributes.service = segmentServiceLabel ? segmentServiceLabel.type : null;
                            }
                            return {
                                ...segment,
                                useShadow:
                                    segment.lines.includes(lineHover) ||
                                    (highlight &&
                                        attributes[highlight.attribute] !== null &&
                                        highlight.getColor(highlight.highlightValue).stroke === highlight.getColor(attributes[highlight.attribute]).stroke),
                                highlightColor: highlight ? highlight.getColor(attributes[highlight.attribute]) : null,
                            };
                        })
                        // Bring highlighted track segments to the front. If optimization becomes a problem, we can skip this sort if nothing is being highlighted.
                        .toSorted((s1, s2) => {
                            if (s1.useShadow === s2.useShadow) {
                                return 0;
                            }
                            return s1.useShadow ? 1 : -1;
                        })
                        .map((segment) => (
                            <TrackSegmentSvg
                                key={segment.id}
                                id={segment.id}
                                d={segment.d}
                                baseWidth={svgDimensions.y / 500}
                                highlightColor={segment.highlightColor}
                                useShadow={segment.useShadow}
                                setLineHover={(tr) => setLineHover(tr ? segment.lines[0] : null)}
                            />
                        ))}
                    {Object.entries(STATIONS).reduce((acc, [identifier, stationObject]) => {
                        const baseSize = svgDimensions.y / 275;
                        const scaleBaseSize = baseSize / 3;
                        const size = scale ? Math.sqrt(stationObject.boardings / MIN_BOARDINGS) * scaleBaseSize : baseSize;
                        // Map from station on route to whether service stops at that station
                        const stops =
                            pattern === null
                                ? null
                                : SERVICES[service][subservice].servicePatterns[pattern].compiledRoute.reduce((obj, serviceStop) => {
                                      const {stop, disambiguator, tracksNorth, tracksSouth} = serviceStop;
                                      obj[gdn(stop, disambiguator)] = [...tracksNorth, ...tracksSouth].some((track) => track.stops);
                                      return obj;
                                  }, {});
                        // If only rendering one dot per station
                        if (scale) {
                            // TODO updated conditions - something related to zoom and closeness of dots
                            const {coordinates} = stationObject;
                            // Iterate through the platform sets, take the first value which is not undefined. We should never see more than one defined value here.
                            const fill =
                                PS_COLORS[
                                    stops === null
                                        ? undefined
                                        : Object.keys(stationObject.platformSets)
                                              .map((psIdentifier) => stops[psIdentifier])
                                              .reduce((acc2, f) => (acc2 === undefined ? f : acc2), undefined)
                                ];
                            const onClickPs = Object.keys(stationObject.platformSets)[0];
                            acc.push(
                                <MapDot
                                    key={identifier}
                                    fill={fill}
                                    size={size}
                                    coordinates={coordinates}
                                    setPsHover={(tr) => setPsHover([tr ? identifier : null, true])}
                                    setFocus={() => {
                                        setStation(identifier);
                                        setPs(onClickPs);
                                    }}
                                />,
                            );
                        } else {
                            for (const [psIdentifier, psObject] of Object.entries(stationObject.platformSets)) {
                                const {coordinates} = psObject;
                                const fill = stops === null ? PS_COLORS.undefined : PS_COLORS[stops[psIdentifier]];
                                acc.push(
                                    <MapDot
                                        key={psIdentifier}
                                        fill={fill}
                                        size={size}
                                        coordinates={coordinates}
                                        setPsHover={(tr) => setPsHover([tr ? psIdentifier : null, false])}
                                        setFocus={() => {
                                            setStation(identifier);
                                            setPs(psIdentifier);
                                        }}
                                    />,
                                );
                            }
                        }
                        return acc;
                    }, [])}
                </g>
            </MainSvg>
            {psHover[0] &&
                (() => {
                    const [identifier, isStation] = psHover;
                    const hovered = (isStation ? STATIONS : PLATFORM_SETS)[identifier];
                    const onClickPs = isStation ? Object.keys(hovered)[0] : identifier;
                    const {name, coordinates} = hovered;
                    const {x, y} = svgCoordsToAbsoluteCoords(coordinates);
                    const bullets = getBullets(isStation ? Object.values(hovered.platformSets) : [hovered], select);
                    return (
                        // TODO scale translation when station dots are scaled
                        <AbsolutePositioned left={`${x}px`} top={`${y}px`} transform={`translate(-50%, ${zoom * 20}px)`}>
                            <PlatformSetPreview
                                name={name}
                                bullets={bullets}
                                setPsHover={(tr) => setPsHover([tr ? identifier : null, isStation])}
                                setFocus={() => {
                                    setStation(identifier);
                                    setPs(onClickPs);
                                }}
                            />
                        </AbsolutePositioned>
                    );
                })()}
            {/* TODO save mouse position when start hovering then don't move */}
            {lineHover && (
                <AbsolutePositioned left={`${mousePosition.x}px`} top={`${mousePosition.y}px`} transform="translate(-50%, 10%)">
                    <LinePreview line={lineHover} select={select} />
                </AbsolutePositioned>
            )}
            <MenuContainer>
                <MenuFlexContainer flexDirection="row" alignItems="flex-start">
                    <Menu
                        showMenu={showMenu}
                        setShowMenu={setShowMenu}
                        updateZoom={updateZoom}
                        reset={reset}
                        select={select}
                        setSelect={setSelect}
                        scale={scale}
                        setScale={setScale}
                        attribute={attribute}
                        setAttribute={setAttribute}
                        station={station}
                        setStation={setStation}
                        ps={ps}
                        setPs={setPs}
                        service={service}
                        setService={setService}
                    />
                    {(highlight !== null || pattern !== null) && (
                        <RelativePositioned left="20px">
                            {highlight && <TrackLegend data={highlight} setHighlightValue={setHighlightValue} />}
                            {pattern !== null && <PlatformSetLegend colors={PS_COLORS} />}
                        </RelativePositioned>
                    )}
                </MenuFlexContainer>
            </MenuContainer>

            {station && (
                <StationFocus station={STATIONS[station]} psName={ps} setPsName={(psName) => setPs(psName)} select={select} close={() => setStation(null)} />
            )}
            {service && (
                <ServiceFocus
                    servicesInformation={SERVICES[service]}
                    selected={{subservice: selectedSubservice, pattern: selectedPattern}}
                    setHover={(s, p) => {
                        setSubserviceHover(s);
                        setPatternHover(p);
                    }}
                    setSelect={(s, p) => {
                        setSelectedSubservice(s);
                        setSelectedPattern(p);
                    }}
                    close={() => setService(null)}
                />
            )}
        </MainSpan>
    );
}

const TrackSegmentPath = styled.path`
    cursor: default;
`;

function TrackSegmentSvg({id, d, baseWidth, highlightColor, useShadow, setLineHover}) {
    const {stroke, opacity} = highlightColor ?? {stroke: "#9c9c9c", opacity: "1"};
    if (stroke === undefined) {
        throw new Error(`Track segment ${id} stroke is undefined`);
    }
    //const style = useShadow ? {filter: `drop-shadow(-${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} ${shadowSize} ${shadowColor}) drop-shadow(-${shadowSize} ${shadowSize} ${shadowColor})`} : {}
    return (
        <TrackSegmentPath
            id={`path${id}`}
            title={id}
            fill="none"
            stroke={stroke}
            strokeOpacity={opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth={useShadow ? baseWidth * 2 : baseWidth}
            d={d}
            clipPath="url(#SVGID_548_)"
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
            onMouseEnter={() => {
                setLineHover(true);
            }}
            onMouseLeave={() => {
                setLineHover(false);
            }}
        />
    );
}

function MapDot({fill, size, coordinates, setPsHover, setFocus}) {
    const {x, y} = coordinates;
    return (
        <DotEllipse
            cx={x}
            cy={y}
            rx={size}
            ry={size}
            fill={fill}
            onClick={setFocus}
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
            onMouseEnter={() => {
                setPsHover(true);
            }}
            onMouseLeave={() => {
                setPsHover(false);
            }}
        />
    );
}

// TODO add "pointer triangle"?
function PlatformSetPreview({name, bullets, setPsHover, setFocus}) {
    return (
        <Sign
            onClick={setFocus}
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
            onMouseEnter={() => {
                setPsHover(true);
            }}
            onMouseLeave={() => {
                setPsHover(false);
            }}
        >
            {name}
            <br />
            {Array.from(bullets)
                .toSorted()
                .map((bullet) => BULLETS[bullet]())}
        </Sign>
    );
}

function LinePreview({line, select}) {
    const platformSets = Object.values(PLATFORM_SETS).filter((ps) => ps.tracks.map((el) => el.line).includes(line));
    const bullets = getBullets(platformSets, select, line);
    return (
        <Sign>
            {line}
            <br />
            {Array.from(bullets)
                .toSorted()
                .map((bullet) => BULLETS[bullet]())}
        </Sign>
    );
}

export {Subway};
