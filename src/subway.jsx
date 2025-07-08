import React, {useState, useEffect} from "react";
import {BrowserRouter, Route, Routes, Link, useSearchParams, useParams} from "react-router-dom";
import {DateTime, Interval} from "luxon";
import {PLATFORM_SETS, SERVICES, STATIONS, MIN_BOARDINGS} from "./data.jsx";
import {BULLETS} from "./bullets.jsx";
import {TRACK_SEGMENTS} from "./tsdata.jsx"
import {
	ServiceType,
	LineName,
	PlatformSetType,
	TrackType,
	PlatformType,
	PlatformService,
	InternalDirection,
	ServiceDirection,
	Division,
	SignalingType,
	JunctionType,
	BuiltFor
} from "./enums.jsx";
import {serviceTimeEqual} from "./objects.jsx";

// Misc TODO 
// circle/highlight/border station dots
// hardcoded line name positions
// line focus?
// Better representation of scaled stations
// Bullet ordering
// Better color scheme
// Fixed text and arrow representation of terminal stations
// Multiple values for track attributes (QBL/astoria overlap)
// Add ability to generate larger image and scale down

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

const selfPointingTrackAttributeObject = (attribute, name, visible, options, discrete) => {return {[attribute]: new TrackAttribute(attribute, name, visible, options, discrete)}};
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
	new TrackAttribute("obf", "Originally Built For", true, Object.values(BuiltFor), true),
	new TrackAttribute("type", "Track Type", true, Object.values(PlatformSetType), true),
	new TrackAttribute("division", "Division", true, Object.values(Division), true),
	new TrackAttribute("signaling", "Signaling Type", true, Object.values(SignalingType), true),
	new TrackAttribute("service", "Service", false, [null, ...Object.values(TrackType)], true),
];
const TRACK_ATTRIBUTES = Object.fromEntries(trackAttributesBase.map(attr => [attr.attribute, attr]));
const TRACK_ATTRIBUTES_NAME_MAP = Object.fromEntries(trackAttributesBase.map(attr => [attr.name, attr]));

const BACKGROUND_SRC = require("./shoreline.png");

function SubwayMap({}){
	const [searchParams, setSearchParams] = useSearchParams();
	const focusType = searchParams.get("ftype");
	const focusValue = searchParams.get("fvalue");
	const attribute = searchParams.get("attribute");
	const select = searchParams.get("select") === "true" || false;
	const scale = searchParams.get("scale") === "true" || false;
	const service = searchParams.get("service") === null ? null : parseInt(searchParams.get("service"));
	const pattern = searchParams.get("pattern") === null ? null : parseInt(searchParams.get("pattern"));
	const [dimensions, setDimensions] = useState({});
	const [psHover, setPsHover] = useState(null);
	const [serviceHover, setServiceHover] = useState(null);
	const [patternHover, setPatternHover] = useState(null);
	const [lineHover, setLineHover] = useState(null);
	const [highlightValue, setHighlightValue] = useState(null);
	const [svgDimensions, setSvgDimensions] = useState({});
	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			setSvgDimensions({y: img.naturalHeight, x: img.naturalWidth});
		}
		img.src = BACKGROUND_SRC;
	}, []);
	if(svgDimensions.x === undefined || svgDimensions.y === undefined){
		return null;
	}
	const highlight = attribute || pattern || patternHover !== null ? {...TRACK_ATTRIBUTES[(pattern || patternHover !== null) ? "service" : attribute], highlightValue} : null;
	const setFocus = (type, doubleclick=false) => {
		return value => {
			if(!value || doubleclick && value === focusValue){
				updateSearchParams(setSearchParams, "ftype", null);
				updateSearchParams(setSearchParams, "fvalue", null);
			} else {
				updateSearchParams(setSearchParams, "ftype", type);
				updateSearchParams(setSearchParams, "fvalue", value);
			}
		}
	}

	const pat = patternHover === null ? pattern : patternHover;
	const ser = serviceHover === null ? service : serviceHover;

	const getAttributes = segment => {
		let extraAttributes = {}
		const {id, d, ...attributes} = segment;
		if(pat !== null){
			const segmentServiceType = SERVICES[focusValue][ser].servicePatterns[pat].route.find(({serviceSegment}) => serviceSegment === attributes.service_segment);
			extraAttributes = {service: segmentServiceType ? segmentServiceType.type : null};
		}
		return {...attributes, ...extraAttributes};
	}

	const stops = {};
	if(pat !== null){
		SERVICES[focusValue][ser].servicePatterns[pat].compiledRoute.reduce((obj, serviceStop) => {
			const {stop, trackNext, trackPrevious} = serviceStop;
			const stopsNext = trackNext?.stops;
			const stopsPrevious = trackPrevious?.stops;
			obj[stop] = [stopsNext, stopsPrevious];
			return obj;
		}, stops)
	}

	return (
		<span style={{"display": "flex", "flex": "1 1 auto", position: "relative"}}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				xmlnsXlink="http://www.w3.org/1999/xlink"
				xmlSpace="preserve"
				id="svg2"
				height={svgDimensions.y}
				width={svgDimensions.x}
				version="1.1"
				style={{"flex": "0 0 auto", "z-index": "0"}}
			>
				<image x="0" y="0" width="100%" xlinkHref={BACKGROUND_SRC}></image>

				{Object.values(TRACK_SEGMENTS).filter(segment => segment.visible).map(segment => <TrackSegmentSvg id={segment.id} d={segment.d} attributes={getAttributes(segment)} highlight={highlight} hover={segment.lines.includes(lineHover)} setLineHover={(tr) => setLineHover(tr ? segment.lines[0] : null)}/>)}
				{Object.entries(PLATFORM_SETS).toSorted((a, b) => b.boardings - a.boardings).map(([identifier, ps]) => (<PlatformSetDot platformSet={ps} scale={scale} stops={stops} setPsHover={(tr) => setPsHover(tr ? identifier : null)} setFocus={() => setFocus("ps", true)(identifier)}/>))}
			</svg>
			{psHover && (
				<span style={{position: "absolute", left: PLATFORM_SETS[psHover].coordinates.x, top: PLATFORM_SETS[psHover].coordinates.y + 8, transform: "translate(-50%, 0)"}}>
					<PlatformSetPreview platformSet={PLATFORM_SETS[psHover]} select={select}/>
				</span>
			)}
			{/* TODO could do mouse position, also could do hardcoded location for each line*/}
			{lineHover && (
				//<span style={{position: "absolute", left: mousePosition.x, top: mousePosition.y + 8, transform: "translate(-50%, 0)"}}>
				<span style={{position: "absolute", left: 0, top: 0}}>
					<LinePreview line={lineHover} select={select}/>
				</span>
			)}
			<span style={{"flex": "0 0 auto", "display": "flex", "flexDirection": "column", margin: "0px 80px 0px 25px"}}>
				<span style={{"flex": "0 0 auto"}}>
					<label style={{"margin-right": "8px"}}>Show Select Service?</label>
					<input type="checkbox" checked={select} onClick={() => {updateSearchParams(setSearchParams, "select", !select)}} />
					<br/>
					<label style={{"margin-right": "8px"}}>Scale Stations by Boardings?</label>
					<input type="checkbox" checked={scale} onClick={() => {updateSearchParams(setSearchParams, "scale", !scale)}} />
					<br/>
					<label style={{"margin-right": "8px"}}>Track Highlight</label>
					<select onChange={(event) => {updateSearchParams(setSearchParams, "attribute", TRACK_ATTRIBUTES_NAME_MAP?.[event.target.value]?.attribute)}}>
						{[{attribute: null, name: "None", visible: true}, ...Object.values(TRACK_ATTRIBUTES)].filter(({visible}) => visible).map(({attribute: att, name}) => (
							<option selected={att === attribute}>{name}</option>
						))}
					</select>
					<br/>
					<label style={{"margin-right": "8px"}}>Station</label>
					<select onChange={(event) => {
						if(event.target.value === "None"){
							updateSearchParams(setSearchParams, "ftype", null);
							updateSearchParams(setSearchParams, "fvalue", null);
						} else {
							updateSearchParams(setSearchParams, "ftype", "ps");
							updateSearchParams(setSearchParams, "fvalue", event.target.value);
						}
						
					}}>
												{/*TODO change to stations?*/}
						{["None", ...Object.keys(PLATFORM_SETS).toSorted()].map((name) => (
							// TODO this doesn't work, mouseenter/leave are not supported by option, need a custom component 
							<option onMouseEnter={() => {setPsHover(null)}} onMouseLeave={() => {setPsHover(null)}} selected={(focusType === "ps" && focusValue === name) || (focusType !== "ps" && name === null)}>{name}</option>
						))}
					</select>
					<br/>
					<label style={{"margin-right": "8px"}}>Service</label>
					<select onChange={(event) => {
						if(event.target.value === "None"){
							updateSearchParams(setSearchParams, "ftype", null);
							updateSearchParams(setSearchParams, "fvalue", null);
							updateSearchParams(setSearchParams, "service", null);
							updateSearchParams(setSearchParams, "pattern", null);
						} else {
							updateSearchParams(setSearchParams, "ftype", "service");
							updateSearchParams(setSearchParams, "fvalue", event.target.value);
							updateSearchParams(setSearchParams, "service", null);
							updateSearchParams(setSearchParams, "pattern", null);
						}
						
					}}>
						{["None", ...Object.keys(SERVICES)].map((name) => (
							<option selected={(focusType === "service" && focusValue === name) || (focusType !== "service" && name === null)}>{name}</option>
						))}
					</select>
					<br/>
					<br/>
				</span>
				{highlight && (
					<span style={{"flex": "4 1 auto"}}>
						<Legend data={highlight} setHighlightValue={setHighlightValue}/>
					</span>
				)}
			</span>
			{focusValue && (
				<span style={{"flex": "4 1 auto"}}>
					{focusType === "ps" && <StationFocus station={STATIONS[PLATFORM_SETS[focusValue].stationKey]} select={select}/>}
					{focusType === "service" && <ServiceFocus servicesInformation={SERVICES[focusValue]} selected={{service, pattern}} setHover={(service, pattern) => {setServiceHover(service);setPatternHover(pattern);}} setSelect={(ser, pat) => {updateSearchParams(setSearchParams, "service", ser);updateSearchParams(setSearchParams, "pattern", pat);}}/>}
					{focusType === "line" && true}
				</span>
			)}
		</span>
	);
}

function TrackSegmentSvg({id, d, attributes, highlight, hover, setLineHover}){
    const {stroke, opacity} = highlight ? highlight.getColor(attributes[highlight.attribute]) : {stroke: "#9c9c9c", opacity: "1"};
    if(stroke === undefined){
        throw new Error(`Track segment ${id} has no attribute ${highlight.attribute} or highlight has no value ${attributes[highlight.attribute]}`);
    }
    const shadowSize = "0.5px";
    const shadowColor = "#555555";
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
            strokeWidth={useShadow ? "5.5" : "2.5"}
            //style={style}
            d={d}
            clipPath="url(#SVGID_548_)"
            onMouseEnter={() => {setLineHover(true)}}
            onMouseLeave={() => {setLineHover(false)}}
        ></path>
    )
};

//TODO could change highlight from string to bool
function PlatformSetDot({platformSet, scale, stops, setPsHover, setFocus}){
	const {name, coordinates: {x, y}} = platformSet;
	const baseSize = 3;
	const scaleBaseSize = 1.5;
	const size = scale ? Math.sqrt(STATIONS[platformSet.stationKey].boardings / MIN_BOARDINGS) * scaleBaseSize : baseSize;
	let fill = "#000000";
	if(stops[name]){ // TODO directional only stop
		if(stops[name][0] || stops[name][1]){
			fill = "#fffb00";
		} else {
			fill = "#ff0000";
		}
	}
	return (
		<ellipse onClick={setFocus} onMouseEnter={() => {setPsHover(true)}} onMouseLeave={() => {setPsHover(false)}} style={{fill, stroke: "stroke: rgb(0, 0, 0)"}} cx={x} cy={y} rx={size} ry={size} transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
	)
}

function Legend({data, setHighlightValue}){
	// TODO could include onClick
	const {name, colors} = data;
	return (
		<>
			<table style={{"border-spacing": "10px"}}>
				<thead>
					<tr>
						<th colSpan="2">{name}</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(colors).filter(([option, _]) => option !== "null").map(([option, color]) => (
						<tr onMouseEnter={() => {setHighlightValue(option)}} onMouseLeave={() => {setHighlightValue(null)}}>
							<td>{option}<span style={{display: "inline-block", width: "12px"}}/></td>
							<td>
								<svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 125 125" style={{display: "inline-block", transform: "translate(0, 50%)"}}>
									 <line x1="0" y1="0" x2="100" y2="0" stroke={color} strokeWidth="25" />
								</svg>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</>
	)
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
								<div onMouseEnter={() => {setHover(serviceIndex, patternIndex)}} onMouseLeave={() => {setHover(null, null)}} onClick={() => {isSelected ? setSelect(null, null) : setSelect(serviceIndex, patternIndex)}}>
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

function StationFocus({station, select}){
	const {name, platformSets, boardings, odt, rank} = station;
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
	for(const platformSet of platformSets){
		for(const floor of platformSet.layout){
			for(const element of floor){
				if(element.category !== "Track" || !element.stops){
					continue;
				}
				for(const [service, {serviceTime}] of Object.entries(element.service)){
					// TODO order, MAKE THIS A SEPARATE FUNCTION NOTE: late nights omitted on purpose
					if(select || [serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.weekends].some(t => t === ServiceType.YES)){
						bullets.add(service);
					}
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
			{boardings.toLocaleString()} boardings (2023), {ordinal(rank)} of {Object.values(STATIONS).length}<br/>
			Opposite direction transfer: {{true: "Yes", false: "No", null: "N/A"}[odt]}<br/><br/>
			{platformSets.map((platformSet => <PlatformSet platformSet={platformSet} select={select}/>))}<br/>
		</>
	);
}

// TODO change name to platformset?
function PlatformSetPreview({platformSet, select}){
	const {name, type, odt, layout, platformName} = platformSet;
	const bullets = getBullets([platformSet], select);
	return (
		<div style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}>
			{name}<br/>
			{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
		</div>
	);
}

function LinePreview({line, select}){
	// TODO this is part of the "station overhaul"
	const platformSets = Object.values(PLATFORM_SETS).filter(ps => ps.layout.flat().map(el => el.line).includes(line));
	const bullets = getBullets(platformSets, select);
	return (
		<div style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}>
			{line}<br/>
			{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
		</div>
	)
}

function getBullets(platformSets, select){
	const bullets = new Set();
	for(const platformSet of platformSets){
		const {layout} = platformSet;
		for(const floor of layout){
			for(const element of floor){
				if(element.category !== "Track" || !element.stops){
					continue;
				}
				for(const [service, {serviceTime}] of Object.entries(element.service)){
					// TODO order, MAKE THIS A SEPARATE FUNCTION NOTE: late nights omitted on purpose
					if(select || [serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.weekends].some(t => t === ServiceType.YES)){
						bullets.add(service);
					}
				}
			}
		}
	}
	// TODO order bullets and return list?
	return bullets;
}

function PlatformSet({platformSet, select}){
	const {name, type, odt, opened, layout, platformName, lines} = platformSet;
	// Ideas: render background as dark or brown color to represent the ground, render track description (ie "westbound local") to the side, by default show services lined up then expand
	return (
		<>
			<div style={{"margin-bottom": "4px"}}> <span style={{"font-weight": "bold"}}>{lines.join(", ")} Platforms</span> ({type}, Opened {opened.toLocaleString()})</div>
			{layout.map((floor, index) => (
				<>
					{layout.length > 1 && (<><span style={{"font-style" : "italic"}}>Floor {type === PlatformSetType.UNDERGROUND ? "B" : ""}{index + 1}</span><br/></>) /*TODO label floor*/}
					{floor.map((element, index2) => (
						<>
							{element.category !== "Platform" && index2 === 0 && <hr style={{"border-top-width": "3px", "border-color": "#888888"}}/>}
							<div style={{margin: "2px 0px"}}>
								{element.category === "Track" && <Track track={element} select={select}/>}
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

function Track({track, select}){
	const {type, direction, compassDirection, stops, service} = track;
	let hasService = false;
	return (
		<>
			<div>{direction === InternalDirection.NEXT ? "\u2190" : "\u2192"}{compassDirection}bound {type}</div>
			<div style={{height: "24px", margin: "5px 0px", background: "linear-gradient(to bottom, rgb(255 255 255 / 0%), rgb(255 0 153 / 0%) 4px, #E9E9E9 4px, #E9E9E9 8px, rgb(255 255 255 / 0%) 8px, rgb(255 0 153 / 0%) 16px, #E9E9E9 16px, #E9E9E9 20px, rgb(255 255 255 / 0%) 20px, rgb(255 255 255 / 0%) 24px), repeating-linear-gradient(to right, #FFFFFF, #FFFFFF 12px, #c19a6b 12px, #c19a6b 20px)"}}/>
			{Object.entries(service).map(([name, serviceTimeStops], index) => {
				const {serviceTime} = serviceTimeStops;
				const StopDescription = () => stops ? <NextLastStops serviceTimeStops={serviceTimeStops} select={select}/> : " does not stop here"
				if(select){
					hasService = true;
					return <div style={{margin: "5px 0px"}}>{BULLETS[name]()}{` ${serviceTimeString(serviceTime, ServiceType.YES)} ${serviceTimeString(serviceTime, ServiceType.SELECT)}`} <StopDescription/></div>;
				} else {
					// Assumption that we will not receive a pattern with all times set to NO
					if([serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.lateNights, serviceTime.weekends].some(t => t === ServiceType.YES)){
						hasService = true;
						return <div style={{margin: "5px 0px"}}>{BULLETS[name]()}{` ${serviceTimeString(serviceTime, ServiceType.YES)}`} <StopDescription/></div>
					} else {
						return ""
					}
				}
			})}
			{!hasService && <div style={{margin: "5px 0px"}}>No regular service</div>}
		</>
	);
}

function NextLastStops({serviceTimeStops, select}){
	const {serviceTime, nextStopService, lastStopService} = serviceTimeStops;
	const getStopRep = (service, select) => {
		return (
			<span /*style={{display: "inline-flex", "flexDirection": "column"}}*/>
				{Object.entries(service).map(([stop, time], i, serviceTimes) => (
					<span>
						{ 
							(() => {
								if(select){
									// TODO consolidate this with above?
									// TODO eliminate INDIVIDUAL time strings if equal to track service time?
									return serviceTimes.length > 1 /*&& !serviceTimeEqual(time, serviceTime)*/ ? `${stop} ${serviceTimeString(time, ServiceType.YES)} ${serviceTimeString(time, ServiceType.SELECT)} ` : stop;
								} else {
									return [time.earlyMorning, time.rushHour, time.midday, time.evening, time.lateNights, time.weekends].some(t => t === ServiceType.YES) ? (serviceTimes.length > 1 && !serviceTimeEqual(time, serviceTime) ? `${stop} ${serviceTimeString(time, ServiceType.YES)} ` : stop) : "";
								}
							})()
						}
					</span>
				))}
			</span>
		);
	};
	// TODO figure out how to handle last stop
	return (<span>(Next stop {getStopRep(nextStopService, select)}, Last stop {getStopRep(lastStopService, select)})</span>)
}

function Platform({platform}){
	const {type, accessible, service} = platform;
	const [serviceUp, serviceDown] = {[PlatformService.UP]: [true, false], [PlatformService.DOWN]: [false, true], [PlatformService.BOTH]: [true, true]}[service];

	return (
		<div style={{"box-sizing": "content-box", height: "40px", "background-color": "#BCBCBC", "align-content": "center", "padding-left": "10px", "border-color": "#f7f443", "border-width": `${serviceUp ? "5" : "0"}px 0px ${serviceDown ? "5" : "0"}px 0px`}}>
			{`${type} Platform${accessible ? " (accessible)" : ""}`}
		</div>
	);
}

function serviceTimeString(serviceTime, level){
	const select = level === ServiceType.SELECT;
	if(serviceTime === null){
		return "";
	}
	const {earlyMorning, rushHour, midday, evening, lateNights, weekends} = serviceTime;
	const possibleServiceTimes = {
		"early morning": earlyMorning,
		"rush hour": rushHour,
		"midday": midday,
		"evening": evening,
		"late night": lateNights,
		"weekend": weekends,
	}
	const humanReadableList = (ls) => ls.length === 1 ? ls[0] : `${ls.slice(0, ls.length - 1).join(", ")}${ls.length > 2 ? "," : ""} and ${ls[ls.length - 1]}`;
	const getHumanReadableList = (ff, plural) => humanReadableList(Object.entries(possibleServiceTimes).filter(ff).map(([desc, el]) => `${desc}${plural ? "s" : ""}`));
	const numberOfTimes = Object.values(possibleServiceTimes).filter(el => el === level).length;
	if(numberOfTimes === 6){
		return select ? "Select trips" : "All times";
	} else if(numberOfTimes > 3){
		return `${select ? "Select trips a" : "A"}ll times except ${getHumanReadableList(([desc, el]) => el !== level, true)}`;
	} else if(numberOfTimes > 0){
		return `${select ? "Select " : ""}${getHumanReadableList(([desc, el]) => el === level, !select)}${select ? " trips" : ""}`;
	} else {
		return "";
	}
}

// function showTime(serviceTime, select){
// 	// TODO utilize
// 	return select || [serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.lateNights, serviceTime.weekends].some(t => t === ServiceType.YES);
// }

function TrackAttribute(attribute, name, visible, options, discrete){
	this.attribute = attribute;
	this.name = name;
	this.visible = visible;
	this.options = options;
	// TODO absolutely need to replace this as it's confusing
	const highlightColors = ["#a7a9ac", "#0039a6", "#ff6319", "#6cbe45", "#996633", "#fccc0a", "#ee352e", "#00933c", "#b933ad", "#00add00", "#808183"];
	if(discrete){
		this.colors = this.options.reduce((acc, option, index) => (acc[option] = highlightColors[typeof option === "number" ? option : index], acc), {});
	} else {
		this.colors = this.options.reduce((acc, [option, _], index) => (acc[option] = highlightColors[typeof option === "number" ? option : index], acc), {});
	}
	this.getColor = (value) => {
		if(value === null){
			return {stroke: "#9c9c9c", opacity: "1"};
		} else if(discrete){
			return {stroke: this.colors[value], opacity: "1"};
		} else {
			let index = 0;
			for(const [option, interval] of this.options){
				if(interval.contains(value) || option === value){
					return {stroke: this.colors[option], opacity: "1"};
				}
				index += 1
			}
		}
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