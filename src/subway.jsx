import React, {useState, useEffect, useMemo, useCallback} from "react";
import {BrowserRouter, Route, Routes, useSearchParams} from "react-router-dom";
import {DateTime, Interval} from "luxon";
import {SERVICES, STATIONS, PLATFORM_SETS, MIN_BOARDINGS, MAX_RANK} from "./data.jsx";
import {BULLETS} from "./bullets.jsx";
import {TRACK_SEGMENTS} from "./tsdata.jsx"
import {
	ServiceTimeType,
	StructureType,
	TrackType,
	PlatformService,
	ArrowDirection,
	Division,
	SignalingType,
	Company,
	ServiceTimeComponent,
} from "./enums.jsx";
import {serviceTimeEqual, getDisambiguatedName as gdn} from "./objects.jsx";

// Misc TODO 
// Add spinner
// circle/highlight/border station dots
// Better representation of scaled stations
// Bullet ordering
// Better color scheme
// Fixed text and arrow representation of terminal stations
// Multiple values for track attributes (QBL/astoria overlap)
// Add ability to generate larger image and scale down

// How 2 measure track length
// Idea 1 - update property in TRACK_SEGMENTS on first render - works but is a bit wonky


// https://stackoverflow.com/questions/36862334/get-viewport-window-height-in-reactjs
const useWindowDimensions = () => {
	const [windowDimensions, setWindowDimensions] = useState({x: window.innerWidth, y: window.innerHeight});
	useEffect(() => {
		function handleResize() {
			setWindowDimensions({x: window.innerWidth, y: window.innerHeight});
		}

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		}
	}, []);
	return windowDimensions;
}


// https://www.joshwcomeau.com/snippets/react-hooks/use-mouse-position/
const useMousePosition = () => {
	const [mousePosition, setMousePosition] = React.useState({x: null, y: null});
	useEffect(() => {
		const updateMousePosition = ev => {
			setMousePosition({x: ev.clientX, y: ev.clientY});
		};

		window.addEventListener('mousemove', updateMousePosition);
		return () => {
			window.removeEventListener('mousemove', updateMousePosition);
		};
	}, []);
	return mousePosition;
};

const BACKGROUND_SRC = require("./shoreline.png");

const trackAttributesBase = [
	new TrackAttribute("total_tracks", "Total Tracks", true, [1, 2, 3, 4, 6, 7, 8], true),
	new TrackAttribute("used_tracks", "Used Tracks", true, [0, 1, 2, 3, 4, 6, 7, 8], true),
	new TrackAttribute("unused_tracks", "Unused Tracks", true, [0, 1, 2], true),
	new TrackAttribute("opened", "Date Opened", true, [ // TODO encode this data somewhere else? Could use single dates to avoid duplication
		["Before 1900", Interval.fromDateTimes(DateTime.fromObject({year: 1, month: 1, day: 1}), DateTime.fromObject({year: 1900, month: 1, day: 1}))],
		["1900 - 1909", Interval.fromDateTimes(DateTime.fromObject({year: 1900, month: 1, day: 1}), DateTime.fromObject({year: 1910, month: 1, day: 1}))],
		["1910 - 1919", Interval.fromDateTimes(DateTime.fromObject({year: 1910, month: 1, day: 1}), DateTime.fromObject({year: 1920, month: 1, day: 1}))],
		["1920 - 1929", Interval.fromDateTimes(DateTime.fromObject({year: 1920, month: 1, day: 1}), DateTime.fromObject({year: 1930, month: 1, day: 1}))],
		["1930 - 1939", Interval.fromDateTimes(DateTime.fromObject({year: 1930, month: 1, day: 1}), DateTime.fromObject({year: 1940, month: 1, day: 1}))],
		["1940 - 1949", Interval.fromDateTimes(DateTime.fromObject({year: 1940, month: 1, day: 1}), DateTime.fromObject({year: 1950, month: 1, day: 1}))],
		["1950 - 1959", Interval.fromDateTimes(DateTime.fromObject({year: 1950, month: 1, day: 1}), DateTime.fromObject({year: 1960, month: 1, day: 1}))],
		["1960 - 1999", Interval.fromDateTimes(DateTime.fromObject({year: 1960, month: 1, day: 1}), DateTime.fromObject({year: 2000, month: 1, day: 1}))],
		["2000 - present", Interval.fromDateTimes(DateTime.fromObject({year: 2000, month: 1, day: 1}), DateTime.fromObject({year: 3000, month: 1, day: 1}))],
	], false), // Start: >=, end: <
	new TrackAttribute("obf", "Originally Built For", true, Object.values(Company), true),
	new TrackAttribute("type", "Track Type", true, Object.values(StructureType), true),
	new TrackAttribute("division", "Division", true, Object.values(Division), true),
	new TrackAttribute("signaling", "Signaling Type", true, Object.values(SignalingType), true),
	new TrackAttribute("service", "Service", false, [null, ...Object.values(TrackType)], true),
];
const TRACK_ATTRIBUTES = Object.fromEntries(trackAttributesBase.map(attr => [attr.attribute, attr]));
const TRACK_ATTRIBUTES_NAME_MAP = Object.fromEntries(trackAttributesBase.map(attr => [attr.name, attr]));

const PS_COLORS = {
	"Stop": "#fffb00",
	"Skipped Stop": "#ff0000",
	"null": "#ffffff",
}


function Subway({}){
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/*" element={<SubwayMap />} />
				<Route path="/" element={<SubwayMap />} />
			</Routes>
		</BrowserRouter>
	);
}


function SubwayMap({}){
	// TODO wrap all non-hooks in useMemo?
	const [searchParams, setSearchParams] = useSearchParams();
	const focusType = ["service", "ps"].includes(searchParams.get("ftype")) ? searchParams.get("ftype") : null;
	const focusValue = focusType && {service: SERVICES, ps: STATIONS}[focusType][searchParams.get("fvalue")] ? searchParams.get("fvalue") : null;
	const attribute = TRACK_ATTRIBUTES[searchParams.get("attribute")] ? searchParams.get("attribute") : null;
	const select = searchParams.get("select") === "true" || false;
	const scale = searchParams.get("scale") === "true" || false;
	const service = searchParams.get("service") !== null && focusType === "service" && focusValue && SERVICES[focusValue][parseInt(searchParams.get("service"))] ? parseInt(searchParams.get("service")) : null;
	const pattern = searchParams.get("pattern") !== null && focusType === "service" && focusValue && service !== null && SERVICES[focusValue][service].servicePatterns[parseInt(searchParams.get("pattern"))] ? parseInt(searchParams.get("pattern")) : null;
	const platformSet = searchParams.get("ps") === null ? null : searchParams.get("ps"); // TODO extra validation
	const [psHover, setPsHover] = useState(null);
	const [serviceHover, setServiceHover] = useState(null);
	const [patternHover, setPatternHover] = useState(null);
	const [lineHover, setLineHover] = useState(null);
	const [highlightValue, setHighlightValue] = useState(null);
	const [svgDimensions, setSvgDimensions] = useState(null);
	const windowDimensions = useWindowDimensions();
	const mousePosition = useMousePosition();
	const [baseTranslate, setBaseTranslate] = useState(null);
	const [startDragPosition, setStartDragPosition] = useState(null);
	const translate = useMemo(() => startDragPosition ? {
		x: baseTranslate.x + mousePosition.x - startDragPosition.x, 
		y: baseTranslate.y + mousePosition.y - startDragPosition.y,
	} : {
		...baseTranslate
	}, [mousePosition, baseTranslate, startDragPosition]);
	// The background image is high resolution and scaled down using a "base zoom" value (unless you have an extremely high res monitor, in which case it's scaled up)
	const baseZoom = useMemo(() => svgDimensions === null ? null : Math.min(windowDimensions.x / svgDimensions.x, windowDimensions.y / svgDimensions.y), [svgDimensions, windowDimensions])
	const [zoom, setZoom] = useState(null);
	const reset = useCallback(() => {
		setZoom(baseZoom);
		setBaseTranslate({x: (1 - baseZoom) * svgDimensions.x/2, y: (1 - baseZoom) * svgDimensions.y/2});
	}, [baseZoom, svgDimensions]);
	useEffect(() => {
		if(baseZoom !== null && zoom === null){
			reset();
		}
	}, [baseZoom, zoom]);

	// Absolute position of 0, 0 in the SVG coordinate system if SVG is unzoomed and unpanned
	// TODO "calculate for x and y function" to simplify code?
	const initialOrigin = useMemo(() => svgDimensions === null ? null : {
			x: windowDimensions.x/2 - svgDimensions.x/2,
			y: windowDimensions.y/2 - svgDimensions.y/2,
		}, [svgDimensions, windowDimensions])
	const absoluteCoordsToSvgCoords = useCallback((coords) => ({
			x: (coords.x - initialOrigin.x - baseTranslate.x) / zoom,
			y: (coords.y - initialOrigin.y - baseTranslate.y) / zoom,
		}), [initialOrigin, baseTranslate, zoom]);
	const svgCoordsToAbsoluteCoords = useCallback((coords) => ({
			x: (coords.x * zoom) + initialOrigin.x + baseTranslate.x,
			y: (coords.y * zoom) + initialOrigin.y + baseTranslate.y,
		}), [initialOrigin, baseTranslate, zoom]);

	const updateZoom = useCallback((delta, ignoreMouse) => {
		if(startDragPosition){
			return;
		}
		const multiplier = delta < 0 ? 0.8 : 1.25;
		const newZoom = multiplier * zoom;
		if((newZoom < 0.75 * baseZoom && multiplier < 1) || (newZoom > 10 * baseZoom && multiplier > 1)){
			return;
		}
		const zoomTarget = ignoreMouse ? {x: windowDimensions.x/2, y: windowDimensions.y/2} : mousePosition;
		// Target position within the SVG's coordinate system, should remain constant after scrolling.
		const targetPositionOverSvg = absoluteCoordsToSvgCoords(zoomTarget);
		setZoom(newZoom);
		// Assume that targetPositionOverSvg is constant then solve the equation for baseTranslate subsituting in the new zoom value
		setBaseTranslate({
			x: zoomTarget.x - initialOrigin.x - (targetPositionOverSvg.x * newZoom), 
			y: zoomTarget.y - initialOrigin.y - (targetPositionOverSvg.y * newZoom),
		});
	}, [absoluteCoordsToSvgCoords, windowDimensions, mousePosition, startDragPosition, baseZoom, zoom]);
	useEffect(() => {
		const onScroll = (e) => updateZoom(-e.deltaY, false);
		// TODO this shouldn't be global
		window.addEventListener('wheel', onScroll);
		return () => {
			window.removeEventListener('wheel', onScroll);
		};
	}, [updateZoom]);

	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			setSvgDimensions({y: img.naturalHeight, x: img.naturalWidth});
		}
		img.src = BACKGROUND_SRC;
	}, []);
	if(svgDimensions === null || zoom === null){
		return null;
	}

	const highlight = attribute || pattern !== null || patternHover !== null ? {...TRACK_ATTRIBUTES[(pattern !== null || patternHover !== null) ? "service" : attribute], highlightValue} : null;
	const setFocus = (type, doubleclick=false) => value => {
			updateSearchParams(setSearchParams, "pattern", null);
			updateSearchParams(setSearchParams, "service", null);
			updateSearchParams(setSearchParams, "ps", null);
			if(!value || (doubleclick && value === focusValue)){
				updateSearchParams(setSearchParams, "ftype", null);
				updateSearchParams(setSearchParams, "fvalue", null);
				return true;
			} else {
				updateSearchParams(setSearchParams, "ftype", type);
				updateSearchParams(setSearchParams, "fvalue", value);
				return false;
			}
		}

	const pat = patternHover === null ? pattern : patternHover;
	const ser = serviceHover === null ? service : serviceHover;

	const getAttributes = segment => {
		let extraAttributes = {}
		const {id, d, ...attributes} = segment;
		if(pat !== null){
			const segmentServiceLabel = SERVICES[focusValue][ser].servicePatterns[pat].route.find(({serviceSegment}) => serviceSegment === attributes.service_segment);
			extraAttributes = {service: segmentServiceLabel ? segmentServiceLabel.type : null};
		}
		return {...attributes, ...extraAttributes};
	}

	const stops = {};
	if(pat !== null){
		SERVICES[focusValue][ser].servicePatterns[pat].compiledRoute.reduce((obj, serviceStop) => {
			const {stop, disambiguator, tracksNorth, tracksSouth} = serviceStop;
			obj[gdn(stop, disambiguator)] = [...tracksNorth, ...tracksSouth].some((track) => track.stops);
			return obj;
		}, stops)
	}

	return (
		<span style={{display: "flex", "flex-direction": "column", overflow: "hidden", height: "100vh", "align-items": "center", "justify-content": "center"}}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				xmlnsXlink="http://www.w3.org/1999/xlink"
				xmlSpace="preserve"
				id="svg2"
				height={svgDimensions.y}
				width={svgDimensions.x}
				viewBox={`0 0 ${svgDimensions.x} ${svgDimensions.y}`}
				version="1.1"
				onMouseDown={() => {setStartDragPosition({...mousePosition})}}
				onMouseUp={() => {
					setBaseTranslate({...translate});
					setStartDragPosition(null);
				}}
				style={{cursor: startDragPosition ? "grabbing" : "grab", width: "100vw", height: "100vh", "min-width": `${svgDimensions.x}px`, "min-height": `${svgDimensions.y}px`}}
				/*style={{"flex": "0 0 auto", "z-index": "0"}}*/
			>
				<g transform={`matrix(${zoom} 0 0 ${zoom} ${translate.x} ${translate.y})`}>
					<image x="0" y="0" width="100%" xlinkHref={BACKGROUND_SRC} />

					{Object.values(TRACK_SEGMENTS).filter(segment => segment.visible).map(segment => (
						<TrackSegmentSvg 
							key={segment.id}
							id={segment.id} 
							d={segment.d}
							baseWidth={svgDimensions.y/500} 
							attributes={getAttributes(segment)} 
							highlight={highlight} 
							hover={segment.lines.includes(lineHover)} 
							setLineHover={(tr) => setLineHover(tr ? segment.lines[0] : null)}
						/>
					))}
					{Object.entries(PLATFORM_SETS).map(([identifier, ps]) => (
						<PlatformSetDot 
							key={identifier}
							platformSet={ps} 
							colors={PS_COLORS} 
							baseSize={svgDimensions.y/275} 
							scale={scale} 
							stops={Object.keys(stops).length > 0 ? stops : null} 
							setPsHover={(tr) => setPsHover(tr ? identifier : null)}
							setFocus={() => {
								const doubleclick = setFocus("ps", identifier === platformSet)(ps.stationKey);
								updateSearchParams(setSearchParams, "ps", doubleclick ? null : identifier);
							}}
						/>
					))}
				</g>
			</svg>
			{psHover && (() => {
				const {x, y} = svgCoordsToAbsoluteCoords(PLATFORM_SETS[psHover].coordinates);
				return (
					// TODO scale translation when station dots are scaled
					<span style={{position: "absolute", left: x, top: y, transform: `translate(-50%, ${zoom*20}px)`}}>
						<PlatformSetPreview 
							platformSet={PLATFORM_SETS[psHover]} 
							select={select}
							setPsHover={(tr) => setPsHover(tr ? psHover : null)}
							setFocus={() => {
								const doubleclick = setFocus("ps", true)(psHover);
								updateSearchParams(setSearchParams, "ps", doubleclick ? null : gdn(PLATFORM_SETS[psHover].name, PLATFORM_SETS[psHover].disambiguator));
							}}
						/>
					</span>
				)
			})()}
			{/* TODO save mouse position when start hovering then don't move*/}
			{lineHover && (
				//<span style={{position: "absolute", left: 0, top: 0}}>
				<span style={{position: "absolute", left: mousePosition.x, top: mousePosition.y, transform: "translate(-50%, 10%)"}}>
					<LinePreview line={lineHover} select={select}/>
				</span>
			)}
			<span style={{position: "absolute", top: "0px", left: "0px"}} /*style={{"flex": "0 0 auto", "display": "flex", "flexDirection": "column", margin: "0px 80px 0px 25px"}}*/>
				<span>
					<span>
						<button style={{border: "0.5px solid", padding: "0 8px", "margin-right": "8px"}} onClick={() => updateZoom(1, true)}>+</button>
						<button style={{border: "0.5px solid", padding: "0 8px", "margin-right": "8px"}} onClick={reset}>Reset</button>
						<button style={{border: "0.5px solid", padding: "0 8px"}} onClick={() => updateZoom(-1, true)}>-</button>
					</span>
					<br/>
					<label style={{"margin-right": "8px"}}>Show Select Service?</label>
					<input type="checkbox" checked={select} onClick={() => {updateSearchParams(setSearchParams, "select", !select)}} />
					<br/>
					<label style={{"margin-right": "8px"}}>Scale Stations by Boardings?</label>
					<input type="checkbox" checked={scale} onClick={() => {updateSearchParams(setSearchParams, "scale", !scale)}} />
					<br/>
					<label style={{"margin-right": "8px"}}>Track Highlight</label>
					<select onChange={(event) => {updateSearchParams(setSearchParams, "attribute", TRACK_ATTRIBUTES_NAME_MAP?.[event.target.value]?.attribute)}}>
						{[{attribute: null, name: "None", visible: true}, ...Object.values(TRACK_ATTRIBUTES)].filter(({visible}) => visible).map(({attribute: att, name}) => (
							<option key={att} selected={att === attribute}>{name}</option>
						))}
					</select>
					<br/>
					<label style={{"margin-right": "8px"}}>Station</label>
					<select onChange={(event) => {
						if(event.target.value === "None"){
							setFocus("ps", false)(null);
						} else {
							setFocus("ps", false)(PLATFORM_SETS[event.target.value].stationKey);
							updateSearchParams(setSearchParams, "ps", event.target.value);
						}
					}}>
												{/*TODO change to stations?*/}
						{["None", ...Object.keys(PLATFORM_SETS).toSorted()].map((name) => (
							// TODO this doesn't work, mouseenter/leave are not supported by option, need a custom component 
							<option key={name} onMouseEnter={() => {setPsHover(null)}} onMouseLeave={() => {setPsHover(null)}} selected={(focusType === "ps" && platformSet === name) || (focusType !== "ps" && name === null)}>{name}</option>
						))}
					</select>
					<br/>
					<label style={{"margin-right": "8px"}}>Service</label>
					<select onChange={(event) => {
						if(event.target.value === "None"){
							setFocus("service", false)(null);
						} else {
							setFocus("service", false)(event.target.value);
						}
						
					}}>
						{["None", ...Object.keys(SERVICES)].map((name) => (
							<option key={name} selected={(focusType === "service" && focusValue === name) || (focusType !== "service" && name === null)}>{name}</option>
						))}
					</select>
					<br/>
					<br/>
				</span>
				{highlight && (
					<span style={{"flex": "0 0 auto"}}>
						<TrackLegend data={highlight} setHighlightValue={setHighlightValue}/>
						<br/>
						<br/>
					</span>
				)}
				{pat !== null && (
					<span style={{"flex": "0 0 auto"}}>
						<PlatformSetLegend colors={PS_COLORS} size={3.5}/>
					</span>
				)}
			</span>
			{focusValue && (
				<span style={{position: "absolute", "overflow-y": "scroll", top: "0px", right: "0px", "background-color": "#FFFFFF"}} /*style={{"flex": "4 1 auto"}}*/>
					{focusType === "ps" && 
						<StationFocus 
							station={STATIONS[focusValue]} 
							psName={platformSet}
							setPsName={(psName) => updateSearchParams(setSearchParams, "ps", psName)}
							select={select}
						/>
					}
					{focusType === "service" && 
						<ServiceFocus 
							servicesInformation={SERVICES[focusValue]} 
							selected={{service, pattern}} 
							setHover={(s, p) => {
								setServiceHover(s);
								setPatternHover(p);
							}} 
							setSelect={(s, p) => {
								updateSearchParams(setSearchParams, "service", s);
								updateSearchParams(setSearchParams, "pattern", p);
							}}
						/>
					}
				</span>
			)}
		</span>
	);
}

function TrackSegmentSvg({id, d, baseWidth, attributes, highlight, hover, setLineHover}){
    const {stroke, opacity} = highlight ? highlight.getColor(attributes[highlight.attribute]) : {stroke: "#9c9c9c", opacity: "1"};
    if(stroke === undefined){
        throw new Error(`Track segment ${id} has no attribute ${highlight.attribute} or highlight has no value ${attributes[highlight.attribute]}`);
    }
    // const shadowSize = "0.5px";
    // const shadowColor = "#555555";
    // TODO bring to front if using shadow? Overall I'm a bit dissatisfied with this
    const useShadow =  hover || (highlight && (attributes[highlight.attribute] !== null && highlight.getColor(highlight.highlightValue).stroke === highlight.getColor(attributes[highlight.attribute]).stroke))
    //const style = useShadow ? {filter: `drop-shadow(-${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} ${shadowSize} ${shadowColor}) drop-shadow(-${shadowSize} ${shadowSize} ${shadowColor})`} : {}
    return (
        <path
            id={`path${id}`}
            title={id}
            fill="none"
            stroke={stroke}
            strokeOpacity={opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth={useShadow ? baseWidth * 2 : baseWidth}
            //style={style}
            style={{cursor: "default"}}
            d={d}
            clipPath="url(#SVGID_548_)"
            onMouseDown={(e) => {e.stopPropagation()}}
            onMouseEnter={() => {setLineHover(true)}}
            onMouseLeave={() => {setLineHover(false)}}
        />
    )
}

//TODO could change highlight from string to bool
function PlatformSetDot({platformSet, colors, baseSize, scale, stops, setPsHover, setFocus}){
	const {name, disambiguator, coordinates: {x, y}} = platformSet;
	const scaleBaseSize = baseSize/3;
	const size = scale ? Math.sqrt(STATIONS[platformSet.stationKey].boardings / MIN_BOARDINGS) * scaleBaseSize : baseSize;
	let fill;
	if(stops === null || stops[gdn(name, disambiguator)] === undefined){
		fill = colors.null;
	} else if(stops[gdn(name, disambiguator)]){ // TODO directional only stop?
		fill = colors.Stop;
	} else { // Skipped stop
		fill = colors["Skipped Stop"];
	}
	return (
		<ellipse
			cx={x} 
			cy={y} 
			rx={size} 
			ry={size}
			style={{fill, cursor: "default", stroke: "rgb(0, 0, 0)"}} 
			onClick={setFocus}
			onMouseDown={(e) => {e.stopPropagation()}}
			onMouseEnter={() => {setPsHover(true)}} 
			onMouseLeave={() => {setPsHover(false)}} 
		/>
	)
}

function Legend({name, colors, onTrMouseEnter, onTrMouseLeave, SvgChild}){
	// TODO could include onClick
	return (
		<table style={{"border-spacing": "10px"}}>
				<thead>
					<tr>
						<th colSpan="2">{name}</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(colors).filter(([option, _]) => option !== "null").map(([option, color]) => (
						<tr key={option} onMouseEnter={() => {onTrMouseEnter(option)}} onMouseLeave={() => {onTrMouseLeave(option)}}>
							<td>{option}<span style={{display: "inline-block", width: "12px"}}/></td>
							<td>
								<svg xmlns="http://www.w3.org/2000/svg" width="30px" height="20px" style={{display: "inline-block"}}>
									<SvgChild color={color} />
								</svg>
							</td>
						</tr>
					))}
				</tbody>
			</table>
	)
}

function TrackLegend({data, setHighlightValue}){
	const {name, colors} = data;
	return <Legend name={name} colors={colors} onTrMouseEnter={(option) => {setHighlightValue(option)}} onTrMouseLeave={() => {setHighlightValue(null)}} SvgChild={TrackSvgChild}/>;
}

function TrackSvgChild({color}){
	return <line x1="0" y1="50%" x2="100" y2="50%" stroke={color} strokeWidth="2.5" />;
}

function PlatformSetLegend({colors, size}){
	return (<Legend name="Stations" colors={colors} onTrMouseEnter={() => {}} onTrMouseLeave={() => {}} SvgChild={platformSetSvgChildWithSize(size)}/>)
}

function platformSetSvgChildWithSize(size){
	return function PlatformSetSvgChildCur({color}) {
		return <PlatformSetSvgChild color={color} size={size}/>;
	} 
}

function PlatformSetSvgChild({color, size}){
	return <ellipse style={{fill: color, stroke: "rgb(0, 0, 0)"}} rx={size} ry={size} cx="50%" cy="50%"/>;
}

function ServiceFocus({servicesInformation, selected, setHover, setSelect}){
	return (
		<>
			{servicesInformation.map(({service, subtitle, servicePatterns}, serviceIndex) => (
				<>
					{BULLETS[service]()}{" "}{subtitle}<br/>
					<span style={{"text-indent": "50px"}}>
						{servicePatterns.map(({serviceDescription}, patternIndex) => {
							const isSelected = selected.service === serviceIndex && selected.pattern === patternIndex;
							const child = (
								<div 
									onMouseEnter={() => {setHover(serviceIndex, patternIndex)}} 
									onMouseLeave={() => {setHover(null, null)}} 
									onClick={() => {
										if(isSelected){
											setSelect(null, null)
										} else {
											setSelect(serviceIndex, patternIndex)
										}
									}}
								>
									{""}{serviceDescription}
								</div>
							)
							return isSelected ? (<strong>{child}</strong>) : child;
						})}
					</span>
					<br/>
				</>
			))}
		</>
	);
}

// TODO Fix scrolling in station window (use CSS "float" property instead of flex?)
function StationFocus({station, psName, setPsName, select}){
	const {name, platformSets, boardings: initialBoardings, odt, rank: initialRank} = station;
	// TODO change once times square is added
	const boardings = typeof initialBoardings === "string" ? 0 /*STATIONS[initialBoardings].boardings*/ : initialBoardings;
	const rank = typeof boardings === "string" ? 0 /*STATIONS[initialBoardings].rank*/ : initialRank;
	const ordinal = num => {
		if(num % 10 === 1 && num % 100 !== 11){
			return `${num}st`;
		} else if(num % 10 === 2 && num % 100 !== 12){
			return `${num}nd`;
		} else if(num % 10 === 3 && num % 100 !== 13){
			return `${num}rd`;
		} else {
			return `${num}th`;
		}
	};
	const bullets = new Set();
	for(const platformSet of Object.values(platformSets)){
		for(const track of platformSet.tracks){
			for(const {service, stops, serviceTime} of Object.values(track.service)){
				if(!stops){
					continue;
				}
				// TODO order, NOTE: late nights and weekends omitted on purpose
				if(select || serviceTime.hasServiceForTime([ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS], ServiceTimeType.YES)){
					bullets.add(service);
				}
			}
		}
	}
	return (
		<>
			<div style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}>
				{name}<br/>
				{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
			</div>
			{boardings.toLocaleString()} boardings (2023), {ordinal(rank)} of {MAX_RANK}<br/>
			Opposite direction transfer: {{true: "Yes", false: "No", null: "N/A"}[odt]}<br/><br/>
			{/*TODO tab titles*/}
			{Object.values(platformSets).length === 1 ? (
					<Tab platformSet={platformSets[psName]} select={select}/>
				) : (
					<>
						{Object.values(platformSets).map((platformSet) => 
							(<span 
								key={gdn(platformSet.name, platformSet.disambiguator)}
								style={{padding: "10px", "font-weight": gdn(platformSet.name, platformSet.disambiguator) === psName ? "bold" : "normal"}} 
								onClick={() => setPsName(gdn(platformSet.name, platformSet.disambiguator))}>{platformSet.lines.filter(lineName => lineName !== null).map(lineName => lineName.slice(lineName.indexOf(" "))).join(", ")}
							</span>)
						)}
						<br/>
						<Tab platformSet={platformSets[psName]} select={select}/>
					</>
				)
			}
			<br/>
		</>
	);
}

// TODO change name to platformset, add "pointer triangle"?
function PlatformSetPreview({platformSet, select, setPsHover, setFocus}){
	const {name} = platformSet;
	const bullets = getBullets([platformSet], select);
	return (
		<div 
			style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}
			onClick={setFocus}
			onMouseDown={(e) => {e.stopPropagation()}}
			onMouseEnter={() => {setPsHover(true)}} 
			onMouseLeave={() => {setPsHover(false)}} 
		>
			{name}<br/>
			{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
		</div>
	);
}

function LinePreview({line, select}){
	const platformSets = Object.values(PLATFORM_SETS).filter(ps => ps.tracks.map(el => el.line).includes(line));
	const bullets = getBullets(platformSets, select, line);
	return (
		<div style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}>
			{line}<br/>
			{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
		</div>
	)
}

function getBullets(platformSets, select, line=null){
	const bullets = new Set();
	for(const platformSet of platformSets){
		for(const track of platformSet.tracks){
			for(const {service, stops, serviceTime} of Object.values(track.service)){
				if(!stops){
					continue;
				}
				// TODO order NOTE: late nights and weekends omitted on purpose
				if((select || serviceTime.hasServiceForTime([ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS], ServiceTimeType.YES)) && (line === null || track.line === line)){
					bullets.add(service);
				}
			}
		}
	}
	// TODO order bullets and return list?
	return bullets;
}

function Tab({platformSet, select}){
	const {name, type, opened, lines, layout, normal} = platformSet;
	// Ideas: render background as dark or brown color to represent the ground, render track description (ie "westbound local") to the side, by default show services lined up then expand
	return (
		<>
			{normal && <Label data={{label: lines.join(", "), type, opened}}/>}
			{layout.map((floor, index) => (
				<>
					{layout.length > 1 && (<><span style={{"font-style" : "italic"}}>Floor {type === StructureType.UNDERGROUND ? "B" : ""}{index + 1}</span><br/></>) /*TODO label floor*/}
					{floor.map((element, index2) => (
						<>
							{element.category !== "Platform" && index2 === 0 && <hr style={{"border-top-width": "3px", "border-color": "#888888"}}/>}
							<div style={{margin: "2px 0px"}}>
								{element.category === "Label" && <Label data={element}/>}
								{element.category === "Track" && <Track track={element} psName={name} select={select}/>}
								{element.category === "Platform" && <Platform platform={element}/>}
								{element.category === "Misc" && element.description}
							</div>
							{element.category !== "Platform" && (index2 === floor.length - 1 || floor[index2 + 1].category !== "Platform") && <hr style={{"margin-top": "6px", "border-top-width": "3px", "border-color": "#888888"}}/>}
						</>
					))}
					{index !== layout.length - 1 && (
						<>{/* Idea: render this as stairs? */}
							<hr style={{margin: "20px 0px 8px 0px", "height": "6px", "border-top-width": "2px", "background-color":"white", "border-bottom-width": "2px", "border-color": "#CCCCCC"}}/>
						</>
					)}
				</>
			))}
		</>
	);
}

function Label({data}){
	const {label, type, opened} = data;
	const tostring = type || opened ? `(${type ? (`${type  }, `) : ""}${opened ? (`Opened ${  opened.toLocaleString()}`) : ""})` : "";
	return <div style={{"margin-bottom": "4px"}}> <span style={{"font-weight": "bold"}}>{label} Platforms</span> {tostring}</div>
}

function Track({track, psName, select}){
	const {type, direction, serviceDirection, service, summary, trackDescription, showTrack} = track;
	let hasService = false;
	const arrows = {
		[ArrowDirection.RIGHT]: "\u2192",
		[ArrowDirection.LEFT]: "\u2190",
	}
	const bound = direction === ArrowDirection.BOTH ? "" : `${serviceDirection}bound `;
	const sortServiceLines = ([_, a], [__, b]) => {
		const {service: serviceA, stops: stopsA, direction: directionA} = a;
		const {service: serviceB, stops: stopsB, direction: directionB} = b;
		if(directionA === directionB){
			if(stopsA === stopsB){
				// TODO sort by service time? (ie "all times" services before "late nights" services)
				return serviceA.localeCompare(serviceB);
			} else {
				return stopsA ? -1 : 1;
			}
		} else {
			return directionA === ArrowDirection.LEFT ? -1 : 1
		}
	}
	return (
		<>
			<div>{summary ?? `${bound}${type}`}</div>
			<>
				{showTrack && <div style={{height: "24px", margin: "5px 0px", background: "linear-gradient(to bottom, rgb(255 255 255 / 0%), rgb(255 0 153 / 0%) 4px, #E9E9E9 4px, #E9E9E9 8px, rgb(255 255 255 / 0%) 8px, rgb(255 0 153 / 0%) 16px, #E9E9E9 16px, #E9E9E9 20px, rgb(255 255 255 / 0%) 20px, rgb(255 255 255 / 0%) 24px), repeating-linear-gradient(to right, #FFFFFF, #FFFFFF 12px, #c19a6b 12px, #c19a6b 20px)"}}/>}
				{
					!trackDescription && Object.entries(service).toSorted(sortServiceLines).map(([key, serviceTimeStops]) => {
						const {service: serviceName, stops, direction: entryDirection, serviceTime} = serviceTimeStops;
						const stopDescription = () => stops ? <NextLastStops serviceTimeStops={serviceTimeStops} psName={psName} select={select}/> : " does not stop here"
						if(select){
							hasService = true;
							return <div key={key} style={{margin: "5px 0px"}}>{arrows[entryDirection]}{BULLETS[serviceName]()}{` ${serviceTimeString(serviceTime, ServiceTimeType.YES)} ${serviceTimeString(serviceTime, ServiceTimeType.SELECT)}`} {stopDescription()}</div>;
						} else {
							// Assumption that we will not receive a pattern with all times set to NO
							if(serviceTime.hasServiceForTime([ServiceTimeComponent.ALL_TIMES], ServiceTimeType.YES)){
								hasService = true;
								return <div key={key} style={{margin: "5px 0px"}}>{arrows[entryDirection]}{BULLETS[serviceName]()}{` ${serviceTimeString(serviceTime, ServiceTimeType.YES)}`} {stopDescription()}</div>
							} else {
								return ""
							}
						}
					})
				}
				{!hasService && <div style={{margin: "5px 0px"}}>{trackDescription || "No regular service"}</div>}
			</>
		</>
	);
}

function NextLastStops({serviceTimeStops, psName, select}){
	const {serviceTime, nextStopService, lastStopService} = serviceTimeStops;
	const getStopRep = (service, nextstop) => (
			<span /*style={{display: "inline-flex", "flexDirection": "column"}}*/>
				{Object.entries(service).map(([disambiguatedName, {time, name}], i, serviceTimes) => (
					<span key={disambiguatedName}>
						{ 
							(() => {
								const base = nextstop ? (name === "" ? "Termination track" : `Next stop ${name}`) : `, Last stop ${name}`;
								if(!nextstop && disambiguatedName === psName){
									return "";
								}
								if(select){
									// TODO consolidate this with above?
									// TODO eliminate INDIVIDUAL time strings if equal to track service time?
									return base + (serviceTimes.length > 1 /*&& !serviceTimeEqual(time, serviceTime)*/ ? `${serviceTimeString(time, ServiceTimeType.YES)} ${serviceTimeString(time, ServiceTimeType.SELECT)} ` : "");
								} else {
									return serviceTime.hasServiceForTime([ServiceTimeComponent.ALL_TIMES], ServiceTimeType.YES) ? (serviceTimes.length > 1 && !serviceTimeEqual(time, serviceTime) ? `${base} ${serviceTimeString(time, ServiceTimeType.YES)} ` : base) : "";
								}
							})()
						}
					</span>
				))}
			</span>
		);
	// TODO fix this once and for all
	return (<span>({getStopRep(nextStopService, true)}{getStopRep(lastStopService, false)})</span>)
}

function Platform({platform}){
	const {type, accessible, service, description} = platform;
	const [serviceUp, serviceDown] = {[PlatformService.UP]: [true, false], [PlatformService.DOWN]: [false, true], [PlatformService.BOTH]: [true, true], [PlatformService.NONE]: [false, false]}[service];

	return (
		<div style={{"box-sizing": "content-box", height: "40px", "background-color": "#BCBCBC", "align-content": "center", "padding-left": "10px", "border-color": "#f7f443", "border-width": `${serviceUp ? "5" : "0"}px 0px ${serviceDown ? "5" : "0"}px 0px`}}>
			{`${type} Platform${accessible ? " (Accessible)" : ""}${service === PlatformService.NONE ? " (Not in Service)" : ""}${description ? `, ${  description}` : ""}`}
		</div>
	);
}

function serviceTimeString(serviceTime, level){
	const select = level === ServiceTimeType.SELECT;
	if(serviceTime === null){
		return "";
	}
	const shorthand = serviceTime.getShorthand(level);
	if(Object.entries(shorthand).length === 0){
		return "";
	}
	const getMessage = (message, plural) => plural ? message : (message[message.length - 1] === "s" ? message.slice(0, message.length - 1) : message);
	const humanReadableList = (ls) => ls.length === 1 ? ls[0] : `${ls.slice(0, ls.length - 1).join(", ")}${ls.length > 2 ? "," : ""} and ${ls[ls.length - 1]}`;
	const getHumanReadableList = (sh, plural) => humanReadableList(Object.keys(shorthand).map(desc => getMessage(desc, plural)));
	// TODO - could have hardcoded "except" here for except late nights or except rush
	//const useInverse = false;
	//return `${select ? "Select trips e" : "E"}xcept ${getHumanReadableList(([desc, el]) => el !== level, true)}`;
	return `${select ? "Select " : ""}${getHumanReadableList(shorthand, !select)}${select ? " trips" : ""}`;
}

function TrackAttribute(attribute, name, visible, options, discrete){
	this.attribute = attribute;
	this.name = name;
	this.visible = visible;
	this.options = options;
	// TODO absolutely need to replace this as it's confusing
	const highlightColors = ["#a7a9ac", "#0039a6", "#ff6319", "#6cbe45", "#996633", "#fccc0a", "#ee352e", "#00933c", "#b933ad", "#00add00", "#808183"];
	if(discrete){
		this.colors = this.options.reduce((acc, option, index) => {
			acc[option] = highlightColors[typeof option === "number" ? option : index];
			return acc;
		}, {});
	} else {
		this.colors = this.options.reduce((acc, [option, _], index) => {
			acc[option] = highlightColors[typeof option === "number" ? option : index];
			return acc;
		}, {});
	}
	this.getColor = (value) => {
		if(value === null){
			return {stroke: "#9c9c9c", opacity: "1"};
		} else if(discrete){
			return {stroke: this.colors[value], opacity: "1"};
		} else {
			for(const [option, interval] of this.options){
				if(interval.contains(value) || option === value){
					return {stroke: this.colors[option], opacity: "1"};
				}
			}
		}
		throw new Error(`Color not found for ${attribute} ${value}`);
	}
}

function updateSearchParams(setSearchParams, key, value){
	setSearchParams((prev) => {
		if(value === null || value === undefined || value === false){
			prev.delete(key);
		} else {
			prev.set(key, value);
		}
		return prev;
	})
}

export {Subway}