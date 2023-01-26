class Utilities {
    /**
     * Returns france center depending on option (wkt, 4326, epsg:4326, 3857 or epsg:4326)
     * @returns {ol.Coordinate}
     */
    static getFranceCenter(srid, wkt) {
        if (srid !== 3857 && srid !== 4326) return null;
        let asWkt = (wkt === true) ? true : false;

        switch(srid) {
            case 3857: return asWkt ? 'POINT(251936.04517352092 5916836.764449345)' : [ 251936.04517352092, 5916836.764449345 ];
            case 4226: return asWkt ? 'POINT(2.26318 46.84516)' : [ 2.26318, 46.84516 ];
            default: break;
        }

        return null;
    }

    static getMaxExtent4326() {
        return [-180, -90, 180, 90];
    }

    static getMaxExtent3857() {
        return [-20037508.342789244, -238107693.26496765, 20037508.342789244, 238107693.26496765];
    }

    /**
     * Generate unique ? id
     * @returns {String}
     */
    static generateUid() {
        return Math.random().toString(36).substring(2, 9);
    }
}

let res0 = 156543.03392804097;
const resolutions = { "0": res0 };
for (let i = 1; i <= 20; ++i) {
    let resolution = res0 / Math.pow(2, i) ;
    resolutions[i.toString()] = resolution;
}  

const getResolutionForZoom = (zoom) => {
    let z = zoom.toString();
    return (z in resolutions) ? resolutions[z] : null;   
}

export { Utilities, getResolutionForZoom };