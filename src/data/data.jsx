/*
// TODO: data "filling in" functions, different open dates for platform sets

Tentative plan: use constructor methods ("weak classes")

TOP LEVEL ELEMENTS
Line:
	Name
	Layout (Ordered array):
		Reference to platform set
		Non-station elements (track information, crossing, merger, signaling type, track type)

Station:
	Name
	Platforms: Set of references to platform set
	Passengers
	Rank

Platform set:
	Name
	Type: Underground, Elevated, Embankment, Open Cut, At-Grade
	Opposite-Direction Transfer
	Level:
		Layout (Ordered array):
			Platform
			Track
			Non-track elements (wall, trackbed, non-subway track)

Service:
	Name
	Pattern:
		Full Name
		General time
		Precise time
		Select service?
		Bullet (circle or diamond)
		Route (Ordered array, If null doesn't run)

COMPOSED ELEMENTS
Platform:
	Type: side, island
	Accessible?

Track:
	Line: reference to Line
	Direction: Cardinal directions, PDE
	Type: normal, express, local, PDE, storage/layup

Route:
	Line: Reference to line
	From: Reference to platform set
	To: Reference to platform set
	Type: Normal, express, local, PDE

// Operations needed for enum: "Hard" access, has, iteration
*/

// WEST EDGE: -74.0508 EAST EDGE -73.7462 (684.433)
// NORTH EDGE: 40.9126 SOUTH EDGE: 40.5578 (1038.043)
// -(y - 40.9126)(2,925.713)
// -(x - -74.0508)(2,246.989)
//def convert(x, y):
//  return ((-1 * (x + 74.0508) * 2246.989), (-1 * (y - 40.9126) * (2925.713)))

import React from "react";
import {DateTime} from "luxon";
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
import {
	Track,
	Platform,
	PlatformSet,
	Line,
	Station,
	TrackInformation,
	TrackInformationDiff,
	Junction,
	ServiceTime,
	ServiceTimeStops,
	TrackServiceTime,
	accumulateServiceTime,
	ServicePattern,
	ServiceSlice,
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
	new Platform(PlatformType.ISLAND, accessibleNext),
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, true),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.ISLAND, accessiblePrevious),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
]];

const fourTrackLocalLayout = (line, accessibleNext, accessiblePrevious) =>
[[
	new Platform(PlatformType.SIDE, accessibleNext),
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, false),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious),
]];

// Less common four-track platform layouts
const fourTrackLocalSeparatedByTypeLayout = (line, accessibleNext, accessiblePrevious) =>
[[
	new Platform(PlatformType.SIDE, accessibleNext),
	new Track(line, TrackType.LOCAL, InternalDirection.NEXT, true),
	new Track(line, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious),
], [
	new Track(line, TrackType.EXPRESS, InternalDirection.NEXT, false),
	new Track(line, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
]];

// Common two-track platform layouts
const twoTrackIslandLayout = (line, accessible, tracktype=TrackType.NORMAL) => 
[[
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Platform(PlatformType.ISLAND, accessible),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
]];

// TODO could consolidate more?
const twoTrackSideLayout = (line, accessibleNext, accessiblePrevious, tracktype=TrackType.NORMAL) => 
[[
	new Platform(PlatformType.SIDE, accessibleNext),
	new Track(line, tracktype, InternalDirection.NEXT, true),
	new Track(line, tracktype, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious),
]];

// Less common two-track platform layouts
const twoTrackSeparatedLayout = (line, accessibleNext, accessiblePrevious) => // TODO this has a few variations
[[
	new Track(line, TrackType.NORMAL, InternalDirection.NEXT, true),
	new Platform(PlatformType.SIDE, accessibleNext),

], [
	new Track(line, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
	new Platform(PlatformType.SIDE, accessiblePrevious),
]];


const selfPointingPlatformSetObject = (name, disambiguator, type, odt, opened, layout, position) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new PlatformSet(name, type, odt, opened, layout, position)}};

const PLATFORM_SETS = {
	...selfPointingPlatformSetObject("Jamaica-179th Street", null, PlatformSetType.UNDERGROUND, null, DateTime.fromObject({year: 1950, month: 12, day: 10}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), [600.62, 585.14]),
	...selfPointingPlatformSetObject("169th Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [577.48, 591.87]),
	...selfPointingPlatformSetObject("Parsons Boulevard", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [555.68, 600.36]),
	...selfPointingPlatformSetObject("Sutphin Boulevard", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [539.95, 606.21]),
	...selfPointingPlatformSetObject("Briarwood", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [518.61, 597.14]),
	...selfPointingPlatformSetObject("Kew Gardens-Union Turnpike", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), [494.11, 580.46]),
	...selfPointingPlatformSetObject("75th Avenue", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [479.96, 568.17]),
	...selfPointingPlatformSetObject("Forest Hills-71st Avenue", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), [463.55, 558.81]),
	...selfPointingPlatformSetObject("67th Avenue", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [444.00, 543.60]),
	...selfPointingPlatformSetObject("63rd Drive-Rego Park", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [424.91, 534.53]),
	...selfPointingPlatformSetObject("Woodhaven Boulevard", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [406.03, 524.29]),
	...selfPointingPlatformSetObject("Grand Avenue-Newtown", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [389.40, 514.34]),
	...selfPointingPlatformSetObject("Elmhurst Avenue", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [379.52, 497.96]),
	...selfPointingPlatformSetObject("Jackson Heights-Roosevelt Avenue", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), [360.19, 486.55]),
	...selfPointingPlatformSetObject("65th Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [344.46, 477.77]),
	...selfPointingPlatformSetObject("Northern Boulevard", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalSeparatedByTypeLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [323.12, 466.36]),
	//...selfPointingPlatformSetObject("46th Street", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL)),
	//...selfPointingPlatformSetObject("Steinway Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false, TrackType.LOCAL)),
	...selfPointingPlatformSetObject("46th Street", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [306.94, 456.12]),
	...selfPointingPlatformSetObject("Steinway Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [293.46, 454.36]),
	...selfPointingPlatformSetObject("36th Street", null, PlatformSetType.UNDERGROUND, false, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [273.91, 470.16]),
	...selfPointingPlatformSetObject("Queens Plaza", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, true), [255.48, 478.94]),
	...selfPointingPlatformSetObject("Court Square-23rd Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1939, month: 8, day: 28}), twoTrackSideLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true, false), [235.48, 482.16]),
	...selfPointingPlatformSetObject("Lexington Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackIslandLayout(LineName.IND_QUEENS_BOULEVARD_LINE, true), [181.11, 452.02]),
	...selfPointingPlatformSetObject("Fifth Avenue-53rd Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSeparatedLayout(LineName.IND_QUEENS_BOULEVARD_LINE, false, false), [168.75, 445.59]),
	...selfPointingPlatformSetObject("Seventh Avenue", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
		new Platform(PlatformType.ISLAND, false),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
	], [
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.ISLAND, false),
		new Track(LineName.IND_SIXTH_AVENUE_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
	]], [155.04, 437.98]),
	...selfPointingPlatformSetObject("50th Street", null, PlatformSetType.UNDERGROUND, true, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
		new Platform(PlatformType.SIDE, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.NEXT, true),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.NEXT, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.EXPRESS, InternalDirection.PREVIOUS, false),
		new Track(LineName.IND_EIGHTH_AVENUE_LINE, TrackType.LOCAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true),
	], [
		new Platform(PlatformType.SIDE, false),
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.NEXT, true),
		new Miscellaneous("Wall"), //TODO
		new Track(LineName.IND_QUEENS_BOULEVARD_LINE, TrackType.NORMAL, InternalDirection.PREVIOUS, true),
		new Platform(PlatformType.SIDE, true),
	]], [145.60, 439.73]),
};

const selfPointingStationObjectDefault = (name, boardings) => {return {[name]: new Station(name, [PLATFORM_SETS[name]], boardings)}};
const selfPointingStationObject = (name, disambiguator, platformSets, boardings) => {return {[name + (disambiguator ? ` ${disambiguator}` : "")]: new Station(name, platformSets, boardings)}};

const STATIONS = {
	...selfPointingStationObjectDefault("Jamaica-179th Street", 3944828),
	...selfPointingStationObjectDefault("169th Street", 1627817),
	...selfPointingStationObjectDefault("Parsons Boulevard", 1584984),
	...selfPointingStationObjectDefault("Sutphin Boulevard", 5941974),
	...selfPointingStationObjectDefault("Briarwood", 1046884),
	...selfPointingStationObjectDefault("Kew Gardens-Union Turnpike", 5016215),
	...selfPointingStationObjectDefault("75th Avenue", 683707),
	...selfPointingStationObjectDefault("Forest Hills-71st Avenue", 5509732),
	...selfPointingStationObjectDefault("67th Avenue", 1658341),
	...selfPointingStationObjectDefault("63rd Drive-Rego Park", 3033839),
	...selfPointingStationObjectDefault("Woodhaven Boulevard", 4237180),
	...selfPointingStationObjectDefault("Grand Avenue-Newtown", 3893242),
	...selfPointingStationObjectDefault("Elmhurst Avenue", 2676734),
	...selfPointingStationObject("Jackson Heights–Roosevelt Avenue/74th Street", null, [PLATFORM_SETS["Jackson Heights-Roosevelt Avenue"]], 14348691),
	...selfPointingStationObjectDefault("65th Street", 729908),
	...selfPointingStationObjectDefault("46th Street", 1662115),
	...selfPointingStationObjectDefault("Steinway Street", 2730057),
	...selfPointingStationObjectDefault("36th Street", 769239),
	...selfPointingStationObjectDefault("Queens Plaza", 3645653),
	...selfPointingStationObject("Court Square-23rd Street", null, [PLATFORM_SETS["Court Square-23rd Street"]], 5381184),
	...selfPointingStationObject("Lexington Avenue/51st Street", null, [PLATFORM_SETS["Lexington Avenue-53rd Street"]], 11339465),
	...selfPointingStationObjectDefault("Fifth Avenue-53rd Street", 4733296),
	...selfPointingStationObjectDefault("Seventh Avenue", 3892682),
	...selfPointingStationObjectDefault("50th Street", 4857531),
}

const LINES = {
	[LineName.IND_QUEENS_BOULEVARD_LINE] : new Line(LineName.IND_QUEENS_BOULEVARD_LINE, Division.B, [
		new TrackInformation(PlatformSetType.UNDERGROUND, SignalingType.BLOCK, "Independent Subway System", DateTime.fromObject({year: 1950, month: 12, day: 10}), 2, 2),
		PLATFORM_SETS["Jamaica-179th Street"],
		new TrackInformationDiff({"opened": DateTime.fromObject({year: 1937, month: 4, day: 24})}),
		PLATFORM_SETS["169th Street"],
		PLATFORM_SETS["Parsons Boulevard"],
		PLATFORM_SETS["Sutphin Boulevard"],
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_ARCHER_AVENUE_LINE, JunctionType.FLYING, "ALL", TrackType.NORMAL),
		new TrackInformationDiff({"used_tracks": 4, "unused_tracks": 0}),
		PLATFORM_SETS["Briarwood"],
		new TrackInformationDiff({"signaling": SignalingType.COMMUNICATION_BASED, "opened": DateTime.fromObject({year: 1936, month: 12, day: 31})}),
		PLATFORM_SETS["Kew Gardens-Union Turnpike"],
		PLATFORM_SETS["75th Avenue"],
		PLATFORM_SETS["Forest Hills-71st Avenue"],
		PLATFORM_SETS["67th Avenue"],
		PLATFORM_SETS["63rd Drive-Rego Park"],
		PLATFORM_SETS["Woodhaven Boulevard"],
		PLATFORM_SETS["Grand Avenue-Newtown"],
		PLATFORM_SETS["Elmhurst Avenue"],
		new TrackInformationDiff({"opened": DateTime.fromObject({year: 1933, month: 8, day: 19})}),
		PLATFORM_SETS["Jackson Heights-Roosevelt Avenue"],
		PLATFORM_SETS["65th Street"],
		PLATFORM_SETS["Northern Boulevard"],
		//"Express Tracks Diverge",
		PLATFORM_SETS["46th Street"],
		PLATFORM_SETS["Steinway Street"],
		//"Express Tracks Rejoin",
		PLATFORM_SETS["36th Street"],
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_63RD_STREET_LINE, JunctionType.FLYING, "ALL", TrackType.NORMAL),
		PLATFORM_SETS["Queens Plaza"],
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.BMT_BROADWAY_LINE, JunctionType.FLYING, TrackType.LOCAL, TrackType.NORMAL),
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_CROSSTOWN_LINE, JunctionType.SEPARATING, TrackType.LOCAL, TrackType.NORMAL),
		new TrackInformationDiff({"used_tracks": 2}),
		PLATFORM_SETS["Court Square-23rd Street"],
		PLATFORM_SETS["Lexington Avenue-53rd Street"],
		PLATFORM_SETS["Fifth Avenue-53rd Street"],
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_SIXTH_AVENUE_LINE, JunctionType.FLYING, TrackType.NORMAL, TrackType.LOCAL),
		PLATFORM_SETS["Seventh Avenue"],
		PLATFORM_SETS["50th Street"],
		new Junction(LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_SIXTH_AVENUE_LINE, JunctionType.FLYING, TrackType.NORMAL, "ALL"),
	]),
};

const SERVICES = {
	[Service.E]: [
		// Full express
		new ServicePattern("E Eighth Avenue Local", "Weekdays 7 AM to 7 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "Queens Plaza", TrackType.EXPRESS, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
		// Express after forest hills
		new ServicePattern("E Eighth Avenue Local", "Weekends all day, Weekdays 6 - 7 AM and 7 - 9:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "75th Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "Queens Plaza", TrackType.EXPRESS, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
		// Full local
		// TODO need to describe late night service better
		new ServicePattern("E Eighth Avenue Local", "10 PM - 5 AM (6 AM Weekends)", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "36th Street", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Queens Plaza", "Queens Plaza", TrackType.EXPRESS, [], InternalDirection.PREVIOUS),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
		new ServicePattern("E Eighth Avenue Local", "10 PM - 5 AM (6 AM Weekends)", ServiceDirection.SOUTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "Queens Plaza", TrackType.LOCAL, [], InternalDirection.NEXT),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),


		// Select service
		new ServicePattern("E Eighth Avenue Local", "Select rush hour trips", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jamaica-179th Street", "Queens Plaza", TrackType.EXPRESS, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
		new ServicePattern("E Eighth Avenue Local", "Select Queens-bound evening trips", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jamaica-179th Street", "75th Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "Queens Plaza", TrackType.EXPRESS, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
		new ServicePattern("E Eighth Avenue Local", "Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "Elmhurst Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jackson Heights-Roosevelt Avenue", "Queens Plaza", TrackType.EXPRESS, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "50th Street", TrackType.NORMAL, []),
		]),
	],

	[Service.F]: [
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Weekdays 5 AM - 10:30 PM, Saturdays 6 AM - 9 PM, Sundays 7 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jamaica-179th Street", "75th Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "36th Street", TrackType.EXPRESS, []),
		]),
		// TODO need to describe late night service better
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Weekdays 10:30 PM - 5 AM, Saturdays 6 AM - 9 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.YES, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jamaica-179th Street", "36th Street", TrackType.LOCAL, []),
		]),

		// Select service,
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Briarwood", "Elmhurst Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jackson Heights-Roosevelt Avenue", "36th Street", TrackType.EXPRESS, []),
		]),
	],

	[Service.Fd]: [// F express train
		new ServicePattern("F Queens Boulevard Express/Sixth Avenue Local", "Rush hours, two trains in each direction", ServiceDirection.BOTH, new ServiceTime(ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Jamaica-179th Street", "75th Avenue", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "36th Street", TrackType.EXPRESS, []),
		])
	],

	[Service.R]: [
		new ServicePattern("R Broadway Local", "Everyday 6 AM - 10:30 PM", ServiceDirection.BOTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.YES), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "Queens Plaza", TrackType.LOCAL, []),
		]),

		new ServicePattern("R Broadway Local", "Queens-bound trips 10 PM - Midnight", ServiceDirection.NORTH, new ServiceTime(ServiceType.NO, ServiceType.NO, ServiceType.NO, ServiceType.SELECT, ServiceType.NO, ServiceType.SELECT), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Queens Plaza", "Queens Plaza", TrackType.LOCAL, []),
		]),
	],

	[Service.M]: [
		new ServicePattern("M Queens Boulevard Local/Sixth Avenue Local", "Weekdays 6 AM - 9:30 PM", ServiceDirection.NORTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "36th Street", TrackType.LOCAL, []),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Queens Plaza", "Queens Plaza", TrackType.EXPRESS, [], InternalDirection.PREVIOUS),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "Fifth Avenue-53rd Street", TrackType.NORMAL, []),
		]),

		new ServicePattern("M Queens Boulevard Local/Sixth Avenue Local", "Weekdays 6 AM - 9:30 PM", ServiceDirection.SOUTH, new ServiceTime(ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.YES, ServiceType.NO, ServiceType.NO), [
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Forest Hills-71st Avenue", "Queens Plaza", TrackType.LOCAL, [], InternalDirection.NEXT),
			new ServiceSlice(LineName.IND_QUEENS_BOULEVARD_LINE, "Court Square-23rd Street", "Fifth Avenue-53rd Street", TrackType.NORMAL, []),
		]),
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
		let prevSlice = null;
		let prevMap = null;
		for(const slice of pattern.route){
			const map = LINES[slice.line].map;
			if(prevSlice !== null){
				if(prevSlice.line === slice.line){
					index = map.findIndex((element, i) => categorySearchFunction(index, "PlatformSet")(element, i));
					if(slice.from !== map[index].name){
						throw new Error(`${map[index].name} is not the next station in ${slice.line}`);
					}
				} else {
					const fi = prevMap.findIndex(categorySearchFunction(index, "PlatformSet"));
					index = prevMap.findIndex(categorySearchFunction(index, "Junction"));
					if(fi !== -1 && fi < index){
						throw new Error(`Station occured before junction at index ${index} in ${slice.line}`);
					}
					const junction = prevMap[index];
					let key;
					
					if(junction.line1 === slice.line){
						key = "line2";
					} else if(junction.line2 === slice.line){
						key = "line1";
					} else {
						throw new Error(`${prevSlice.line} does not have junction to ${slice.line} at index ${index}`);
					}
					index = 0;
					do {
						index = map.findIndex(categorySearchFunction(index, "Junction"));
						if(index === -1){
							throw new Error(`${slice.line} does not have junction to ${prevSlice.line} before station ${slice.from}`);
						}
					} while(map[index][key] !== prevSlice.line && map.find(categorySearchFunction(index, "PlatformSet")).name !== slice.from)
					index = map.findIndex(categorySearchFunction(index, "Station"));
				}
			} else {
				index = map.findIndex((element, i) => categorySearchFunction(-1, "PlatformSet")(element, i) && element.name === slice.from)
			}
			let first = true;
			do {
				//debugger;
				if(first){
					first = false;
				} else {
					index = map.findIndex(categorySearchFunction(index, "PlatformSet"));
				}
				const platformSet = map[index];
				let trackNext;
				let trackPrevious;
				for(const floor of platformSet.layout){
					for(const track of floor){
						// TODO direction doesn't work
						if(track.direction === InternalDirection.NEXT && slice.internalDirection !== InternalDirection.PREVIOUS && track.type === slice.type){
							trackNext = track; // TODO incorporate skips
							// To differentiate on next/last stop: do this later?
							//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
						}
						if(track.direction === InternalDirection.PREVIOUS && slice.internalDirection !== InternalDirection.NEXT && track.type === slice.type){
							trackPrevious = track;
							//track.service[service] = track.service[service] === undefined ? accumulateServiceTime([pattern.serviceTime]) : accumulateServiceTime([track.service[service], pattern.serviceTime]);
						}
					}
				}
				if((trackNext === undefined && slice.internalDirection !== InternalDirection.PREVIOUS) || (trackPrevious === undefined && slice.internalDirection !== InternalDirection.NEXT)){
					throw new Error(`Track of type ${slice.type} not found in ${platformSet.name}`);
				}
				compiledRoute.push(new ServiceStop(platformSet.name, trackNext, trackPrevious));
			} while(map[index].name !== slice.to);
			prevSlice = slice;
			prevMap = map;
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
Object.values(STATIONS).toSorted((a, b) => b.boardings - a.boardings).forEach((el, index) => el.rank = index + 1);

export {LINES, PLATFORM_SETS, SERVICES, STATIONS}