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
	Tab,
	Label,
	ServiceSegment,
	ServiceTime,
	ServiceTimeStops,
	TrackServiceTime,
	accumulateServiceTime,
	ServicePattern,
	ServiceInformation,
	SegmentServiceLabel,
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
// 2. Single platform set with multiple lines - only need change to subway.jsx
// 3. Multiple dots/platform sets for a single station - only need change to subway.jsx
// 4. Termination track types

// Cases needed:
// Peak direction express (Jamaica line)
// Skip stops (Jamaica line)
// Bidirectional service (Franklin avenue line)
// Multi platform set stations (Jamaica + Lexington Avenue lines)
// "Sandwich" layout (Broadway + Lexington Avenue lines)

// Questions to figure out:
// How to have multiple "headers"? (ie sandwich case)
// Should it be all in one or tabs?
// Multiple dots connected with lines?

// Need the ability to have multiple dots and a single tab?

/*
THE ALL ENCOMPASSING STATION AND TRACK DATA PLAN
What we need:
Separate tabs for completely separate platform sets
Ability to label each individual floor

Completely separate the dot from the layout - need to figure out how to assign services to tracks

- Each entry in PLATFORM_SETS represents a dot on the map.
- Each entry in STATIONS represents a tab on the right of the screen. Stations owns the platform layout data. 
	Thus, service segments pass through stations. Tracks are labeled with line and an additional disambiguator label if necessary.
- Idea - for multi-platform set stations draw a "main dot" in the mean of each dot's position, the "main dot" will be scaled.
- The "minor" dots will show only which services pass through that platform set. Platform sets must have a reference to their station and also a list of lines for this purpose.
- Create a "label" platform layout element which will render label data
- Group platform layouts into "tabs" - always group into tabs unless platform sets are aligned (they are the same station and parallel) or the sandwich case exists.

Precise details of the above plan:
- Tracks must know which platform set they are in (and/or vice versa)
- Most platform sets will follow a common case. Have a default constructor which associates platform sets with tabs. 
- Tab objects will have a "default" attribute, if not specified must manually include label and/or sign objects.

Peak direction express and wrong way concurrencies:
- Segment service label will have line name, track label, and next direction - Done
- Next defaults to south. When specifying a service path, can override this and make next correspond to north. - Done
- Peak direction express/bidirectional track will be labeled as InternalDirection.BOTH. Peak direction service must be encoded as two separate patterns. - Done (need to test)
*/

// Common four-track platform layouts
const fourTrackExpressLayout = (line, accessibleNext, accessiblePrevious) => 
[[
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

// Common three-track platform layouts
const threeTrackExpressLayout = (line, accessibleNext, accessiblePrevious) => 
[[
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.BOTH),
	new Track(line, TrackType.PEAK_DIRECTION_EXPRESS, InternalDirection.BOTH, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.BOTH),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
]];


const threeTrackLocalLayout = (line, accessibleNext, accessiblePrevious) => 
[[
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.DOWN),
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Track(line, TrackType.PEAK_DIRECTION_EXPRESS, InternalDirection.BOTH, false),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];

const coordsForID = (id) => PLATFORM_SET_COORDS[id].coords;

const selfPointingPlatformSetObject = (name, disambiguator, type, opened, layout, position) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new PlatformSet(name, type, opened, layout, position)}};

const PLATFORM_SETS = {
	...selfPointingPlatformSetObject("Jackson Heights-Roosevelt Avenue", null, PlatformSetType.UNDERGROUND,  DateTime.fromObject({year: 1933, month: 8, day: 19}), coordsForID(200)),
	...selfPointingPlatformSetObject("74th Street-Broadway", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1917, month: 4, day: 21}), coordsForID(386)),
	...selfPointingPlatformSetObject("Court Square-23rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1939, month: 8, day: 28}), coordsForID(287)),
	...selfPointingPlatformSetObject("Court Square", LineName.IND_CROSSTOWN_LINE, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), coordsForID(288)),
	...selfPointingPlatformSetObject("Court Square", LineName.IRT_FLUSHING_LINE, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1916, month: 11, day: 5}), coordsForID(262)),
	...selfPointingPlatformSetObject("Lexington Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), coordsForID(265)),
	...selfPointingPlatformSetObject("51st Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 7, day: 17}), coordsForID(277)),
};

const assignTracksToPlatformSet = (ps, layout) => {
	ps.tracks = layout.flat().filter(el => el.category === "Track");
	ps.lines = [...new Set(ps.tracks.map(track => track.line))];
}

const selfPointingStationObjectDefault = (name, disambiguator, type, opened, layout, position, boardings, odt) => {
	const ps = new PlatformSet(name, type, opened, position);
	assignTracksToPlatformSet(ps, layout);
	PLATFORM_SETS[name + (disambiguator ? ` ${disambiguator}` : "")] = ps;
	return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(name, [new Tab(layout, name)], [ps], boardings, odt)};
};

const selfPointingMultiTabStationObjectDefault = (name, disambiguator, platformSetsLayouts, boardings, odt) => {
	Object.entries(platformSetsLayouts).forEach(([psName, layout]) => assignTracksToPlatformSet(PLATFORM_SETS[psName], layout));
	const psLayArray = Object.entries(platformSetsLayouts);
	psLayArray.forEach(([psName, layout], index) => {PLATFORM_SETS[psName].tab = index});
	return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(
		name,
		psLayArray.map(([psName, layout]) => new Tab(layout, psName)), 
		psLayArray.map(([psName, layout]) => PLATFORM_SETS[psName]), 
		boardings,
		odt,
	)};
};

// Used if we need to turn off normal tab layout
const selfPointingStationObject = (name, disambiguator, type, opened, tab, position, boardings, odt) => {
	const ps = new PlatformSet(name, type, opened, position);
	assignTracksToPlatformSet(ps, tab.layout);
	PLATFORM_SETS[name + (disambiguator ? ` ${disambiguator}` : "")] = ps;
	return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(name, [tab], [ps], boardings, odt)};
};

const selfPointingMultiTabStationObject = (name, disambiguator, platformSetsTabs, boardings, odt) => {
	platformSetsTabs.forEach(([psName, tab]) => assignTracksToPlatformSet(PLATFORM_SETS[psName], tab.layout));
	platformSetsTabs.forEach(([psName, layout], index) => {PLATFORM_SETS[psName].tab = index});
	return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(
		name,
		Object.values(platformSetsTabs),
		Object.keys(platformSetsTabs).map(psName => PLATFORM_SETS[psName]),
		boardings,
		odt,
	)};
};

const STATIONS = {
	...selfPointingStationObjectDefault("Jamaica-179th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1950, month: 12, day: 10}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(469), 3944828, null),
	...selfPointingStationObjectDefault("169th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(344), 1627817, true),
	...selfPointingStationObjectDefault("Parsons Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(343), 1584984, true),
	...selfPointingStationObjectDefault("Sutphin Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(414), 5941974, true),
	...selfPointingStationObjectDefault("Briarwood", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(410), 1046884, false),
	...selfPointingStationObjectDefault("Kew Gardens-Union Turnpike", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(310), 5016215, true),
	...selfPointingStationObjectDefault("75th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(309), 683707, false),
	...selfPointingStationObjectDefault("Forest Hills-71st Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(411), 5509732, true),
	...selfPointingStationObjectDefault("67th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(349), 1658341, true),
	...selfPointingStationObjectDefault("63rd Drive-Rego Park", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(348), 3033839, true),
	...selfPointingStationObjectDefault("Woodhaven Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(388), 4237180, true),
	...selfPointingStationObjectDefault("Grand Avenue-Newtown", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(401), 3893242, true),
	...selfPointingMultiTabStationObjectDefault("Jackson Heights–Roosevelt Avenue/74th Street", null, {
			"74th Street-Broadway": threeTrackLocalLayout(LineName.IRT_FLUSHING_LINE, true, true),
			"Jackson Heights-Roosevelt Avenue": fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true),
		}, 14348691, true
	),
	...selfPointingStationObjectDefault("Elmhurst Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(402), 2676734, true),
	...selfPointingStationObjectDefault("65th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(387), 729908, true),
	...selfPointingStationObjectDefault("Northern Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalSeparatedByTypeLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(396), 1400392, false),
	...selfPointingStationObjectDefault("46th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), coordsForID(395), 1662115, false),
	...selfPointingStationObjectDefault("Steinway Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), coordsForID(18), 2730057, true),
	...selfPointingStationObjectDefault("36th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(17), 769239, false),
	...selfPointingStationObjectDefault("Queens Plaza", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), coordsForID(27), 3645653, true),
	...selfPointingMultiTabStationObjectDefault("Court Square-23rd Street", null, {
			[`Court Square ${LineName.IRT_FLUSHING_LINE}`]: twoTrackSideLayout(LineName.IRT_FLUSHING_LINE, true, true),
			"Court Square-23rd Street": twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, false),
			[`Court Square ${LineName.IND_CROSSTOWN_LINE}`]: twoTrackIslandLayout(LineName.IND_CROSSTOWN_LINE, true),
		}, 5381184, true
	),
	...selfPointingMultiTabStationObjectDefault("Lexington Avenue/51st Street", null, {
			"51st Street": fourTrackLocalSeparatedByTypeLayout(LineName.IRT_LEXINGTON_AVENUE_LINE, true, true),
			"Lexington Avenue-53rd Street": twoTrackIslandLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false),
		}, 11339465, true
	),
	...selfPointingStationObjectDefault("Fifth Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSeparatedLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), coordsForID(264), 4733296, true),
	...selfPointingStationObjectDefault("Seventh Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
			new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
			new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
			new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		], [
			new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
			new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
			new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		]], coordsForID(95), 3892682, true

	),
	...selfPointingStationObject("50th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1932, month: 9, day: 10}), new Tab([[
			new Label({label: LineName.IND_EIGHTH_AVENUE_LINE, type: PlatformSetType.UNDERGROUND, opened: DateTime.fromObject({year: 1932, month: 9, day: 10})}),
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
			new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.NEXT, false),
			new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
			new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
			new Platform(PlatformType.SIDE, true, PlatformService.UP),
		], [
			new Label({label: LineName.IND_EIGHTH_AVENUE_LINE, type: PlatformSetType.UNDERGROUND, opened: DateTime.fromObject({year: 1933, month: 8, day: 19})}),
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
			new Miscellaneous("Wall"), //TODO
			new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
			new Platform(PlatformType.SIDE, true, PlatformService.UP),
		]], "50th Street", false), coordsForID(94), 4857531, true
	),
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

const segmentsWithLabel = (segments, type, line, nextDirection=ServiceDirection.SOUTH, disambiguator=null) => segments.map(s => new SegmentServiceLabel(s, type, line, nextDirection, disambiguator))

const SERVICES = {
	[Service.E]: [
		new ServiceInformation(Service.E, "Eighth Avenue Local", [
			// Full express
			new ServicePattern("Weekdays 7 AM to 7 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
			// Express after forest hills
			new ServicePattern("Weekends all day, Weekdays 6 - 7 AM and 7 - 9:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithLabel(["QB2"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
			// Full local
			// TODO need to describe late night service better
			new ServicePattern("10 PM - 5 AM (6 AM Weekends)", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
			new ServicePattern("10 PM - 5 AM (6 AM Weekends)", ServiceDirection.SOUTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),


			// Select service - Express after Roosevelt av
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithLabel(["QB2", "QB3"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB4", "QB5E", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10", "QB11", "QB12", "QB13"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
		]),
	],

	[Service.F]: [
		new ServiceInformation(Service.F, "Queens Boulevard Express/Sixth Avenue Local", [
			new ServicePattern("Weekdays 5 AM - 10:30 PM, Saturdays 6 AM - 9 PM, Sundays 7 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
			// TODO need to describe late night service better
			new ServicePattern("Weekdays 10:30 PM - 5 AM, Saturdays 6 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
				...segmentsWithLabel(["QB1", "QB2", "QB3", "QB4", "QB5L", "QB6", "QBAS1"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),

			// Select service - Express after Roosevelt av
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithLabel(["QB1", "QB2", "QB3"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
		]),

		new ServiceInformation(Service.Fd, "Queens Boulevard Express/Sixth Avenue Local", [// F express train
			new ServicePattern("Rush hours, two trains in each direction", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5E", "QB6", "QBAS1"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
		]),
	],

	[Service.R]: [
		new ServiceInformation(Service.R, "Broadway Local", [
			new ServicePattern("Everyday 6 AM - 10:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
				...segmentsWithLabel(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7", "QB8"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),

			new ServicePattern("Queens-bound trips 10 PM - Midnight", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.SELECT), [
				...segmentsWithLabel(["QB7", "QB8"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
		]),
	],

	[Service.M]: [
		new ServiceInformation(Service.M, "Queens Boulevard Local/Sixth Avenue Local", [
			new ServicePattern("Weekdays 6 AM - 9:30 PM", ServiceDirection.NORTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
				...segmentsWithLabel(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QBAS3", "QB7", "QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),

			new ServicePattern("Weekdays 6 AM - 9:30 PM", ServiceDirection.SOUTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
				...segmentsWithLabel(["QB3", "QB4", "QB5L", "QB6", "QBAS1", "QBAS2", "QBAS3", "QB7"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB8", "QB9"], TrackType.EXPRESS, LineName.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB10"], TrackType.LOCAL, LineName.IND_QUEENS_BOULEVARD_LINE),
			], []),
		]),
	],
};

const accumulateTrackServiceTime = (track, service, nextStop, lastStop, time) => {
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
				const {line, type, disambiguator, nextDirection} = pattern.route[i];
				// TODO could eliminate code duplication
				if(i !== 0){
					const {serviceSegment: lastServiceSegment} = pattern.route[i - 1];
					if(!serviceSegment.start.includes(lastServiceSegment) && !serviceSegment.end.includes(lastServiceSegment)){
						throw new Error(`${pattern.route[i].serviceSegment} has no connection to ${lastServiceSegment}`);
					}
				}
				if(i !== pattern.route.length - 1){
					const {serviceSegment: nextServiceSegment} = pattern.route[i + 1];
					if(!serviceSegment.start.includes(nextServiceSegment) && !serviceSegment.end.includes(nextServiceSegment)){
						throw new Error(`${pattern.route[i].serviceSegment} has no connection to ${nextServiceSegment}`);
					}
				}
				let ignoreDirection = null;
				if(pattern.serviceDirection !== ServiceDirection.BOTH){
					ignoreDirection = nextDirection === pattern.serviceDirection ? InternalDirection.PREVIOUS : InternalDirection.NEXT;
				}
				for(let j = 0; j < serviceSegment.platformSets.length; j++){
					const platformSet = serviceSegment.platformSets[j];
					let tracksNext = [];
					let tracksPrevious = [];
					if(platformSet.turnaround){
						if(!((i === 0 || i === pattern.route.length - 1) && (j === 0 || j === serviceSegment.platformSets.length - 1))){
							throw new Error(`Turnaround platformset ${platformSet.name} encountered in middle of service pattern`);
						}
						for(const tracks of platformSet.tracks){
							const {direction} = floor[0];
							const tracks = floor.filter(({category}) => category === "Track");
							if(!tracks.every((track) => track.direction === direction)){
								throw new Error(`Turnaround platformset ${platformSet.name} without all tracks facing same direction`);
							}
							[tracksNext, tracksPrevious] = direction === InternalDirection.NEXT ? [tracks, []] : [[], tracks];
						}
					} else {
						for(const track of platformSet.tracks){
							if(((track.direction === InternalDirection.NEXT && ignoreDirection !== InternalDirection.NEXT) || track.direction === InternalDirection.BOTH) && track.type === type && track.line === line && (track.disambiguator === null || track.disambiguator === disambiguator)){
								tracksNext = [track]; // TODO incorporate skips
								// To differentiate on next/last stop: do this later?
								//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
							}
							if(((track.direction === InternalDirection.PREVIOUS && ignoreDirection !== InternalDirection.PREVIOUS) || track.direction === InternalDirection.BOTH) && track.type === type && track.line === line && (track.disambiguator === null || track.disambiguator === disambiguator)){
								tracksPrevious = [track];
								//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
							}
						}
						if((tracksNext.length == 0 && ignoreDirection !== InternalDirection.NEXT) || (tracksPrevious.length == 0 && ignoreDirection !== InternalDirection.PREVIOUS)){
							throw new Error(`Track of type ${type} not found in ${platformSet.name}`);
						}
					}
					compiledRoute.push(new ServiceStop(platformSet.name, tracksNext, tracksPrevious));
				}
			}
			pattern.compiledRoute = compiledRoute;
			const lastStopNext = compiledRoute[compiledRoute.length - 1].stop;
			const lastStopPrevious = compiledRoute[0].stop;
			for(let i = 0; i < compiledRoute.length; i++){
				const {tracksNext, tracksPrevious} = compiledRoute[i];
				const nextStopNext = compiledRoute.find((el, index) => el.tracksNext.some(track => track.stops) && index > i)?.stop ?? "\"\"";
				const nextStopPrevious = compiledRoute.toReversed().find((el, index) => el.tracksPrevious.some(track => track.stops) && index >= (compiledRoute.length - i))?.stop ?? "\"\"";
				for(const trackNext of tracksNext){
					accumulateTrackServiceTime(trackNext, service, nextStopNext, lastStopNext, pattern.serviceTime);
				}
				for(const trackPrevious of tracksPrevious){
					accumulateTrackServiceTime(trackPrevious, service, nextStopPrevious, lastStopPrevious, pattern.serviceTime);
				}
			}
		}
	}
}

for(const platformSet of Object.values(PLATFORM_SETS)){
	for(const track of platformSet.tracks){
		if(track.category !== "Track"){
			continue;
		}
		for(const service of Object.keys(track.service)){
			// TODO assert same as result of last stop function?
			track.service[service].serviceTime = accumulateServiceTime(Object.values(track.service[service].nextStopService));
		}
	}
}

// Assign track compass directions
const oppositeDirections = {"North": "South", "South": "North", "East": "West", "West": "East"};
for(const serviceSegment of Object.values(SERVICE_SEGMENTS)){
	const {platformSets, nextCompassDirection} = serviceSegment;
	for(const platformSet of platformSets){
		for(const track of platformSet.tracks){
			if(track.category !== "Track"){
				continue;
			}
			// TODO when implementing multi-line sets: add an if statement here for line
			// TODO bidirectional tracks
			if(track.direction === InternalDirection.NEXT){
				track.compassDirection = nextCompassDirection;
			} else {
				track.compassDirection = oppositeDirections[nextCompassDirection];
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

export {TRACK_SEGMENTS, SERVICES, STATIONS, PLATFORM_SETS, MIN_BOARDINGS}