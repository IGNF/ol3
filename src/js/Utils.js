/**
 * Returns france center in WGS84 Web Mercator (EPSG:3857)
 * @returns {ol.Coordinate}
 */
ol.utils.getFranceCenter = function() {
    return [ 251936.04517352092, 5916836.764449345 ];
};


/**
 * Returns resolution for zoom level
 * @returns {ol.utils.resolutions}
 */
ol.utils.resolutions = function() {
    var res0 = 156543.03392804097;
    
    var resolutions = {"0": res0};
    for (var i=1; i<=20; ++i) {
        var resolution = res0 / Math.pow(2, i) ;
        resolutions[i.toString()] = resolution;
    }
    
    this.getResolution = function(zoomLevel) {
        var z = zoomLevel.toString();
        if (z in resolutions) {
            return resolutions[z];
        }
        return null;
    };
};