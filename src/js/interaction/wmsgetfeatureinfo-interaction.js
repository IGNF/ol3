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
    
	this.downPx_ 		= null;
    this.lastCentroid_  = null;

	ol.interaction.Pointer.call(this, {
		handleDownEvent: this.handleDownEvent_,
		handleUpEvent: this.handleUpEvent_,
		handleDragEvent: this.handleDragEvent_
	});
};

ol.inherits(ol.interaction.WMSGetFeatureInfo, ol.interaction.Pointer);

/**
 * 
 * @param {type} event
 * @returns {Boolean}
 */
ol.interaction.WMSGetFeatureInfo.prototype.handleDownEvent_ = function(event)
{
	this.lastCentroid_ = ol.interaction.Pointer.centroid(this.targetPointers);
	this.downPx_ = event.pixel;
	return true;
};

/**
 * 
 * @param {type} event
 * @returns {undefined}
 */
ol.interaction.WMSGetFeatureInfo.prototype.handleDragEvent_ = function(event)
{
	var centroid = ol.interaction.Pointer.centroid(this.targetPointers);

	if (this.lastCentroid_) {
		var deltaX = this.lastCentroid_[0] - centroid[0];
		var deltaY = centroid[1] - this.lastCentroid_[1];
		
		var map = event.map;
		
        var view = map.getView();
		var viewState = view.getState();
		var center = [deltaX, deltaY];
		
        ol.coordinate.scale(center, viewState.resolution);
		ol.coordinate.rotate(center, viewState.rotation);
		ol.coordinate.add(center, viewState.center);
		center = view.constrainCenter(center);
		view.setCenter(center);
	}
	this.lastCentroid_ = centroid;
};

/**
 * 
 * @param {type} event
 * @returns {undefined}
 */
ol.interaction.WMSGetFeatureInfo.prototype.handleUpEvent_ = function(event)
{
    this.lastCentroid_ = null;

    var clickPx = event.pixel;

    var dx = this.downPx_[0] - clickPx[0];
    var dy = this.downPx_[1] - clickPx[1];
    var squaredDistance = dx * dx + dy * dy;
    if (squaredDistance > 25) { return; }

    var map = event.map;
    
    // PAS SUR QUE CA MARCHE DANS TOUS LES CAS
    var url = this.layer_.getSource().getGetFeatureInfoUrl(
        event.coordinate,
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
                coordinate: event.coordinate
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
};