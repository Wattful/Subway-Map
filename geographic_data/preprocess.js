import shorelineData from "./shoreline_raw.json" with { type: "json" };
import trackData from "./track_raw.json" with { type: "json" };
import stationsData from "./stations_raw.json" with { type: "json" };
import fs from "fs";
import {forEachCoord} from "./util.js";

/*
Station features:
Subway Station ID SUBWAYSTAT: Arbitrary number
Station ID STATION_ID: Arbitrary number
NY CT ID NYCT_ID: Arbitrary number
Segment ID SEGMENTID: Arbitrary number, doesn't correspond to track segment ID
Subway Type SUBWAY_TYP: Appears to be "AMTRAK" for all subway stops and "LIRR" for SIR
Line LINE: Line name, doesn't include company
Division DIVISION: BMT/IRT/IND/SIR
Station Label STATIONLAB: Division + services + name (ex. IRT-4-5P-6-6X-14 ST-UNION SQ)
Created By CREATED_BY
Created Date CREATED_DA
Modified By MODIFIED_B
Modified Date MODIFIED_D
B7SC

Track features:
Segment ID SEGMENTID: Arbitrary number
Legacy Segment ID LEGACY_SEG: ?
Rail Type RAIL_TYPE: Appears to be "AMTRAK" for subway and "LIRR" for SIR
Row Type ROW_TYPE: 1: Subterranean, 2: Elevated, 5: Open Cut Depression, 6: Embankment, 3: Surface, 8: Subterranean Coincident with Boundary, 4: Hidden, 7: Viaduct
Segment Sequence Number SEGMENT_SE: Number, appears to increment/decrement by ten but inconsistent
Route ROUTE: ex. 4-5-6
Division DIVISION: BMT/IRT/IND/SIR
Line LINE: Short line name (ex. LEXINGTON AVE)
Subway Label SUBWAY_LAB: Long line name (ex. LEXINGTON AVENUE LINE)
Segloc Status SEGLOCSTAT: ?
Created By CREATED_BY
Created Date CREATED_DA
Modified By MODIFIED_B
Modified Date MODIFIED_D
FROM_LEVEL: ?
TO_LEVEL_C: ?

Line, route, and division can't be used - break down when multiple lines share track. Row type may be usable but is a bit noisy, needs to be cleaned up

Idea for track labeling
1. Use script to link 99% of segments
2. Manually link remaining segments
3. Individually label features using auto-fill in
4. As part of previous step, group tracks into "service segments"
5. Assign platform sets and service patterns to service segments
*/

const {features: shorelineFeatures, ...shorelineAttrs} = shorelineData;
let shorelineOutputFeatures = [];
const {features: trackFeatures, ...trackAttrs} = trackData;
let trackOutputFeatures = [];
const {features: stationsFeatures, ...stationsAttrs} = stationsData;
let stationsOutputFeatures = [];

// Remove Staten Island
const shX = -8240000
const tX = -8245000

forEachCoord(shorelineFeatures, (x, y, feature) => {
	if(x > shX){
		shorelineOutputFeatures = [...shorelineOutputFeatures, feature];
		return true;
	}
	return false;
});

forEachCoord(trackFeatures, (x, y, feature) => {
	if(x > tX){
		trackOutputFeatures = [...trackOutputFeatures, feature];
		return true;
	}
	return false;
});

forEachCoord(stationsFeatures, (x, y, feature) => {
	if(x > tX){
		stationsOutputFeatures = [...stationsOutputFeatures, feature];
		return true;
	}
	return false;
});

// Rename relevant data and discard irrelevant data
trackOutputFeatures = trackOutputFeatures.map(({type, properties, geometry}) => {
	const {SEGMENTID: id, ROW_TYPE: tracktype} = properties;
	return {type, properties: {
		id,
		tracktype: {
			1: "Underground",
			2: "Elevated",
			3: "At-Grade",
			4: {
				353831: "Elevated",
				8107744: "Elevated",
				8103031: "At-Grade",
				8103028: "At-Grade",
				263022: "At-Grade",
				324328: "At-Grade",
				8103639: "At-Grade",
				8103638: "At-Grade",
			}[id] ?? "Open Cut",
			5: "Open Cut",
			6: "Embankment",
			7: "Elevated",
			8: "Underground",
		}[tracktype],
	}, geometry};
});

stationsOutputFeatures = stationsOutputFeatures.map(({type, properties, geometry}) => {
	const {SUBWAYSTAT: id} = properties;
	return {type, properties: {id}, geometry};
});

/* 
Invariants:
1. All track segments have at least one end filled
2. All track segments that are not marked as dead ends have both ends filled
3. All vertices are marked as resolved
*/

const createFillerSegment = (vertex1, vertex2, newSegmentID, properties) => {
	trackOutputFeatures.push({type: "Feature", properties: {id: newSegmentID, ...properties}, geometry: {type: "LineString", coordinates: [vertex1, vertex2]}});
};

// TODO Need to add south ferry 1 station
// Crosstown line/QBL
createFillerSegment([-8231376.925070595, 4975037.975411263], [-8231154.608204795, 4975149.601498582], 1, {tracktype: "Underground"});
// Nassau st line/Montague st tunnel
createFillerSegment([-8238888.122288354, 4969115.110719187], [-8238844.668789842, 4968223.565520624], 2, {tracktype: "Underground"});

// Duplicate segment on eastern pkwy line and new lots line yard tracks
const segmentsToExclude = new Set([8102331, 8106931, 8106933, 8106936, 8106930, 8106934, 8106935, 8106932, 8106937]);
trackOutputFeatures = trackOutputFeatures.filter((segment) => !segmentsToExclude.has(segment.properties.id));

const vertexToIdMap = {};
forEachCoord(trackOutputFeatures, (x, y, feature, end) => {
	if(end){
		if(vertexToIdMap[`${x},${y}`] === undefined){
			vertexToIdMap[`${x},${y}`] = {ids: [feature.properties.id], resolved: false};
		} else {
			vertexToIdMap[`${x},${y}`].ids.push(feature.properties.id);
		}
	}
});

const filteredVertexMap = Object.fromEntries(Object.entries(vertexToIdMap).filter(([_, obj]) => obj.ids.length === 1 || !obj.ids.every(v => v === obj.ids[0])));
const idToVerticesMap = Object.entries(filteredVertexMap).reduce((acc, [vertex, {ids}]) => {
	for(const id of ids){
		if(acc[id] === undefined){
			acc[id] = [vertex];
		} else {
			acc[id].push(vertex);
		}
	}
	return acc;
}, {});

const segmentIdMap = trackOutputFeatures.reduce((acc, val) => {acc[val.properties.id] = val; return acc}, {});

const assign = (segment1ID, segment2ID) => {
	const segment = segmentIdMap[segment1ID];
	if(segment.properties.start === undefined){
		segment.properties.start = [segment2ID];
	} else if(segment.end === undefined){
		segment.properties.end = [segment2ID];
	} else {
		throw new Error(`Segment ${segment1ID} has both end slots filled`);
	}
}
const doubleAssign = (segment1ID, segment2ID) => {
	assign(segment1ID, segment2ID);
	assign(segment2ID, segment1ID);
}
const assignJunction = (segment1ID, segment2ID, segment3ID) => {
	assign(segment2ID, segment1ID);
	assign(segment3ID, segment1ID);
	const segment = segmentIdMap[segment1ID];
	if(segment.properties.start === undefined){
		segment.properties.start = [segment2ID, segment3ID];
	} else if(segment.end === undefined){
		segment.properties.end = [segment2ID, segment3ID];
	} else {
		throw new Error(`Segment ${segment1ID} has both end slots filled`);
	}
}
const assignPartialJunction = (segment1ID, segment2ID, segment3ID) => {
	assign(segment1ID, segment2ID);
	const segment = segmentIdMap[segment2ID];
	if(segment.properties.start?.[0] === segment3ID){
		segment.properties.start.push(segment1ID);
	} else if(segment.properties.end?.[0] === segment3ID){
		segment.properties.end.push(segment1ID);
	} else {
		throw new Error(`Segment ${segment2ID} not mapped to segment ${segment3ID}`);
	}
}
const assignBigJunction = (segment1ID, segmentIDs) => {
	for(const segmentID of segmentIDs){
		assign(segmentID, segment1ID);
	}
	const segment = segmentIdMap[segment1ID];
	if(segment.properties.start === undefined){
		segment.properties.start = segmentIDs;
	} else if(segment.end === undefined){
		segment.properties.end = segmentIDs;
	} else {
		throw new Error(`Segment ${segment1ID} has both end slots filled`);
	}
}

const markDeadEndResolved = (id) => {
	const vertices = idToVerticesMap[id];
	for(const vertex of vertices){
		const vertexData = filteredVertexMap[vertex];
		if(vertexData.ids.length === 1 && !vertexData.resolved){
			vertexData.resolved = true;
			return;
		}
	}
	console.log(`WARNING: No unresolved dead end found for ${id}`);
}

const markCommonVertexResolved = (ids) => {
	let vertices = new Set(idToVerticesMap[ids[0]]);
	for(const id of ids){
		vertices = vertices.intersection(new Set(idToVerticesMap[id]));
	}
	if(vertices.size === 0){
		console.log(`WARNING: No common vertex found for ${ids}`);
		return;
	}
	const vertex = vertices.values().next().value;
	if(!filteredVertexMap[vertex].ids.length === ids.length){
		console.log(`WARNING: ${filteredVertexMap[vertex].ids} is superset of ${ids}`);
	}
	filteredVertexMap[vertex].resolved = true;
}

const assignAndMarkDeadEndResolved = (segment1ID, segment2ID) => {
	doubleAssign(segment1ID, segment2ID);
	markDeadEndResolved(segment1ID);
	markDeadEndResolved(segment2ID);
}

const assignAndMarkJunctionResolved = (segment1ID, segment2ID, segment3ID) => {
	assignJunction(segment1ID, segment2ID, segment3ID);
	markCommonVertexResolved([segment1ID, segment2ID, segment3ID]);
}

const doubleDoubleAssignAndMarkResolved = (segment1ID, segment2ID, segment3ID, segment4ID) => {
	doubleAssign(segment1ID, segment2ID);
	doubleAssign(segment3ID, segment4ID);
	markCommonVertexResolved([segment1ID, segment2ID, segment3ID, segment4ID]);
}

const assignAndMarkBigJunctionResolved = (segment1ID, segmentIDs) => {
	assignBigJunction(segment1ID, segmentIDs);
	markCommonVertexResolved([segment1ID, ...segmentIDs]);
}

const assignAndMarkPartialJunctionResolved = (segment1ID, segment2ID, segment3ID) => {
	assignPartialJunction(segment1ID, segment2ID, segment3ID);
	markDeadEndResolved(segment1ID);
}


for(const vertex of Object.values(filteredVertexMap).filter((obj) => obj.ids.length === 2)){
	const {ids: [segment1ID, segment2ID]} = vertex;
	vertex.resolved = true;
	doubleAssign(segment1ID, segment2ID);
}

const deadEnds = new Set([
	255655, // Broadway-Seventh Avenue line north end
	263022, // Lenox Avenue line north end
	286799, // Flushing line south end
	304860, // Second Avenue line north end
	312285, // Pelham line north end
	8100261, // Flushing line north end
	8101776, // Fourth Avenue line south end
	8102639, // Nostrand Avenue line south end
	8102672, // Fulton Street line south end
	8102840, // Archer Avenue lines north end
	8103127, // Franklin Avenue line north end
	8103206, // Astoria line north end
	8103225, // Queens Boulevard line north end
	8103568, // White Plains Road line north end
	8103592, // Dyre Avenue line north end
	8103732, // Eighth Avenue line north end
	8103772, // Jerome Avenue line north end
	8104026, // Myrtle Avenue line north end
	8104309, // Concourse line north end
	8106938, // New Lots line south end
	8107783, // Canarsie line south end
	8107793, // Rockaway line west end
	8107805, // Rockaway line east end
]);

deadEnds.forEach((segmentID) => markDeadEndResolved(segmentID));

// Unexpected dead end pair
assignAndMarkDeadEndResolved(257982, 8104538); // Rockaway line
assignAndMarkDeadEndResolved(8102712, 8104268); // Canarsie line
assignAndMarkDeadEndResolved(8102750, 8102770); // Fourth Avenue line
assignAndMarkDeadEndResolved(8102934, 8104040); // Fulton Street line
assignAndMarkDeadEndResolved(8103237, 8104075); // Astoria line
assignAndMarkDeadEndResolved(8103281, 8103290); // Broadway-Seventh Avenue line
assignAndMarkDeadEndResolved(8103295, 8103297); // Broadway-Seventh Avenue line
assignAndMarkDeadEndResolved(8103425, 8103426); // Eighth Avenue line
assignAndMarkDeadEndResolved(8104005, 8104006); // Eighth Avenue line

// 3-way junction
assignAndMarkJunctionResolved(225566, 266833, 266834); // White Plains rd Dyre av lines
assignAndMarkJunctionResolved(271352, 8103488, 8103489); // Queens blvd 6th av lines
assignAndMarkJunctionResolved(297638, 297642, 297649); // Broadway-7th av south ferry loop
assignAndMarkJunctionResolved(314262, 314942, 314958); // Jerome av Dyra av lines
assignAndMarkJunctionResolved(8100114, 8102820, 263132); // Manhattan Bridge brooklyn end
assignAndMarkJunctionResolved(8100183, 8102241, 8104513); // Fulton st Rockaway lines
assignAndMarkJunctionResolved(8100255, 254832, 254857); // Queens blvd Broadway lines
assignAndMarkJunctionResolved(8103546, 8101464, 8100612); // 8th av Concourse lines
assignAndMarkJunctionResolved(8100557, 8102789, 8100884); // Eastern pky Brighton lines
assignAndMarkJunctionResolved(8103505, 304766, 8100912); // 63 st 2nd av lines
assignAndMarkJunctionResolved(8103477, 8101337, 8103490); // 8th av Queens blvd lines
assignAndMarkJunctionResolved(8101499, 8104443, 262480); // Broadway-7th av Lenox av lines
assignAndMarkJunctionResolved(8101547, 8104288, 8103511); // 63rd st lines
assignAndMarkJunctionResolved(8101668, 8102361, 8103459); // Broadway-7th av 42nd st lines
assignAndMarkJunctionResolved(8103476, 8103491, 8102392); // 8th av Queens blvd lines
assignAndMarkJunctionResolved(8102607, 8104499, 261824); // 4th av Sea Beach lines
assignAndMarkJunctionResolved(8102647, 257688, 231801); // Eastern pky Nostrand av lines
assignAndMarkJunctionResolved(8102767, 8102769, 8104405); // Fulton st Crosstown lines
assignAndMarkJunctionResolved(8102773, 8102776, 8104341); // Crosstown Brighton lines
assignAndMarkJunctionResolved(8102787, 8102775, 8102774); // Fulton st Crosstown lines
assignAndMarkJunctionResolved(8102777, 8102775, 8100399); // Fulton st Brighton lines
assignAndMarkJunctionResolved(8102783, 257572, 257581); // Manhattan brg Broadway lines
assignAndMarkJunctionResolved(8102837, 8104064, 8104065); // Archer av lines
assignAndMarkJunctionResolved(8104062, 8104061, 8102858); // Queens blvd Archer av lines
assignAndMarkJunctionResolved(8102980, 331213, 331320); // Culver line
assignAndMarkJunctionResolved(8103029, 8103026, 8103044); // Sea Beach West End lines
assignAndMarkJunctionResolved(8103041, 258062, 222234); // Brighton Culver lines
assignAndMarkJunctionResolved(8103111, 342331, 8103108); // Brighton Franklin av lines
assignAndMarkJunctionResolved(8103173, 8103177, 8102200); // Queens blvd line
assignAndMarkJunctionResolved(8103235, 8103234, 8104075); // Flushing astoria lines
assignAndMarkJunctionResolved(280853, 8104079, 8103244); // Flushing astoria lines
assignAndMarkJunctionResolved(8103253, 8103973, 8103974); // Culver line
assignAndMarkJunctionResolved(8103273, 8103275, 8107809); // Rockaway line
assignAndMarkJunctionResolved(8104498, 8104494, 8103275); // Rockaway line
assignAndMarkJunctionResolved(8102804, 8100925, 8103277); // 8th av 6th av lines
assignAndMarkJunctionResolved(8103282, 8103291, 8103292); // Broadway-7th av line
assignAndMarkJunctionResolved(8103368, 8103369, 8103370); // Broadway line
assignAndMarkJunctionResolved(8103412, 264224, 271192); // 8th av 6 av lines
assignAndMarkJunctionResolved(8103418, 8103420, 8103421); // 8th av 6 av lines
assignAndMarkJunctionResolved(8103486, 8103490, 8103491); // Queens blvd line
assignAndMarkJunctionResolved(8103495, 8103501, 8103502); // Broadway 63rd st lines
assignAndMarkJunctionResolved(8103940, 257396, 257402); // 4th av West End lines
assignAndMarkJunctionResolved(8104097, 8104084, 8104083); // Broadway Astoria lines
assignAndMarkJunctionResolved(8104296, 8102958, 8102959); // Brighton Eastern pkwy lines
assignAndMarkJunctionResolved(8104428, 8104426, 8104425); // Jerome av Pelham lines
assignAndMarkJunctionResolved(8103544, 8104792, 8104452); // Lenox av White Plains rd lines
assignAndMarkJunctionResolved(269864, 8104491, 8103487); // Queens blvd 6 av lines
assignAndMarkJunctionResolved(8104492, 8104493, 8104496); // Rockawawy line
assignAndMarkJunctionResolved(8104712, 8107884, 8102697); // Jamaica Myrtle av lines
assignAndMarkJunctionResolved(8104766, 251382, 251541); // Jerome av White Plains rd lines
assignAndMarkJunctionResolved(8103912, 2, 8103913); // Nassau st Broadway lines
assignAndMarkJunctionResolved(8103160, 1, 254711); // Crosstown Queens blvd lines
assignAndMarkJunctionResolved(8102314, 8103172, 8101798); // Astoria Queens blvd lines (fake junction, not much we can do about this)
assignAndMarkJunctionResolved(8102314, 8103249, 348670); // 63rd st Queens blvd Astoria lines (same as above)
assignAndMarkJunctionResolved(8104073, 8103229, 8103236); // Astoria Queens blvd lines (same as above)
assignAndMarkJunctionResolved(244195, 244203, 8102806); // Eastern pkwy line


// Tracks crossing over without junction
doubleDoubleAssignAndMarkResolved(8103506, 330762, 8100390, 8103504); // Lexington av Broadway lines
doubleDoubleAssignAndMarkResolved(8100034, 8102145, 8102826, 240918); // Manhattan brg 6th av lines
doubleDoubleAssignAndMarkResolved(8100097, 8101802, 8101733, 8102172); // Jamaica Crosstown lines
doubleDoubleAssignAndMarkResolved(8100169, 294077, 8100170, 8101252); // Broadway 7th av 8th av lines
doubleDoubleAssignAndMarkResolved(8100173, 8101166, 286769, 286771); // 8th av Flushing lines
doubleDoubleAssignAndMarkResolved(8100268, 8100562, 8104415, 257847); // Eastern pkwy Fulton st lines
doubleDoubleAssignAndMarkResolved(8100293, 8100491, 8100391, 8101214); // Queens blvd Lexington av lines
doubleDoubleAssignAndMarkResolved(8100584, 8101379, 8101872, 8103505); // 63rd st Lexington av lines
doubleDoubleAssignAndMarkResolved(8100604, 8101144, 8102749, 8102750); // Fulton st 4th av lines
doubleDoubleAssignAndMarkResolved(8100725, 8102454, 8104478, 8104479); // 4th av Culver lines
doubleDoubleAssignAndMarkResolved(8100852, 8103148, 8100486, 8101433); // Flushing Crosstown lines
doubleDoubleAssignAndMarkResolved(8100901, 8101538, 8102152, 8102153); // 8th av Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8100903, 8101866, 8101641, 8102113); // Nassau 6th av lines
doubleDoubleAssignAndMarkResolved(8100916, 8100805, 8100971, 262981); // 8th av Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8100995, 8100436, 253640, 253649); // White Plains rd Jerome av lines
doubleDoubleAssignAndMarkResolved(8101018, 8100926, 8102777, 8102778); // Eastern Pkwy 6th av lines
doubleDoubleAssignAndMarkResolved(8101064, 8101201, 8103376, 8103378); // Lexington av 6th av lines
doubleDoubleAssignAndMarkResolved(8101083, 8103296, 8103293, 8102046); // Nassau st 8th av lines
doubleDoubleAssignAndMarkResolved(8101127, 269865, 8100378, 8101203); // Queens blvd Broadway lines
doubleDoubleAssignAndMarkResolved(8101327, 8102703, 8102702, 8102704); // Canarsie Myrtle av lines
doubleDoubleAssignAndMarkResolved(8101568, 8102753, 8102746, 8102748); // Eastern pkwy 4th av lines
doubleDoubleAssignAndMarkResolved(8101597, 8101957, 8102778, 8102779); // Broadway 8th av lines
doubleDoubleAssignAndMarkResolved(8101602, 8102457, 8100069, 8103843); // Jerome av Concourse lines
doubleDoubleAssignAndMarkResolved(8101612, 8101120, 8102824, 8102828); // Manhattan brg 6th av lines
doubleDoubleAssignAndMarkResolved(8101662, 8103461, 8102427, 8103459); // 6th av 42nd st lines
doubleDoubleAssignAndMarkResolved(8101748, 8101294, 8104491, 8103489); // 6th av Queens blvd lines
doubleDoubleAssignAndMarkResolved(8101790, 8101406, 8101127, 8103486); // Broadway 7th av Queens blvd lines
doubleDoubleAssignAndMarkResolved(8101793, 8103457, 8101407, 8103455); // 6th av Broadway lines
doubleDoubleAssignAndMarkResolved(8101821, 313283, 8103295, 8100948); // Nassau st Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8102005, 8102751, 8102767, 8101144); // Brighton Fulton st lines
doubleDoubleAssignAndMarkResolved(8102230, 8103466, 8103461, 8101902); // Flushing 6th av lines
doubleDoubleAssignAndMarkResolved(8102237, 302073, 8104791, 8103527); // 8th av Lenox av lines
doubleDoubleAssignAndMarkResolved(8102344, 8102925, 8104041, 8101895); // Jamaica Fulton st lines
doubleDoubleAssignAndMarkResolved(8102361, 8103462, 8102555, 8102230); // Broadway Flushing lines
doubleDoubleAssignAndMarkResolved(8102426, 8104292, 8103499, 8103500); // 6th av Broadway lines
doubleDoubleAssignAndMarkResolved(8102429, 254633, 8103156, 8100208); // Crosstown Flushing lines
doubleDoubleAssignAndMarkResolved(8102476, 8101253, 8101747, 314675); // Canarsie Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8102508, 8102078, 8103284, 8103285); // 8th av Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8102512, 8103366, 8103365, 8101124); // Lexington av Broadway lines
doubleDoubleAssignAndMarkResolved(8102548, 8103365, 8103364, 8101981); // Broadway Nassau st lines
doubleDoubleAssignAndMarkResolved(8102555, 286769, 8101336, 8103460); // Flushing 8th av lines
doubleDoubleAssignAndMarkResolved(8102809, 8103935, 8102805, 8104799); // 4th av Broadway 7th av lines
doubleDoubleAssignAndMarkResolved(8102994, 288750, 288744, 288745); // Sea Beach West End lines
doubleDoubleAssignAndMarkResolved(8103124, 231793, 341865, 341899); // Franklin av Eastern pkwy lines
doubleDoubleAssignAndMarkResolved(8103143, 8104506, 8101683, 257746); // Canarsie Crosstown lines
doubleDoubleAssignAndMarkResolved(8103157, 8101129, 8103158, 8101206); // Queens blvd Flushing lines
doubleDoubleAssignAndMarkResolved(8103167, 8101968, 8104095, 253876); // Flushing Broadway lines
doubleDoubleAssignAndMarkResolved(8103189, 8101240, 8101553, 8101778); // Queens blvd Flushing lines
doubleDoubleAssignAndMarkResolved(8103230, 8100032, 8103233, 8100588); // Queens blvd Flushing lines
doubleDoubleAssignAndMarkResolved(8103284, 8103349, 8103286, 8102545); // Broadway 7th av Broadway lines
doubleDoubleAssignAndMarkResolved(8103298, 8102046, 8103301, 8100947); // 8th av Lexington av lines
doubleDoubleAssignAndMarkResolved(8103299, 8103891, 8103300, 8104301); // 8th av Broadway lines
doubleDoubleAssignAndMarkResolved(8103349, 8100165, 273575, 246474); // Broadway 7th av Lexington av lines
doubleDoubleAssignAndMarkResolved(8103374, 8103375, 8100412, 8101920); // 6th av Broadway lines
doubleDoubleAssignAndMarkResolved(8103427, 8103449, 8100961, 8103440); // Canarsie Broadway lines
doubleDoubleAssignAndMarkResolved(8103428, 8103437, 8103449, 329327); // Lexington av Canarsie lines
doubleDoubleAssignAndMarkResolved(8103431, 8101253, 8101037, 8102155); // Canarsie 6th av lines
doubleDoubleAssignAndMarkResolved(8103468, 8104469, 8104470, 297550); // Lexington av Flushing lines
doubleDoubleAssignAndMarkResolved(8103479, 8103481, 8103480, 8103482); // Broadway 7th av Broadway lines
doubleDoubleAssignAndMarkResolved(8103492, 8103494, 8103496, 8103497); // Broadway 7th av 8th av lines
doubleDoubleAssignAndMarkResolved(8103895, 297656, 8103896, 297653); // Lexington av South Ferry loop
doubleDoubleAssignAndMarkResolved(8103989, 8103991, 8103990, 261058); // Canarsie New Lots lines
doubleDoubleAssignAndMarkResolved(8104040, 8103980, 8103981, 8102928); // Fulton st Jamaica lines
doubleDoubleAssignAndMarkResolved(8104552, 8104559, 8103977, 8103980); // Canarsie Fulton st lines
doubleDoubleAssignAndMarkResolved(8104559, 257985, 8103982, 8102928); // Canarise Jamaica lines

assignAndMarkBigJunctionResolved(8103474, [8101748, 8103487, 8103488]); // 6th av Queens blvd lines
assignAndMarkBigJunctionResolved(262978, [8104273, 312050, 262609]); // 6th av line

assignJunction(8103383, 8101497, 312075); // Williamsburg brg
doubleAssign(8103394, 8103395); // 6th av line
markCommonVertexResolved([8103383, 8101497, 312075, 8103394, 8103395]);

// 8th av Canarsie lines
doubleAssign(8103426, 8100375);
markCommonVertexResolved([8103426, 8100375, 8102476]);
deadEnds.add(8102476);
// Flushing 42nd st lines
doubleAssign(8100691, 8104399);
markCommonVertexResolved([8100691, 8104399, 297616]);
deadEnds.add(297616);

assignAndMarkPartialJunctionResolved(8104111, 8104112, 8102522); // Queens blvd line
assignAndMarkPartialJunctionResolved(8102770, 8102741, 8102771); // 4th av brighton lines

const unresolvedVertexMap = Object.values(filteredVertexMap).filter((obj) => !obj.resolved);
if(unresolvedVertexMap.length > 0){
	console.log(`WARNING: ${unresolvedVertexMap.length} unresolved track vertices`);
}
const unfilledTracks = trackOutputFeatures.filter((feature => (feature.properties.start === undefined && feature.properties.end === undefined) || ((feature.properties.start === undefined || feature.properties.end === undefined) && !deadEnds.has(feature.properties.id))));
if(unfilledTracks.length > 0){
	console.log(`WARNING: ${unfilledTracks.length} non-dead end tracks without both ends filled`);
}

const shorelineOutput = {...shorelineAttrs, features: shorelineOutputFeatures};
const trackOutput = {...trackAttrs, features: trackOutputFeatures};
const stationsOutput = {...stationsAttrs, features: stationsOutputFeatures};

fs.writeFile("shoreline_processed.json", JSON.stringify(shorelineOutput), (err) => {
    if (err) {
        console.log(err);
    }
});
fs.writeFile("track_processed.json", JSON.stringify(trackOutput), (err) => {
    if (err) {
        console.log(err);
    }
});
fs.writeFile("stations_processed.json", JSON.stringify(stationsOutput), (err) => {
    if (err) {
        console.log(err);
    }
});
