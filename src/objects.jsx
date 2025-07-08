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
	this.compassDirection = null;
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
	this.category = "PlatformSet"; // TODO is this necessary?
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

function Station(name, platformSets, boardings, odt){
	this.name = name;
	this.platformSets = platformSets;
	this.boardings = boardings;
	this.odt = odt;
	this.rank = null;
}

function ServiceSegment(name, platformSets, nextDirection, start, end){
	this.name = name;
	this.platformSets = platformSets;
	this.nextDirection = nextDirection;
	this.start = start;
	this.end = end;
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

const accumulateServiceTime = (patterns) => patterns.reduce((base, next) => (next === null ? base : new ServiceTime(Math.max(base.earlyMorning, next.earlyMorning), Math.max(base.rushHour, next.rushHour), Math.max(base.midday, next.midday), Math.max(base.evening, next.evening), Math.max(base.lateNights, next.lateNights), Math.max(base.weekends, next.weekends))), new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO));

function ServicePattern(serviceDescription, serviceDirection, serviceTime, route, skips){
	this.serviceDescription = serviceDescription;
	this.serviceDirection = serviceDirection;
	this.serviceTime = serviceTime;
	this.route = route;
	this.skips = skips;
	this.compiledRoute = null;
}

function ServiceInformation(service, subtitle, servicePatterns){
	this.service = service;
	this.subtitle = subtitle;
	this.servicePatterns = servicePatterns;
}

function SegmentServiceType(serviceSegment, type){
	this.serviceSegment = serviceSegment;
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
	Station,
	ServiceSegment,
	ServiceTime,
	serviceTimeEqual,
	ServiceTimeStops,
	accumulateServiceTime,
	ServicePattern,
	ServiceInformation,
	SegmentServiceType,
	ServiceStop,
	Miscellaneous,
	categorySearchFunction,
}