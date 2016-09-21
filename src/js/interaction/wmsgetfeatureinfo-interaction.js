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
    
    this.proxyUrl_ = options.proxyUrl || '';
    this.layer_    = options.layer;
    
    var format = options.infoFormat || 'GML';
    if (! format in formats) {
        throw "infoFormat option must be either 'GML', 'HTML, 'JSON'";
    }
    
    this.format_ = format;
    this.params_ = {
        INFO_FORMAT: formats[format],
        FEATURE_COUNT: options.maxFeatures || 10
    };
    
    var self = this;
    
    /**
     * 
     * @param {ol.MapEvent} event
     * @returns {undefined}
     */
    this.getFeatureInfo_ = function(event) {
		var map = event.map;
        
        // PAS SUR QUE CA MARCHE DANS TOUS LES CAS
        var url = self.layer_.getSource().getGetFeatureInfoUrl(
            event.coordinate,
            map.getView().getResolution(),
			map.getView().getProjection(),
            self.params_
        );
    
        document.body.style.cursor = "progress";
        $.ajax({
            url: this.proxyUrl_ + encodeURIComponent(url),
            success: function(data) {
                document.body.style.cursor = 'auto';
                var newEvent = {
                    type:'getfeatureinfo',
                    response: data,
                    coordinates: event.coordinate
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
                document.body.style.cursor = 'auto';
                self.dispatchEvent({ type:'getfeatureinfofailed', msg: jqXHR.responseText });
            } 
        });
    };
    
	ol.interaction.Pointer.call(this, {handleDownEvent: this.getFeatureInfo_});
};

ol.inherits(ol.interaction.WMSGetFeatureInfo, ol.interaction.Pointer);