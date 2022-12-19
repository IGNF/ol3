class Utilities {
    /**
     * Returns france center in WGS84 Web Mercator (EPSG:3857)
     * @returns {ol.Coordinate}
     */
    static getFranceCenter() {
        return [ 251936.04517352092, 5916836.764449345 ];    
    }

    /**
     * Generate unique ? id
     * @returns {String}
     */
    generateUid() {
        return Math.random().toString(36).substring(2, 9);
    }
}


class MapResolutions
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

export { Utilities, MapResolutions }