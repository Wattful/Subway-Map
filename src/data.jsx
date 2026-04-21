import {DateTime} from "luxon";
import {
	Line,
	Service,
	StructureType,
	TrackType,
	PlatformType,
	PlatformService,
	ArrowDirection,
	ServiceDirection,
	ServiceTimeComponent,
	ServiceTimeType,
} from "./enums.jsx";
import {
	Track,
	getTerminalKey as gtk,
	getServiceKey as gsk,
	Platform,
	PlatformSet,
	Station,
	getDisambiguatedName as gdn,
	Label,
	ServiceSegment,
	ServiceTime,
	ServiceTimeStops,
	accumulateServiceTime,
	TimeAndName,
	ServicePattern,
	ServiceInformation,
	SegmentServiceLabel,
	ServiceStop,
	Miscellaneous,
} from "./objects.jsx";
import {
	TRACK_SEGMENTS,
	PLATFORM_SET_COORDS,
	SERVICE_SEGMENT_BORDERS
} from "./tsdata.jsx";

/*
Class which takes a base layout and allows us to edit that layout.
All methods return this for chaining.
*/
function LayoutBuilder(layout){
	this.layout = layout;

	this.get = () => layout;

	// The override functions allow us to assign any object property - these are mostly used to mark tracks/platforms as unused or add descriptions.
	this.overrideAll = (category, attributes) => {
		for(const floor of this.layout){
			for(const element of floor){
				if(category === null || element.category === category){
					Object.assign(element, attributes);
				}
			}
		}
		return this;
	};

	this.overrideFloor = (floor, category, attributes) => {
		for(const element of this.layout[floor]){
			if(category === null || element.category === category){
				Object.assign(element, attributes);
			}
		}
		return this;
	};

	this.override = (floor, index, attributes) => {
		Object.assign(this.layout[floor][index], attributes);
		return this;
	};

	this.add = (floor, index, element) => {
		this.layout[floor].splice(index, 0, element);
		return this;
	};

	this.remove = (floor, index) => {
		this.layout[floor].splice(index, 1);
		return this;
	};
}

// Common four-track platform layouts
const fourTrackExpressLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Platform(PlatformType.ISLAND, accessibleLeft, PlatformService.BOTH),
		new Track(line, TrackType.EXPRESS, ArrowDirection.LEFT, true),
		new Track(line, TrackType.EXPRESS, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.ISLAND, accessibleRight, PlatformService.BOTH),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
	]]
);

const fourTrackLocalLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.DOWN),
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Track(line, TrackType.EXPRESS, ArrowDirection.LEFT, false),
		new Track(line, TrackType.EXPRESS, ArrowDirection.RIGHT, false),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.UP),
	]]
);

// Less common four-track platform layouts
const fourTrackLocalSeparatedByTypeLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.DOWN),
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.UP),
	], [
		new Track(line, TrackType.EXPRESS, ArrowDirection.LEFT, false),
		new Track(line, TrackType.EXPRESS, ArrowDirection.RIGHT, false),
	]]
);

// Common two-track platform layouts
const twoTrackIslandLayout = (line, accessible) => new LayoutBuilder(
	[[
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Platform(PlatformType.ISLAND, accessible, PlatformService.BOTH),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
	]]
);

const twoTrackSideLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.DOWN),
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.UP),
	]]
);

// Less common two-track platform layouts
const twoTrackSeparatedLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(// TODO this has a few variations (address as it comes up)
	[[
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.UP),

	], [
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.UP),
	]]
);

// Common three-track platform layouts
const threeTrackExpressLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.BOTH),
		new Track(line, TrackType.PEAK_DIRECTION_EXPRESS, ArrowDirection.BOTH, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.BOTH),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
	]]
);

const threeTrackLocalLayout = (line, accessibleLeft, accessibleRight) => new LayoutBuilder(
	[[
		new Platform(PlatformType.SIDE, accessibleLeft, PlatformService.DOWN),
		new Track(line, TrackType.LOCAL, ArrowDirection.LEFT, true),
		new Track(line, TrackType.PEAK_DIRECTION_EXPRESS, ArrowDirection.BOTH, false),
		new Track(line, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		new Platform(PlatformType.SIDE, accessibleRight, PlatformService.UP),
	]]
);

// Some common overrides for custom tracks
const noTrackOrTrackbed = {trackDescription: "No Track or Trackbed", showTrack: false};
const trackbed = {trackDescription: "Trackbed", showTrack: false};

const coordsForID = (id) => PLATFORM_SET_COORDS[id].coords;

const selfPointingPlatformSetObject = (name, disambiguator, type, opened, layout, position) => ({[gdn(name, disambiguator)]: new PlatformSet(name, disambiguator, type, opened, layout, position)});

// One platform set
const selfPointingStationObject = (name, disambiguator, type, opened, layout, position, boardings, odt, normal=true) => {
	const ps = new PlatformSet(name, disambiguator, type, opened, layout, position, normal);
	return {[gdn(name, disambiguator)]: new Station(name, disambiguator, {[gdn(name, disambiguator)]: ps}, boardings, odt)};
};

// Multiple platform sets
const selfPointingMultiTabStationObject = (name, disambiguator, platformSetsLayouts, boardings, odt) => ({[gdn(name, disambiguator)]: new Station(
		name,
		disambiguator,
		platformSetsLayouts, 
		boardings,
		odt,
	)});

/*
A station is a group of one or more platform sets. For example, Fulton Street is one station made up of four platform sets.
Some data, namely boardings and odt, are collected at the station level. Most data is held at the platform set level.
*/
const STATIONS = {
	// QBL
	...selfPointingStationObject("Jamaica-179th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1950, month: 12, day: 10}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, true).get(), coordsForID(469), 3944828, null),
	...selfPointingStationObject("169th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(344), 1627817, true),
	...selfPointingStationObject("Parsons Boulevard", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(343), 1584984, true),
	...selfPointingStationObject("Sutphin Boulevard", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(414), 5941974, true),
	...selfPointingStationObject("Briarwood", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1937, month: 4, day: 24}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(410), 1046884, false),
	...selfPointingStationObject("Kew Gardens-Union Turnpike", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, true).get(), coordsForID(310), 5016215, true),
	...selfPointingStationObject("75th Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(309), 683707, false),
	...selfPointingStationObject("Forest Hills-71st Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, true).get(), coordsForID(411), 5509732, true),
	...selfPointingStationObject("67th Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(349), 1658341, true),
	...selfPointingStationObject("63rd Drive-Rego Park", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(348), 3033839, true),
	...selfPointingStationObject("Woodhaven Boulevard", Line.IND_QUEENS_BOULEVARD_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(388), 4237180, true),
	...selfPointingStationObject("Grand Avenue-Newtown", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(401), 3893242, true),
	...selfPointingMultiTabStationObject("Jackson Heights–Roosevelt Avenue/74th Street", null, {
			...selfPointingPlatformSetObject("74th Street-Broadway", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1917, month: 4, day: 21}), threeTrackLocalLayout(Line.IRT_FLUSHING_LINE, true, true).get(), coordsForID(386)),
			...selfPointingPlatformSetObject("Jackson Heights-Roosevelt Avenue", null, StructureType.UNDERGROUND,  DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, true).get(), coordsForID(200)),
		}, 14348691, true
	),
	...selfPointingStationObject("Elmhurst Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 12, day: 31}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(402), 2676734, true),
	...selfPointingStationObject("65th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(387), 729908, true),
	...selfPointingStationObject("Northern Boulevard", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalSeparatedByTypeLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(396), 1400392, false),
	...selfPointingStationObject("46th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(395), 1662115, false),
	...selfPointingStationObject("Steinway Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSideLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(18), 2730057, true),
	...selfPointingStationObject("36th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackLocalLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(17), 769239, false),
	...selfPointingStationObject("Queens Plaza", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), fourTrackExpressLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, true).get(), coordsForID(27), 3645653, true),
	...selfPointingMultiTabStationObject("Court Square-23rd Street", null, {
			...selfPointingPlatformSetObject("Court Square", Line.IRT_FLUSHING_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1916, month: 11, day: 5}), twoTrackSideLayout(Line.IRT_FLUSHING_LINE, true, true).get(), coordsForID(262)),
			...selfPointingPlatformSetObject("Court Square-23rd Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1939, month: 8, day: 28}), twoTrackSideLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, false).get(), coordsForID(287)),
			...selfPointingPlatformSetObject("Court Square", Line.IND_CROSSTOWN_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackIslandLayout(Line.IND_CROSSTOWN_LINE, true).get(), coordsForID(288)),
		}, 5381184, true
	),
	...selfPointingMultiTabStationObject("Lexington Avenue/51st Street", null, {
			...selfPointingPlatformSetObject("51st Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 7, day: 17}), fourTrackLocalSeparatedByTypeLayout(Line.IRT_LEXINGTON_AVENUE_LINE, true, true).get(), coordsForID(277)),
			...selfPointingPlatformSetObject("Lexington Avenue-53rd Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackIslandLayout(Line.IND_QUEENS_BOULEVARD_LINE, false).get(), coordsForID(265)),
		}, 11339465, true
	),
	...selfPointingStationObject("Fifth Avenue-53rd Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), twoTrackSeparatedLayout(Line.IND_QUEENS_BOULEVARD_LINE, false, false).get(), coordsForID(264), 4733296, true),
	...selfPointingStationObject("Seventh Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 8, day: 19}), [[
			new Track(Line.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
		], [
			new Track(Line.IND_QUEENS_BOULEVARD_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
			new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		]], coordsForID(95), 3892682, true

	),
	...selfPointingStationObject("50th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1932, month: 9, day: 10}), [[
			new Label({label: Line.IND_EIGHTH_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1932, month: 9, day: 10})}),
			...fourTrackLocalLayout(Line.IND_EIGHTH_AVENUE_LINE, true, false).get()[0],
		], [
			new Label({label: Line.IND_QUEENS_BOULEVARD_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1933, month: 8, day: 19})}),
			...twoTrackSideLayout(Line.IND_QUEENS_BOULEVARD_LINE, true, false).add(0, 2, new Miscellaneous("Wall")).get()[0], //TODO
		]], coordsForID(94), 4857531, true, false
	),

	// Archer Avenue lines
	...selfPointingStationObject("Jamaica Center-Parsons/Archer", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1988, month: 12, day: 11}), [[
			new Label({label: Line.IND_ARCHER_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1988, month: 12, day: 11})}),
			...twoTrackIslandLayout(Line.IND_ARCHER_AVENUE_LINE, true).get()[0],
		], [
			new Label({label: Line.BMT_ARCHER_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1988, month: 12, day: 11})}),
			...twoTrackIslandLayout(Line.BMT_ARCHER_AVENUE_LINE, true).get()[0],
		]], coordsForID(416), 6137267, null, false
	),
	...selfPointingStationObject("Sutphin Boulevard-Archer Avenue-JFK Airport", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1988, month: 12, day: 11}), [[
			new Label({label: Line.IND_ARCHER_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1988, month: 12, day: 11})}),
			...twoTrackIslandLayout(Line.IND_ARCHER_AVENUE_LINE, true).get()[0],
		], [
			new Label({label: Line.BMT_ARCHER_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1988, month: 12, day: 11})}),
			...twoTrackIslandLayout(Line.BMT_ARCHER_AVENUE_LINE, true).get()[0],
		]], coordsForID(354), 6496357, true, false
	),
	...selfPointingStationObject("Jamaica-Van Wyck", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1988, month: 12, day: 11}), twoTrackIslandLayout(Line.IND_ARCHER_AVENUE_LINE, true).get(), coordsForID(415), 1053098, true),

	// Jamaica Line
	...selfPointingStationObject("121st Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1918, month: 7, day: 3}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 2, noTrackOrTrackbed).get(), coordsForID(353), 464940, true),
	...selfPointingStationObject("111th Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1917, month: 5, day: 28}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(352), 469638, true),
	...selfPointingStationObject("104th Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1917, month: 5, day: 28}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 2, noTrackOrTrackbed).get(), coordsForID(406), 599302, true),
	...selfPointingStationObject("Woodhaven Boulevard", Line.BMT_JAMAICA_LINE, StructureType.ELEVATED, DateTime.fromObject({year: 1917, month: 5, day: 28}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, true, true).override(0, 2, noTrackOrTrackbed).get(), coordsForID(351), 561288, true),
	...selfPointingStationObject("85th Street–Forest Parkway", null, StructureType.ELEVATED, DateTime.fromObject({year: 1917, month: 5, day: 28}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 2, noTrackOrTrackbed).get(), coordsForID(350), 703824, true),
	...selfPointingStationObject("75th Street–Elderts Lane", null, StructureType.ELEVATED, DateTime.fromObject({year: 1917, month: 5, day: 28}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 2, noTrackOrTrackbed).get(), coordsForID(384), 450062, true),
	...selfPointingStationObject("Cypress Hills", null, StructureType.ELEVATED, DateTime.fromObject({year: 1893, month: 5, day: 30}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 2, noTrackOrTrackbed).get(), coordsForID(383), 272614, true),
	...selfPointingStationObject("Crescent Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1893, month: 5, day: 30}), twoTrackIslandLayout(Line.BMT_JAMAICA_LINE, false).get(), coordsForID(381), 715796, true),
	...selfPointingStationObject("Norwood Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1893, month: 5, day: 30}), twoTrackIslandLayout(Line.BMT_JAMAICA_LINE, false).get(), coordsForID(380), 468898, true),
	...selfPointingStationObject("Cleveland Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1893, month: 5, day: 30}), twoTrackIslandLayout(Line.BMT_JAMAICA_LINE, false).get(), coordsForID(362), 409981, true),
	...selfPointingStationObject("Van Siclen Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 12, day: 3}), twoTrackIslandLayout(Line.BMT_JAMAICA_LINE, false).get(), coordsForID(361), 529233, true),
	...selfPointingStationObject("Alabama Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 9, day: 5}), twoTrackIslandLayout(Line.BMT_JAMAICA_LINE, false).get(), coordsForID(376), 371707, true),
	...selfPointingMultiTabStationObject("Broadway Junction", null, {
		...selfPointingPlatformSetObject("Broadway Junction", Line.BMT_JAMAICA_LINE, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 6, day: 14}), threeTrackExpressLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(374)),
		...selfPointingPlatformSetObject("Broadway Junction", Line.BMT_CANARSIE_LINE, StructureType.ELEVATED, DateTime.fromObject({year: 1928, month: 7, day: 14}), [[
			new Track(Line.BMT_CANARSIE_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.ISLAND, false, PlatformService.UP, "Separation at South End"),
			new Track(Line.BMT_CANARSIE_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
			new Platform(PlatformType.SIDE, false, PlatformService.UP),
		]], coordsForID(474)),
		...selfPointingPlatformSetObject("Broadway Junction", Line.IND_FULTON_STREET_LINE, StructureType.ELEVATED, DateTime.fromObject({year: 1946, month: 12, day: 30}), fourTrackExpressLayout(Line.IND_FULTON_STREET_LINE, false, false).get(), coordsForID(136)),
	}, 1808472, true),
	...selfPointingStationObject("Chauncey Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 7, day: 18}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(373), 605650, true),
	...selfPointingStationObject("Halsey Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 8, day: 19}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(375), 1221794, true),
	...selfPointingStationObject("Gates Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1885, month: 5, day: 13}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(20), 1466874, true),
	...selfPointingStationObject("Kosciuszko Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).get(), coordsForID(19), 1310254, true),
	...selfPointingStationObject("Myrtle Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackExpressLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 0, {summary: "Westbound Local"}).override(0, 4, {summary: "Eastbound Local"}).get(), coordsForID(122), 2788090, true),
	...selfPointingStationObject("Flushing Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, true, true).override(0, 1, {summary: "Westbound Local"}).override(0, 3, {summary: "Eastbound Local"}).get(), coordsForID(121), 1658300, true),
	...selfPointingStationObject("Lorimer Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 1, {summary: "Westbound Local"}).override(0, 3, {summary: "Eastbound Local"}).get(), coordsForID(284), 907287, true),
	...selfPointingStationObject("Hewes Street", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, false, false).override(0, 1, {summary: "Westbound Local"}).override(0, 3, {summary: "Eastbound Local"}).get(), coordsForID(259), 671482, true),
	...selfPointingStationObject("Marcy Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1888, month: 6, day: 25}), threeTrackLocalLayout(Line.BMT_JAMAICA_LINE, true, true).override(0, 1, {summary: "Westbound Local"}).override(0, 3, {summary: "Eastbound Local"}).get(), coordsForID(258), 2841630, false),

	// Nassau St Line
	...selfPointingMultiTabStationObject("Delancey Street/Essex Street", null, {
		...selfPointingPlatformSetObject("Essex Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1908, month: 9, day: 16}), [[
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(Line.BMT_NASSAU_STREET_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true, null, "Westbound Local"),
			new Track(Line.BMT_NASSAU_STREET_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true, "Center", "Eastbound Local"),
			new Platform(PlatformType.ISLAND, false, PlatformService.BOTH),
			new Track(Line.BMT_NASSAU_STREET_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true, "South", "Eastbound Local"),
		]], coordsForID(260)),
		...selfPointingPlatformSetObject("Delancey Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 1, day: 1}), twoTrackSideLayout(Line.IND_SIXTH_AVENUE_LINE, false, false).get(), coordsForID(119)),
	}, 7079160, true),
	...selfPointingStationObject("Bowery", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1913, month: 8, day: 4}), 
		fourTrackExpressLayout(Line.BMT_NASSAU_STREET_LINE, false, null)
			.override(0, 2, {type: TrackType.LOCAL, direction: ArrowDirection.RIGHT})
			.override(0, 3, {type: null, direction: null, stops: null, description: "Former Northbound", ...trackbed})
			.override(0, 4, {service: PlatformService.NONE})
			.override(0, 5, {type: null, direction: null, stops: null, description: "Former Northbound"}).get(), coordsForID(190), 879248, true),
	...selfPointingMultiTabStationObject("Canal Street", null, {
		...selfPointingPlatformSetObject("Canal Street", Line.IRT_LEXINGTON_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1904, month: 10, day: 27}), fourTrackLocalLayout(Line.IRT_LEXINGTON_AVENUE_LINE, true, true).get(), coordsForID(107)),
		...selfPointingPlatformSetObject("Canal Street", Line.BMT_NASSAU_STREET_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1913, month: 8, day: 4}), fourTrackExpressLayout(Line.BMT_NASSAU_STREET_LINE, null, false)
			.override(0, 2, {type: TrackType.LOCAL, direction: ArrowDirection.RIGHT})
			.override(0, 3, {type: null, direction: null, stops: null, description: "Former Northbound", ...trackbed})
			.override(0, 4, {service: PlatformService.NONE})
			.override(0, 5, {type: null, direction: null, stops: null, description: "Former Northbound"}).get(), coordsForID(169)), // TODO better way to mark tracks as unused?
		...selfPointingPlatformSetObject("Canal Street", `${Line.BMT_BROADWAY_LINE} Lower Platforms`, StructureType.UNDERGROUND, DateTime.fromObject({year: 1917, month: 9, day: 4}), twoTrackSideLayout(Line.BMT_BROADWAY_LINE, false, false).get(), coordsForID(191)),
		...selfPointingPlatformSetObject("Canal Street", `${Line.BMT_BROADWAY_LINE} Upper Platforms`, StructureType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 1, day: 5}), fourTrackLocalLayout(Line.BMT_BROADWAY_LINE, false, false)
			.override(0, 2, {description: "Center Track", trackDescription: "City Hall Layup"})
			.override(0, 3, {description: "Center Track", trackDescription: "City Hall Layup"}).get(), coordsForID(171)),
	}, 11048920, true),
	...selfPointingMultiTabStationObject("Brooklyn Bridge-City Hall/Chambers Street", null, {
		...selfPointingPlatformSetObject("Brooklyn Bridge-City Hall", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1904, month: 10, day: 27}), fourTrackExpressLayout(Line.IRT_LEXINGTON_AVENUE_LINE, true, true).get(), coordsForID(134)),
		...selfPointingPlatformSetObject("Chambers Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1913, month: 8, day: 4}), [[
			new Platform(PlatformType.SIDE, null, PlatformService.NONE),
			new Track(Line.BMT_NASSAU_STREET_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.ISLAND, true, PlatformService.UP),
			new Track(Line.BMT_NASSAU_STREET_LINE, null, null, null, null, "Center Track"),
			new Platform(PlatformType.SIDE, null, PlatformService.NONE),
			new Track(Line.BMT_NASSAU_STREET_LINE, null, null, null, null, "Center Track"),
			new Platform(PlatformType.ISLAND, true, PlatformService.DOWN),
			new Track(Line.BMT_NASSAU_STREET_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
			new Platform(PlatformType.SIDE, null, PlatformService.NONE, "Mostly Demolished"),
		]], coordsForID(168)),
	}, 5911226, true),
	...selfPointingMultiTabStationObject("Fulton Street", null, {
		...selfPointingPlatformSetObject("Fulton Street", Line.IRT_LEXINGTON_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1905, month: 1, day: 16}), twoTrackSideLayout(Line.IRT_LEXINGTON_AVENUE_LINE, true, true).get(), coordsForID(181)),
		...selfPointingPlatformSetObject("Fulton Street", Line.IRT_BROADWAY_SEVENTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 7, day: 1}), twoTrackIslandLayout(Line.IRT_BROADWAY_SEVENTH_AVENUE_LINE, true).get(), coordsForID(156)),
		...selfPointingPlatformSetObject("Fulton Street", Line.BMT_NASSAU_STREET_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1931, month: 5, day: 29}), twoTrackSeparatedLayout(Line.BMT_NASSAU_STREET_LINE, true, true).get(), coordsForID(167)),
		...selfPointingPlatformSetObject("Fulton Street", Line.IND_EIGHTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1933, month: 2, day: 1}), twoTrackIslandLayout(Line.IND_EIGHTH_AVENUE_LINE, true).get(), coordsForID(109)),
	}, 19221396, true),
	...selfPointingStationObject("Broad Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1931, month: 5, day: 29}), twoTrackSideLayout(Line.BMT_NASSAU_STREET_LINE, false, false).get(), coordsForID(182), 1289698, null),

	// Myrtle Ave Line
	...selfPointingStationObject("Central Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1889, month: 7, day: 20}), threeTrackLocalLayout(Line.BMT_MYRTLE_AVENUE_LINE, false, false).override(0, 2, {summary: "Center Track", ...noTrackOrTrackbed}).get(), coordsForID(21), 886352, true),
	...selfPointingStationObject("Knickerbocker Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1889, month: 8, day: 15}), threeTrackLocalLayout(Line.BMT_MYRTLE_AVENUE_LINE, false, false).override(0, 2, {summary: "Center Track", ...noTrackOrTrackbed}).get(), coordsForID(22), 919957, true),
	...selfPointingMultiTabStationObject("Myrtle-Wyckoff Avenues", null, {
		...selfPointingPlatformSetObject("Myrtle-Wyckoff Avenues", Line.BMT_MYRTLE_AVENUE_LINE, StructureType.ELEVATED, DateTime.fromObject({year: 1889, month: 7, day: 20}), twoTrackIslandLayout(Line.BMT_MYRTLE_AVENUE_LINE, true).get(), coordsForID(389)),
		...selfPointingPlatformSetObject("Myrtle-Wyckoff Avenues", Line.BMT_CANARSIE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1928, month: 7, day: 14}), twoTrackIslandLayout(Line.BMT_CANARSIE_LINE, true).get(), coordsForID(491)),
	}, 5230944, true),
	...selfPointingStationObject("Seneca Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1915, month: 2, day: 22}), twoTrackIslandLayout(Line.BMT_MYRTLE_AVENUE_LINE, false).get(), coordsForID(390), 655571, true),
	...selfPointingStationObject("Forest Avenue", null, StructureType.ELEVATED, DateTime.fromObject({year: 1915, month: 2, day: 22}), twoTrackIslandLayout(Line.BMT_MYRTLE_AVENUE_LINE, false).get(), coordsForID(392), 998920, true),
	...selfPointingStationObject("Fresh Pond Road", null, StructureType.ELEVATED, DateTime.fromObject({year: 1915, month: 2, day: 22}), twoTrackIslandLayout(Line.BMT_MYRTLE_AVENUE_LINE, false).get(), coordsForID(177), 1207460, true),
	...selfPointingStationObject("Middle Village-Metropolitan Avenue", null, StructureType.AT_GRADE, DateTime.fromObject({year: 1915, month: 8, day: 9}), twoTrackIslandLayout(Line.BMT_MYRTLE_AVENUE_LINE, true).get(), coordsForID(178), 1751180, true),

	// 63rd St Lines
	...selfPointingStationObject("21st Street-Queensbridge", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1989, month: 10, day: 29}), twoTrackSideLayout(Line.IND_63RD_STREET_LINE, true, true).get(), coordsForID(93), 886352, true),
	...selfPointingStationObject("Roosevelt Island", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1989, month: 10, day: 29}), twoTrackSideLayout(Line.IND_63RD_STREET_LINE, true, true).get(), coordsForID(99), 1885823, true),
	...selfPointingStationObject("Lexington Avenue-63rd Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1989, month: 10, day: 29}), 
		[[
			new Track(Line.BMT_63RD_STREET_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.ISLAND, true, PlatformService.BOTH),
			new Track(Line.IND_63RD_STREET_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
		], [
			new Track(Line.BMT_63RD_STREET_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
			new Platform(PlatformType.ISLAND, true, PlatformService.BOTH),
			new Track(Line.IND_63RD_STREET_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		]], 
	coordsForID(98), 3781248, true),

	// Sixth Ave Line
	//...selfPointingStationObject("Grand Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1968, month: 7, day: 1}), twoTrackSideLayout(Line.IND_SIXTH_AVENUE_LINE, false, false).get(), coordsForID(188), 5902255, true),

	//...selfPointingStationObject("York Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 4, day: 9}), twoTrackIslandLayout(Line.IND_SIXTH_AVENUE_LINE, false).get(), coordsForID(485), 3603306, true),
	//...selfPointingStationObject("East Broadway", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 1, day: 1}), twoTrackIslandLayout(Line.IND_SIXTH_AVENUE_LINE, false).get(), coordsForID(118), 3596399, true),
	//...selfPointingStationObject("Second Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 1, day: 1}), fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, false, false).get(), coordsForID(120), 4241785, true),
	...selfPointingMultiTabStationObject("Broadway-Lafayette Street/Bleecker Street", null, {
		...selfPointingPlatformSetObject("Broadway-Lafayette Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1936, month: 1, day: 1}), fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, true, true).get(), coordsForID(189)),
		...selfPointingPlatformSetObject("Bleecker Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1904, month: 10, day: 27}), fourTrackLocalLayout(Line.IRT_LEXINGTON_AVENUE_LINE, true, true).get(), coordsForID(192)),
	}, 9991286, true),
	...selfPointingStationObject("West Fourth Street-Washington Square", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1932, month: 9, day: 10}), [[
			new Label({label: Line.IND_EIGHTH_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1932, month: 9, day: 10})}),
			...fourTrackExpressLayout(Line.IND_EIGHTH_AVENUE_LINE, true, true).get()[0],
		], [
			new Label({label: Line.IND_SIXTH_AVENUE_LINE, type: StructureType.UNDERGROUND, opened: DateTime.fromObject({year: 1940, month: 12, day: 15})}),
			...fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, true, true).get()[0],
		]], coordsForID(148), 10872225, true, false
	),
	...selfPointingMultiTabStationObject("14th Street/Sixth Avenue", null, {
		...selfPointingPlatformSetObject("14th Street", Line.IND_SIXTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1940, month: 12, day: 15}), [[
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.SIDE, true, PlatformService.UP),
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(null, null, null, null, null, "PATH Northbound"),
			new Track(null, null, null, null, null, "PATH Southbound"),
			new Platform(PlatformType.SIDE, false, PlatformService.UP),
			new Platform(PlatformType.SIDE, true, PlatformService.DOWN),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
		], [
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.EXPRESS, ArrowDirection.LEFT, false),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.EXPRESS, ArrowDirection.RIGHT, false),
		]], coordsForID(204)),
		...selfPointingPlatformSetObject("Sixth Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1924, month: 9, day: 24}), twoTrackIslandLayout(Line.BMT_CANARSIE_LINE, true).get(), coordsForID(205)),
		...selfPointingPlatformSetObject("14th Street", Line.IRT_BROADWAY_SEVENTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 7, day: 1}), fourTrackExpressLayout(Line.IRT_BROADWAY_SEVENTH_AVENUE_LINE, true).get(), coordsForID(201)),
	}, 10463838, true),
	...selfPointingStationObject("23rd Street", Line.IND_SIXTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1940, month: 12, day: 15}), 
		[[
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.LEFT, true),
			new Platform(PlatformType.SIDE, false, PlatformService.DOWN),
			new Track(null, null, null, null, null, "PATH Northbound"),
			new Track(null, null, null, null, null, "PATH Southbound"),
			new Platform(PlatformType.SIDE, false, PlatformService.UP),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.LOCAL, ArrowDirection.RIGHT, true),
			new Platform(PlatformType.SIDE, false, PlatformService.UP),
		], [
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.EXPRESS, ArrowDirection.LEFT, false),
			new Track(Line.IND_SIXTH_AVENUE_LINE, TrackType.EXPRESS, ArrowDirection.RIGHT, false),
		]], 
	coordsForID(114), 5958666, false),
	...selfPointingMultiTabStationObject("34th Street-Herald Square", null, {
		...selfPointingPlatformSetObject("34th Street-Herald Square", Line.BMT_BROADWAY_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1918, month: 1, day: 5}), fourTrackExpressLayout(Line.BMT_BROADWAY_LINE, true, true).get(), coordsForID(267)),
		...selfPointingPlatformSetObject("34th Street-Herald Square", Line.IND_SIXTH_AVENUE_LINE, StructureType.UNDERGROUND, DateTime.fromObject({year: 1940, month: 12, day: 15}), fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, true, true).get(), coordsForID(115)),
	}, 25012549, true),
	...selfPointingMultiTabStationObject("42nd Street-Bryant Park/Fifth Avenue", null, {
		...selfPointingPlatformSetObject("42nd Street-Bryant Park", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1940, month: 12, day: 15}), fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, false, false).get(), coordsForID(275)),
		...selfPointingPlatformSetObject("Fifth Avenue", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1926, month: 3, day: 22}), twoTrackIslandLayout(Line.IRT_FLUSHING_LINE, false).get(), coordsForID(274)),
	}, gdn("Times Square-42nd Street"), true),
	...selfPointingStationObject("47th-50th Streets-Rockefeller Center", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1940, month: 12, day: 15}), 
		fourTrackExpressLayout(Line.IND_SIXTH_AVENUE_LINE, true, true).override(0, 0, {type: TrackType.EXPRESS}).override(0, 2, {type: TrackType.LOCAL}).get(),
	coordsForID(96), 12514970, true),
	...selfPointingStationObject("57th Street", null, StructureType.UNDERGROUND, DateTime.fromObject({year: 1968, month: 7, day: 1}), twoTrackIslandLayout(Line.IND_SIXTH_AVENUE_LINE, true).get(), coordsForID(97), 3002045, true),
};

/*
Map to reference platform sets without descending into the STATIONS object.
Each platform set represents a dot on the map. Layout, structure type, and date opened are stored at the platform set level.
*/
const PLATFORM_SETS = Object.entries(STATIONS).reduce((acc, [stationKey, station]) => {
	for(const platformSet of Object.values(station.platformSets)){
		const dn = gdn(platformSet.name, platformSet.disambiguator);
		if(acc[dn]){
			throw new Error(`Two platform sets with identical disambiguated name ${dn}`);
		}
		platformSet.tracks = platformSet.layout.flat().filter(el => el.category === "Track");
		platformSet.lines = [...new Set(platformSet.tracks.map(track => track.line))];
		platformSet.stationKey = stationKey;
	}
	return {...acc, ...station.platformSets};
}, {});

const selfPointingServiceSegmentObject = (name, platformSets, northDirection) => {
	const [start, end] = SERVICE_SEGMENT_BORDERS[name];
	return {[name]: new ServiceSegment(name, platformSets, start, end, northDirection)};
};

/*
A service segment is a segment of track used for defining where trains travel and on what track type they travel.
A new service segment must be created if: 
1. A train enters/leaves the segment
2. A train changes track type on the segment (including disambiguated track types)
3. The track enters a different line
4. The arrow direction corresponding to rail north changes
*/
const SERVICE_SEGMENTS = {
	// STATIONS MUST BE LISTED FROM ARROW RIGHT TO LEFT
	...selfPointingServiceSegmentObject("QB1", [gdn("Jamaica-179th Street"), gdn("169th Street"), gdn("Parsons Boulevard"), gdn("Sutphin Boulevard")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB2", [gdn("Briarwood"), gdn("Kew Gardens-Union Turnpike"), gdn("75th Avenue")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB3", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB4", [gdn("Forest Hills-71st Avenue"), gdn("67th Avenue"), gdn("63rd Drive-Rego Park"), gdn("Woodhaven Boulevard", Line.IND_QUEENS_BOULEVARD_LINE), gdn("Grand Avenue-Newtown"), gdn("Elmhurst Avenue")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB5", [gdn("Jackson Heights-Roosevelt Avenue"), gdn("65th Street"), gdn("Northern Boulevard")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB6L", [gdn("46th Street"), gdn("Steinway Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB6E", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB7", [gdn("36th Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QBAS1", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QBAS2", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QBAS3", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB8", [gdn("Queens Plaza")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB9", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB10", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB11", [gdn("Court Square-23rd Street"), gdn("Lexington Avenue-53rd Street"), gdn("Fifth Avenue-53rd Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB12", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("QB6A", [gdn("Seventh Avenue")]),
	...selfPointingServiceSegmentObject("QB13", [gdn("50th Street")], ArrowDirection.RIGHT),

	...selfPointingServiceSegmentObject("AA1", [gdn("Jamaica Center-Parsons/Archer"), gdn("Sutphin Boulevard-Archer Avenue-JFK Airport")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("AA2", [gdn("Jamaica-Van Wyck")], ArrowDirection.RIGHT),

	...selfPointingServiceSegmentObject("J1", [gdn("121st Street"), gdn("111th Street"), gdn("104th Street"), gdn("Woodhaven Boulevard", Line.BMT_JAMAICA_LINE), gdn("85th Street–Forest Parkway"), gdn("75th Street–Elderts Lane"), gdn("Cypress Hills"), gdn("Crescent Street"), gdn("Norwood Avenue"), gdn("Cleveland Street"), gdn("Van Siclen Avenue"), gdn("Alabama Avenue")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("J2", [gdn("Broadway Junction", Line.BMT_JAMAICA_LINE)], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("J3", [gdn("Chauncey Street"), gdn("Halsey Street"), gdn("Gates Avenue"), gdn("Kosciuszko Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("J4", [gdn("Myrtle Avenue")]),
	...selfPointingServiceSegmentObject("J5", [gdn("Flushing Avenue"), gdn("Lorimer Street"), gdn("Hewes Street")]),
	...selfPointingServiceSegmentObject("J6", [gdn("Marcy Avenue")]),

	...selfPointingServiceSegmentObject("MA1", [gdn("Middle Village-Metropolitan Avenue"), gdn("Fresh Pond Road"), gdn("Forest Avenue"), gdn("Seneca Avenue"), gdn("Myrtle-Wyckoff Avenues", Line.BMT_MYRTLE_AVENUE_LINE), gdn("Knickerbocker Avenue"), gdn("Central Avenue")], ArrowDirection.LEFT),

	...selfPointingServiceSegmentObject("NS1", [gdn("Essex Street")]),
	...selfPointingServiceSegmentObject("NS2", [gdn("Bowery"), gdn("Canal Street", Line.BMT_NASSAU_STREET_LINE), gdn("Chambers Street"), gdn("Fulton Street", Line.BMT_NASSAU_STREET_LINE), gdn("Broad Street")], ArrowDirection.RIGHT),

	...selfPointingServiceSegmentObject("6AN", [gdn("57th Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("6AQBE", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("6AQBW", [], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("6A1", [gdn("47th-50th Streets-Rockefeller Center"), gdn("42nd Street-Bryant Park"), gdn("34th Street-Herald Square", Line.IND_SIXTH_AVENUE_LINE), gdn("23rd Street", Line.IND_SIXTH_AVENUE_LINE), gdn("14th Street", Line.IND_SIXTH_AVENUE_LINE)], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("6A8A", [gdn("West Fourth Street-Washington Square")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("6A2", [gdn("Broadway-Lafayette Street")], ArrowDirection.LEFT),
	...selfPointingServiceSegmentObject("6AM", [], ArrowDirection.LEFT),

	...selfPointingServiceSegmentObject("I63S1", [gdn("21st Street-Queensbridge"), gdn("Roosevelt Island")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("IB63S", [gdn("Lexington Avenue-63rd Street")], ArrowDirection.RIGHT),
	...selfPointingServiceSegmentObject("I63S2", [], ArrowDirection.RIGHT),
};

// TODO fill in segments unambiguously? - possibly in the future if a good case comes up but for now this is ok
const segmentsWithLabel = (segments, type, line, northDirection=null, disambiguators={}) => segments.map(s => new SegmentServiceLabel(s, type, line, northDirection, disambiguators))

// All patterns are rail north to south
const SERVICES = {
	[Service.B]: [
		new ServiceInformation(Service.B, "Sixth Avenue Express", [
			// All the way to Bedford Park Blvd
			new ServicePattern("Weekdays 5 - 9 AM and 4 - 7 PM, every other trip 9 AM - 4 PM", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.RUSH_HOURS]: ServiceTimeType.YES, [ServiceTimeComponent.MIDDAYS]: ServiceTimeType.YES})),

			// Terminates at 145 St
			new ServicePattern("Weekdays every other trip 9 AM - 4 PM", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.MIDDAYS]: ServiceTimeType.YES, [ServiceTimeComponent.EVENINGS]: ServiceTimeType.YES})),

			// Select - terminates at Kingsbridge Road and skips 182-183rd st
			new ServicePattern("Three northbound AM rush trips", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT}), null),
		]),
	],

	[Service.D]: [
		new ServiceInformation(Service.D, "Sixth Avenue Express", [
			// Local Bronx, Express Brooklyn
			new ServicePattern("Weekdays 6 AM - 10 PM except rush hours in the peak direction, Weekends 5 AM - 9 PM", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, 
			new ServiceTime({[ServiceTimeComponent.WEEKDAYS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES, [ServiceTimeComponent.PM_RUSH]: ServiceTimeType.NO}), 
			new ServiceTime({[ServiceTimeComponent.WEEKDAYS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES, [ServiceTimeComponent.AM_RUSH]: ServiceTimeType.NO})
			),

			// Express Bronx, Express Brooklyn
			new ServicePattern("Southbound weekday trips 6 - 9 AM, northbound weekday trips 4 - 7 PM", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.PM_RUSH]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.YES})),

			// Local Bronx, Local Brooklyn
			new ServicePattern("10 PM - 5 AM", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})),

			// Select - Local Bronx, Express Brooklyn, begins at 25 Av, north only
			new ServicePattern("Four northbound AM rush trips", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT}), null),

			// Select - Local Bronx, Express Brooklyn, ends at Bay Parkway, south only
			new ServicePattern("Four southbound PM rush and evening trips", [
				...segmentsWithLabel(["QB6A", "6AQBW"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["6A1", "6A8A", "6A2"], TrackType.EXPRESS, Line.IND_SIXTH_AVENUE_LINE),
			], [], null, null, null, new ServiceTime({[ServiceTimeComponent.EVENINGS]: ServiceTimeType.SELECT})),
		]),
	],

	[Service.E]: [
		new ServiceInformation(Service.E, "Eighth Avenue Local", [
			// Full express
			new ServicePattern("Weekdays 7 AM to 7 PM", [
				...segmentsWithLabel(["AA1", "AA2"], TrackType.LOCAL, Line.IND_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11", "QB12", "QB6A", "QB13"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE, ArrowDirection.RIGHT),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.RUSH_HOURS]: ServiceTimeType.YES, [ServiceTimeComponent.MIDDAYS]: ServiceTimeType.YES})),
			// Express after forest hills
			new ServicePattern("Weekends all day, Weekdays 6 - 7 AM and 7 - 9:30 PM", [
				...segmentsWithLabel(["AA1", "AA2"], TrackType.LOCAL, Line.IND_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11", "QB12", "QB6A", "QB13"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE, ArrowDirection.RIGHT),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.EARLY_MORNINGS]: ServiceTimeType.YES, [ServiceTimeComponent.EARLY_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES})),
			// Full local
			new ServicePattern("Northbound trips 10 PM - 5 AM (6 AM Weekends)", [
				...segmentsWithLabel(["AA1", "AA2"], TrackType.LOCAL, Line.IND_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5", "QB6L", "QB7", "QBAS1", "QBAS2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11", "QB12", "QB6A", "QB13"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE, ArrowDirection.RIGHT),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES}), null),
			new ServicePattern("Southbound trips 10 PM - 5 AM (6 AM Weekends)", [
				...segmentsWithLabel(["AA1", "AA2"], TrackType.LOCAL, Line.IND_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["QB2", "QB3", "QB4", "QB5", "QB6L", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11", "QB12", "QB6A", "QB13"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE, ArrowDirection.RIGHT),
			], [], {}, null, null, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})),


			// Select service - Express after Roosevelt av
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", [
				...segmentsWithLabel(["AA1", "AA2"], TrackType.LOCAL, Line.IND_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["QB2", "QB3", "QB4"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11", "QB12", "QB6A", "QB13"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE, ArrowDirection.RIGHT),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.WEEKENDS]: ServiceTimeType.SELECT}), null),
		]),
	],

	[Service.F]: [
		new ServiceInformation(Service.F, "Queens Boulevard Express/Sixth Avenue Local", [
			// Main pattern - express via 53rd
			new ServicePattern("Weekdays 5 AM - 9 PM", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["6AQBE", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS]: ServiceTimeType.YES})),
			
			// Evenings and late nights - local via 63rd
			new ServicePattern("Queens-bound trips 9 PM - 5 AM, Brooklyn-bound trips 11 PM - 5 AM", [
				...segmentsWithLabel(["QB1", "QB2", "QB3", "QB4", "QB5", "QB6L", "QB7", "QBAS1"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["I63S1", "IB63S", "I63S2"], TrackType.LOCAL, Line.IND_63RD_STREET_LINE),
				...segmentsWithLabel(["6AN", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})),
			
			// Weekends and Brooklyn-bound trips 9-11 PM - express via 63rd
			new ServicePattern("Saturdays 6 AM - 9 PM, Sundays 7 AM - 9 PM, Brooklyn-bound trips 9 - 11 PM", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["I63S1", "IB63S", "I63S2"], TrackType.LOCAL, Line.IND_63RD_STREET_LINE),
				...segmentsWithLabel(["6AN", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES})),

			// Select service - Express after Roosevelt av via 63rd
			new ServicePattern("Queens-bound trips Saturdays 6:30 - 7:30 AM and Sundays 6:30 - 8:30 AM", [
				...segmentsWithLabel(["QB1", "QB2", "QB3", "QB4"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB5", "QB6E", "QB7", "QBAS1"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["I63S1", "IB63S", "I63S2"], TrackType.LOCAL, Line.IND_63RD_STREET_LINE),
				...segmentsWithLabel(["6AN", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.WEEKENDS]: ServiceTimeType.SELECT}), null),

			// Select northbound AM rush - Avenue X - Jamaica express via 53rd
			new ServicePattern("Seven Queens-bound AM rush trips", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["6AQBE", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT}), null),

			// Select weekday trips - Kings Highway - Jamaica express via 53rd
			new ServicePattern("Select weekday trips", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["6AQBE", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.WEEKDAYS]: ServiceTimeType.SELECT})),

			// One AM rush trip each direction - Church Avenue - Jamaica express via 53rd
			new ServicePattern("One AM rush trip each direction", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["6AQBE", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT})),
		]),

		// F express train - Culver express, express via 53rd
		new ServiceInformation(Service.Fd, "Queens Boulevard Express/Sixth Avenue Local", [
			new ServicePattern("Rush hours, two trains in each direction", [
				...segmentsWithLabel(["QB1", "QB2"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB3", "QB4", "QB5", "QB6E", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9", "QB10"], TrackType.EXPRESS, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["QB11"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["6AQBE", "6A1", "6A8A", "6A2"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, TrackType.LOCAL)]: false, 
				[gtk(ArrowDirection.RIGHT, TrackType.EXPRESS)]: false, 
				[gtk(ArrowDirection.LEFT, TrackType.LOCAL)]: true, 
				[gtk(ArrowDirection.LEFT, TrackType.EXPRESS)]: true,
			}, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT}), new ServiceTime({[ServiceTimeComponent.PM_RUSH]: ServiceTimeType.SELECT})),
		]),
	],

	[Service.R]: [
		new ServiceInformation(Service.R, "Broadway Local", [
			// Main pattern: Bay Ridge - Forest Hills
			new ServicePattern("Everyday 6 AM - 10:30 PM", [
				...segmentsWithLabel(["QB4", "QB5", "QB6L", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
			], [], null, {}, new ServiceTime({[ServiceTimeComponent.ALL_TIMES_EXCEPT_LATE_NIGHTS]: ServiceTimeType.YES})),

			// Short turn at Queens Plaza
			new ServicePattern("Queens-bound trips 10 PM - Midnight", [
				...segmentsWithLabel(["QB8", "QB9"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
			], [], null, {}, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES}), null),

			// HODO: northbound terminal
			// Short turn at Whitehall Street
			// new ServicePattern("Everyday 11 PM - 5 AM", [
			// ], [], null, {}, new ServiceTime({[ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})),

			// Select - Bay Ridge - 96 st
			// new ServicePattern("One northbound AM rush trip", [
			// ], [], null, {}, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT})),

			// Select - 36 st - Forest Hills
			new ServicePattern("Two northbound afternoon trips", [
				...segmentsWithLabel(["QB4", "QB5", "QB6L", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.AFTERNOON_MIDDAYS]: ServiceTimeType.SELECT}), null),

			// Select - 36 st - Bay Ridge
			// new ServicePattern("Two southbound late night trips", [
			// ], [], null, {}, null, new ServiceTime({[ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.SELECT})),

			// Select - Bay Parkway - Forest Hills (via express?)
			new ServicePattern("One southbound AM rush trip", [
				...segmentsWithLabel(["QB4", "QB5", "QB6L", "QB7", "QBAS1", "QBAS2", "QBAS3", "QB8", "QB9"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
			], [], null, null, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT})),
		]),
	],

	[Service.J]: [
		new ServiceInformation(Service.J, "Nassau Street Local", [
			new ServicePattern("All times except rush hours and middays", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2", "J3", "J4", "J5", "J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "Center"}),
			], [], {}, null, 
			new ServiceTime({[ServiceTimeComponent.EARLY_MORNINGS]: ServiceTimeType.YES, [ServiceTimeComponent.MORNINGS]: ServiceTimeType.YES, [ServiceTimeComponent.EARLY_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES}), 
			new ServiceTime({[ServiceTimeComponent.EARLY_MORNINGS]: ServiceTimeType.YES, [ServiceTimeComponent.AFTERNOONS]: ServiceTimeType.YES, [ServiceTimeComponent.EARLY_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})
			),
			new ServicePattern("Weekday evenings, weekends all day", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2", "J3", "J4", "J5", "J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "South"}),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES})),
			new ServicePattern("Southbound weekday trips 6:30 AM - noon, northbound weekday trips 1 - 7:30 PM", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2", "J3"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE),
				...segmentsWithLabel(["J4", "J5"], TrackType.PEAK_DIRECTION_EXPRESS, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "Center"}),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.AFTERNOON_MIDDAYS]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.MORNING_MIDDAYS]: ServiceTimeType.YES})),
			new ServicePattern("Seven southbound weekday trips 7 - 9 AM, Five northbound weekday trips 5 - 6:30 PM", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2", "J3"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE),
				...segmentsWithLabel(["J4", "J5"], TrackType.PEAK_DIRECTION_EXPRESS, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "Center"}),
			], [gdn("121st Street"), gdn("104th Street"), gdn("75th Street–Elderts Lane"), gdn("Norwood Avenue"), gdn("Van Siclen Avenue"), gdn("Chauncey Street"), gdn("Gates Avenue")], 
			{}, null, new ServiceTime({[ServiceTimeComponent.PM_RUSH]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.YES})),

			// Select
			// HODO how do these terminate?
			new ServicePattern("Three northbound weekday trips 6:30 - 7:30 AM", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE),
			], [], {}, null, new ServiceTime({[ServiceTimeComponent.EARLY_MORNINGS]: ServiceTimeType.SELECT}), null),
			new ServicePattern("Two northbound weekday trips 8:30 - 9 AM, Two southbound weeday trips 4:30 - 5 PM", [
				...segmentsWithLabel(["J2", "J3", "J4", "J5", "J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "Center"}),
			], [], null, null, new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.SELECT}), new ServiceTime({[ServiceTimeComponent.PM_RUSH]: ServiceTimeType.SELECT})),
		]),

		new ServiceInformation(Service.Z, "Nassau Street Express", [
			new ServicePattern("Six southbound weekday trips 7 - 9 AM, six northbound weekday trips 5 - 6:30 PM", [
				...segmentsWithLabel(["AA1"], TrackType.LOCAL, Line.BMT_ARCHER_AVENUE_LINE),
				...segmentsWithLabel(["J1", "J2", "J3"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE),
				...segmentsWithLabel(["J4", "J5"], TrackType.PEAK_DIRECTION_EXPRESS, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["J6"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.RIGHT),
				...segmentsWithLabel(["NS1", "NS2"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.RIGHT, {[ServiceDirection.NORTH]: "Center"}),
			], [gdn("111th Street"), gdn("85th Street–Forest Parkway"), gdn("Cypress Hills"), gdn("Cleveland Street"), gdn("Halsey Street"), gdn("Kosciuszko Street")],
			{}, null, new ServiceTime({[ServiceTimeComponent.PM_RUSH]: ServiceTimeType.YES}), new ServiceTime({[ServiceTimeComponent.AM_RUSH]: ServiceTimeType.YES})),
		]),
	],

	[Service.M]: [
		new ServiceInformation(Service.M, "Queens Boulevard Local/Sixth Avenue Local", [
			// Full pattern
			new ServicePattern("Weekdays 5 AM - 9:30 PM", [
				...segmentsWithLabel(["QB4", "QB5", "QB6L", "QB7", "QBAS1"], TrackType.LOCAL, Line.IND_QUEENS_BOULEVARD_LINE),
				...segmentsWithLabel(["I63S1", "IB63S", "I63S2"], TrackType.LOCAL, Line.IND_63RD_STREET_LINE),
				...segmentsWithLabel(["6AN", "6A1", "6A8A", "6A2", "6AM"], TrackType.LOCAL, Line.IND_SIXTH_AVENUE_LINE),
				...segmentsWithLabel(["NS1"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.LEFT, {[ServiceDirection.SOUTH]: "South"}),
				...segmentsWithLabel(["J6", "J5", "J4"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["MA1"], TrackType.LOCAL, Line.BMT_MYRTLE_AVENUE_LINE),
			], [], null, {}, new ServiceTime({[ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS]: ServiceTimeType.YES})),

			// Short turn at Essex st
			new ServicePattern("Weekdays 9 - 11:30 PM, Weekends 7 AM - 11:30 PM", [
				...segmentsWithLabel(["NS1"], TrackType.LOCAL, Line.BMT_NASSAU_STREET_LINE, ArrowDirection.LEFT, {[ServiceDirection.SOUTH]: "Center"}),
				...segmentsWithLabel(["J6", "J5", "J4"], TrackType.LOCAL, Line.BMT_JAMAICA_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["MA1"], TrackType.LOCAL, Line.BMT_MYRTLE_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.RIGHT, "Center")]: true,
			}, {}, new ServiceTime({[ServiceTimeComponent.LATE_EVENINGS]: ServiceTimeType.YES, [ServiceTimeComponent.WEEKENDS]: ServiceTimeType.YES})),

			// Short turn at Broadway
			new ServicePattern("11:30 PM - 5 AM (7 AM Weekends)", [
				...segmentsWithLabel(["J4"], TrackType.PEAK_DIRECTION_EXPRESS, Line.BMT_JAMAICA_LINE, ArrowDirection.LEFT),
				...segmentsWithLabel(["MA1"], TrackType.LOCAL, Line.BMT_MYRTLE_AVENUE_LINE),
			], [], {
				[gtk(ArrowDirection.BOTH, TrackType.PEAK_DIRECTION_EXPRESS)]: true, 
			}, {}, new ServiceTime({[ServiceTimeComponent.LATE_NIGHTS]: ServiceTimeType.YES})),
		]),
	],
};

/*
Add a service pattern's service time to a track.
For example, if a track already has a service at late nights, and we add the same service on weekdays, that will accumulate to all times except weekends.
When storing service time, we must split in three ways:
1. The service (obviously)
2. The arrow direction the service travels in (such as for peak-direction express tracks)
3. Whether the service stops (this split only comes up for skip-stop service)
Any of these things being different will cause a new line to be shown in the frontend.
For each line, we also store the potential next and last stops for each time.
*/
const accumulateTrackServiceTime = (track, stops, arrowDirection, service, nextStop, lastStop, time) => {
	// This shouldn't happen and is a band aid solution
	if(time === null){
		return;
	}
	const key = gsk(service, stops, arrowDirection);
	const nextKey = gdn(nextStop.stop, nextStop.disambiguator);
	const lastKey = gdn(lastStop.stop, lastStop.disambiguator);
	if(track.service[key] === undefined){
		track.service[key] = new ServiceTimeStops(service, stops, arrowDirection, {
			[nextKey]: new TimeAndName(time, nextStop.stop, nextStop.disambiguator)
		}, {
			[lastKey]: new TimeAndName(time, lastStop.stop, lastStop.disambiguator)
		});
	} else {
		const {nextStopService, lastStopService} = track.service[key];
		if(nextStopService[nextKey] === undefined){
			nextStopService[nextKey] = new TimeAndName(time, nextStop.stop, nextStop.disambiguator);
		} else {
			nextStopService[nextKey].time = accumulateServiceTime([nextStopService[nextKey].time, time]);
		}
		if(lastStopService[lastKey] === undefined){
			lastStopService[lastKey] = new TimeAndName(time, lastStop.stop, lastStop.disambiguator);
		} else {
			lastStopService[lastKey].time = accumulateServiceTime([lastStopService[lastKey].time, time]);
		}
	}
}

const oppositeServiceDirection = (direction) => direction === ServiceDirection.NORTH ? ServiceDirection.SOUTH : ServiceDirection.NORTH;
const oppositeArrowDirection = (direction) => direction === ArrowDirection.RIGHT ? ArrowDirection.LEFT : ArrowDirection.RIGHT;

// TODO can direction logic be simplified
// Fill platform sets with service times, fill servicepattern with stations stopped at/skipped
for(const parentService in SERVICES){
	for(const serviceInformation of SERVICES[parentService]){
		const {service, servicePatterns} = serviceInformation;
		for(const pattern of servicePatterns){
			const {route, skips, northTerminal, southTerminal, northServiceTime, southServiceTime} = pattern;
			if(northServiceTime === null && southServiceTime === null){
				throw new Error("Pattern has no service time");
			}
			const compiledRoute = []; // Array of ServiceStop objects, list of all stations passed through and whether route stops
			// For each service segment
			for(let i = 0; i < route.length; i++){
				const serviceSegment = SERVICE_SEGMENTS[route[i].serviceSegment];
				const {northDirection: segmentNorthDirection} = serviceSegment;
				const {line, type, disambiguators: serviceDisambiguators, northDirection: serviceNorthDirection} = route[i];
				// First, we figure out directions. 
				// Rail direction north/south refers to the subway's internal designation of trains as either northbound or southbound.
				// Arrow direction left/right refers to the frontend's display of a service as traveling to either the right or the left.
				// Which arrow direction corresponds to a rail direction of north
				const northDirection = segmentNorthDirection ?? serviceNorthDirection;
				if(northDirection === null || northDirection === undefined){
					throw new Error(`No north direction defined for service segment ${route[i].serviceSegment}`);
				}
				// Which rail direction corresponds to an arrow direction of right
				const rightDirection = northDirection === ArrowDirection.RIGHT ? ServiceDirection.NORTH : ServiceDirection.SOUTH;
				// Track disambiguators used for each direction (for example, to disambiguate the two eastbound tracks at essex st)
				const rightServiceDisambiguator = serviceDisambiguators[ServiceDirection.BOTH] ?? serviceDisambiguators[rightDirection];
				const leftServiceDisambiguator = serviceDisambiguators[ServiceDirection.BOTH] ?? serviceDisambiguators[oppositeServiceDirection(rightDirection)];
				// For a one-way service pattern, which arrow direction we shouldn't assign to
				let ignoreArrowDirection = null;
				// For a one-way service pattern, which rail direction we shouldn't assign to
				let ignoreServiceDirection = null;
				if(northServiceTime === null){
					ignoreArrowDirection = northDirection;
					ignoreServiceDirection = ServiceDirection.NORTH;
				} else if(southServiceTime === null){
					ignoreArrowDirection = oppositeArrowDirection(northDirection);
					ignoreServiceDirection = ServiceDirection.SOUTH;
				}
				// Check that the service segment is connected to the ones before and after
				if(i !== 0){
					const {serviceSegment: lastServiceSegment} = route[i - 1];
					if(!serviceSegment.start.includes(lastServiceSegment) && !serviceSegment.end.includes(lastServiceSegment)){
						throw new Error(`${route[i].serviceSegment} has no connection to ${lastServiceSegment}`);
					}
				}
				if(i !== route.length - 1){
					const {serviceSegment: nextServiceSegment} = route[i + 1];
					if(!serviceSegment.start.includes(nextServiceSegment) && !serviceSegment.end.includes(nextServiceSegment)){
						throw new Error(`${route[i].serviceSegment} has no connection to ${nextServiceSegment}`);
					}
				}
				// Make sure that we're processing the platform sets in the correct order. All platform sets must be right to left in the service segment object.
				const platformSets = northDirection === ArrowDirection.RIGHT ? serviceSegment.platformSets : serviceSegment.platformSets.toReversed();
				for(let j = 0; j < platformSets.length; j++){
					const platformSet = PLATFORM_SETS[platformSets[j]];
					let tracksNorth = null;
					let tracksSouth = null;
					// Null terminals case indicates "default" terminal - one termination track and one active track, despite being a terminal this falls through to the next section
					// See ServicePattern object documentation
					if(((i === 0 && j === 0) && northTerminal !== null) || ((i === route.length - 1 && j === platformSets.length - 1) && southTerminal !== null)){
						// Terminal information for the terminal we're looking at and what direction service leaving that terminal travels in
						const [terminal, terminalServiceDirection] = (i === 0 && j === 0) ? [northTerminal, ServiceDirection.SOUTH] : [southTerminal, ServiceDirection.NORTH];
						// Whether to ignore termination tracks. For services only traveling north, ignore termination tracks at the south terminal, and vice versa.
						const ignoreTerminationTracks = ignoreServiceDirection === oppositeServiceDirection(terminalServiceDirection);
						const filteredTracks = platformSet.tracks.filter(track => track.line === line).map(track => ({track, stops: track.stops}));
						// Empty object means that all tracks are active
						const terminationTracks = (Object.entries(terminal).length === 0 || ignoreTerminationTracks) ? [] : filteredTracks.filter(({track}) => terminal[track.terminalKey] === false);
						// Unlike termination tracks, we never ignore active tracks. 
						// If we did, then a one-way service pattern at a terminal with all active tracks would not show up as stopping at that station - because all tracks at that terminal are going in the opposite direciton.
						// I think this works in all cases but I'm not 100% sure.
						const activeTracks = Object.entries(terminal).length === 0 ? filteredTracks : filteredTracks.filter(({track}) => terminal[track.terminalKey] === true);
						[tracksNorth, tracksSouth] = terminalServiceDirection === ServiceDirection.NORTH ? [activeTracks, terminationTracks] : [terminationTracks, activeTracks];
					} else {
						let tracksRight = [];
						let tracksLeft = [];
						for(const track of platformSet.tracks){
							// Assign trains going in arrow direction right
							if(ignoreArrowDirection !== ArrowDirection.RIGHT && (track.direction === ArrowDirection.RIGHT || track.direction === ArrowDirection.BOTH) && track.type === type && track.line === line && (track.disambiguator === null || track.disambiguator === rightServiceDisambiguator)){
								if(track.trackDescription || !track.showTrack){
									throw new Error("Track with description or hidden track has service");
								}
								tracksRight = [{track, stops: track.stops && !skips.includes(gdn(platformSet.name, platformSet.disambiguator))}];
							}
							// Assign trains going in arrow direction left
							if(ignoreArrowDirection !== ArrowDirection.LEFT && (track.direction === ArrowDirection.LEFT || track.direction === ArrowDirection.BOTH) && track.type === type && track.line === line && (track.disambiguator === null || track.disambiguator === leftServiceDisambiguator)){
								if(track.trackDescription || !track.showTrack){
									throw new Error("Track with description or hidden track has service");
								}
								tracksLeft = [{track, stops: track.stops && !skips.includes(gdn(platformSet.name, platformSet.disambiguator))}];
							}
						}
						if((tracksRight.length === 0 && ignoreArrowDirection !== ArrowDirection.RIGHT) || (tracksLeft.length === 0 && ignoreArrowDirection !== ArrowDirection.LEFT)){
							throw new Error(`Track of type ${type} not found in ${platformSet.name}`);
						}
						[tracksNorth, tracksSouth] = northDirection === ArrowDirection.RIGHT ? [tracksRight, tracksLeft] : [tracksLeft, tracksRight];
					}
					// Assign directions used as the track description (ie "Northbound"), if trains travel in both directions a manually specified description will be needed (except for peak direction express)
					for(const {track} of tracksNorth){
						if(track.serviceDirection === null){
							track.serviceDirection = ServiceDirection.NORTH;
						} else if(track.serviceDirection === ServiceDirection.SOUTH){
							track.serviceDirection = ServiceDirection.BOTH;
						}
					}
					for(const {track} of tracksSouth){
						if(track.serviceDirection === null){
							track.serviceDirection = ServiceDirection.SOUTH;
						} else if(track.serviceDirection === ServiceDirection.NORTH){
							track.serviceDirection = ServiceDirection.BOTH;
						}
					}
					compiledRoute.push(new ServiceStop(platformSet.name, platformSet.disambiguator, tracksNorth, tracksSouth, northDirection));
				}
			}
			pattern.compiledRoute = compiledRoute;
			const lastStopNorth = compiledRoute[0];
			const lastStopSouth = compiledRoute[compiledRoute.length - 1];
			for(let i = 0; i < compiledRoute.length; i++){
				// For each stop, figure out the next stop in each direction.
				const {tracksNorth, tracksSouth, northDirection} = compiledRoute[i];
				const nextStopNorth = compiledRoute.toReversed().find((el, index) => (el.tracksNorth.some(({stops}) => stops) || index === compiledRoute.length - 1) && index >= (compiledRoute.length - i)) ?? {stop: "", disambiguator: null};
				const nextStopSouth = compiledRoute.find((el, index) => (el.tracksSouth.some(({stops}) => stops) || index === compiledRoute.length - 1) && index > i) ?? {stop: "", disambiguator: null};
				for(const {track, stops} of tracksNorth){
					accumulateTrackServiceTime(track, stops, northDirection, service, nextStopNorth, lastStopNorth, northServiceTime);
				}
				for(const {track, stops} of tracksSouth){
					accumulateTrackServiceTime(track, stops, northDirection === ArrowDirection.RIGHT ? ArrowDirection.LEFT : ArrowDirection.RIGHT, service, nextStopSouth, lastStopSouth, southServiceTime);
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
			track.service[service].serviceTime = accumulateServiceTime(Object.values(track.service[service].nextStopService).map(stopService => stopService.time));
			// Verify that all tracks have something to display in the summary section
			if(track.direction === null && track.summary === null){
			// TODO uncomment this when the project has been completed - uncommenting it before will cause it to throw on unfinished multi-platform stations
			//if((track.serviceDirection === null && (track.serviceDirection === ServiceDirection.BOTH && track.direction !== ArrowDirection.BOTH)) && track.summary === null){
				throw new Error(`Track in platformSet ${gdn(platformSet.name, platformSet.disambiguator)} has no summary`);
			}
		}
	}
}

// Assign station boardings ranks
let previousBoardings = null;
// This is used in the unlikely case of a tie
let carriedRanks = 0;
Object.values(STATIONS).toSorted((a, b) => {
	if(typeof a.boardings === "string"){
		return 1;
	} else if(typeof b.boardings === "string"){
		return -1;
	}
	return b.boardings - a.boardings;
}).forEach((station, index) => {
	if(typeof station.boardings === "string"){
		if(STATIONS[station.boardings] === undefined){
			// TODO uncomment after adding times square
			// throw new Error(`Unrecognized parent station ${station.boardings}`);
		}
	} else {
		station.rank = index + 1 - carriedRanks;
		if(previousBoardings === station.boardings && station.countRank){
			carriedRanks++;
		} else {
			carriedRanks = 0;
		}
		previousBoardings = station.boardings;
	}
});
const MIN_BOARDINGS = Math.min(...Object.values(STATIONS).filter(({boardings}) => typeof boardings === "number").map(({boardings}) => boardings));
const MAX_RANK = Math.max(...Object.values(STATIONS).map(({rank}) => rank));

export {TRACK_SEGMENTS, SERVICES, STATIONS, PLATFORM_SETS, MIN_BOARDINGS, MAX_RANK}