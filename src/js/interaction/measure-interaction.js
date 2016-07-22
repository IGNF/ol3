/**
 * Generate unique ? id
 * @returns {String}
 */
function generateUid() {
	return Math.random().toString(36).substr(2, 9);
}

var ol = ol || {};

/**
 * @classdesc
 * Interaction for measure distance or area depending on geometry type
 * 
 * Additionnal options
 * - multiple {bool} possibility to make many measures
 * - drawStyle {ol.style} option is used to style the features (measures)
 * - defStyle {ol.style} interaction style
 *
 * @constructor
 * @extends {ol.interaction.Draw}
 * @param {olx.interaction.DrawOptions=} options Options.
 */
ol.interaction.Measure = function(options)	{
	if (!options) options = {};
	
	var self_	= this;
	this.listener	= null;
	this.measureOverlay = null;
	this.id = generateUid();
	this.multiple = options.multiple || false;
	this.wgs84Sphere = new ol.Sphere(6378137);

    /**
     * interaction default style
     * @type ol.style.Style
     */
	var defStyle = new ol.style.Style({
		fill: new ol.style.Fill({
			color: 'rgba(255, 165, 0, 0.3)'
		}),
		stroke: new ol.style.Stroke({
			color: '#ffa500',
			width: 2
		}),
		image: new ol.style.Circle({
			radius: 5,
			stroke: new ol.style.Stroke({
				color: '#ffa500'
			}),
			fill: new ol.style.Fill({
				color:  '#ffa500'
			})
		})
	});
	
	/**
     * Layer default style
     * @type ol.style.Style
     */
	var defDrawStyle = new ol.style.Style({
		fill: new ol.style.Fill({
			color: 'rgba(255, 165, 0, 0.2)'
		}),
		stroke: new ol.style.Stroke({
			color: '#ffcc33',
			width: 2
		}),
		image: new ol.style.Circle({
			radius: 7,
			fill: new ol.style.Fill({
				color:  '#ffcc33'
			})
		})
	});
	
	var drawStyle = options.drawStyle || defDrawStyle;
	this.layer =  new ol.layer.Vector({ 
		source: new ol.source.Vector(),
		style: drawStyle
	});
	
	if (! options.style) {
		options.style = defStyle;
	}
	
	/*if (options.type == ol.geom.GeometryType.LINE_STRING)	{
		options.maxPoints = 2;
	}*/
	options.source = this.layer.getSource();
	
	ol.interaction.Draw.call(this, options);
	
	/**
     * Format area output.
     * @param {ol.geom.Polygon} polygon The polygon.
     * @return {string} Formatted area.
     */	
	this.formatArea = function(polygon) {
		var area;
        
        var sourceProj = this.getMap().getView().getProjection();
        var geom = polygon.clone().transform(sourceProj, 'EPSG:4326');
		
		var coordinates = geom.getLinearRing(0).getCoordinates();
		area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates));
       
        var output;
        if (area > 10000) {
			output = (Math.round(area / 1000000 * 100) / 100) + ' km<sup>2</sup>';
        } else {
			output = (Math.round(area * 100) / 100) + ' m<sup>2</sup>';
        }
        return output;
	};
	
	/**
	 * Format length output.
     * @param {ol.geom.LineString} line The line.
	 * @return {string} The formatted length.
     */
	this.formatLength = function(line) {
        var length = 0;
       
		var coordinates = line.getCoordinates();
		var sourceProj = this.getMap().getView().getProjection();
		for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
			var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
			var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
			length += this.wgs84Sphere.haversineDistance(c1, c2);
		}
        
        var output;
        if (length > 100) {
			output = (Math.round(length / 1000 * 100) / 100) + ' km';
        } else {
			output = (Math.round(length * 100) / 100) + ' m';
        }
		return output;
	};
	  
    /**
     * Tooltip overlay creation
     */
	this.createMeasureTooltip = function() {
		var elt = document.createElement('div');
		elt.className = 'tooltip-' + this.id + ' tooltip-measure';
		
		this.measureOverlay = new ol.Overlay({
			element: elt,
			offset: [0, -15],
			positioning: 'bottom-center'
		});
		if (this.getMap()) {
			this.getMap().addOverlay(this.measureOverlay);
		}
	};
	
    /**
     * Manage drawstart event
     */
	this.on('drawstart', function(evt) {
		if (! this.multiple) {
			self_.layer.getSource().clear();
			if (self_.measureOverlay) {
				var elt = self_.measureOverlay.getElement();
				if (elt.parentNode) { elt.parentNode.removeChild(elt); }
			}
		}
		this.createMeasureTooltip();
		
		var ttPos;
		self_.listener = evt.feature.getGeometry().on('change', function(evt) {
			var geom = evt.target;
			
			var output;
			if (geom instanceof ol.geom.Polygon) {
				output = self_.formatArea(geom);
				ttPos = geom.getInteriorPoint().getCoordinates();
			} else if (geom instanceof ol.geom.LineString) {
				output = self_.formatLength(geom);
				ttPos = geom.getLastCoordinate();
			}
			var elt = self_.measureOverlay.getElement();
			elt.innerHTML = output;
			self_.measureOverlay.setPosition(ttPos);	
		});
	}, this);
	
     /**
     * Manage drawend event
     */
	this.on('drawend', function(evt) {
		var elt = self_.measureOverlay.getElement();
		elt.className =  'tooltip-' + this.id + ' tooltip-static';
		
		self_.measureOverlay.setOffset([0, -7]);
		ol.Observable.unByKey(self_.listener);
	}, this);
};

ol.inherits(ol.interaction.Measure, ol.interaction.Draw);

/**
 * Override ol.interaction.Draw.setMap
 * @param {ol.Map} map
 */
ol.interaction.Measure.prototype.setMap = function (map) {
	ol.interaction.Draw.prototype.setMap.call(this, map);

	if (this.getMap())	{
		this.getMap().removeLayer(this.layer);
    }
	map.addLayer(this.layer);
};

/**
 * Override ol.interaction.Draw.setActive
 * @param {type} active
 */
ol.interaction.Measure.prototype.setActive = function(active)	{
	ol.interaction.Draw.prototype.setActive.call(this, active);
	this.layer.getSource().clear();
	
	if (! active) {
		var selector = "div[class^='tooltip-" + this.id + "']";
		var nodes = document.querySelectorAll(selector);
		for (var n=0; n<nodes.length; ++n) {
			nodes[n].parentNode.removeChild(nodes[n]);
		}
	}
};