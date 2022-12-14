/**
 * Returns france center in WGS84 Web Mercator (EPSG:3857)
 * @returns {ol.Coordinate}
 */
export function ign_utils_getFranceCenter() {
    return [ 251936.04517352092, 5916836.764449345 ];
};

/**
 * Generate unique ? id
 * @returns {String}
 */
export function ign_utils_generateUid() {
	return Math.random().toString(36).substr(2, 9);
}

class ign_utils_resolutions
{
    constructor() {
        let res0 = 156543.03392804097;
    
        this._resolutions = { "0": res0 };
        for (let i = 1; i <= 20; ++i) {
            let resolution = res0 / Math.pow(2, i) ;
            this._resolutions[i.toString()] = resolution;
        }    
    } 
    
    getResolution(zoom) {
        let z = zoomLevel.toString();
        return (z in resolutions) ? resolutions[z] : null;    
    }
}

export default ign_utils_resolutions;