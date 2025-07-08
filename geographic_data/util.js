export function forEachCoord(features, innerCallback){
	featureLoop: for(const feature of features){
		const {type} = feature.geometry;
		if(type === "LineString"){
			for(let i = 0; i < feature.geometry.coordinates.length; i++){
				const [x, y] = feature.geometry.coordinates[i];
				const ct = innerCallback(x, y, feature, i === 0 || i === feature.geometry.coordinates.length - 1);
				if(ct){
					continue featureLoop;
				}
			}
		} else if(type === "MultiLineString"){
			for(const z of feature.geometry.coordinates){
				for(let i = 0; i < z.length; i++){
					const [x, y] = z[i];
					const ct = innerCallback(x, y, feature, i === 0 || i === z.length - 1);
					if(ct){
						continue featureLoop;
					}
				}
			}
		} else if (type === "Point"){
			const [x, y] = feature.geometry.coordinates;
			const ct = innerCallback(x, y, feature);
			if(ct){ // Redundant
				continue featureLoop;
			}
		} else {
			console.log(`UNRECOGNIZED TYPE ${type}`);
		}
	}
}