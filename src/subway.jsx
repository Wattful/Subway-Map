import React, {useState} from "react";
import {BrowserRouter, Route, Routes, Link, useSearchParams, useParams} from "react-router-dom";
import {Background} from "./background.jsx";
import {TRACK_SEGMENTS, PLATFORM_SETS, SERVICES, STATIONS, MIN_BOARDINGS} from "./data.jsx";
import {BULLETS} from "./bullets.jsx";
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

// Final TODO: separation between floors, try track description on side

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

const selfPointingTrackAttributeObject = (attribute, name, visible, options) => {return {[attribute]: new TrackAttribute(attribute, name, visible, options)}};
const trackAttributesBase = [
	new TrackAttribute("total_tracks", "Total Tracks", true, [1, 2, 3, 4, 6, 8]),
	new TrackAttribute("used_tracks", "Used Tracks", true, [0, 1, 2, 3, 4, 6, 8]),
	new TrackAttribute("unused_tracks", "Unused Tracks", true, [0, 1, 2]),
	//new TrackAttribute("Date Opened", ["TBD"]), true, TODO
	new TrackAttribute("obf", "Originally Built For", true, Object.values(BuiltFor)),
	new TrackAttribute("type", "Track Type", true, Object.values(PlatformSetType)),
	new TrackAttribute("division", "Division", true, Object.values(Division)),
	new TrackAttribute("signaling", "Signaling Type", true, Object.values(SignalingType)),
	new TrackAttribute("service", "Service", false, [null, ...Object.values(TrackType)]), // TODO hide from menu and implement service highlighting
];
const TRACK_ATTRIBUTES = Object.fromEntries(trackAttributesBase.map(attr => [attr.attribute, attr]));
const TRACK_ATTRIBUTES_NAME_MAP = Object.fromEntries(trackAttributesBase.map(attr => [attr.name, attr]));

const NORTH = 40.9268;
const SOUTH = 40.5399;
const WEST = -74.1026;
const EAST = -73.6930;
const WIDTH = 648;
const HEIGHT = 792;
const coordinatesToPixels = ({lat, lon}) => {return {x: (lon - WEST) * (WIDTH / (EAST - WEST)), y: -(lat - NORTH) * (HEIGHT / (NORTH - SOUTH))}};

function SubwayMap({}){
	const [searchParams, setSearchParams] = useSearchParams();
	const focusType = searchParams.get("ftype");
	const focusValue = searchParams.get("fvalue");
	const attribute = searchParams.get("attribute");
	const select = searchParams.get("select") === "true" || false;
	const scale = searchParams.get("scale") === "true" || false;
	const pattern = searchParams.get("pattern");
	const [psHover, setPsHover] = useState(null);
	const [patternHover, setPatternHover] = useState(null);
	const [highlightValue, setHighlightValue] = useState(null);
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

	const getAttributes = segment => {
		let extraAttributes = {}
		const {id, d, ...attributes} = segment;
		let pat = patternHover === null ? pattern : patternHover;
		if(pat !== null){
			const segmentServiceType = SERVICES[focusValue][pat].route.find(({trackSegment}) => trackSegment === id);
			extraAttributes = {service: segmentServiceType ? segmentServiceType.type : null};
		}
		return {...attributes, ...extraAttributes};
	}

	return (
		<span style={{"display": "flex", "flex": "1 1 auto", position: "relative"}}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				xmlnsXlink="http://www.w3.org/1999/xlink"
				xmlSpace="preserve"
				id="svg2"
				width={WIDTH}
				height={HEIGHT}
				version="1.1"
				style={{"flex": "0 0 auto", "z-index": "0"}}
			>
				<Background />														
				{Object.values(TRACK_SEGMENTS).map(segment => <TrackSegmentSvg id={segment.id} d={segment.d} attributes={getAttributes(segment)} highlight={highlight}/>)}
				{Object.entries(PLATFORM_SETS).toSorted((a, b) => b.boardings - a.boardings).map(([identifier, ps]) => (<PlatformSetDot platformSet={ps} scale={scale} setPsHover={(tr) => setPsHover(tr ? identifier : null)} setFocus={() => setFocus("ps", true)(identifier)}/>))}
			</svg>
			{psHover && (
				<span style={{position: "absolute", left: coordinatesToPixels(PLATFORM_SETS[psHover].coordinates).x, top: coordinatesToPixels(PLATFORM_SETS[psHover].coordinates).y + 8, transform: "translate(-50%, 0)"}}>
					<PlatformSetPreview platformSet={PLATFORM_SETS[psHover]} select={select}/>
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
					{focusType === "service" && <ServiceFocus service={SERVICES[focusValue]} selectedPattern={pattern} setHover={setPatternHover} setSelect={(pat) => updateSearchParams(setSearchParams, "pattern", pat)}/>}
					{focusType === "line" && true}
				</span>
			)}
		</span>
	);
}

function TrackSegmentSvg({id, d, attributes, highlight}){
	console.log(attributes);
	console.log(highlight);
    const stroke = highlight ? highlight.colors[attributes[highlight.attribute]] : "#9c9c9c";
    if(stroke === undefined){
        throw new Error(`Track segment ${id} has no attribute ${highlight.attribute} or highlight has no value ${attributes[highlight.attribute]}`);
    }
    const shadowSize = "0.04px";
    const shadowColor = "#555555";
    const style = (highlight && (highlight.highlightValue === `${attributes[highlight.attribute]}`)) ? {filter: `drop-shadow(-${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} -${shadowSize} ${shadowColor}) drop-shadow(${shadowSize} ${shadowSize} ${shadowColor}) drop-shadow(-${shadowSize} ${shadowSize} ${shadowColor})`} : {}
    return (
        <path
            id={`path${id}`}
            title={id}
            fill="none"
            stroke={stroke}
            //className="psHoverable"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="3.5"
            style={style}
            d={d}
            clipPath="url(#SVGID_548_)"
        ></path>
    )
};

//TODO could change highlight from string to bool
function PlatformSetDot({platformSet, scale, setPsHover, setFocus}){
	const {x, y} = coordinatesToPixels(platformSet.coordinates);
	const baseSize = 1.75;
	const size = scale ? Math.sqrt(STATIONS[platformSet.stationKey].boardings / MIN_BOARDINGS) * baseSize : baseSize;
	return (
		<ellipse onClick={setFocus} onMouseEnter={() => {setPsHover(true)}} onMouseLeave={() => {setPsHover(false)}} style={{fill: "#000000", stroke: "stroke: rgb(0, 0, 0)"}} cx={x} cy={y} rx={size} ry={size} transform="matrix(1, 0, 0, 1, 0, -7.105427357601002e-15)"/>
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

function ServiceFocus({service, selectedPattern, setHover, setSelect}){
	// TODO highlight selected pattern description
	return (
		<>
			{service.map(({name, serviceDescription, route}, index) => (
				<div onMouseEnter={() => {setHover(index)}} onMouseLeave={() => {setHover(null)}} onClick={() => {setSelect(selectedPattern === index ? null : index)}}>
					{name} {serviceDescription}
				</div>
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
	const bullets = new Set();
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
	return (
		<div style={{"background-color": "#000000", "color": "#FFFFFF", "font-family": "Helvetica", "font-weight": "bold", "border-top": "10px solid black", "box-shadow": "inset 0 2px white", "padding": "2px 10px"}}>
			{name}<br/>
			{Array.from(bullets).toSorted().map(bullet => (BULLETS[bullet]()))}
		</div>
	);
}

function PlatformSet({platformSet, select}){
	const {name, type, odt, opened, layout, platformName, lines} = platformSet;
	// Ideas: render background as dark or brown color to represent the ground, render track description (ie "westbound local") to the side, by default show services lined up then expand
	return (
		<>
			{/* TODO add platformName */}
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
	const {type, direction, stops, service} = track;
	let hasService = false;
	return (
		<>
			<div>{direction === InternalDirection.NEXT ? "\u2190 West" : "\u2192 East"}bound{type !== TrackType.NORMAL && ` ${type}`}</div>
			<div style={{height: "24px", margin: "5px 0px", background: "linear-gradient(to bottom, rgb(255 255 255 / 0%), rgb(255 0 153 / 0%) 4px, #E9E9E9 4px, #E9E9E9 8px, rgb(255 255 255 / 0%) 8px, rgb(255 0 153 / 0%) 16px, #E9E9E9 16px, #E9E9E9 20px, rgb(255 255 255 / 0%) 20px, rgb(255 255 255 / 0%) 24px), repeating-linear-gradient(to right, #FFFFFF, #FFFFFF 12px, #c19a6b 12px, #c19a6b 20px)"}}/>
			{Object.entries(service).map(([name, serviceTimeStops], index) => {
				const {serviceTime} = serviceTimeStops;
				const StopDescription = () => stops ? <NextLastStops serviceTimeStops={serviceTimeStops} select={select}/> : " does not stop here"
				// TODO multiple spaces?
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

function Service({service, select}){
	// 1. name, 2. service time description, 3. stations
	return (
		<table>
			<tbody>
				{service.filter(pattern => showTime(pattern.serviceTime, select)).map(pattern => (
					<tr>
						<td>
							{pattern.name}
						</td>
						<td>
							{pattern.serviceDescription}
						</td>
						{pattern.compiledRoute.map(serviceStop => (
							<td>
								{(() => {
									const {stop, trackNext, trackPrevious} = serviceStop;
									const stopsNext = trackNext?.stops;
									const stopsPrevious = trackPrevious?.stops;
									if(!stopsNext && !stopsPrevious){
										return (<i>{stop}</i>);
									} else if(stopsNext && !stopsPrevious){
										return `${stop}\u2191`;
									} else if(!stopsNext && stopsPrevious){
										return `${stop}\u2193`;
									} else {
										return stop;
									}
								})()}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
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
		return `${select ? "Select " : ""}${getHumanReadableList(([desc, el]) => el === level, !select)}${select ? " trips" : ""}`; //TODO capitalize first letter?
	} else {
		return "";
	}
}

function showTime(serviceTime, select){
	// TODO utilize
	return select || [serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.lateNights, serviceTime.weekends].some(t => t === ServiceType.YES);
}

// NOT a react component, an object with two react components
function TrackAttribute(attribute, name, visible, options){
	this.attribute = attribute;
	this.name = name;
	this.visible = visible;
	// TODO absolutely need to replace this as it's confusing
	const highlightColors = ["#a7a9ac", "#0039a6", "#ff6319", "#6cbe45", "#996633", "#fccc0a", "#ee352e", "#00933c", "#b933ad", "#00add00", "#808183"];
	this.colors = options.reduce((acc, option, index) => (acc[option] = highlightColors[typeof option === "number" ? option : index], acc), {});
	// this.Selector = () => (<><span onClick={() => {updateSearchParams(setSearchParams, "highlight", this.name)}}>{this.name}</span><br/></>);
	// this.OptionsWindow = () => (<ul>{this.options.map(opt => (<li>{opt}</li>))}</ul>)
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