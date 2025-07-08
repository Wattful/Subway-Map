import { execSync } from 'child_process';

execSync('ogr2ogr shoreline_raw.json -f "GeoJSON" -t_srs Track/Track.prj Shoreline/Shoreline.shp', { encoding: 'utf-8' });
execSync('ogr2ogr track_raw.json -f "GeoJSON" -t_srs Track/Track.prj Track/Track.shp', { encoding: 'utf-8' });
execSync('ogr2ogr stations_raw.json -f "GeoJSON" -t_srs Track/Track.prj Stations/Stations.shp', { encoding: 'utf-8' });