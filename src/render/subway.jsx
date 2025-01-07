import React, {useState} from "react";
import {BrowserRouter, Route, Routes, Link, useSearchParams, useParams} from "react-router-dom";
import {LINES, PLATFORM_SETS, SERVICES, STATIONS} from "../data/data.jsx";
import {
	ServiceType,
	LineName,
	PlatformSetType,
	TrackType,
	PlatformType,
	InternalDirection,
	ServiceDirection,
	Division,
	SignalingType,
	JunctionType,
	BuiltFor
} from "../data/enums.jsx";
import {serviceTimeEqual} from "../data/objects.jsx";

function Subway({}){
	return (
		<BrowserRouter basename="subway">
			<Routes>
				<Route path="/*" element={<SubwayFocusExample />} />
				<Route path="/" element={<SubwayFocusExample />} />
			</Routes>
		</BrowserRouter>
	);
}

function SubwayFocusExample({}){
	const [searchParams, setSearchParams] = useSearchParams();
	const platformSet = searchParams.get("ps");
	const service = searchParams.get("service");
	const highlight = searchParams.get("highlight");
	const select = searchParams.get("select") === "true" || false;

	const selfPointingTrackAttributeObject = (name, options) => {return {[name]: new TrackAttribute(name, platformSet, options, setSearchParams)}};
	const trackAttributes = {
		...selfPointingTrackAttributeObject("Total Tracks", [1, 2, 3, 4, 6, 8]),
		...selfPointingTrackAttributeObject("Used Tracks", [0, 1, 2, 3, 4, 6, 8]),
		...selfPointingTrackAttributeObject("Unused Tracks", [0, 1, 2]),
		...selfPointingTrackAttributeObject("Date Opened", ["TBD"]),
		...selfPointingTrackAttributeObject("Originally Built For", Object.values(BuiltFor)),
		...selfPointingTrackAttributeObject("Track Type", Object.values(PlatformSetType)),
		...selfPointingTrackAttributeObject("Division", Object.values(Division)),
		...selfPointingTrackAttributeObject("Signaling Type", Object.values(SignalingType)),
	}

	// Track attributes: division, obf, opened, type, used tracks, unused tracks, total tracks, signaling
	return (
		<>
			<span onClick={() => {updateSearchParams(setSearchParams, "select", !select)}}>Show select: {select.toString()}</span><br/>
			{highlight && 
				(<>
					<strong>Highlighted attribute: {highlight}</strong><br/>
					Possible values:<br/>
					{(() => {
						const ta = trackAttributes[highlight]; 
						return <ta.OptionsWindow/> //lmao, should replace
					})()}
				</>)
			}
			<br/>
			Highlight track:<br/>
			<ul>
			{Object.values(trackAttributes).map(attribute => (<li><attribute.Selector/></li>))}
			</ul>
			<br/>
			{platformSet && (<Station station={STATIONS[platformSet]} select={select}/>)}
			<br/>
			{service && (<Service service={SERVICES[service]} select={select}/>)}
			Stations:<br/>
			<ul>
			{Object.keys(STATIONS).map(lineName => (<li><span onClick={() => {updateSearchParams(setSearchParams, "ps", lineName)}}>{lineName}</span></li>))}
			</ul>
		</>
	);
}

function Station({station, select}){
	const {name, platformSets, boardings, rank} = station;
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
	return (
		<>
			<strong>{name}</strong><br/>
			{boardings} boardings, {ordinal(rank)} of {Object.values(STATIONS).length}<br/>
			{platformSets.map((platformSet => <PlatformSet platformSet={platformSet} select={select}/>))}<br/>
		</>
	);
}

function PlatformSet({platformSet, select}){
	const {name, type, odt, layout, platformName} = platformSet;
	return (
		<>
			{/* TODO add platformName */}
			{layout.map(floor => (
				<>
					{layout.length > 1 && (<>Floor <br/></>) /*TODO label floor*/}
					{floor.map(element => (
						<>
							{element.category === "Track" && <Track track={element} select={select}/>}
							{element.category === "Platform" && <Platform platform={element}/>}
							{element.category === "Misc" && element.description}<br/>
						</>
					))}
				</>
			))}
		</>
	);
}

function Track({track, select}){
	const {type, direction, stops, service} = track;
	return (
		<>
			{direction}bound{type !== TrackType.NORMAL && ` ${type}`}<br/>
			{Object.entries(service).map(([name, serviceTimeStops]) => {
				const {serviceTime} = serviceTimeStops;
				// TODO multiple spaces?
				if(select){
					return <>{`${name} ${serviceTimeString(serviceTime, ServiceType.YES)} ${serviceTimeString(serviceTime, ServiceType.SELECT)}`} <NextLastStops serviceTimeStops={serviceTimeStops} select={select}/><br/></>;
				} else {
					// Assumption that we will not receive a pattern with all times set to NO
					return [serviceTime.earlyMorning, serviceTime.rushHour, serviceTime.midday, serviceTime.evening, serviceTime.lateNights, serviceTime.weekends].some(t => t === ServiceType.YES) ? <>{`${name} ${serviceTimeString(serviceTime, ServiceType.YES)}`} <NextLastStops serviceTimeStops={serviceTimeStops} select={select}/><br/></> : "";
				}
			})}{!stops && " does not stop here"}<br/>
		</>
	);
}

function NextLastStops({serviceTimeStops, select}){
	const {serviceTime, nextStopService, lastStopService} = serviceTimeStops;
	const getStopString = (service, select) => {
		return Object.entries(service).map(([stop, time], i, serviceTimes) => {
			if(select){
				// TODO consolidate this with above?
				// TODO eliminate INDIVIDUAL time strings if equal to track service time?
				return serviceTimes.length > 1 && !serviceTimeEqual(time, serviceTime) ? `${stop} ${serviceTimeString(time, ServiceType.YES)} ${serviceTimeString(time, ServiceType.SELECT)} ` : stop;
			} else {
				return [time.earlyMorning, time.rushHour, time.midday, time.evening, time.lateNights, time.weekends].some(t => t === ServiceType.YES) ? (serviceTimes.length > 1 && !serviceTimeEqual(time, serviceTime) ? `${stop} ${serviceTimeString(time, ServiceType.YES)} ` : stop) : "";
			}
		});
	};
	// TODO figure out how to handle last stop
	return `Next stop ${getStopString(nextStopService, select)}, Last stop ${getStopString(lastStopService, select)}`
}

function Platform({platform}){
	const {type, accessible} = platform;
	return (<>{`${type} Platform${accessible ? " (accessible)" : ""}`}<br/></>);
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
									} else if(stopsNext && !stopsPrevious){
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
function TrackAttribute(name, focus, options, setSearchParams){
	this.name = name;
	this.focus = focus;
	this.options = options;
	this.Selector = () => (<><span onClick={() => {updateSearchParams(setSearchParams, "highlight", this.name)}}>{this.name}</span><br/></>);
	this.OptionsWindow = () => (<ul>{this.options.map(opt => (<li>{opt}</li>))}</ul>)
}

function updateSearchParams(setSearchParams, key, value){
	setSearchParams((prev) => {
		prev.set(key, value);
		return prev;
	})
}

export {Subway}