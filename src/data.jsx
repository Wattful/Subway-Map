import React from "react";
import {DateTime} from "luxon";
import {
	LineName,
	Service,
	PlatformSetType,
	TrackType,
	PlatformType,
	PlatformService,
	InternalDirection,
	ServiceDirection,
	CardinalDirection,
	Division,
	SignalingType,
	JunctionType,
	BuiltFor,
	ServiceType,
} from "./enums.jsx";
import {
	Track,
	Platform,
	PlatformSet,
	Station,
	ServiceSegment,
	ServiceTime,
	ServiceTimeStops,
	TrackServiceTime,
	accumulateServiceTime,
	ServicePattern,
	ServiceInformation,
	SegmentServiceType,
	ServiceStop,
	Miscellaneous,
	categorySearchFunction,
} from "./objects.jsx";
import {
	EBullet,
	FBullet,
	FdBullet,
	MBullet,
	RBullet,
} from "./bullets.jsx";
import {
	TRACK_SEGMENTS,
	PLATFORM_SET_COORDS,
} from "./tsdata.jsx";

// TODO cases not currently handled:
// 1. Peak-direction/bidirectional service
// 2. Single platform set with multiple lines
// 3. Multiple dots/platform sets for a single station

// Common four-track platform layouts
const fourTrackExpressLayout = (line, accessibleNext, accessiblePrevious) => [[
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Platform(PlatformType.ISLAND, accessibleNext, PlatformService.BOTH),
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, true),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.ISLAND, accessiblePrevious, PlatformService.BOTH),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
]];

const fourTrackLocalLayout = (line, accessibleNext, accessiblePrevious) =>
[[
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.DOWN),
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, false),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];

// Less common four-track platform layouts
const fourTrackLocalSeparatedByTypeLayout = (line, accessibleNext, accessiblePrevious) =>
[[
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.DOWN),
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
], [
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, false),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
]];

// Common two-track platform layouts
const twoTrackIslandLayout = (line, accessible, tracktype=TrackType.LOCAL) => 
[[
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Platform(PlatformType.ISLAND, accessible, PlatformService.BOTH),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
]];

// TODO could consolidate more?
const twoTrackSideLayout = (line, accessibleNext, accessiblePrevious, tracktype=TrackType.LOCAL) => 
[[
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.DOWN),
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];

// Less common two-track platform layouts
const twoTrackSeparatedLayout = (line, accessibleNext, accessiblePrevious) => // TODO this has a few variations
[[
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.UP),

], [
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];

const coordsForID = (id) => PLATFORM_SET_COORDS[id].coords;

const selfPointingPlatformSetObject = (name, disambiguator, type, opened, layout, position) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new PlatformSet(name, type, opened, layout, position)}};

// TODO a general overhaul of how stations are stored
const PLATFORM_SETS = {
	...selfPointingPlatformSetObject("Jamaica-179th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1950, month: 12, day: 10}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(469)),
	...selfPointingPlatformSetObject("169th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(344)),
	...selfPointingPlatformSetObject("Parsons Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(343)),
	...selfPointingPlatformSetObject("Sutphin Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(414)),
	...selfPointingPlatformSetObject("Briarwood", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(410)),
	...selfPointingPlatformSetObject("Kew Gardens-Union Turnpike", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(310)),
	...selfPointingPlatformSetObject("75th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(309)),
	...selfPointingPlatformSetObject("Forest Hills-71st Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(411)),
	...selfPointingPlatformSetObject("67th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(349)),
	...selfPointingPlatformSetObject("63rd Drive-Rego Park", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(348)),
	...selfPointingPlatformSetObject("Woodhaven Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(388)),
	...selfPointingPlatformSetObject("Grand Avenue-Newtown", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(401)),
	...selfPointingPlatformSetObject("Elmhurst Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(402)),
	...selfPointingPlatformSetObject("Jackson Heights-Roosevelt Avenue", null, PlatformSetType.UNDERGROUND,  DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(200)),
	...selfPointingPlatformSetObject("65th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(387)),
	...selfPointingPlatformSetObject("Northern Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalSeparatedByTypeLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(396)),
	...selfPointingPlatformSetObject("46th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), coordsForID(395)),
	...selfPointingPlatformSetObject("Steinway Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), coordsForID(18)),
	...selfPointingPlatformSetObject("36th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(17)),
	...selfPointingPlatformSetObject("Queens Plaza", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(27)),
	...selfPointingPlatformSetObject("Court Square-23rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1939, month: 8, day: 28}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, false), coordsForID(287)),
	...selfPointingPlatformSetObject("Lexington Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackIslandLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true), coordsForID(265)),
	...selfPointingPlatformSetObject("Fifth Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSeparatedLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(264)),
	...selfPointingPlatformSetObject("Seventh Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	], [
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
	]], coordsForID(95)),
	...selfPointingPlatformSetObject("50th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.NEXT, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true, PlatformService.UP),
	], [
		new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		new Miscellaneous("Wall"), //TODO
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true, PlatformService.UP),
	]], coordsForID(94)),
};

const selfPointingStationObjectDefault = (name, boardings, odt) => {return {[name]: new Station(name, [PLATFORM_SETS[name]], boardings, odt)}};
const selfPointingStationObject = (name, disambiguator, platformSets, boardings, odt) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(name, platformSets, boardings, odt)}};

const STATIONS = {
	...selfPointingStationObjectDefault("Jamaica-179th Street", 3944828, null),
	...selfPointingStationObjectDefault("169th Street", 1627817, true),
	...selfPointingStationObjectDefault("Parsons Boulevard", 1584984, true),
	...selfPointingStationObjectDefault("Sutphin Boulevard", 5941974, true),
	...selfPointingStationObjectDefault("Briarwood", 1046884, false),
	...selfPointingStationObjectDefault("Kew Gardens-Union Turnpike", 5016215, true),
	...selfPointingStationObjectDefault("75th Avenue", 683707, false),
	...selfPointingStationObjectDefault("Forest Hills-71st Avenue", 5509732, true),
	...selfPointingStationObjectDefault("67th Avenue", 1658341, true),
	...selfPointingStationObjectDefault("63rd Drive-Rego Park", 3033839, true),
	...selfPointingStationObjectDefault("Woodhaven Boulevard", 4237180, true),
	...selfPointingStationObjectDefault("Grand Avenue-Newtown", 3893242, true),
	...selfPointingStationObjectDefault("Elmhurst Avenue", 2676734, true),
	...selfPointingStationObject("Jackson Heights–Roosevelt Avenue/74th Street", null, [PLATFORM_SETS["Jackson Heights-Roosevelt Avenue"]], 14348691, true),
	...selfPointingStationObjectDefault("65th Street", 729908, true),
	...selfPointingStationObjectDefault("Northern Boulevard", 1400392, false),
	...selfPointingStationObjectDefault("46th Street", 1662115, false),
	...selfPointingStationObjectDefault("Steinway Street", 2730057, true),
	...selfPointingStationObjectDefault("36th Street", 769239, false),
	...selfPointingStationObjectDefault("Queens Plaza", 3645653, true),
	...selfPointingStationObject("Court Square-23rd Street", null, [PLATFORM_SETS["Court Square-23rd Street"]], 5381184, true),
	...selfPointingStationObject("Lexington Avenue/51st Street", null, [PLATFORM_SETS["Lexington Avenue-53rd Street"]], 11339465, true),
	...selfPointingStationObjectDefault("Fifth Avenue-53rd Street", 4733296, true),
	...selfPointingStationObjectDefault("Seventh Avenue", 3892682, true),
	...selfPointingStationObjectDefault("50th Street", 4857531, true),
};

// TODO may need to be optimized
const findBorders = (name) => {
	let start;
	let end;
	const checkBorder = (border) => {
		for(const segmentID of border ?? []){
			const ts = TRACK_SEGMENTS[segmentID];
			if(TRACK_SEGMENTS[segmentID].service_segment === name){
				return;
			}
		}
		if(start === undefined){
			start = (border ?? []).map(segmentID => TRACK_SEGMENTS[segmentID].service_segment);
		} else if(end === undefined){
			end = (border ?? []).map(segmentID => TRACK_SEGMENTS[segmentID].service_segment);
		} else {
			throw new Error(`Service segment ${name} has more than two borders`);
		}
	}
	for(const segment of Object.values(TRACK_SEGMENTS)){
		if(segment.service_segment === name){
			checkBorder(segment.start);
			checkBorder(segment.end);
		}
	}
	if(start === undefined || end === undefined){
		throw new Error(`Service segment ${name} has less than two borders`);
	}
	return [start, end];
}

const selfPointingServiceSegmentObject = (name, platformSets, nextDirection) => {
	const [start, end] = findBorders(name);
	return {[name]: new ServiceSegment(name, platformSets, nextDirection, start, end)}
};

const SERVICE_SEGMENTS = {
	...selfPointingServiceSegmentObject("QB1", [PLATFORM_SETS["Jamaica-179th Street"], PLATFORM_SETS["169th Street"], PLATFORM_SETS["Parsons Boulevard"], PLATFORM_SETS["Sutphin Boulevard"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB2", [PLATFORM_SETS["Briarwood"], PLATFORM_SETS["Kew Gardens-Union Turnpike"], PLATFORM_SETS["75th Avenue"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB3", [PLATFORM_SETS["Forest Hills-71st Avenue"], PLATFORM_SETS["67th Avenue"], PLATFORM_SETS["63rd Drive-Rego Park"], PLATFORM_SETS["Woodhaven Boulevard"], PLATFORM_SETS["Grand Avenue-Newtown"], PLATFORM_SETS["Elmhurst Avenue"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB4", [PLATFORM_SETS["Jackson Heights-Roosevelt Avenue"], PLATFORM_SETS["65th Street"], PLATFORM_SETS["Northern Boulevard"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB5L", [PLATFORM_SETS["46th Street"], PLATFORM_SETS["Steinway Street"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB5E", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB6", [PLATFORM_SETS["36th Street"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QBAS1", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QBAS2", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QBAS3", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB7", [PLATFORM_SETS["Queens Plaza"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB8", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB9", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB10", [PLATFORM_SETS["Court Square-23rd Street"], PLATFORM_SETS["Lexington Avenue-53rd Street"], PLATFORM_SETS["Fifth Avenue-53rd Street"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB11", [], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB12", [PLATFORM_SETS["Seventh Avenue"]], CardinalDirection.SOUTH),
	...selfPointingServiceSegmentObject("QB13", [PLATFORM_SETS["50th Street"]], CardinalDirection.SOUTH),
};

const segmentsWithType = (segments, type) => segments.map(s => new SegmentServiceType(s, type))

const SERVICES = {
	[Service.E]: [
		new ServiceInformation(Service.E, "Eighth Avenue Local", [
			// Full express
			new ServicePattern("Weekdays 7 AM to 7 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
				...segmentsWithType(["QB2", "QB3", "QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL),
			], []),
			// Express after forest hills
			new ServicePattern("Weekends all day, Weekdays 6 - 7 AM and 7 - 9:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithType(["QB2"], TrackType.LOCAL),
				...segmentsWithType(["QB3", "QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL),
			], []),
			// Full local
			// TODO need to describe late night service better
			new ServicePattern("10 PM - 5 AM (6 AM Weekends)", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithType(["QB2", "QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2"], TrackType.LOCAL),
				...segmentsWithType(["QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL),
			], []),
			new ServicePattern("10 PM - 5 AM (6 AM Weekends)", ServiceDirection.SOUTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithType(["QB2", "QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7"], TrackType.LOCAL),
				...segmentsWithType(["QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL),
			], []),


			// Select service - Express after Roosevelt av
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithType(["QB2", "QB3"], TrackType.LOCAL),
				...segmentsWithType(["QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL),
			], []),
		]),
	],

	[Service.F]: [
		new ServiceInformation(Service.F, "Queens Boulevard Express/Sixth Avenue Local", [
			new ServicePattern("Weekdays 5 AM - 10:30 PM, Saturdays 6 AM - 9 PM, Sundays 7 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithType(["QB1", "QB2"], TrackType.LOCAL),
				...segmentsWithType(["QB3", "QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS),
			], []),
			// TODO need to describe late night service better
			new ServicePattern("Weekdays 10:30 PM - 5 AM, Saturdays 6 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithType(["QB1", "QB2", "QB3", "QB4", "QB5E", "QB6", "QBAS1"], TrackType.LOCAL),
			], []),

			// Select service - Express after Roosevelt av
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithType(["QB1", "QB2", "QB3"], TrackType.LOCAL),
				...segmentsWithType(["QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS),
			], []),
		]),

		new ServiceInformation(Service.Fd, "Queens Boulevard Express/Sixth Avenue Local", [// F express train
			new ServicePattern("Rush hours, two trains in each direction", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
				...segmentsWithType(["QB1", "QB2"], TrackType.LOCAL),
				...segmentsWithType(["QB3", "QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS),
			], []),
		]),
	],

	[Service.R]: [
		new ServiceInformation(Service.R, "Broadway Local", [
			new ServicePattern("Everyday 6 AM - 10:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithType(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8"], TrackType.LOCAL),
			], []),

			new ServicePattern("Queens-bound trips 10 PM - Midnight", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithType(["QB7", "QB8"], TrackType.LOCAL),
			], []),
		]),
	],

	[Service.M]: [
		new ServiceInformation(Service.M, "Queens Boulevard Local/Sixth Avenue Local", [
			new ServicePattern("Weekdays 6 AM - 9:30 PM", ServiceDirection.NORTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
				...segmentsWithType(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2"], TrackType.LOCAL),
				...segmentsWithType(["QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10"], TrackType.LOCAL),
			], []),

			new ServicePattern("Weekdays 6 AM - 9:30 PM", ServiceDirection.SOUTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
				...segmentsWithType(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7"], TrackType.LOCAL),
				...segmentsWithType(["QB8", "QB9"], TrackType.EXPRESS),
				...segmentsWithType(["QB10"], TrackType.LOCAL),
			], []),
		]),
	],
};

const accumulateTrackServiceTime = (track, service, nextStop, lastStop, time) => {
	if(track === undefined){
		return;
	}
	if(track.service[service] === undefined){
		track.service[service] = new ServiceTimeStops({[nextStop]: time}, {[lastStop]: time});
	} else {
		const {nextStopService, lastStopService} = track.service[service];
		nextStopService[nextStop] = nextStopService[nextStop] === undefined ? time : accumulateServiceTime([nextStopService[nextStop], time]);
		lastStopService[lastStop] = lastStopService[lastStop] === undefined ? time : accumulateServiceTime([lastStopService[lastStop], time]);
	}
}

// Filling in and verification functions
// Filling in: Fill platform sets with service times, fill servicepattern with stations stopped at/skipped
// Verification: Do service patterns make sense with respect to lines and junctions
// TODO reduced platform set names (iterate through stations)
for(const parentService in SERVICES){
	for(const serviceInformation of SERVICES[parentService]){
		const {service, servicePatterns} = serviceInformation;
		for(const pattern of servicePatterns){
			const compiledRoute = []; // Array of ServiceStop objects, list of all stations passed through and whether route stops
			let index = null;
			let prevSegment = null;
			let prevMap = null;
			for(let i = 0; i < pattern.route.length; i++){
				const serviceSegment = SERVICE_SEGMENTS[pattern.route[i].serviceSegment];
				const {type} = pattern.route[i];
				// TODO the concept of "internal direction" is not used correctly here. This will not work with wrong-way concurrencies.
				let internalDirection; // Internal direction that corresponds to rail north
				// TODO could eliminate code duplication
				if(i !== 0){
					const {serviceSegment: lastServiceSegment} = pattern.route[i - 1];
					if(serviceSegment.start.includes(lastServiceSegment)){
						internalDirection = InternalDirection.PREVIOUS;
					} else if(serviceSegment.end.includes(lastServiceSegment)){
						internalDirection = InternalDirection.NEXT;
					} else {
						throw new Error(`${pattern.route[i].serviceSegment} has no connection to ${lastServiceSegment}`);
					}
				}
				if(i !== pattern.route.length - 1){
					const {serviceSegment: nextServiceSegment} = pattern.route[i + 1];
					if(serviceSegment.start.includes(nextServiceSegment)){
						if(internalDirection === InternalDirection.PREVIOUS){
							throw new Error(`${serviceSegment} contradictory direction going to ${nextServiceSegment}`);
						}
						internalDirection = InternalDirection.NEXT;
					} else if(serviceSegment.end.includes(nextServiceSegment)){
						if(internalDirection === InternalDirection.NEXT){
							throw new Error(`${serviceSegment} contradictory direction going to ${nextServiceSegment}`);
						}
						internalDirection = InternalDirection.PREVIOUS;
					} else {
						throw new Error(`${pattern.route[i].serviceSegment} has no connection to ${nextServiceSegment}`);
					}
				}
				let ignoreDirection = null;
				if(pattern.serviceDirection === ServiceDirection.NORTH){
					ignoreDirection = internalDirection === InternalDirection.NEXT ? InternalDirection.PREVIOUS : InternalDirection.NEXT;
				} else if(pattern.serviceDirection === ServiceDirection.SOUTH){
					ignoreDirection = internalDirection;
				}
				for(const platformSet of serviceSegment.platformSets){
					let trackNext;
					let trackPrevious;
					for(const floor of platformSet.layout){
						for(const track of floor){
							// TODO direction doesn't work
							if(track.direction === InternalDirection.NEXT && ignoreDirection !== InternalDirection.NEXT && track.type === type){
								trackNext = track; // TODO incorporate skips
								// To differentiate on next/last stop: do this later?
								//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
							}
							if(track.direction === InternalDirection.PREVIOUS && ignoreDirection !== InternalDirection.PREVIOUS && track.type === type){
								trackPrevious = track;
								//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
							}
						}
					}
					if((trackNext === undefined && ignoreDirection !== InternalDirection.NEXT) || (trackPrevious === undefined && ignoreDirection !== InternalDirection.PREVIOUS)){
						throw new Error(`Track of type ${type} not found in ${platformSet.name}`);
					}
					compiledRoute.push(new ServiceStop(platformSet.name, trackNext, trackPrevious));
				}
			}
			pattern.compiledRoute = compiledRoute;
			const lastStopNext = compiledRoute[compiledRoute.length - 1].stop;
			const lastStopPrevious = compiledRoute[0].stop;
			for(let i = 0; i < compiledRoute.length; i++){
				const {trackNext, trackPrevious} = compiledRoute[i];
				const nextStopNext = compiledRoute.find((el, index) => el.trackNext?.stops === true && index > i)?.stop ?? "\"\"";
				const nextStopPrevious = compiledRoute.toReversed().find((el, index) => el.trackPrevious?.stops === true && index >= (compiledRoute.length - i))?.stop ?? "\"\"";
				accumulateTrackServiceTime(trackNext, service, nextStopNext, lastStopNext, pattern.serviceTime);
				accumulateTrackServiceTime(trackPrevious, service, nextStopPrevious, lastStopPrevious, pattern.serviceTime);
			}
		}
	}
	
}

for(const platformSet of Object.values(PLATFORM_SETS)){
	for(const floor of platformSet.layout){
		for(const track of floor){
			if(track.category !== "Track"){
				continue;
			}
			for(const service of Object.keys(track.service)){
				// TODO assert same as result of last stop function?
				track.service[service].serviceTime = accumulateServiceTime(Object.values(track.service[service].nextStopService));
			}
		}
	}
}

// Assign track compass directions
const oppositeDirections = {"North" : "South", "South": "North", "East": "West", "West": "East"};
for(const serviceSegment of Object.values(SERVICE_SEGMENTS)){
	const {platformSets, nextDirection} = serviceSegment;
	for(const platformSet of platformSets){
		for(const floor of platformSet.layout){
			for(const track of floor){
				if(track.category !== "Track"){
					continue;
				}
				// TODO when implementing multi-line sets: add an if statement here for line
				// TODO bidirectional tracks
				if(track.direction === InternalDirection.NEXT){
					track.compassDirection = nextDirection;
				} else {
					track.compassDirection = oppositeDirections[nextDirection];
				}
				
			}
		}
	}
}

// TODO fails in a tie, although that case is unlikely
Object.entries(STATIONS).toSorted(([_, a], [__, b]) => b.boardings - a.boardings).forEach(([stationKey, station], index) => {
	station.rank = index + 1;
	station.platformSets.forEach(platformSet => {platformSet.stationKey = stationKey});
});
const MIN_BOARDINGS = Math.min(...Object.values(STATIONS).map(({boardings}) => boardings));
Object.values(SERVICE_SEGMENTS).forEach(({line, platformSets}) => {platformSets.forEach(platformSet => {platformSet.lines.push(line)})})

export {TRACK_SEGMENTS, PLATFORM_SETS, SERVICES, STATIONS, MIN_BOARDINGS}