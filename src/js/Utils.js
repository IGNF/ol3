/**
 * Returns france center in WGS84 Web Mercator (EPSG:3857)
 * @returns {ol.Coordinate}
 */
ol.utils.getFranceCenter = function() {
    return [ 251936.04517352092, 5916836.764449345 ];
};

/**
 * Returns unique identifier
 * @returns {String}
 */
ol.utils.guid = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
};

