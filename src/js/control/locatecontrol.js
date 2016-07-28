/** 
 *  A simple control to locate your position
 *  @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options.
 *  
 */


/**
 * A simple control to locate your position
 * @param {Object} opt_options
 *  - html {String} html to insert in the control
 * @extends {ol.control.Control}
 */
ol.control.Locate = function(opt_options) {
    var options = opt_options || {};

    this.geolocation_   = null;
    this.toggle_        = options.toggle || false;

    var element = document.createElement('div');
    element.className = 'ol-control ol-locate ol-unselectable';

    var button = document.createElement('button');
    button.type         	= 'button';
    button.title        		= options.title;
    button.innerHTML   	= options.html;
    element.appendChild	(button);

    var self = this;
    button.addEventListener('click',function(evt) {
        if (! self.geolocation_) { return; }
        self.geolocation_.setTracking(true)
    },	false);

    // Call parent constructor
    ol.control.Control.call(this, {element: element});
};

ol.inherits(ol.control.Locate, ol.control.Control);

/** 
 * @param {type} evt
 */
/*ol.control.Locate.prototype.handleLocate_ = function(evt) {
    if (! this.geolocation_) { return; }
    
    this.geolocation_.setTracking(true);
};*/

/**
 * @param {ol.Map} map
 */
ol.control.Locate.prototype.setMap = function(map) {
    ol.control.Control.prototype.setMap.call(this, map);
    if (!map) { return;}
    
    this.geolocation_ = new ol.Geolocation({
        trackingOptions: {
            maximumAge: 10000,
            enableHighAccuracy: true,
            timeout: 600000
        },
        projection: map.getView().getProjection()
    });
	
	var self = this;
	this.geolocation_.on('change:position', function() {
		var coordinates = self.geolocation_.getPosition();
		map.getView().setCenter(coordinates);
		
		self.geolocation_.setTracking(false);
	});
};