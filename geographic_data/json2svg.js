import * as d3Geo from "d3-geo";
import {geoProject} from "d3-geo-projection";
import svgexport from "svgexport";
import fs from "fs";
import {forEachCoord} from "./util.js";
import shorelineData from "./shoreline_processed.json" with { type: "json" };
import trackData from "./track_processed.json" with { type: "json" };
import stationsData from "./stations_processed.json" with { type: "json" };

const {geoPath} = d3Geo;
const height = parseInt(process.argv[2]);
if(!height){
    throw new Error("Height not specified");
}

// TODO combine with preprocess?

let [xmin, ymin, xmax, ymax] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

const minMaxFunction = (x, y) => {
	xmin = Math.min(x, xmin);
	ymin = Math.min(y, ymin);
	xmax = Math.max(x, xmax);
	ymax = Math.max(y, ymax);
	return false;
}

forEachCoord(shorelineData.features, minMaxFunction);
// In theory bounding box should be covered by shoreline only but include these for completeness
forEachCoord(trackData.features, minMaxFunction);
forEachCoord(stationsData.features, minMaxFunction);

[xmin, ymin, xmax, ymax] = [xmin - 1000, ymin - 1000, xmax + 1000, ymax + 1000];
const width = Math.ceil((xmax - xmin) * (height / (ymax - ymin)));

const boundingBoxFeatures = [{"type": "Feature", "properties": {"isboundingbox": true}, "geometry": {"type": "Point", "coordinates": [xmin, ymin]}}, { "type": "Feature", "properties": {"isboundingbox": true}, "geometry": {"type": "Point", "coordinates": [xmax, ymax]}}];
const filterBoundingBoxFeatures = ({type, features}) => {return {type, features: features.filter((feature) => !feature.properties.isboundingbox)}};

const shorelineInput = {type: "FeatureCollection", features: [...shorelineData.features, ...boundingBoxFeatures]};
const pixel_shoreline = filterBoundingBoxFeatures(geoProject(shorelineInput, d3Geo.geoIdentity().reflectY(true).fitHeight(height, shorelineInput)));
const trackInput = {type: "FeatureCollection", features: [...trackData.features, ...boundingBoxFeatures]};
const pixel_track = filterBoundingBoxFeatures(geoProject(trackInput, d3Geo.geoIdentity().reflectY(true).fitHeight(height, trackInput)));
const stationsInput = {type: "FeatureCollection", features: [...stationsData.features, ...boundingBoxFeatures]};
const pixel_stations = filterBoundingBoxFeatures(geoProject(stationsInput, d3Geo.geoIdentity().reflectY(true).fitHeight(height, stationsInput)));

const shorelineSVG = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
    + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n"
    + "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\""
    + ` width="${width}"`
    + ` height="${height}"`
    + ` viewBox="0 0 ${width} ${height}"`
    + ` fill="none" stroke="black"`
    + ">\n"
    + `<path d="${geoPath()(pixel_shoreline)}"/>\n`
    + "</svg>"
fs.writeFile("shoreline.svg", shorelineSVG, (err) => {
    if (err) {
        console.log(err);
    }
});

svgexport.render({
    input: ["shoreline.svg"],
    output: ["../src/shoreline.png"],
}, (err) => {
    if (err) {
        console.log(err);
    }
})

const trackJson = pixel_track.features.reduce((acc, feature) => {
    const {id, ...props} = feature.properties;
    acc[id] = {id, ...props, d: geoPath()(feature)};
    return acc;
}, {})
fs.writeFile("../src/track.json", JSON.stringify(trackJson, null, 4), (err) => {
    if (err) {
        console.log(err);
    }
});

const stationsJson = pixel_stations.features.reduce((acc, feature) => {
    const {id, ...props} = feature.properties;
    acc[id] = {id, coords: {x: feature.geometry.coordinates[0], y: feature.geometry.coordinates[1]}};
    return acc;
}, {})
fs.writeFile("../src/stations.json", JSON.stringify(stationsJson, null, 4), (err) => {
    if (err) {
        console.log(err);
    }
});