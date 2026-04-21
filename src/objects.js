import {ServiceTimeComponent, ServiceTimeType} from "./enums.js";

function Track(line, type, direction, stops, disambiguator = null, summary = null, trackDescription = null, showTrack = true) {
    this.category = "Track";
    this.line = line;
    this.type = type;
    this.direction = direction; // Arrow direction
    this.stops = stops;
    this.service = {}; // Map from service to servicetime
    this.serviceDirection = null; // North, south, or both. Used in the track description.
    this.disambiguator = disambiguator; // Not displayed to the user. Used for disambiguation by servicesegment and for matching terminal tracks. (terminal tracks use disambiguator ?? type)
    this.summary = summary; // Displayed to the user as the track summary.
    this.trackDescription = trackDescription; // Displayed to the user in place of the services.
    this.showTrack = showTrack; // Whether track graphic is shown in the frontend, false for trackbed, etc
    this.terminalKey = getTerminalKey(direction, disambiguator ?? type);
}

function Platform(type, accessible, service, description = null) {
    this.category = "Platform";
    this.type = type;
    this.accessible = accessible;
    this.service = service; // Top, bottom, both, or neither
    this.description = description;
}

function PlatformSet(name, disambiguator, type, opened, layout, coordinates, normal = true) {
    this.name = name;
    this.disambiguator = disambiguator;
    this.type = type;
    this.opened = opened;
    this.layout = layout;
    this.coordinates = coordinates;
    this.normal = normal; // If true, the frontend will auto-generate a label, otherwise use labels contained in the layout.
    this.lines = [];
    this.tracks = null;
    this.stationKey = null;
}

function Station(name, disambiguator, platformSets, boardings, odt) {
    this.name = name;
    this.disambiguator = disambiguator;
    this.platformSets = platformSets;
    this.boardings = boardings;
    this.odt = odt;
    this.rank = null;
}

function Label(data) {
    this.category = "Label";
    Object.assign(this, data);
}

function ServiceSegment(name, platformSets, start, end, northDirection) {
    this.name = name;
    this.platformSets = platformSets;
    this.start = start;
    this.end = end;
    this.northDirection = northDirection;
}

function ServiceTimeTreeEntry(key, children, name = key) {
    this.key = key;
    this.children = children;
    this.name = name;
    this.leaves = null;
}

// Service times are represented as a tree. Broad service times, such as "Weekdays", are the parents of more specific service times, such as "AM Rush".
// This allows us to efficiently specify a pattern's service time, accumulate it with other times, and get a shorthand representation that can be shown to the user.
// Service times in order they should be checked, this is used by the shorthand algorithm.
const SERVICE_TIMES_ENTRIES = [
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES, [ServiceTimeComponent.ALL_TIMES_EXCEPT_LATE_NIGHTS, ServiceTimeComponent.LATE_NIGHTS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_LATE_NIGHTS, [ServiceTimeComponent.WEEKDAYS, ServiceTimeComponent.WEEKENDS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_AM_RUSH, [
        ServiceTimeComponent.LATE_NIGHTS,
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.PM_RUSH,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_PM_RUSH, [
        ServiceTimeComponent.LATE_NIGHTS,
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.AM_RUSH,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_MORNINGS, [
        ServiceTimeComponent.LATE_NIGHTS,
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.AFTERNOON_MIDDAYS,
        ServiceTimeComponent.PM_RUSH,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_AFTERNOONS, [
        ServiceTimeComponent.LATE_NIGHTS,
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.AM_RUSH,
        ServiceTimeComponent.MORNING_MIDDAYS,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_AM_RUSH_AND_LATE_NIGHTS, [
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.PM_RUSH,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.ALL_TIMES_EXCEPT_PM_RUSH_AND_LATE_NIGHTS, [
        ServiceTimeComponent.WEEKENDS,
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.AM_RUSH,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.LATE_NIGHTS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.WEEKENDS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.WEEKDAYS, [
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.RUSH_HOURS,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.EVENINGS,
    ]),
    // Secondary version of weekdays excluding early mornings, should not be referenced directly, only used for accumulating service time
    // Might need these for the "weekdays except" also
    new ServiceTimeTreeEntry(
        ServiceTimeComponent.WEEKDAYS_SP,
        [ServiceTimeComponent.RUSH_HOURS, ServiceTimeComponent.MIDDAYS, ServiceTimeComponent.EVENINGS],
        ServiceTimeComponent.WEEKDAYS,
    ),
    new ServiceTimeTreeEntry(ServiceTimeComponent.WEEKDAYS_EXCEPT_AM_RUSH, [
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.PM_RUSH,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.WEEKDAYS_EXCEPT_PM_RUSH, [
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.AM_RUSH,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.WEEKDAYS_EXCEPT_LATE_EVENINGS, [
        ServiceTimeComponent.EARLY_MORNINGS,
        ServiceTimeComponent.RUSH_HOURS,
        ServiceTimeComponent.MIDDAYS,
        ServiceTimeComponent.EARLY_EVENINGS,
    ]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.EARLY_MORNINGS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.RUSH_HOURS, [ServiceTimeComponent.AM_RUSH, ServiceTimeComponent.PM_RUSH]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.MIDDAYS, [ServiceTimeComponent.MORNING_MIDDAYS, ServiceTimeComponent.AFTERNOON_MIDDAYS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.EVENINGS, [ServiceTimeComponent.EARLY_EVENINGS, ServiceTimeComponent.LATE_EVENINGS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.MORNINGS, [ServiceTimeComponent.AM_RUSH, ServiceTimeComponent.MORNING_MIDDAYS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.AFTERNOONS, [ServiceTimeComponent.PM_RUSH, ServiceTimeComponent.AFTERNOON_MIDDAYS]),
    new ServiceTimeTreeEntry(ServiceTimeComponent.EARLY_EVENINGS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.LATE_EVENINGS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.AM_RUSH, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.PM_RUSH, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.MORNING_MIDDAYS, []),
    new ServiceTimeTreeEntry(ServiceTimeComponent.AFTERNOON_MIDDAYS, []),
];

const SERVICE_TIMES = SERVICE_TIMES_ENTRIES.reduce((acc, entry) => {
    acc[entry.key] = entry;
    return acc;
}, {});

// Exact order is not relevant as long as this is only computed once
const LEAF_SERVICE_TIMES = SERVICE_TIMES_ENTRIES.filter((time) => time.children.length === 0);
const LEAF_SERVICE_TIME_INDICES = LEAF_SERVICE_TIMES.reduce((acc, time, index) => {
    acc[time.name] = index;
    return acc;
}, {});

const getLeaves = (leaves, name) => {
    const serviceTimeTreeEntry = SERVICE_TIMES[name];
    if (serviceTimeTreeEntry.children.length === 0) {
        leaves[LEAF_SERVICE_TIME_INDICES[serviceTimeTreeEntry.name]] = true;
    } else {
        for (const child of serviceTimeTreeEntry.children) {
            getLeaves(leaves, child);
        }
    }
    return leaves;
};

for (const serviceTimeTreeEntry of SERVICE_TIMES_ENTRIES) {
    const leaves = Object.values(LEAF_SERVICE_TIME_INDICES).map((_) => false);
    serviceTimeTreeEntry.leaves = getLeaves(leaves, serviceTimeTreeEntry.key);
}

// Iterate through the service times in order. If matches, add it to the shorthand and continue searching for the remaining leaves.
const getShorthandForType = (l, type) => {
    let leaves = [...l];
    const answer = {};
    if (!leaves.some((leaf) => leaf)) {
        return answer;
    }

    for (const time of SERVICE_TIMES_ENTRIES) {
        let satisfies = true;
        for (let i = 0; i < time.leaves.length; i++) {
            if (time.leaves[i] && !leaves[i]) {
                satisfies = false;
                break;
            }
        }
        if (satisfies) {
            answer[time.name] = type;
            leaves = leaves.map((leaf, index) => leaf && !time.leaves[index]);
            if (!leaves.some((leaf) => leaf)) {
                return answer;
            }
        }
    }
    throw new Error("Shorthand algorithm broken");
};

// Internally, a service time is represented as an array of the leaf times.
function ServiceTimeInternal(leaves) {
    this._leaves = leaves;
    this._shorthand = null;

    this.getLeaves = () => this._leaves;
    this.getShorthand = (type = null) => {
        const filterFunction = (sh) => Object.fromEntries(Object.entries(sh).filter(([_, level]) => type === null || level === type));
        if (this._shorthand !== null) {
            return filterFunction(this._shorthand);
        }
        this._shorthand = {
            ...getShorthandForType(
                this._leaves.map((value) => value === ServiceTimeType.YES),
                ServiceTimeType.YES,
            ),
            ...getShorthandForType(
                this._leaves.map((value) => value === ServiceTimeType.SELECT),
                ServiceTimeType.SELECT,
            ),
        };
        return filterFunction(this._shorthand);
    };
    this.hasServiceForTime = (times, type) => {
        for (const time of times) {
            const timeLeaves = SERVICE_TIMES[time].leaves;
            if (this._leaves.some((leaf, index) => leaf >= type && timeLeaves[index])) {
                return true;
            }
        }
        return false;
    };
}

function ServiceTime(specification) {
    const leaves = Object.values(LEAF_SERVICE_TIME_INDICES).map((_) => ServiceTimeType.NO);
    for (const [time, type] of Object.entries(specification)) {
        SERVICE_TIMES[time].leaves.forEach((bool, index) => {
            if (bool) {
                leaves[index] = type;
            }
        });
    }
    return new ServiceTimeInternal(leaves);
}

function ServiceTimeStops(service, stops, direction, nextStopService, lastStopService) {
    this.service = service;
    this.stops = stops;
    this.direction = direction;
    this.nextStopService = nextStopService;
    this.lastStopService = lastStopService;
    this.serviceTime = null;
}

function TimeAndName(time, name, disambiguator) {
    this.time = time;
    this.name = name;
    this.disambiguator = disambiguator; // Not currently used, could be used for a link
}

function ServicePattern(serviceDescription, route, skips, northTerminal, southTerminal, northServiceTime, southServiceTime = northServiceTime) {
    this.serviceDescription = serviceDescription;
    this.route = route;
    this.skips = skips;
    // null - use default values, one track is termination, one track is active
    // {} - all tracks are turnaround
    // {terminalKey: true for active, false for termination, not present/undefined for unused}
    this.northTerminal = northTerminal;
    this.southTerminal = southTerminal;
    this.northServiceTime = northServiceTime;
    this.southServiceTime = southServiceTime;
    this.compiledRoute = null;
}

function ServiceInformation(service, subtitle, servicePatterns) {
    this.service = service;
    this.subtitle = subtitle;
    this.servicePatterns = servicePatterns;
}

function SegmentServiceLabel(serviceSegment, type, line, northDirection = null, disambiguators = {}) {
    this.serviceSegment = serviceSegment;
    this.type = type;
    this.line = line;
    this.northDirection = northDirection;
    this.disambiguators = disambiguators; // Map from ServiceDirection to disambiguator name
}

function ServiceStop(stop, disambiguator, tracksNorth, tracksSouth, northDirection) {
    this.stop = stop; //Platform set name
    this.disambiguator = disambiguator; // Not currently used, could be used for a link
    this.tracksNorth = tracksNorth;
    this.tracksSouth = tracksSouth;
    this.northDirection = northDirection;
}

function Miscellaneous(description) {
    this.category = "Misc";
    this.description = description;
}

const getTerminalKey = (direction, type) => `${direction}${type}`;

// TODO sort function for this
const getServiceKey = (service, direction, stops) => `${service}${direction}${stops}`;

const getDisambiguatedName = (name, disambiguator = null) => (disambiguator ? `${name} (${disambiguator})` : name);

const serviceTimeEqual = (service1, service2) => service1.getLeaves().every((e, i) => e === service2.getLeaves()[i]);

const accumulateServiceTime = (patterns) =>
    patterns.reduce(
        (base, next) => (next === null ? base : new ServiceTimeInternal(base.getLeaves().map((value, index) => Math.max(value, next.getLeaves()[index])))),
        new ServiceTimeInternal(Object.values(LEAF_SERVICE_TIME_INDICES).map((_) => ServiceTimeType.NO)),
    );

export {
    Track,
    Platform,
    PlatformSet,
    Station,
    Label,
    ServiceSegment,
    ServiceTime,
    ServiceTimeStops,
    TimeAndName,
    ServicePattern,
    ServiceInformation,
    SegmentServiceLabel,
    ServiceStop,
    Miscellaneous,
    getTerminalKey,
    getServiceKey,
    getDisambiguatedName,
    serviceTimeEqual,
    accumulateServiceTime,
};
