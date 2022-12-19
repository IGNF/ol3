import Overlay from 'ol/Overlay';
import Control from 'ol/control/Control';
import Geolocation from 'ol/Geolocation';


/**
 * Localisation de la position de l'utilisateur
 */
class LocateOverlay extends Overlay
{
	constructor() {
		let outer = document.createElement('div');
		outer.className = 'locate-outer-circle';
	
		let inner = document.createElement('div');
		inner.className = 'locate-inner-circle';
		outer.appendChild(inner);
		
		super({
			element: outer,
			positioning: 'center-center'
		})
	}

	show() {
		this.getElement().style.display = 'block';
	}

	hide() {
		this.getElement().style.display = 'none';
	}
}

class Locate extends Control
{
	/**
	 * 
	 * @param {Object} opt_options Control options.
	 *		- title {String} title of the control
 	 *		- html {String} html to insert in the control
	 */
	constructor(opt_options) {
		let options = opt_options?? {};
	
		let button = document.createElement('button');
		button.type	= 'button';
		button.title = options.title || 'Locate me';
		button.innerHTML = options.html || '';

		let element = document.createElement('div');
		element.className = 'ol-locate ol-unselectable ol-control';
		element.appendChild(button);

		super({ element: element });
		
		this._toggle 	= options.toggle || false;
		this._location 	= null;
		this._overlay	= null;
		
		button.addEventListener('click', event => {
			event.preventDefault()
			if (! this._location) { return; }
			
			let tracking = this._location.getTracking();
			if (! this._toggle)	{
				this._location.setTracking(true);
				return;
			}
			
			this._location.setTracking(! tracking);
			button.style = this._location.getTracking() ? 'color: #f00' : '';
			tracking ? this._overlay.hide() : this._overlay.show();
		}, false);
	}

	/**
	 * Override Control.setMap
	 * @param {ol.Map} map
	 */
	setMap(map) {
		super.setMap(map);
	
		if (this.getMap()) {
			if (this._location_) { delete this._location ;}
			if (this._overlay)	{ this.getMap().removeOverlay(this._overlay); }
		}

		if (! map) return;

		this._overlay = new LocateOverlay();
		map.addOverlay(this._overlay);
		
		this._location = new Geolocation({
			projection: map.getView().getProjection(),
			trackingOptions: {
				enableHighAccuracy: true,
				maximumAge: 10000,
				timeout: 600000
			}
		});
		
		this._location.on('change:position', () => {
			let coordinates = this._location.getPosition();
			map.getView().setCenter(coordinates);
			this._overlay.setPosition(coordinates);
			
			if (! this._toggle)	{
				this._location.setTracking(false);
			}
		});

		this._location.on('error', (error) => {
			console.log(error.message);
			if (! this._toggle)	{
				this._location.setTracking(false);
			}
			this._overlay.setPosition([null, null]);
		});
	}
}

export default Locate;