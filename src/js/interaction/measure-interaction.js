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
	
    var self_           = this;
	this.listener       = null;
	this.measureOverlay = null;
	this.multiple = options.multiple || false;
	this.wgs84Sphere = new ol.Sphere(6378137);
	this.currentFeature = null;

    var authorizedTypes = new Array(
        ol.geom.GeometryType.LINE_STRING,
        ol.geom.GeometryType.POLYGON,
        ol.geom.GeometryType.CIRCLE
    );
    
    /**
     * Type is authorized ?
     * @param {ol.geom.GeometryType} type
     * @returns {Boolean}
     */
    function isAuthorized(type) {
        var index = authorizedTypes.indexOf(type);
        return (index !== -1);
    }
    
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
			radius: 3,
			stroke: new ol.style.Stroke({
				color: '#ffa500'
			}),
			fill: new ol.style.Fill({
				color:  '#ffa500'
			})
		})
	});
	
	/**
     * 
     * @param {ol.Feature} feature
     * @param {numeric} resolution
     * @returns {Array}
     */
	function styleFunction(feature, resolution) {
		var style = new ol.style.Style({
			fill: new ol.style.Fill({
				color: 'rgba(255, 165, 0, 0.2)'
			}),
			stroke: new ol.style.Stroke({
				color: '#ffa500',
				width: 2
			}),
			text: new ol.style.Text({
				font: 'bold 16px Arial, Verdana, Helvetica, sans-serif',
				text:feature.get('measure'),
				stroke: new ol.style.Stroke({
					color: '#fff',
					width: 5
				})
			})
		});
		return [style];
	}

	this.layer =  new ol.layer.Vector({ 
		source: new ol.source.Vector(),
		style: styleFunction
	});
	
	if (! options.style) {
		options.style = defStyle;
	}
    options.source = this.layer.getSource();
    
	/*if (options.type == ol.geom.GeometryType.LINE_STRING)	{
		options.maxPoints = 2;
	}*/
    if (! options.type) {
        options.type = ol.geom.GeometryType.LINE_STRING;
    } else if (! isAuthorized(options.type)) {
        throw 'Type ' + options.type + ' is not authorized.'; 
    }
	
	ol.interaction.Draw.call(this, options);

    /**
     * Format length ouput
     * @param {ol.geom.LineString} line
     * @return {object} The formatted length.
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
        
        var output = {};
        if (length > 100) {
			output.html = output.measure = (Math.round(length / 1000 * 100) / 100) + ' km';
        } else {
			output.html = output.measure = (Math.round(length * 100) / 100) + ' m';
        }
		return output;
	};
	
    /**
     * Format area output.
     * @param {ol.geom.Polygon} polygon
     * @return {object} Formatted area.
     */
	this.formatArea = function(polygon) {
		var area;
        
        var sourceProj = this.getMap().getView().getProjection();
        var geom = polygon.clone().transform(sourceProj, 'EPSG:4326');
		
		var coordinates = geom.getLinearRing(0).getCoordinates();
		area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates));
       
        var output = {};
        if (area > 10000) {
			area = (Math.round(area / 1000000 * 100) / 100);
			output.html = area + ' km<sup>2</sup>';
			output.measure = area + ' km2';
        } else {
			area =(Math.round(area * 100) / 100);
			output.html = area + ' m<sup>2</sup>';
			output.measure = area + ' m2';
        }
        return output;
	};
    
    /**
     * Format area output for a circle.
     * @param {ol.geom.Circle} circle
     * @return {object} Formatted area.
     */
	this.formatCircleArea = function(circle) {
		var sourceProj = this.getMap().getView().getProjection();
        var geom = circle.clone().transform(sourceProj, 'EPSG:4326');
        
		var radius = this.wgs84Sphere.haversineDistance(
            geom.getFirstCoordinate(),
            geom.getLastCoordinate()
        );
        var area = Math.PI * Math.pow(radius, 2);
      
		var output = {};
        if (area > 10000) {
			area = (Math.round(area / 1000000 * 100) / 100);
			output.html = area + ' km<sup>2</sup>';
			output.measure = area + ' km2';
        } else {
			area =(Math.round(area * 100) / 100);
			output.html = area + ' m<sup>2</sup>';
			output.measure = area + ' m2';
        }
        return output;
	};
    
    /**
     * Tooltip overlay creation
     */
	var elt = document.createElement('div');
	elt.className = 'tooltip-' + generateUid() + ' tooltip-measure';
    this.measureOverlay = new ol.Overlay({
       element: elt,
       offset: [0, -15],
       positioning: 'bottom-center'
    });
	
    /**
     * Manage drawstart event
     */
	this.on('drawstart', function(evt) {
		if (! this.multiple) {
			self_.layer.getSource().clear();
		}
		
		var ttPos;
		self_.currentFeature = evt.feature;
		
		/**
		 * Listener on geometry change
		 */
		self_.listener = evt.feature.getGeometry().on('change', function(evt) {
			if (self_.measureOverlay.getElement().style.visibility === 'hidden') {
				self_.measureOverlay.getElement().style.visibility = 'visible';
			}
	
			var geom = evt.target;
			
			var output;
            if (geom instanceof ol.geom.LineString) {
				output = self_.formatLength(geom);
				ttPos = geom.getLastCoordinate();
			} else if (geom instanceof ol.geom.Polygon) {
				output = self_.formatArea(geom);
				ttPos = geom.getLastCoordinate();
			} else if (geom instanceof ol.geom.Circle) {
				output = self_.formatCircleArea(geom);
				ttPos = geom.getCenter();
			}
			
			var elt = self_.measureOverlay.getElement();
			elt.innerHTML = output.html;
			self_.currentFeature.set('measure', output.measure);
			self_.measureOverlay.setPosition(ttPos);	
		});
	}, this);
	
     /**
     * Manage drawend event
     */
	this.on('drawend', function(evt) {
		self_.measureOverlay.getElement().style.visibility = 'hidden';
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
		this.getMap().removeOverlay(this.measureOverlay);
    }

	map.addLayer(this.layer);
	map.addOverlay(this.measureOverlay);
};

/**
 * Override ol.interaction.Draw.setActive
 * @param {type} active
 */
ol.interaction.Measure.prototype.setActive = function(active)	{
	ol.interaction.Draw.prototype.setActive.call(this, active);
	this.layer.getSource().clear();
};