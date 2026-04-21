import {DateTime} from "luxon";
import {
	Line,
	StructureType,
	Division,
	SignalingType,
	Company,
} from "./enums.js";
import trackData from "./track.json";
import stationsData from "./stations.json";

function fillInSegments(startSegment, endSegment){
	const _fillInSegments = (segment, start, segments) => {
		const boundary = start ? trackData[segment].start : trackData[segment].end;
		if(boundary?.length !== 1){
			return null;
		}
		const nextSegment = boundary[0];
		const newSegments = [...segments, nextSegment];
		if(nextSegment === endSegment){
			return newSegments;
		}
		const nextSegmentData = trackData[nextSegment];
		if(nextSegmentData.start.includes(segment)){
			return nextSegmentData.start?.length === 1 ? _fillInSegments(nextSegment, false, newSegments) : null;
		} else if(nextSegmentData.end.includes(segment)){
			return nextSegmentData.end?.length === 1 ? _fillInSegments(nextSegment, true, newSegments) : null;
		} else {
			throw new Error(`${segment} is next to ${nextSegment} but latter is not next to former`);
		}
	};
	if(startSegment === endSegment){
		return [startSegment];
	}
	// No way to tell initial direction so try both
	return _fillInSegments(startSegment, true, [startSegment]) ?? _fillInSegments(startSegment, false, [startSegment]);
}

// Given an array of "nodes", assign attributes to all segments between the first node and the last node.
// A node is the segment before and after a border, such as a junction.
// This excludes the start segment of the first node and the end segment of the last node. 
// This is a bit counterintuitive, but makes the actual code of assigning the segments simpler and less error-prone.
function assignAttributes(segmentNodesLists, attrs){
	for(const segmentNodes of segmentNodesLists){
		let startSegment = null;
		let endSegment = null;
		for(let i = 0; i < segmentNodes.length; i++){
			const [segment1, segment2] = segmentNodes[i];
			if(startSegment === null){
				if(segment2 === null){
					throw new Error("Unexpected null segment");
				}
				startSegment = segment2;
				continue;
			}
			if(segment1 === null){
				throw new Error("Unexpected null segment");
			}
			endSegment = segment1;
			const segments = fillInSegments(startSegment, endSegment);
			if(segments === null){
				throw new Error(`Cannot unambiguously fill in ${startSegment} to ${endSegment}`);
			}
			segments.forEach((segment) => {Object.assign(trackData[segment], attrs)});
			if(segment2 === null && i !== segmentNodes.length - 1){
				throw new Error("Unexpected null segment");
			}
			startSegment = segment2;
		}
	}
}

function assignAttributesToLine(line, attrs){
	Object.values(trackData).filter((segment) => segment.lines?.includes(line)).forEach((segment) => {
		for(const key of Object.keys(attrs)){
			if(Object.hasOwn(segment, key)){
				throw new Error(`${segment.id} already has property ${key}`);
			}
		}
		Object.assign(segment, attrs);
	});
}

function assignAttributesToLineRemainder(line, attrs){
	Object.values(trackData).filter((segment) => segment.lines?.includes(line)).forEach((segment) => {
		for(const [key, value] of Object.entries(attrs)){
			if(!Object.hasOwn(segment, key)){
				segment[key] = value;
			}
		}
	});
}

// ALL NODES ARE NORTH TO SOUTH. This must be maintained for the assignAttributes function to work.
// Queens Boulevard Line
const queensBlvdN = [null, 8103225];
const queensBlvd169StN = [8102439, 8102844];
const queensBlvdArcherAv = [8104061, 8104062];
const queensBlvdUnionTpkN = [257958, 8102878];
const queensBlvd75AvS = [8102893, 8102892];
const queensBlvd71AvN = [8100578, 239450];
const queensBlvdRooseveltAvN = [8101155, 8103190];
const queensBlvdNSplitS = [8104112, null]
const queensBlvdLocalSplitN = [null, 8102522];
const queensBlvdExpressSplitN = [null, 8104111];
const queensBlvdLocalSplitS = [8103177, null];
const queensBlvdExpressSplitS = [8102200, null];
const queensBlvdSSplitN = [null, 8103173]
const queensBlvdAstoriaN = [8103172, 8102314];
const queensBlvdAstoria63rdSt = [8102314, 348670];
const queensBlvdQueensPlazaN = [348669, 8100245];
const queensBlvdAstoriaS = [8104073, 8103229];
const queensBlvdQueensPlazaS = [8100848, 8100492];
const queensBlvdBroadway = [8100255, 254857];
const queensBlvdCrosstown = [8103160, 254711];
const queensBlvdSixthAvE = [271352, 8103489];
const queensBlvdSixthAvW = [8104491, 269864];
const queensBlvdEighthAv = [8103486, 8103491];
const queensBlvdS = [8103491, null];
assignAttributes([[queensBlvdN, queensBlvdArcherAv, queensBlvdNSplitS], [queensBlvdLocalSplitN, queensBlvdLocalSplitS], [queensBlvdExpressSplitN, queensBlvdExpressSplitS], [queensBlvdSSplitN, queensBlvdAstoriaN], [queensBlvdAstoriaS, queensBlvdBroadway, queensBlvdCrosstown, queensBlvdSixthAvE, queensBlvdSixthAvW], [queensBlvdEighthAv, queensBlvdS]], {lines: [Line.IND_QUEENS_BOULEVARD_LINE]});
assignAttributes([[queensBlvdAstoriaN, queensBlvdAstoria63rdSt, queensBlvdAstoriaS]], {lines: [Line.IND_QUEENS_BOULEVARD_LINE, Line.BMT_ASTORIA_LINE]});
assignAttributes([[queensBlvdSixthAvW, queensBlvdEighthAv]], {lines: [Line.IND_QUEENS_BOULEVARD_LINE, Line.IND_SIXTH_AVENUE_LINE]});

// TODO lol
assignAttributes([[queensBlvdN, queensBlvdArcherAv]], {total_tracks: 4, used_tracks: 2, unused_tracks: 2});
assignAttributes([[queensBlvdArcherAv, queensBlvdNSplitS], [queensBlvdSSplitN, queensBlvdAstoriaN], [queensBlvdAstoriaS, queensBlvdBroadway, queensBlvdCrosstown]], {total_tracks: 4, used_tracks: 4, unused_tracks: 0});
assignAttributes([[queensBlvdAstoriaN, queensBlvdAstoria63rdSt, queensBlvdQueensPlazaN]], {total_tracks: 7, used_tracks: 6, unused_tracks: 1});
assignAttributes([[queensBlvdQueensPlazaN, queensBlvdAstoriaS]], {total_tracks: 6, used_tracks: 6, unused_tracks: 0});
assignAttributesToLineRemainder(Line.IND_QUEENS_BOULEVARD_LINE, {total_tracks: 2, used_tracks: 2, unused_tracks: 0});

// TODO was astoria line opened earlier?
assignAttributes([[queensBlvdN, queensBlvd169StN]], {opened: DateTime.fromObject({year: 1950, month: 12, day: 10})});
assignAttributes([[queensBlvd169StN, queensBlvdArcherAv, queensBlvdUnionTpkN]], {opened: DateTime.fromObject({year: 1937, month: 4, day: 24})});
assignAttributes([[queensBlvdUnionTpkN, queensBlvdRooseveltAvN]], {opened: DateTime.fromObject({year: 1936, month: 12, day: 31})});
assignAttributesToLineRemainder(Line.IND_QUEENS_BOULEVARD_LINE, {opened: DateTime.fromObject({year: 1933, month: 8, day: 19})});

assignAttributesToLine(Line.IND_QUEENS_BOULEVARD_LINE, {obf: Company.IND});
assignAttributesToLine(Line.IND_QUEENS_BOULEVARD_LINE, {type: StructureType.UNDERGROUND}); // TODO ??
assignAttributesToLine(Line.IND_QUEENS_BOULEVARD_LINE, {division: Division.B});

assignAttributes([[queensBlvdN, queensBlvdArcherAv, queensBlvdUnionTpkN]], {signaling: SignalingType.BLOCK});
assignAttributesToLineRemainder(Line.IND_QUEENS_BOULEVARD_LINE, {signaling: SignalingType.COMMUNICATION_BASED});

// 179th st - archer av junction
assignAttributes([[queensBlvdN, queensBlvdArcherAv]], {service_segment: "QB1"});
// Archer av junction - after 75 av
assignAttributes([[queensBlvdArcherAv, queensBlvd75AvS]], {service_segment: "QB2"});
// after 75 av - 71 av (f train express, m/r not running)
assignAttributes([[queensBlvd75AvS, queensBlvd71AvN]], {service_segment: "QB3"});
// 71 av - roosevelt av
assignAttributes([[queensBlvd71AvN, queensBlvdRooseveltAvN]], {service_segment: "QB4"});
// Roosevelt av - Northern blvd
assignAttributes([[queensBlvdRooseveltAvN, queensBlvdNSplitS]], {service_segment: "QB5"});
// Split tracks
assignAttributes([[queensBlvdLocalSplitN, queensBlvdLocalSplitS]], {service_segment: "QB6L"});
assignAttributes([[queensBlvdExpressSplitN, queensBlvdExpressSplitS]], {service_segment: "QB6E"});
// After split tracks to astoria overlap
assignAttributes([[queensBlvdSSplitN, queensBlvdAstoriaN]], {service_segment: "QB7"});
// Astoria overlap to 63rd st junction
assignAttributes([[queensBlvdAstoriaN, queensBlvdAstoria63rdSt]], {service_segment: "QBAS1"});
// 63rd st junction to just before queens plaza
assignAttributes([[queensBlvdAstoria63rdSt, queensBlvdQueensPlazaN]], {service_segment: "QBAS2"});
// Queens plaza to end of astoria overlap (next two northbound M/night E on express track)
assignAttributes([[queensBlvdQueensPlazaN, queensBlvdAstoriaS]], {service_segment: "QBAS3"});
// End of astoria overlap to after Queens plaza
assignAttributes([[queensBlvdAstoriaS, queensBlvdQueensPlazaS]], {service_segment: "QB8"});
// Just after Queens plaza to broadway (line) junction
assignAttributes([[queensBlvdQueensPlazaS, queensBlvdBroadway]], {service_segment: "QB9"});
// Broadway (line) junction to crosstown line junction
assignAttributes([[queensBlvdBroadway, queensBlvdCrosstown]], {service_segment: "QB10"});
// Crosstown line junction to first 6th av junction
assignAttributes([[queensBlvdCrosstown, queensBlvdSixthAvE]], {service_segment: "QB11"});
// Small area between 6th av junctions
assignAttributes([[queensBlvdSixthAvE, queensBlvdSixthAvW]], {service_segment: "QB12"});
// Second 6th av junction to 8th av n/s junction
assignAttributes([[queensBlvdSixthAvW, queensBlvdEighthAv]], {service_segment: "QB6A"});
// 8th av s junction
assignAttributes([[queensBlvdEighthAv, queensBlvdS]], {service_segment: "QB13"});

assignAttributesToLine(Line.IND_QUEENS_BOULEVARD_LINE, {visible: true});

const archerAvN = [null, 8102840];
const indBmtArcherAvS = [8102837, null]
const indArcherAvJunction = [null, 8104064];
const indArcherAvS = [8102858, null];
const bmtArcherAvJunction = [null, 8104065];
const bmtArcherAvUndergroundElevated = [8104564, 8102849];
const bmtArcherAvS = [8102849, null]; // Border not well defined, defined as when tracks start curving
assignAttributes([[archerAvN, indBmtArcherAvS]], {
	lines: [Line.IND_ARCHER_AVENUE_LINE, Line.BMT_ARCHER_AVENUE_LINE], 
	total_tracks: 4, 
	used_tracks: 4, 
	unused_tracks: 0, 
	opened: DateTime.fromObject({year: 1988, month: 12, day: 11}), 
	obf: Company.MTA, 
	type: StructureType.UNDERGROUND, 
	division: Division.B, 
	signaling: SignalingType.BLOCK,
	service_segment: "AA1",
});
assignAttributes([[indArcherAvJunction, indArcherAvS]], {
	lines: [Line.IND_ARCHER_AVENUE_LINE], 
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
	opened: DateTime.fromObject({year: 1988, month: 12, day: 11}), 
	obf: Company.MTA, 
	type: StructureType.UNDERGROUND, 
	division: Division.B, 
	signaling: SignalingType.BLOCK,
	service_segment: "AA2",
});
assignAttributes([[bmtArcherAvJunction, bmtArcherAvS]], {
	lines: [Line.BMT_ARCHER_AVENUE_LINE], 
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
	opened: DateTime.fromObject({year: 1988, month: 12, day: 11}), 
	obf: Company.MTA, 
	division: Division.B, 
	signaling: SignalingType.BLOCK,
	service_segment: "J1",
});
assignAttributes([[bmtArcherAvJunction, bmtArcherAvUndergroundElevated]], {type: StructureType.UNDERGROUND});
assignAttributes([[bmtArcherAvUndergroundElevated, bmtArcherAvS]], {type: StructureType.ELEVATED});
assignAttributesToLine(Line.IND_ARCHER_AVENUE_LINE, {visible: true});
assignAttributesToLineRemainder(Line.BMT_ARCHER_AVENUE_LINE, {visible: true});

const jamaicaN = [null, 8102848];
const jamaica111thStN = [8100219, 8102674];
const jamaicaCypressHillsN = [8102346, 8102680];
const jamaicaFultonSt = [8102344, 8101895]; // TODO how/why is this used?
const jamaica2to3Track = [8102931, 8102930];
const jamaicaVanSiclenAvN = [8100645, 8101152];
const jamaicaCanarsie = [8102928, 8103982]; // and this?
const jamaicaBroadwayJunctionS = [8100402, 8102505];
const jamaicaGatesAvN = [8102386, 8102497];
const jamaicaLexingtonAv = [8101428, 8100690];
const jamaicaMyrtleAv = [8102697, 8104712];
const jamaicaMyrtleAvS = [8101769, 8101833];
const jamaicaMarcyAvN = [8101246, 8102495];
const jamaica3to2Track = [8101739, 8103228];
const jamaicaS = [306952, null]; // Arbitrary
assignAttributes([[jamaicaN, jamaicaMyrtleAv, jamaicaS]], {
	lines: [Line.BMT_JAMAICA_LINE],
	type: StructureType.ELEVATED,
	division: Division.B,
	signaling: SignalingType.BLOCK,
	obf: Company.BMT,
});
assignAttributes([[jamaica2to3Track, jamaicaMyrtleAv]], {total_tracks: 3, used_tracks: 2, unused_tracks: 1});
assignAttributes([[jamaicaMyrtleAvS, jamaica3to2Track]], {total_tracks: 3, used_tracks: 3, unused_tracks: 0});
assignAttributesToLineRemainder(Line.BMT_JAMAICA_LINE, {total_tracks: 2, used_tracks: 2, unused_tracks: 0});
assignAttributes([[jamaicaN, jamaica111thStN]], {opened: DateTime.fromObject({year: 1918, month: 7, day: 3})});
assignAttributes([[jamaica111thStN, jamaicaCypressHillsN]], {opened: DateTime.fromObject({year: 1917, month: 5, day: 28})});
assignAttributes([[jamaicaCypressHillsN, jamaicaVanSiclenAvN]], {opened: DateTime.fromObject({year: 1893, month: 5, day: 30})});
assignAttributes([[jamaicaVanSiclenAvN, jamaicaFultonSt]], {opened: DateTime.fromObject({year: 1885, month: 12, day: 3})});
assignAttributes([[jamaicaFultonSt, jamaicaCanarsie]], {opened: DateTime.fromObject({year: 1885, month: 9, day: 5})});
assignAttributes([[jamaicaCanarsie, jamaicaGatesAvN]], {opened: DateTime.fromObject({year: 1885, month: 6, day: 14})});
assignAttributes([[jamaicaGatesAvN, jamaicaLexingtonAv]], {opened: DateTime.fromObject({year: 1885, month: 5, day: 13})});
assignAttributes([[jamaicaLexingtonAv, jamaicaMyrtleAv, jamaica3to2Track]], {opened: DateTime.fromObject({year: 1888, month: 6, day: 25})});
assignAttributes([[jamaica3to2Track, jamaicaS]], {opened: DateTime.fromObject({year: 1908, month: 9, day: 16})}); // TODO this date might not be accurate
assignAttributes([[jamaicaCanarsie, jamaicaBroadwayJunctionS]], {service_segment: "J2"});
assignAttributes([[jamaicaBroadwayJunctionS, jamaicaMyrtleAv]], {service_segment: "J3"});
assignAttributes([[jamaicaMyrtleAv, jamaicaMyrtleAvS]], {service_segment: "J4"});
assignAttributes([[jamaicaMyrtleAvS, jamaicaMarcyAvN]], {service_segment: "J5"});
assignAttributes([[jamaicaMarcyAvN, jamaicaS]], {service_segment: "J6"});
assignAttributesToLineRemainder(Line.BMT_JAMAICA_LINE, {service_segment: "J1"});
assignAttributesToLine(Line.BMT_JAMAICA_LINE, {visible: true});

const myrtleN = [null, 8107884];
const myrtleBroadwayConnectionS = [8107885, 8104711];
const myrtleWyckoffN = [8102702, 8102704];
const myrtleFreshPondS = [8107876, 8107877];
const myrtleS = [8104026, null];
assignAttributes([[myrtleN, myrtleS]], {
	lines: [Line.BMT_MYRTLE_AVENUE_LINE],
	division: Division.B,
	signaling: SignalingType.BLOCK,
	obf: Company.BMT,
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
	service_segment: "MA1",
});
assignAttributes([[myrtleFreshPondS, myrtleS]], {type: StructureType.EMBANKMENT});
assignAttributesToLineRemainder(Line.BMT_MYRTLE_AVENUE_LINE, {type: StructureType.ELEVATED});
assignAttributes([[myrtleN, myrtleBroadwayConnectionS]], {opened: DateTime.fromObject({year: 1914, month: 7, day: 29})});
assignAttributes([[myrtleBroadwayConnectionS, myrtleWyckoffN]], {opened: DateTime.fromObject({year: 1889, month: 4, day: 27})});
assignAttributesToLineRemainder(Line.BMT_MYRTLE_AVENUE_LINE, {opened: DateTime.fromObject({year: 1915, month: 2, day: 22})});
assignAttributesToLine(Line.BMT_MYRTLE_AVENUE_LINE, {visible: true});

const nassauN = [null, 308228];
const nassauElevatedUnderground = [333941, 8103384];
const nassauEssexS = [8103383, 8101497];
const nassauChambersS = [8103882, 8103883];
const nassauBroadS = [8103307, 2];
const nassauS = [2, null];
assignAttributes([[nassauN, nassauEssexS, nassauS]], {
	lines: [Line.BMT_NASSAU_STREET_LINE],
	division: Division.B,
	signaling: SignalingType.BLOCK,
	obf: Company.BMT,
});
assignAttributes([[nassauN, nassauElevatedUnderground]], {
	type: StructureType.ELEVATED,
});
assignAttributesToLineRemainder(Line.BMT_NASSAU_STREET_LINE, {type: StructureType.UNDERGROUND});
assignAttributes([[nassauN, nassauEssexS]], {
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
});
assignAttributes([[nassauEssexS, nassauChambersS]], {
	total_tracks: 4, 
	used_tracks: 2, 
	unused_tracks: 2,
});
assignAttributes([[nassauChambersS, nassauBroadS]], {
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
});
assignAttributes([[nassauBroadS, nassauS]], {
	total_tracks: 2, 
	used_tracks: 0, 
	unused_tracks: 2,
});
assignAttributes([[nassauN, nassauEssexS]], {opened: DateTime.fromObject({year: 1908, month: 9, day: 16})});
assignAttributes([[nassauEssexS, nassauChambersS]], {opened: DateTime.fromObject({year: 1913, month: 8, day: 4})});
assignAttributes([[nassauChambersS, nassauS]], {opened: DateTime.fromObject({year: 1931, month: 5, day: 29})});
assignAttributes([[nassauN, nassauEssexS]], {service_segment: "NS1"});
assignAttributes([[nassauEssexS, nassauBroadS]], {service_segment: "NS2"});
assignAttributesToLine(Line.BMT_NASSAU_STREET_LINE, {visible: true});

// TODO add grand st and east broadway branches of sixth av line
const sixthNBranchN = [null, 8101861];
const sixthNBranchS = [8101748, null];
const sixthQBLJunctionEastN = [null, 8103488];
const sixthQBLJunctionWestN = [null, 8103487];
const sixthQBLJunctionEastS = [8103488, null];
const sixthQBLJunctionWestS = [8103487, null];
const sixthMainBranchN = [null, 8103474];
const sixthEighthN = [8103421, 8103418];
const sixthEighthS = [8103412, 264224];
const sixthBwayLfyetN = [8103375, 8103374];
const sixthMainBranchS = [262978, null];
const sixthMBranchN = [null, 312075];
const sixthMBranchS = [312050, null];
assignAttributes([[sixthNBranchN, sixthNBranchS], [sixthQBLJunctionEastN, sixthQBLJunctionEastS], [sixthQBLJunctionWestN, sixthQBLJunctionWestS], [sixthMainBranchN, sixthEighthN], [sixthEighthS, sixthMainBranchS], [sixthMBranchN, sixthMBranchS]], {lines: [Line.IND_SIXTH_AVENUE_LINE]});
assignAttributes([[sixthEighthN, sixthEighthS]], {
	lines: [Line.IND_EIGHTH_AVENUE_LINE, Line.IND_SIXTH_AVENUE_LINE],
	total_tracks: 8, 
	used_tracks: 8, 
	unused_tracks: 0,
	opened: DateTime.fromObject({year: 1932, month: 9, day: 10}),
});
assignAttributesToLineRemainder(Line.IND_SIXTH_AVENUE_LINE, {
	division: Division.B,
	signaling: SignalingType.BLOCK,
	type: StructureType.UNDERGROUND,
});
assignAttributes([[sixthNBranchN, sixthNBranchS], [sixthQBLJunctionEastN, sixthQBLJunctionEastS], [sixthQBLJunctionWestN, sixthQBLJunctionWestS], [sixthMBranchN, sixthMBranchS]], {
	total_tracks: 2, 
	used_tracks: 2, 
	unused_tracks: 0,
});
assignAttributes([[sixthMainBranchN, sixthEighthN], [sixthEighthS, sixthMainBranchS]], {
	total_tracks: 4,
	used_tracks: 4,
	unused_tracks: 0,
});
assignAttributes([[sixthNBranchN, sixthNBranchS], [sixthMBranchN, sixthMBranchS]], {
	opened: DateTime.fromObject({year: 1968, month: 7, day: 1}),
	obf: Company.MTA,
});
assignAttributes([[sixthQBLJunctionEastN, sixthQBLJunctionEastS], [sixthQBLJunctionWestN, sixthQBLJunctionWestS], [sixthMainBranchN, sixthEighthN, sixthEighthS, sixthMainBranchS]], {obf: Company.IND});
assignAttributes([[sixthQBLJunctionEastN, sixthQBLJunctionEastS], [sixthQBLJunctionWestN, sixthQBLJunctionWestS], [sixthMainBranchN, sixthEighthN], [sixthEighthS, sixthBwayLfyetN]], {opened: DateTime.fromObject({year: 1940, month: 12, day: 15})});
assignAttributes([[sixthBwayLfyetN, sixthMainBranchS]], {opened: DateTime.fromObject({year: 1936, month: 1, day: 1})});
assignAttributes([[sixthNBranchN, sixthNBranchS]], {service_segment: "6AN"});
assignAttributes([[sixthQBLJunctionEastN, sixthQBLJunctionEastS]], {service_segment: "6AQBE"});
assignAttributes([[sixthQBLJunctionWestN, sixthQBLJunctionWestS]], {service_segment: "6AQBW"});
assignAttributes([[sixthMainBranchN, sixthEighthN]], {service_segment: "6A1"});
assignAttributes([[sixthEighthN, sixthEighthS]], {service_segment: "6A8A"});
assignAttributes([[sixthEighthS, sixthMainBranchS]], {service_segment: "6A2"});
assignAttributes([[sixthMBranchN, sixthMBranchS]], {service_segment: "6AM"});
assignAttributesToLineRemainder(Line.IND_SIXTH_AVENUE_LINE, {visible: true});

const ind63N = [null, 8103249];
const ind63QueensbridgeN = [8102158, 8103248];
const ind63Bmt63N = [8100912, 8103505];
const ind63Bmt63S = [8101547, null];
const ind63SN = [null, 8104288];
const ind63SS = [8102426, null];
assignAttributes([[ind63N, ind63Bmt63N], [ind63SN, ind63SS]], {
	lines: [Line.IND_63RD_STREET_LINE],
	total_tracks: 2,
	used_tracks: 2,
	unused_tracks: 0,
});
assignAttributes([[ind63Bmt63N, ind63Bmt63S]], {
	lines: [Line.IND_63RD_STREET_LINE, Line.BMT_63RD_STREET_LINE],
	total_tracks: 4,
	used_tracks: 4,
	unused_tracks: 0,
});
assignAttributesToLine(Line.IND_63RD_STREET_LINE, {
	division: Division.B,
	signaling: SignalingType.BLOCK,
	obf: Company.MTA,
	type: StructureType.UNDERGROUND,
})
assignAttributes([[ind63N, ind63QueensbridgeN]], {
	opened: DateTime.fromObject({year: 2001, month: 12, day: 16}),
});
assignAttributes([[ind63QueensbridgeN, ind63Bmt63N, ind63Bmt63S], [ind63SN, ind63SS]], {
	opened: DateTime.fromObject({year: 1989, month: 10, day: 29}),
});
assignAttributes([[ind63N, ind63Bmt63N]], {service_segment: "I63S1"});
assignAttributes([[ind63Bmt63N, ind63Bmt63S]], {service_segment: "IB63S"});
assignAttributes([[ind63SN, ind63SS]], {service_segment: "I63S2"});
assignAttributesToLine(Line.IND_63RD_STREET_LINE, {visible: true});

for(const segment of Object.values(trackData).filter((s) => s.visible)){
	// Exclude service segment as not all segments have service
	for(const attribute of ["lines", "total_tracks", "used_tracks", "unused_tracks", "opened", "obf", "type", "division", "signaling"]){
		if(!Object.hasOwn(segment, attribute)){
			throw new Error(`Segment ${segment.id} missing attribute ${attribute}`);
		}
	}
}

// Map from service segment name to which service segments it borders on each end
// {name: [[S1, S2], [S3]]} for example - borders S1 and S2 on one end and S3 on the other.
const serviceSegmentBorders = Object.entries(Object.values(trackData).reduce((acc, segment) => {
	// Group track segments by service segment
	if(segment.service_segment !== undefined){
		if(acc[segment.service_segment] === undefined){
			acc[segment.service_segment] = [segment]
		} else {
			acc[segment.service_segment].push(segment);
		}
	}
	return acc;
}, {})).reduce((acc, [name, segments]) => {
	// Find the ends of each segment
	let start;
	let end;
	const checkBorder = (border) => {
		for(const segmentID of border ?? []){
			if(trackData[segmentID].service_segment === name){
				return;
			}
		}
		if(start === undefined){
			start = (border ?? []).map(segmentID => trackData[segmentID].service_segment);
		} else if(end === undefined){
			end = (border ?? []).map(segmentID => trackData[segmentID].service_segment);
		} else {
			throw new Error(`Service segment ${name} has more than two borders`);
		}
	}
	for(const segment of segments){
		checkBorder(segment.start);
		checkBorder(segment.end);
	}
	if(start === undefined || end === undefined){
		throw new Error(`Service segment ${name} has less than two borders`);
	}
	acc[name] = [start, end];
	return acc;
}, {});

export {trackData as TRACK_SEGMENTS, stationsData as PLATFORM_SET_COORDS, serviceSegmentBorders as SERVICE_SEGMENT_BORDERS}
