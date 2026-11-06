import {execSync} from "child_process";

// Input dataset is in Mercator projection. This is what we use for our visual representation.
execSync('ogr2ogr shoreline_raw.json -f "GeoJSON" -t_srs Track/Track.prj Shoreline/Shoreline.shp', {encoding: "utf-8"});
execSync('ogr2ogr track_raw.json -f "GeoJSON" -t_srs Track/Track.prj Track/Track.shp', {encoding: "utf-8"});
execSync('ogr2ogr ctrack_raw.json -f "GeoJSON" -t_srs WGS84 Track/Track.shp', {encoding: "utf-8"}); // To measure track length, we must create a second projection of the track data in global coordinates.
execSync('ogr2ogr stations_raw.json -f "GeoJSON" -t_srs Track/Track.prj Stations/Stations.shp', {encoding: "utf-8"});
