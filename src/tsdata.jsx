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
import trackData from "./track.json";
import stationsData from "./stations.json";

function fillInSegments(startSegment, endSegment){
	const _fillInSegments = (segment, endSegment, start, segments) => {
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
			return nextSegmentData.start?.length === 1 ? _fillInSegments(nextSegment, endSegment, false, newSegments) : null;
		} else if(nextSegmentData.end.includes(segment)){
			return nextSegmentData.end?.length === 1 ? _fillInSegments(nextSegment, endSegment, true, newSegments) : null;
		} else {
			throw new Error(`${segment} is next to ${nextSegment} but latter is not next to former`);
		}
	};
	if(startSegment === endSegment){
		return [startSegment];
	}
	// No way to tell initial direction so try both
	return _fillInSegments(startSegment, endSegment, true, [startSegment]) ?? _fillInSegments(startSegment, endSegment, false, [startSegment]);
}

function assignAttributes(segmentPairs, attrs){
	for(const [startSegment, endSegment] of segmentPairs){
		const segments = fillInSegments(startSegment, endSegment);
		if(segments === null){
			throw new Error(`Cannot unambiguously fill in ${startSegment} to ${endSegment}`);
		}
		segments.forEach((segment) => {Object.assign(trackData[segment], attrs)});
	}
}

function assignAttributesToLine(line, attrs){
	Object.values(trackData).filter((segment) => segment.lines?.includes(line)).forEach((segment) => {
		for(const key of Object.keys(attrs)){
			if(Object.hasOwn(segment, key)){
				throw new Error(`${segment} already has property ${key}`);
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

// TODO probably want to assign these to variable names
// Queens Boulevard Line
assignAttributes([[8103225, 8104061], [8104062, 8104112], [8102522, 8103177], [8104111, 8102200], [8103173, 8103172], [8103229, 8100255], [254857, 8103160], [254711, 271352], [8103489, 8104491], [8103491, 8103491]], {lines: [LineName.IND_QUEENS_BOULEVARD_LINE]});
assignAttributes([[8102314, 8102314], [348670, 8104073]], {lines: [LineName.IND_QUEENS_BOULEVARD_LINE, LineName.BMT_ASTORIA_LINE]});
assignAttributes([[269864, 8103486]], {lines: [LineName.IND_QUEENS_BOULEVARD_LINE, LineName.IND_SIXTH_AVENUE_LINE]});

// TODO lol
assignAttributes([[8103225, 8104061]], {total_tracks: 4, used_tracks: 2, unused_tracks: 2});
assignAttributes([[8104062, 8104112], [8103173, 8103172], [8103229, 8100255], [254857, 8103160]], {total_tracks: 4, used_tracks: 4, unused_tracks: 0});
assignAttributes([[8102314, 8102314], [348670, 348670]], {total_tracks: 7, used_tracks: 6, unused_tracks: 1});
assignAttributes([[348669, 8104073]], {total_tracks: 6, used_tracks: 6, unused_tracks: 0});
assignAttributesToLineRemainder(LineName.IND_QUEENS_BOULEVARD_LINE, {total_tracks: 2, used_tracks: 2, unused_tracks: 0});

// TODO was astoria line opened earlier?
assignAttributes([[8103225, 8102439]], {opened: DateTime.fromObject({year: 1950, month: 12, day: 10})});
assignAttributes([[8102844, 8104061], [8104062, 257958]], {opened: DateTime.fromObject({year: 1937, month: 4, day: 24})});
assignAttributes([[8102878, 8101155]], {opened: DateTime.fromObject({year: 1936, month: 12, day: 31})});
assignAttributesToLineRemainder(LineName.IND_QUEENS_BOULEVARD_LINE, {opened: DateTime.fromObject({year: 1933, month: 8, day: 19})});

assignAttributesToLine(LineName.IND_QUEENS_BOULEVARD_LINE, {obf: BuiltFor.IND});
assignAttributesToLine(LineName.IND_QUEENS_BOULEVARD_LINE, {type: PlatformSetType.UNDERGROUND}); // TODO ??
assignAttributesToLine(LineName.IND_QUEENS_BOULEVARD_LINE, {division: Division.B});

assignAttributes([[8103225, 8104061], [8104062, 257958]], {signaling: SignalingType.BLOCK});
assignAttributesToLineRemainder(LineName.IND_QUEENS_BOULEVARD_LINE, {signaling: SignalingType.COMMUNICATION_BASED});

// 179th st - archer av junction
assignAttributes([[8103225, 8104061]], {service_segment: "QB1"});
// Archer av junction - after 75 av
assignAttributes([[8104062, 8102893]], {service_segment: "QB2"});
// after 75 av - Roosevelt av
assignAttributes([[8102892, 8101155]], {service_segment: "QB3"});
// Roosevelt av - Northern blvd
assignAttributes([[8103190, 8104112]], {service_segment: "QB4"});
// Split tracks
assignAttributes([[8102522, 8103177]], {service_segment: "QB5L"});
assignAttributes([[8104111, 8102200]], {service_segment: "QB5E"});
// After split tracks to astoria overlap
assignAttributes([[8103173, 8103172]], {service_segment: "QB6"});
// Astoria overlap to 63rd st junction
assignAttributes([[8102314, 8102314]], {service_segment: "QBAS1"});
// 63rd st junction to just before queens plaza
assignAttributes([[348670, 348669]], {service_segment: "QBAS2"});
// Queens plaza to end of astoria overlap (next two northbound M/night E on express track)
assignAttributes([[8100245, 8104073]], {service_segment: "QBAS3"});
// End of astoria overlap to after Queens plaza
assignAttributes([[8103229, 8100848]], {service_segment: "QB7"});
// Just after Queens plaza to broadway (line) junction
assignAttributes([[8100492, 8100255]], {service_segment: "QB8"});
// Broadway (line) junction to crosstown line junction
assignAttributes([[254857, 8103160]], {service_segment: "QB9"});
// Crosstown line junction to first 6th av junction
assignAttributes([[254711, 271352]], {service_segment: "QB10"});
// Small area between 6th av junctions
assignAttributes([[8103489, 8104491]], {service_segment: "QB11"});
// Second 6th av junction to 8th av n/s junction
assignAttributes([[269864, 8103486]], {service_segment: "QB12"});
// 8th av s junction
assignAttributes([[8103491, 8103491]], {service_segment: "QB13"});

assignAttributesToLine(LineName.IND_QUEENS_BOULEVARD_LINE, {visible: true});

for(const segment of Object.values(trackData).filter((segment) => segment.visible)){
	// Exclude service segment as not all segments have service
	for(const attribute of ["lines", "total_tracks", "used_tracks", "unused_tracks", "opened", "obf", "type", "division", "signaling"]){
		if(!Object.hasOwn(segment, attribute)){
			throw new Error(`Segment ${segment.id} missing attribute ${attribute}`);
		}
	}
}

export {trackData as TRACK_SEGMENTS, stationsData as PLATFORM_SET_COORDS}
