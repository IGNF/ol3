import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Text from 'ol/style/Text';
import CircleStyle from 'ol/style/Circle';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { transform } from 'ol/proj';
import { getArea, getDistance } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { Utilities } from './../../Utilities';


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
class MeasureInteraction extends Draw
{
	constructor(options) {
		options = options ?? {};
		
		let type = options.type ?? 'LineString';
		if (! ['LineString','Polygon','Circle'].includes(type)) {
			throw `Type ${type} is not authorized.`; 
		}
		
		let style = options.drawStyle ?? new Style({
			fill: new Fill({
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
				let geometry = feature.getGeometry();
				let geometryType = geometry.getType();

				let textAlign = (geometryType === 'LineString') ? 'left' : 'middle';
				let offsetX   = (geometryType === 'LineString') ? 10 : 0;
				let style = new Style({
					stroke: new Stroke({
						color: '#ffa500',
						width: 2
					}),
					fill: new Fill({
						color: 'rgba(255, 165, 0, 0.2)'
					})
				});

				let measureStyle = new Style({
					geometry: function(feature) {
						switch(type) {
							case 'LineString':
								return new Point(geometry.getLastCoordinate());
							case 'Circle':
								return new Point(geometry.getCenter());
							case 'Polygon':
								return geometry.getInteriorPoint();
						}
					},
					text: new Text({
						text: feature.get('measure'), 
						fill: new Fill({ color: '#000' }),
						textAlign: textAlign,
						offsetX: offsetX,
						backgroundFill: new Fill({ color: '#ffcc33' }),
						backgroundStroke: new Stroke({
							color: '#fff',
							width: 0.5
						}),
						padding: [5, 5, 5, 5]
					})
				});
				
				return [style, measureStyle];
			}
		});
		
		options.style  = style;
		options.source = layer.getSource();
		super(options);
		
		this._style = new Style({
			stroke: new Stroke({
				color: '#ffa500',
				width: 2
			}),
			fill: new Fill({
				color: 'rgba(255, 165, 0, 0.2)'
			})
		});
		this._layer 	= layer;
		this._multiple  = options.multiple ?? false;
		this._listener;
		
		// Tooltip overlay creation
		let elt = document.createElement('div');
		elt.className = 'tooltip-' + Utilities.generateUid() + ' tooltip-measure';
		this._measureOverlay = new Overlay({
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
			this.getMap().removeOverlay(this._measureOverlay);
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
		if (this._layer) this._layer.getSource().clear();
	}

	_formatLength(line) {       
		let coordinates = line.getCoordinates();
		if (coordinates.length < 2) return 0;

		let sourceProj = this.getMap().getView().getProjection();

		let length = 0;
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
        let sourceProj = this.getMap().getView().getProjection();
        let geom = geometry.clone().transform(sourceProj, 'EPSG:4326');
		
		let coordinates, area;
		switch(geom.getType()) {
			case 'Circle':
				let radius = getDistance(
					geom.getFirstCoordinate(),
					geom.getLastCoordinate()
				);
				area = Math.PI * Math.pow(radius, 2);
				break;
			case 'Polygon':
				coordinates = geom.getLinearRing(0).getCoordinates();
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
	_onDrawStart(event) {
		if (! this._multiple) {
			this._layer.getSource().clear();
		}
				
		// Listener on geometry change
		this._listener = event.feature.getGeometry().on('change', e => {
			let geom = e.target;
			
			let output;
            if (geom instanceof LineString) {
				output = this._formatLength(geom);
			} else {
				output = this._formatArea(geom);
			}
			let ttPos = geom.getLastCoordinate();
			
			let elt = this._measureOverlay.getElement();
			elt.innerHTML = output.html;
			event.feature.set('measure', output.measure);
			this._measureOverlay.setPosition(ttPos);	
		});
	}
	
	/**
     * Manage drawend event
     */
	_onDrawEnd(evt) {
		this._measureOverlay.setPosition(undefined);
		unByKey(this._listener);
	}
}

export default MeasureInteraction;