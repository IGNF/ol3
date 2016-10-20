/**
 * @param {object} opt_options
 * - proxyUrl {string} proxy name
 * - layer {ol.layer.Tile} layer to getFeatureInfo on
 * - infoFormat {string} muste be GML,HTML or JSON
 * - maxFeatures {integer} maxFeatures for GetFeatureInfo request
 * @returns {undefined}
 */
ol.interaction.WMSGetFeatureInfo = function(opt_options)
{
    var options = opt_options || {};
    
    if (! options.layer) {
        throw 'layer option must be defined';
    }
    if (! options.layer.getSource() instanceof ol.source.TileWMS) {
        throw "layer source must be an instance of 'ol.source.TileWMS'";
    }
   
    var formats = {
        'GML': 'application/vnd.ogc.gml',
        'HTML': 'text/html',
        'JSON': 'application/json'
    };
    
    this.proxyUrl_ 	= options.proxyUrl || '';
    this.layer_    	= options.layer;
    
    var format = options.infoFormat || 'GML';
    if (! format in formats) {
        throw "infoFormat option must be either 'GML', 'HTML, 'JSON'";
    }
    
    this.format_ = format;
    this.params_ = {
        INFO_FORMAT: formats[format],
        FEATURE_COUNT: options.maxFeatures || 10
    };
	ol.interaction.Interaction.call(this, {handleEvent: this.handleEvent_});
};
ol.inherits(ol.interaction.WMSGetFeatureInfo, ol.interaction.Interaction);

/**
 * 
 * @param {ol.MapBrowserPointerEvent} mapBrowserEvent Event
 * @returns {Boolean}
 */
ol.interaction.WMSGetFeatureInfo.prototype.handleEvent_ = function(mapBrowserEvent)
{
	if (! ol.events.condition.singleClick(mapBrowserEvent)) { return true; }
	
	var map = mapBrowserEvent.map;
	var coordinate = mapBrowserEvent.coordinate;
	
	var url = this.layer_.getSource().getGetFeatureInfoUrl(
        coordinate,
        map.getView().getResolution(),
        map.getView().getProjection(),
        this.params_
    );

    var self = this;
    
    // On change le style de cursor
    var lastCursor = map.getViewport().style.cursor;
    map.getViewport().style.cursor = 'progress';
    
    $.ajax({
        url: this.proxyUrl_ + encodeURIComponent(url),
        success: function(data) {
            map.getViewport().style.cursor = lastCursor;
            var newEvent = {
                type:'getfeatureinfo',
                map: map,
                response: data,
                coordinate: coordinate
            };

            newEvent['data'] = data; 
            if (self.format_ === 'GML') {
                var format = new ol.format.WMSGetFeatureInfo();
                var features = format.readFeatures(data, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: self.getMap().getView().getProjection()
                });
                newEvent['data'] = features;
            }

            self.dispatchEvent(newEvent);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            map.getViewport().style.cursor = lastCursor;
            self.dispatchEvent({ type:'getfeatureinfofailed', msg: jqXHR.responseText });
        } 
    });
	
	return false;
};