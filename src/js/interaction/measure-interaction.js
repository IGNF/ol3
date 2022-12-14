import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Draw from 'ol/interaction/Draw';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/Point';
import { transform } from 'ol/proj';
import { getArea, getDistance } from 'ol/sphere';
import { ign_utils_generateUid } from './../Utils';
import { ign_utils_getMeasureText, ol_style_Label } from './../Style/labelstyle';


/**
 * @classdesc
 * Interaction for measure distance or area depending on geometry type
 * 
 * Additionnal options
 * - multiple {bool} possibility to make many measures
 * - drawStyle {ol.style} option is used to style the features (measures)
 *
 * @constructor
 * @extends {ol.interaction.Draw}
 * @param {olx.interaction.DrawOptions=} options Options.
 */
class ol_interaction_Measure extends Draw
{
	constructor(options) {
		if (!options) options = {};
		
		let type = options.type ?? 'LineString';
		if (! ['LineString','Polygon','Circle'].includes(type)) {
			throw `Type ${type} is not authorized.`; 
		}
		
		let style = options.drawStyle ?? new Style({
			fill: new ol.style.Fill({
				color: 'rgba(255, 165, 0, 0.3)'
			}),
			stroke: new Stroke({
				color: '#ffa500',
				width: 2
			}),
			image: new CircleStyle({
				radius: 3,
				stroke: new Stroke({
					color: '#ffa500'
				}),
				fill: new Fill({
					color:  '#ffa500'
				})
			})
		});
		
		let layer = new VectorLayer({ 
			source: new VectorSource(),
			style: (feature, resolution) => {
				let style = new Style({
					stroke: new Stroke({
						color: '#ffa500',
						width: 2
					}),
					fill: new Fill({
						color: 'rgba(255, 165, 0, 0.2)'
					})
				});
				
				let margin = 5;
				let strokeWidth = 1;
				let font = '14px "Helvetica Neue",Helvetica,Arial,sans-serif';
        
				let w = ign_utils_getMeasureText(font,feature.get('measure'));
				let offsetX = 0;
				if (feature.getGeometry() instanceof ol.geom.LineString) {
					offsetX = w/2 + margin + strokeWidth + 2;
				}
		
				let measureStyle = new Style({
					geometry: feature => {
						let geometry = feature.getGeometry();
						switch(geometry.getType()) {
							case 'LineString':
								return new Point(geometry.getLastCoordinate());
							case 'Circle':
								return new Point(geometry.getCenter());
							case 'Polygon':
								return geometry.getInteriorPoint();
						}
					},
					image: new ol_style_Label({
						label: feature.get('measure'),
						offsetX: offsetX,
						fill: new Fill({color:'#000'})
					}),
					stroke: new Stroke({
						color: '#fff',
						width: strokeWidth
					}),
					fill: new Fill({color:'#ffcc33'})
				});
				
				return [style, measureStyle];
			}
		});
		
		options.style  = style;
		options.source = this.layer.getSource();
		super(options);
		
		this._layer 	= layer;
		this._multiple  = options.multiple ?? false;
		this._listener;
		
		// Tooltip overlay creation
		let elt = document.createElement('div');
		elt.className = 'tooltip-' + ign_utils_generateUid() + ' tooltip-measure';
		this._measureOverlay = new ol.Overlay({
			element: elt,
			offset: [0, -15],
			positioning: 'bottom-center'
		});
		
		this.on('drawstart', evt => {
			this._onDrawStart(evt);
		});
		
		this.on('drawend', evt => {
			this._onDrawEnd(evt);
		});
	}
	
	/**
	 * Override ol.interaction.Draw.setMap
	 * @param {ol.Map} map
	 */
	setMap(map) {
		super.setMap(map);
	
		if (this.getMap())	{
			this.getMap().removeLayer(this.layer);
			this.getMap().removeOverlay(this.measureOverlay);
		}

		this._layer.setMap(map);
		map.addOverlay(this._measureOverlay);
	}

	/**
	 * Override ol.interaction.Draw.setActive
	 * @param {type} active
	 */
	setActive(active)	{
		super.setActive(active);
		this._layer.getSource().clear();
	}

	_formatLength() {
		let length = 0;
       
		let coordinates = line.getCoordinates();
		let sourceProj = this.getMap().getView().getProjection();
		for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
			var c1 = transform(coordinates[i], sourceProj, 'EPSG:4326');
			var c2 = transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
			length += getDistance(c1, c2);
		}
        
        let output = {};
        if (length > 100) {
			output.html = output.measure = (Math.round(length / 1000 * 100) / 100) + ' km';
        } else {
			output.html = output.measure = (Math.round(length * 100) / 100) + ' m';
        }
		return output;
	}
	
	/**
     * Format area output.
     * @param {inherits ol.geom} geometry
     * @return {object} Formatted area.
     */
	_formatArea(geometry) {
		let area;
        
        let sourceProj = this.getMap().getView().getProjection();
        let geom = geometry.clone().transform(sourceProj, 'EPSG:4326');
		
		switch(geom.getType()) {
			case 'Circle':
				var radius = getDistance(
					geom.getFirstCoordinate(),
					geom.getLastCoordinate()
				);
				area = Math.PI * Math.pow(radius, 2);
				break;
			case 'Polygon':
				let coordinates = geom.getLinearRing(0).getCoordinates();
				area = Math.abs(getArea(coordinates));
				break;
		}
		
        let output = {};
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
     * Manage drawstart event
     */
	_onDrawStart(evt) {
		if (! this.multiple) {
			this._layer.getSource().clear();
		}
				
		// Listener on geometry change
		this._listener = evt.feature.getGeometry().on('change', evt => {
			let geom = evt.target;
			
			let output;
            if (geom instanceof LineString) {
				output = this._formatLength(geom);
			} else {
				output = this._formatArea(geom);
			}
			let ttPos = geom.getLastCoordinate();
			
			let elt = self_.measureOverlay.getElement();
			elt.innerHTML = output.html;
			evt.feature.set('measure', output.measure);
			this._measureOverlay.setPosition(ttPos);	
		});
	}
	
	/**
     * Manage drawend event
     */
	_onDrawEnd(evt) {
		this._measureOverlay.setPosition(undefined);
		ol.Observable.unByKey(this.listener);
	}
}