import React from "react";
import {Service} from "./enums.js";

function CircleBullet({color, children}) {
    // TODO are these sizes necessary?
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="29px" height="29px" viewBox="0 0 125 125" style={{display: "inline-block"}}>
            <circle cx="62.5" cy="62.5" r="50" fill={color} />
            {children}
        </svg>
    );
}

function DiamondBullet({color, children}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="29px" height="29px" viewBox="0 0 125 125" style={{display: "inline-block"}}>
            <path d="M62.5,2.5L122.5,62.5L62.5,122.5L2.5,62.5Z" fill={color} />
            {children}
        </svg>
    );
}

// TODO separate colors and common polygons?
const BULLETS = {
    [Service.B]: () => (
        <CircleBullet color="#FF6319">
            <path
                d="M85.5,72.1c0-3.2-0.933-5.967-2.8-8.3c-2.067-2.533-4.8-3.967-8.2-4.3l0.2,0.2l-0.1,0.2c5.733-1.133,8.6-4.567,8.6-10.3c0-4.067-1.467-7.233-4.4-9.5c-2.667-2.133-6.2-3.2-10.6-3.2H44.5v50.4H66c6.067,0,10.633-0.933,13.7-2.8C83.567,82.033,85.5,77.9,85.5,72.1zM72.9,50.8c0,4.067-2.533,6.1-7.6,6.1H54.4V44.8h10.9C70.367,44.8,72.9,46.8,72.9,50.8z M75.2,71.8c0,4.467-2.967,6.7-8.9,6.7H54.4V64.4h11.9C72.233,64.4,75.2,66.867,75.2,71.8z"
                fill="#FFF"
            />
        </CircleBullet>
    ),
    [Service.D]: () => (
        <CircleBullet color="#FF6319">
            <path
                d="M86.8,62.1c0-7.6-1.933-13.6-5.8-18c-4.267-4.8-10.567-7.2-18.9-7.2H44.4v50.4h19.4C79.133,87.3,86.8,78.9,86.8,62.1zM76.5,62.1c0,6.067-1.2,10.333-3.6,12.8c-2.133,2.133-5.6,3.2-10.4,3.2h-8.3v-32h8.1C71.767,46.1,76.5,51.433,76.5,62.1z"
                fill="#FFF"
            />
        </CircleBullet>
    ),
    [Service.E]: () => (
        <CircleBullet color="#0039A6">
            <polygon points="81.9,87.3 81.9,78.1 54.2,78.1 54.2,65.7 78,65.7 78,56.9 54.2,56.9 54.2,46.1 80.1,46.1 80.1,36.9 44.3,36.9 44.3,87.3" fill="#FFF" />
        </CircleBullet>
    ),
    [Service.F]: () => (
        <CircleBullet color="#FF6319">
            <polygon points="80.6,46.1 80.6,36.9 47.4,36.9 47.4,87.3 57.3,87.3 57.2,66.3 77.7,66.3 77.7,57.5 57.2,57.5 57.2,46.1" fill="#FFF" />
        </CircleBullet>
    ),
    [Service.Fd]: () => (
        <DiamondBullet color="#FF6319">
            <polygon points="80.6,46.1 80.6,36.9 47.4,36.9 47.4,87.3 57.3,87.3 57.2,66.3 77.7,66.3 77.7,57.5 57.2,57.5 57.2,46.1" fill="#FFF" />
        </DiamondBullet>
    ),
    [Service.M]: () => (
        <CircleBullet color="#FF6319">
            <polygon
                points="85.8,87.3 85.8,36.9 71.4,36.9 62.4,75 53.4,36.9 38.6,36.9 38.6,87.3 48.1,87.3 48.1,47 57.6,87.3 66.8,87.3 76.3,47 76.3,87.3"
                fill="#FFF"
            />
        </CircleBullet>
    ),
    [Service.R]: () => (
        <CircleBullet color="#FCCC0A">
            <path d="M85.2,87.3L74,67.1c2.4-1,4.267-2.167,5.6-3.5c2.8-2.8,4.2-6.6,4.2-11.4c0-4.533-1.533-8.217-4.6-11.05c-3.067-2.833-7.233-4.25-12.5-4.25h-21v50.4h9.9V68.9h8.5l9.7,18.4H85.2zM73.5,52.9c0,2.2-0.733,3.967-2.2,5.3c-1.467,1.333-3.4,2-5.8,2h-9.9V45.7h8.5C70.367,45.7,73.5,48.1,73.5,52.9z" />
        </CircleBullet>
    ),
    [Service.J]: () => (
        <CircleBullet color="#996633">
            <path
                d="M 77 71.1 V 37 h -9.8 v 34.5 c 0 3.133 -0.45 5.3 -1.35 6.5 s -2.617 1.8 -5.15 1.8 c -2.4 0 -4.05 -0.55 -4.95 -1.65 s -1.35 -3.083 -1.35 -5.95 v -3 h -9.8 v 3.1 c 0 4.933 1.2 8.8 3.6 11.6 c 2.667 3.2 6.6 4.8 11.8 4.8 c 6.667 0 11.367 -1.833 14.1 -5.5 C 76.033 80.467 77 76.433 77 71.1 Z"
                fill="#FFF"
            />
        </CircleBullet>
    ),
    [Service.Z]: () => (
        <CircleBullet color="#996633">
            <polygon points="81.6,87.3 81.7,78.5 55.1,78.5 81.7,45.5 81.7,36.9 44.6,36.9 44.6,45.7 68.9,45.7 42.3,78.7 42.3,87.3" fill="#FFF" />
        </CircleBullet>
    ),
};

export {BULLETS};
