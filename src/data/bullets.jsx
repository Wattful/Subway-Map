import React, {useState} from "react";
import {Service} from "./enums.jsx"

function CircleBullet({color, children}){
	// TODO are these sizes necessary?
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="29px" height="29px" viewBox="0 0 125 125" style={{display: "inline-block"}}>
			<circle cx="62.5" cy="62.5" r="50" fill={color}/>
			{children}
		</svg>
	)
}

function DiamondBullet({color, children}){
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="29px" height="29px" viewBox="0 0 125 125" style={{display: "inline-block"}}>
			<path d="M62.5,2.5L122.5,62.5L62.5,122.5L2.5,62.5Z" fill={color}/>
			{children}
		</svg>
	)
}

// TODO separate colors and common polygons?
const BULLETS = {
	[Service.E]: () => <CircleBullet color="#0039A6"><polygon points="81.9,87.3 81.9,78.1 54.2,78.1 54.2,65.7 78,65.7 78,56.9 54.2,56.9 54.2,46.1 80.1,46.1 80.1,36.9 44.3,36.9 44.3,87.3" fill="#FFF"/></CircleBullet>,
	[Service.F]: () => <CircleBullet color="#FF6319"><polygon points="80.6,46.1 80.6,36.9 47.4,36.9 47.4,87.3 57.3,87.3 57.2,66.3 77.7,66.3 77.7,57.5 57.2,57.5 57.2,46.1" fill="#FFF"/></CircleBullet>,
	[Service.Fd]: () => <DiamondBullet color="#FF6319"><polygon points="80.6,46.1 80.6,36.9 47.4,36.9 47.4,87.3 57.3,87.3 57.2,66.3 77.7,66.3 77.7,57.5 57.2,57.5 57.2,46.1" fill="#FFF"/></DiamondBullet>,
	[Service.M]: () => <CircleBullet color="#FF6319"><polygon points="85.8,87.3 85.8,36.9 71.4,36.9 62.4,75 53.4,36.9 38.6,36.9 38.6,87.3 48.1,87.3 48.1,47 57.6,87.3 66.8,87.3 76.3,47 76.3,87.3" fill="#FFF"/></CircleBullet>,
	[Service.R]: () => <CircleBullet color="#FCCC0A"><path d="M85.2,87.3L74,67.1c2.4-1,4.267-2.167,5.6-3.5c2.8-2.8,4.2-6.6,4.2-11.4c0-4.533-1.533-8.217-4.6-11.05c-3.067-2.833-7.233-4.25-12.5-4.25h-21v50.4h9.9V68.9h8.5l9.7,18.4H85.2zM73.5,52.9c0,2.2-0.733,3.967-2.2,5.3c-1.467,1.333-3.4,2-5.8,2h-9.9V45.7h8.5C70.367,45.7,73.5,48.1,73.5,52.9z"/></CircleBullet>,
}

export {BULLETS};