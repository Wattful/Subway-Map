function Enum(baseEnum) {
    return new Proxy(baseEnum, {
        get(target, item) {
            if (!Object.hasOwn(baseEnum, item)) {
                throw new Error(`${item} is not a member of this enum`);
            }
            return baseEnum[item];
        },

        set() {
            throw new Error("Cannot add a new value to the enum");
        },
    });
}

const Line = Enum({
    IRT_42ND_STREET_LINE: "IRT 42nd Street Line",
    BMT_63RD_STREET_LINE: "BMT 63rd Street Line",
    IND_63RD_STREET_LINE: "IND 63rd Street Line",
    BMT_ARCHER_AVENUE_LINE: "BMT Archer Avenue Line",
    IND_ARCHER_AVENUE_LINE: "IND Archer Avenue Line",
    BMT_ASTORIA_LINE: "BMT Astoria Line",
    BMT_BRIGHTON_LINE: "BMT Brighton Line",
    BMT_BROADWAY_LINE: "BMT Broadway Line",
    IRT_BROADWAY_SEVENTH_AVENUE_LINE: "IRT Broadway-Seventh Avenue Line",
    BMT_CANARSIE_LINE: "BMT Canarsie Line",
    IND_CONCOURSE_LINE: "IND Concourse Line",
    IND_CROSSTOWN_LINE: "IND Crosstown Line",
    IND_CULVER_LINE: "IND Culver Line",
    IRT_DYRE_AVENUE_LINE: "IRT Dyre Avenue Line",
    IRT_EASTERN_PARKWAY_LINE: "IRT Eastern Parkway Line",
    IND_EIGHTH_AVENUE_LINE: "IND Eighth Avenue Line",
    IRT_FLUSHING_LINE: "IRT Flushing Line",
    BMT_FOURTH_AVENUE_LINE: "BMT Fourth Avenue Line",
    BMT_FRANKLIN_AVENUE_LINE: "BMT Franklin Avenue Line",
    IND_FULTON_STREET_LINE: "IND Fulton Street Line",
    BMT_JAMAICA_LINE: "BMT Jamaica Line",
    IRT_JEROME_AVENUE_LINE: "IRT Jerome Avenue Line",
    IRT_LENOX_AVENUE_LINE: "IRT Lenox Avenue Line",
    IRT_LEXINGTON_AVENUE_LINE: "IRT Lexington Avenue Line",
    BMT_MYRTLE_AVENUE_LINE: "BMT Myrtle Avenue Line",
    BMT_NASSAU_STREET_LINE: "BMT Nassau Street Line",
    IRT_NEW_LOTS_LINE: "IRT New Lots Line",
    IRT_NOSTRAND_AVENUE_LINE: "IRT Nostrand Avenue Line",
    IRT_PELHAM_LINE: "IRT Pelham Line",
    IND_QUEENS_BOULEVARD_LINE: "IND Queens Boulevard Line",
    IND_ROCKAWAY_LINE: "IND Rockaway Line",
    BMT_SEA_BEACH_LINE: "BMT Sea Beach Line",
    IND_SECOND_AVENUE_LINE: "IND Second Avenue Line",
    IND_SIXTH_AVENUE_LINE: "IND Sixth Avenue Line",
    BMT_WEST_END_LINE: "BMT West End Line",
    IRT_WHITE_PLAINS_ROAD_LINE: "IRT White Plains Road Line",
});

const Service = Enum({
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    Fd: "Fd",
    G: "G",
    ROCKAWAY_PARK_SHUTTLE: "H",
    J: "J",
    L: "L",
    M: "M",
    N: "N",
    Q: "Q",
    R: "R",
    FRANKLIN_AVENUE_SHUTTLE: "S",
    W: "W",
    Z: "Z",
    "42ND_STREET_SHUTTLE": "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    "6d": "6d",
    7: "7",
    "7d": "7d",
});

const StructureType = Enum({
    UNDERGROUND: "Underground",
    ELEVATED: "Elevated",
    EMBANKMENT: "Embankment",
    OPEN_CUT: "Open Cut",
    AT_GRADE: "At-Grade",
});

const TrackType = Enum({
    LOCAL: "Local",
    EXPRESS: "Express",
    PEAK_DIRECTION_EXPRESS: "Peak-Direction Express",
    BIDIRECTIONAL: "Bidirectional",
    UNUSED: "Unused",
});

const PlatformType = Enum({
    ISLAND: "Island",
    SIDE: "Side",
});

const PlatformService = Enum({
    UP: "Up",
    DOWN: "Down",
    BOTH: "Both",
    NONE: "None",
});

const ArrowDirection = Enum({
    RIGHT: "Right",
    LEFT: "Left",
    BOTH: "Both",
});

const ServiceDirection = Enum({
    NORTH: "North",
    SOUTH: "South",
    BOTH: "Both",
});

const Division = Enum({
    A: "A",
    B: "B",
    BOTH: "Both",
});

const SignalingType = Enum({
    BLOCK: "Fixed Block",
    COMMUNICATION_BASED: "Moving Block (CBTC)",
});

const Company = Enum({
    IRT: "Interborough Rapid Transit Company",
    BMT: "Brooklyn-Manhattan Transit Corporation",
    IND: "Independent Subway System",
    LIRR: "Long Island Rail Road",
    NYWB: "New York, Westchester, and Boston Railway",
    MTA: "New York City Subway",
});

const ServiceTimeComponent = Enum({
    ALL_TIMES: "all times",
    WEEKDAYS: "weekdays",
    WEEKDAYS_SP: "weekdays_sp", // Secondary version of weekdays, explained in objects
    LATE_NIGHTS: "late nights",
    WEEKENDS: "weekends",
    RUSH_HOURS: "rush hours",
    MORNINGS: "mornings",
    MIDDAYS: "middays",
    AFTERNOONS: "afternoons",
    EARLY_MORNINGS: "early mornings",
    AM_RUSH: "AM rush",
    MORNING_MIDDAYS: "morning middays", // These two are a little confusing and shouldn't be shown to the user
    AFTERNOON_MIDDAYS: "afternoon middays",
    PM_RUSH: "PM rush",
    EVENINGS: "evenings",
    EARLY_EVENINGS: "early evenings",
    LATE_EVENINGS: "late evenings",

    ALL_TIMES_EXCEPT_LATE_NIGHTS: "except late nights",
    ALL_TIMES_EXCEPT_AM_RUSH: "except AM rush",
    ALL_TIMES_EXCEPT_PM_RUSH: "except PM rush",
    ALL_TIMES_EXCEPT_MORNINGS: "except mornings",
    ALL_TIMES_EXCEPT_AFTERNOONS: "except afternoons",
    ALL_TIMES_EXCEPT_AM_RUSH_AND_LATE_NIGHTS: "except AM rush and late nights",
    ALL_TIMES_EXCEPT_PM_RUSH_AND_LATE_NIGHTS: "except PM rush and late nights",
    WEEKDAYS_EXCEPT_AM_RUSH: "weekdays except AM rush",
    WEEKDAYS_EXCEPT_PM_RUSH: "weekdays except PM rush",
    WEEKDAYS_EXCEPT_LATE_EVENINGS: "weekdays except late evenings",
});

// Numbers used for gt/lt comparisons
const ServiceTimeType = Enum({
    NO: 0,
    SELECT: 1,
    YES: 2,
});

export {
    Line,
    Service,
    StructureType,
    TrackType,
    PlatformType,
    PlatformService,
    ArrowDirection,
    ServiceDirection,
    Division,
    SignalingType,
    Company,
    ServiceTimeComponent,
    ServiceTimeType,
};
