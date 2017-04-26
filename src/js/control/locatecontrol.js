ol.locateOverlay = function()	{
	var outer = document.createElement('div');
	outer.className = 'locate-outer-circle';
	
	var inner = document.createElement('div');
	inner.className = 'locate-inner-circle';
	outer.appendChild(inner);
	
	ol.Overlay.call(this, {
		element: outer,
		positioning: 'center-center'
	});
};
ol.inherits(ol.locateOverlay, ol.Overlay);

ol.locateOverlay.prototype.show = function() {
	this.getElement().style.display = 'block';
};

ol.locateOverlay.prototype.hide = function() {
	this.getElement().style.display = 'none';
};

/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options.
 *		- title {String} title of the control
 *		- html {String} html to insert in the control
   */
ol.control.Locate = function(opt_options) {
	var options = opt_options || {};
	
	this.toggle_ 	= options.toggle || false;
	this.location_ 	= null;
	this.overlay_	= null;
	
	this.button = document.createElement('button');
	this.button.type 			= 'button';
	this.button.title 			= options.title || 'Locate me';
	this.button.innerHTML 	= options.html || '';

	var self = this;
	this.button.addEventListener('click', function(event) {
		event.preventDefault()
		if (! self.location_) { return; }
		
		var tracking = self.location_.getTracking();
		if (! self.toggle_)	{
			self.location_.setTracking(true);
			return;
		}
		
		self.location_.setTracking(! tracking);
		self.button.style = self.location_.getTracking() ? 'color: #f00' : '';
		tracking ? 	self.overlay_.hide() : self.overlay_.show();
	}, false);

	var element = document.createElement('div');
	element.className = 'ol-locate ol-unselectable ol-control';
	element.appendChild(this.button);
	
	ol.control.Control.call(this, {element: element});
};

ol.inherits(ol.control.Locate, ol.control.Control);

ol.control.Locate.prototype.setMap = function(map) {
	ol.control.Control.prototype.setMap.call(this, map);
	if (this.getMap()) {
		if (this.location_) { delete this.location_ ;}
		if (this.overlay_)	{ this.getMap().removeOverlay(this.overlay_); }
	}
	if (map) {
		this.overlay_ = new ol.locateOverlay();
		map.addOverlay(this.overlay_);
		
		this.location_ = new ol.Geolocation({
			projection: map.getView().getProjection(),
			trackingOptions: {
				enableHighAccuracy: true,
				maximumAge: 10000,
				timeout: 600000
			}
		});
		
		var self = this;
		this.location_.on('change:position', function(){
			var coordinates = self.location_.getPosition();
			map.getView().setCenter(coordinates);
			self.overlay_.setPosition(coordinates);
			
			if (! self.toggle_)	{
				self.location_.setTracking(false);
			}
		});
		this.location_.on('error', function(error){
			console.log(error.message);
			if (! self.toggle_)	{
				self.location_.setTracking(false);
			}
			self.overlay_.setPosition([null,null]);
		});
	}
};