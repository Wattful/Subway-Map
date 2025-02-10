import React from "react";
import {
	LineName,
	Service,
	PlatformSetType,
	TrackType,
	PlatformType,
	InternalDirection,
	ServiceDirection,
	Division,
	SignalingType,
	JunctionType,
	ServiceType,
} from "./enums.jsx";

function Track(line, type, direction, stops){
	this.category = "Track";
	this.line = line;
	this.type = type;
	this.direction = direction;
	if(typeof stops !== "boolean"){
		throw new Error(`"${stops}" is not a boolean`);
	}
	this.stops = stops;
	this.service = {}; // Map from service to servicetime
}

function Platform(type, accessible, service){
	this.category = "Platform";
	this.type = type;
	if(typeof accessible !== "boolean"){
		throw new Error(`"${stops}" is not a boolean`);
	}
	this.accessible = accessible;
	this.service = service;
}

function PlatformSet(name, type, opened, layout, coordinates){
	this.category = "PlatformSet";
	this.name = name;
	this.type = type;
	// if(!(opened instanceof Date)){ // TODO ???
	// 	throw new Error(`"${opened}" is not a date`)
	// }
	this.opened = opened;
	// TODO verification function?
	this.layout = layout;
	this.coordinates = coordinates;
	this.lines = [];
	this.platformName = null;
	this.stationKey = null;
}

function Line(name, trackSegments){
	this.name = name;
	this.trackSegments = trackSegments; 
}

function Station(name, platformSets, boardings, odt){
	this.name = name;
	this.platformSets = platformSets;
	this.boardings = boardings;
	this.odt = odt;
	this.rank = null;
}

function TrackSegment(id, line, platformSets, division, type, signaling, obf, opened, used_tracks, unused_tracks, start, end, d){
	this.id = id;
	this.line = line;
	this.platformSets = platformSets;
	this.division = division;
	this.type = type;
	this.signaling = signaling;
	this.obf = obf;
	this.opened = opened;
	this.used_tracks = used_tracks;
	this.unused_tracks = unused_tracks;
	this.total_tracks = used_tracks + unused_tracks;
	this.start = start;
	this.end = end;
	this.d = d;
}

// TODO need to figure this out
function Junction(line1, line2, type, line1tracks, line2tracks){
	this.category = "Junction";
	// tracks = "ALL" or TrackType
	this.line1 = line1;
	this.line2 = line2;
	this.type = type;
	this.line1tracks = line1tracks;
	this.line2tracks = line2tracks;
}

function ServiceTime(earlyMorning, rushHour, midday, evening, lateNights, weekends){
	this.earlyMorning = earlyMorning;
	this.rushHour = rushHour;
	this.midday = midday;
	this.evening = evening;
	this.lateNights = lateNights;
	this.weekends = weekends;
}

function serviceTimeEqual(service1, service2){
	const s2 = [service2.earlyMorning, service2.rushHour, service2.midday, service2.evening, service2.lateNights, service2.weekends];
	return [service1.earlyMorning, service1.rushHour, service1.midday, service1.evening, service1.lateNights, service1.weekends].every((e, i) => e === s2[i]);
}

function ServiceTimeStops(nextStopService, lastStopService){
	this.nextStopService = nextStopService;
	this.lastStopService = lastStopService;
	// TODO could do a "protected function"? or this could be completely separated
	this.serviceTime = null;
}

// function ServiceServiceTimes(serviceTimeStops){
// 	this.serviceTimeStops = serviceTimeStops;
// 	this.serviceTime = accumulateServiceTime(serviceTimeStops.map(sts => sts.serviceTime));
// }

const accumulateServiceTime = (patterns) => patterns.reduce((base, next) => (next === null ? base : new ServiceTime(Math.max(base.earlyMorning, next.earlyMorning), Math.max(base.rushHour, next.rushHour), Math.max(base.midday, next.midday), Math.max(base.evening, next.evening), Math.max(base.lateNights, next.lateNights), Math.max(base.weekends, next.weekends))), new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO));

function ServicePattern(name, serviceDescription, serviceDirection, serviceTime, route, skips){
	this.name = name;
	this.serviceDescription = serviceDescription;
	this.serviceDirection = serviceDirection;
	this.serviceTime = serviceTime;
	this.route = route;
	this.skips = skips;
	this.compiledRoute = null;
}

// function ServiceSlice(line, from, to, type, skips, internalDirection=InternalDirection.BOTH){
// 	this.line = line;
// 	this.from = from; // TODO assert member?
// 	this.to = to;
// 	this.type = type;
// 	this.skips = skips;
// 	this.internalDirection = internalDirection; // Even for patterns that run only in one direction this is only needed for slices that pass through <= 1 stations and their counterparts if any
// }

// function ServiceSlice(trackSegments, type, skips, internalDirection=InternalDirection.BOTH){
// 	this.trackSegments = trackSegments;
// 	this.type = type;
// 	this.skips = skips;
// 	this.internalDirection = internalDirection; // Even for patterns that run only in one direction this is only needed for slices that pass through <= 1 stations and their counterparts if any
// }

function SegmentServiceType(trackSegment, type){
	this.trackSegment = trackSegment;
	this.type = type;
}

function ServiceStop(stop, trackNext, trackPrevious){
	this.stop = stop; //Platform set name
	this.trackNext = trackNext;
	this.trackPrevious = trackPrevious;
}

function Miscellaneous(description){
	this.category = "Misc";
	this.description = description;
}

function categorySearchFunction(start, category){
	return (element, index) => index > start && element.category === category;
}

export {
	Track,
	Platform,
	PlatformSet,
	Line,
	Station,
	TrackSegment,
	Junction,
	ServiceTime,
	serviceTimeEqual,
	ServiceTimeStops,
	accumulateServiceTime,
	ServicePattern,
	SegmentServiceType,
	ServiceStop,
	Miscellaneous,
	categorySearchFunction,
}