// WEST EDGE: -74.0508 EAST EDGE -73.7462 (684.433)
// NORTH EDGE: 40.9126 SOUTH EDGE: 40.5578 (1038.043)
// -(y - 40.9126)(2,925.713)
// -(x - -74.0508)(2,246.989)
//def convert(x, y):
//  return ((-1 * (x + 74.0508) * 2246.989), (-1 * (y - 40.9126) * (2925.713)))

//648x792 684.433x1038.05 1.154286667407984

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
	Line,
	Station,
	TrackSegment,
	Junction,
	ServiceTime,
	ServiceTimeStops,
	TrackServiceTime,
	accumulateServiceTime,
	ServicePattern,
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
const twoTrackIslandLayout = (line, accessible, tracktype=TrackType.NORMAL) => 
[[
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Platform(PlatformType.ISLAND, accessible, PlatformService.BOTH),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
]];

// TODO could consolidate more?
const twoTrackSideLayout = (line, accessibleNext, accessiblePrevious, tracktype=TrackType.NORMAL) => 
[[
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.DOWN),
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];

// Less common two-track platform layouts
const twoTrackSeparatedLayout = (line, accessibleNext, accessiblePrevious) => // TODO this has a few variations
[[
	new Track(line, TrackType.NORMAL, InternalDirection.NEXT, true),
	new Platform(PlatformType.SIDE, accessibleNext, PlatformService.UP),

], [
	new Track(line, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious, PlatformService.UP),
]];


const selfPointingPlatformSetObject = (name, disambiguator, type, opened, layout, position) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new PlatformSet(name, type, opened, layout, position)}};

const PLATFORM_SETS = {
	...selfPointingPlatformSetObject("Jamaica-179th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1950, month: 12, day: 10}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), {lat: 40.7122, lon: -73.7867}),
	...selfPointingPlatformSetObject("169th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7108, lon: -73.7939}),
	...selfPointingPlatformSetObject("Parsons Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7078, lon: -73.8035}),
	...selfPointingPlatformSetObject("Sutphin Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7058, lon: -73.8106}),
	...selfPointingPlatformSetObject("Briarwood", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7085, lon: -73.8218}),
	...selfPointingPlatformSetObject("Kew Gardens-Union Turnpike", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), {lat: 40.7135, lon: -73.8308}),
	...selfPointingPlatformSetObject("75th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7175, lon: -73.8371}),
	...selfPointingPlatformSetObject("Forest Hills-71st Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), {lat: 40.7210, lon: -73.8444}),
	...selfPointingPlatformSetObject("67th Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7264, lon: -73.8536}),
	...selfPointingPlatformSetObject("63rd Drive-Rego Park", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7293, lon: -73.8615}),
	...selfPointingPlatformSetObject("Woodhaven Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7330, lon: -73.8701}),
	...selfPointingPlatformSetObject("Grand Avenue-Newtown", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7368, lon: -73.8775}),
	...selfPointingPlatformSetObject("Elmhurst Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7420, lon: -73.8818}),
	...selfPointingPlatformSetObject("Jackson Heights-Roosevelt Avenue", null, PlatformSetType.UNDERGROUND,  DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), {lat: 40.7465, lon: -73.8911}),
	...selfPointingPlatformSetObject("65th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7492, lon: -73.8974}),
	...selfPointingPlatformSetObject("Northern Boulevard", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalSeparatedByTypeLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7531, lon: -73.9067}),
	//...selfPointingPlatformSetObject("46th Street", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL)),
	//...selfPointingPlatformSetObject("Steinway Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL)),
	...selfPointingPlatformSetObject("46th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), {lat: 40.7567, lon: -73.9141}),
	...selfPointingPlatformSetObject("Steinway Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL), {lat: 40.7573, lon: -73.9203}),
	...selfPointingPlatformSetObject("36th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7520, lon: -73.9288}),
	...selfPointingPlatformSetObject("Queens Plaza", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), {lat: 40.7490, lon: -73.9370}),
	...selfPointingPlatformSetObject("Court Square-23rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1939, month: 8, day: 28}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, false), {lat: 40.7477, lon: -73.9458}),
	...selfPointingPlatformSetObject("Lexington Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackIslandLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true), {lat: 40.7584, lon: -73.9693}),
	...selfPointingPlatformSetObject("Fifth Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSeparatedLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), {lat: 40.7608, lon: -73.9753}),
	...selfPointingPlatformSetObject("Seventh Avenue", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
		new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
	], [
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
	]], {lat: 40.7634, lon: -73.9818}),
	...selfPointingPlatformSetObject("50th Street", null, PlatformSetType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.NEXT, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true, PlatformService.UP),
	], [
		new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
		new Miscellaneous("Wall"), //TODO
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true, PlatformService.UP),
	]], {lat: 40.7623, lon: -73.9860}),
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

// QBL track segments: 555, 725, 723, 737, 739, 545, 427, 425, 735, 765, 761, 771, 773

const selfPointingTrackSegmentObject = (id, line, platformSets, division, type, signaling, obf, opened, used_tracks, unused_tracks, start, end, d) => {return {[id]: new TrackSegment(id, line, platformSets, division, type, signaling, obf, opened, used_tracks, unused_tracks, start, end, d)}};

const TRACK_SEGMENTS = {
	...selfPointingTrackSegmentObject("QBL1", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Jamaica-179th Street"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.BLOCK, BuiltFor.IND, DateTime.fromObject({year: 1950, month: 12, day: 10}), 2, 2, [], ["QBL2"], "m487.021 442.843 5.521-2.88 2.641.239 3.601-.479 2.64-.96"),
	...selfPointingTrackSegmentObject("QBL2", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["169th Street"], PLATFORM_SETS["Parsons Boulevard"], PLATFORM_SETS["Sutphin Boulevard"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.BLOCK, BuiltFor.IND, DateTime.fromObject({year: 1937, month: 4, day: 24}), 2, 2, ["QBL1"], ["QBL3"], "m447.416 454.844.48.72.96.48.96.48 1.92-.24 4.081-1.44 5.761-2.16 6.961-2.88 10.081-3.601 8.401-3.36"),
	...selfPointingTrackSegmentObject("QBL3", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Briarwood"], PLATFORM_SETS["Kew Gardens-Union Turnpike"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.BLOCK, BuiltFor.IND, DateTime.fromObject({year: 1937, month: 4, day: 24}), 4, 0, ["QBL2"], ["QBL4"], "m427.733 435.402 5.281 2.88 5.521 2.88 3.12 1.921 1.44 1.439 2.881 6.961 1.439 3.36"),
	...selfPointingTrackSegmentObject("QBL4", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["75th Avenue"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1936, month: 12, day: 31}), 4, 0, ["QBL3"], ["QBL5"], "m406.852 420.761 1.92.96 9.602 5.521 2.64 1.92 2.4 2.4 1.921 1.92 2.399 1.921"),
	...selfPointingTrackSegmentObject("QBL5", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Forest Hills-71st Avenue"], PLATFORM_SETS["67th Avenue"], PLATFORM_SETS["63rd Drive-Rego Park"], PLATFORM_SETS["Woodhaven Boulevard"], PLATFORM_SETS["Grand Avenue-Newtown"], PLATFORM_SETS["Elmhurst Avenue"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1936, month: 12, day: 31}), 4, 0, ["QBL4"], ["QBL6"], "m333.402 368.436 4.8 2.88 9.121 5.28 3.601 3.36 3.121 3.121 1.439 2.4.48 1.92.24 1.92.479 1.2 1.681 1.92 1.68.96 3.601 1.68 4.081 1.68 2.64 1.2 1.921 1.681 5.761 2.64 8.4 4.081 7.441 3.84 1.44.96 1.92 1.921.96 1.68 2.16 1.92 3.601 2.161 2.881 1.92"),
	...selfPointingTrackSegmentObject("QBL6", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Jackson Heights-Roosevelt Avenue"], PLATFORM_SETS["65th Street"], PLATFORM_SETS["Northern Boulevard"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 4, 0, ["QBL5"], ["QBL7E", "QBL7L"], "m310.359 355.714 5.761 3.12 11.281 6.481 6.001 3.12"),
	...selfPointingTrackSegmentObject("QBL7L", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["46th Street"], PLATFORM_SETS["Steinway Street"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 2, 0, ["QBL6"], ["QBL8"], "m280.835 356.915 1.44-.48.96-.72 4.08-6.721 2.88-4.561.48-.24.72-.24.72.24 7.201 4.56 11.042 6.961"),
	...selfPointingTrackSegmentObject("QBL7E", LineName.IND_QUEENS_BOULEVARD_LINE, [], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 2, 0, ["QBL6"], ["QBL8"], "m280.835 356.915 2.4-.24 3.6-.96 2.16-.96 2.4-.72 1.68-.24h2.4l2.16.48 1.92.48 1.92.48 2.4.48h1.92l2.161-.48 1.439.24.961.24"), // TODO junction
	...selfPointingTrackSegmentObject("QBL8", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["36th Street"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 4, 0, ["QBL7E", "QBL7L"], ["QBL9"], "m280.835 356.915-4.081.48-4.081.24-2.88.24-1.68.48"),
	...selfPointingTrackSegmentObject("QBL9", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Queens Plaza"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 4, 0, ["QBL8"], ["QBL10"], "m268.114 358.354-1.44.96-2.16 2.4-1.68 1.44-.96.96-1.2.48"),
	...selfPointingTrackSegmentObject("QBL10", LineName.IND_QUEENS_BOULEVARD_LINE, [], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 4, 0, ["QBL9"], ["QBL11"], "m260.673 364.595-1.92.72-4.32 2.16"),
	...selfPointingTrackSegmentObject("QBL11", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Court Square-23rd Street"], PLATFORM_SETS["Lexington Avenue-53rd Street"], PLATFORM_SETS["Fifth Avenue-53rd Street"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 2, 0, ["QBL10"], ["QBL12"], "m254.432 367.476-1.44.24-13.441-3.6-4.801-.96-.96-.72-10.801-11.041-1.2-.96-10.562-5.521-13.922-7.681"),
	...selfPointingTrackSegmentObject("QBL12", LineName.IND_QUEENS_BOULEVARD_LINE, [PLATFORM_SETS["Seventh Avenue"], PLATFORM_SETS["50th Street"]], Division.B, PlatformSetType.UNDERGROUND, SignalingType.COMMUNICATION_BASED, BuiltFor.IND, DateTime.fromObject({year: 1933, month: 8, day: 19}), 2, 0, ["QBL11"], [], "m197.305 337.232-2.4-1.2-6.48-3.6h-.72l-.72.48-.48.24-2.64 5.04"),
};

const fillInSegments = (start, end, direction=InternalDirection.NEXT) => {
	const answer = [start];
	const key = direction === InternalDirection.NEXT ? "end" : "start";
	let segment = start;
	while(segment !== end){
		const edge = TRACK_SEGMENTS[segment][key];
		if(edge.length > 1){
			throw new Error(`Can't unambiguously fill in ${start} to ${end}: ${segment} ${key}s with junction`);
		}
		if(edge.length == 0){
			throw new Error(`Can't fill in ${start} to ${end}: ${segment} ${key}s with bumper blocks`);
		}
		segment = edge[0];
		answer.push(segment);
	}
	return answer;
}

const segmentsWithType = (segments, type) => segments.map(s => new SegmentServiceType(s, type))

const SERVICES = {
	[Service.E]: [
		// Full express
		new ServicePattern("E Eighth Avenue Local", "Weekdays 7 AM to 7 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL3", "QBL6"), "QBL7E", ...fillInSegments("QBL8", "QBL10")], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
		// Express after forest hills
		new ServicePattern("E Eighth Avenue Local", "Weekends all day, Weekdays 6 - 7 AM and 7 - 9:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			...segmentsWithType(["QBL3", "QBL4"], TrackType.LOCAL),
			...segmentsWithType(["QBL5", "QBL6", "QBL7E", ...fillInSegments("QBL8", "QBL10")], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
		// Full local
		// TODO need to describe late night service better
		new ServicePattern("E Eighth Avenue Local", "10 PM - 5 AM (6 AM Weekends)", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL3", "QBL6"), "QBL7L", "QBL8"], TrackType.LOCAL),
			...segmentsWithType(["QBL9", "QBL10"], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
		new ServicePattern("E Eighth Avenue Local", "10 PM - 5 AM (6 AM Weekends)", ServiceDirection.SOUTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL3", "QBL6"), "QBL7L", ...fillInSegments("QBL8", "QBL10")], TrackType.LOCAL),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),


		// Select service
		new ServicePattern("E Eighth Avenue Local", "Select rush hour trips", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL1", "QBL6"), "QBL7E", ...fillInSegments("QBL8", "QBL10")], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
		new ServicePattern("E Eighth Avenue Local", "Select Queens-bound evening trips", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL1", "QBL4")], TrackType.LOCAL),
			...segmentsWithType(["QBL5", "QBL6", "QBL7E", ...fillInSegments("QBL8", "QBL10", InternalDirection.NEXT)], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
		new ServicePattern("E Eighth Avenue Local", "Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
			...segmentsWithType([...fillInSegments("QBL3", "QBL5")], TrackType.LOCAL),
			...segmentsWithType(["QBL6", "QBL7E", ...fillInSegments("QBL8", "QBL10")], TrackType.EXPRESS),
			...segmentsWithType(["QBL11", "QBL12"], TrackType.NORMAL),
		], []),
	],

	[Service.F]: [
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Weekdays 5 AM - 10:30 PM, Saturdays 6 AM - 9 PM, Sundays 7 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			...segmentsWithType([...fillInSegments("QBL1", "QBL4")], TrackType.LOCAL),
			...segmentsWithType(["QBL5", "QBL6", "QBL7E", "QBL8"], TrackType.EXPRESS),
		], []),
		// TODO need to describe late night service better
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Weekdays 10:30 PM - 5 AM, Saturdays 6 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL1", "QBL6"), "QBL7L", "QBL8"], TrackType.LOCAL),
		], []),

		// Select service,
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
			...segmentsWithType([...fillInSegments("QBL3", "QBL5")], TrackType.LOCAL),
			...segmentsWithType(["QBL6", "QBL7E", "QBL8"], TrackType.EXPRESS),
		], []),
	],

	[Service.Fd]: [// F express train
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Rush hours, two trains in each direction", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType([...fillInSegments("QBL1", "QBL4")], TrackType.LOCAL),
			...segmentsWithType(["QBL5", "QBL6", "QBL7E", "QBL8"], TrackType.EXPRESS),
		])
	],

	[Service.R]: [
		new ServicePattern("R Broadway Local", "Everyday 6 AM - 10:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			...segmentsWithType(["QBL5", "QBL6", "QBL7L", "QBL8", "QBL9"], TrackType.LOCAL),
		], []),

		new ServicePattern("R Broadway Local", "Queens-bound trips 10 PM - Midnight", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.SELECT), [
			...segmentsWithType(["QBL9"], TrackType.LOCAL),
		], []),
	],

	[Service.M]: [
		new ServicePattern("M Queens Boulevard Local/Sixth Avenue Local", "Weekdays 6 AM - 9:30 PM", ServiceDirection.NORTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType(["QBL5", "QBL6", "QBL7L", "QBL8"], TrackType.LOCAL),
			...segmentsWithType(["QBL9", "QBL10"], TrackType.EXPRESS),
			...segmentsWithType(["QBL11"], TrackType.NORMAL),
		], []),

		new ServicePattern("M Queens Boulevard Local/Sixth Avenue Local", "Weekdays 6 AM - 9:30 PM", ServiceDirection.SOUTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
			...segmentsWithType(["QBL5", "QBL6", "QBL7L", "QBL8", "QBL9"], TrackType.LOCAL),
			...segmentsWithType(["QBL10"], TrackType.EXPRESS),
			...segmentsWithType(["QBL11"], TrackType.NORMAL),
		], []),
	]
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
for(const service in SERVICES){
	for(const pattern of SERVICES[service]){
		const compiledRoute = []; // Array of ServiceStop objects, list of all stations passed through and whether route stops
		let index = null;
		let prevSegment = null;
		let prevMap = null;
		for(let i = 0; i < pattern.route.length; i++){
			const trackSegment = TRACK_SEGMENTS[pattern.route[i].trackSegment];
			const {type} = pattern.route[i];
			let internalDirection; // Internal direction that corresponds to rail north
			// TODO could eliminate code duplication
			if(i !== 0){
				const {trackSegment: lastTrackSegment} = pattern.route[i - 1];
				if(trackSegment.start.includes(lastTrackSegment)){
					internalDirection = InternalDirection.PREVIOUS;
				} else if(trackSegment.end.includes(lastTrackSegment)){
					internalDirection = InternalDirection.NEXT;
				} else {
					throw new Error(`${pattern.route[i].trackSegment} has no connection to ${lastTrackSegment}`);
				}
			}
			if(i !== pattern.route.length - 1){
				const {trackSegment: nextTrackSegment} = pattern.route[i + 1];
				if(trackSegment.start.includes(nextTrackSegment)){
					if(internalDirection === InternalDirection.PREVIOUS){
						throw new Error(`${trackSegment} contradictory direction going to ${nextTrackSegment}`);
					}
					internalDirection = InternalDirection.NEXT;
				} else if(trackSegment.end.includes(nextTrackSegment)){
					if(internalDirection === InternalDirection.NEXT){
						throw new Error(`${trackSegment} contradictory direction going to ${nextTrackSegment}`);
					}
					internalDirection = InternalDirection.PREVIOUS;
				} else {
					throw new Error(`${pattern.route[i].trackSegment} has no connection to ${nextTrackSegment}`);
				}
			}
			let ignoreDirection = null;
			if(pattern.serviceDirection === ServiceDirection.NORTH){
				ignoreDirection = internalDirection === InternalDirection.NEXT ? InternalDirection.PREVIOUS : InternalDirection.NEXT;
			} else if(pattern.serviceDirection === ServiceDirection.SOUTH){
				ignoreDirection = internalDirection;
			}
			for(const platformSet of trackSegment.platformSets){
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

// TODO fails in a tie, although that case is unlikely
Object.entries(STATIONS).toSorted(([_, a], [__, b]) => b.boardings - a.boardings).forEach(([stationKey, station], index) => {
	station.rank = index + 1;
	station.platformSets.forEach(platformSet => {platformSet.stationKey = stationKey});
});
const MIN_BOARDINGS = Math.min(...Object.values(STATIONS).map(({boardings}) => boardings));
Object.values(TRACK_SEGMENTS).forEach(({line, platformSets}) => {platformSets.forEach(platformSet => {platformSet.lines.push(line)})})

export {TRACK_SEGMENTS, PLATFORM_SETS, SERVICES, STATIONS, MIN_BOARDINGS}