import VectorSource from 'ol/source/Vector';
import Collection from 'ol/Collection';
import { tile as tile_strategy } from 'ol/loadingstrategy';
import { createXYZ } from 'ol/tilegrid';
import Feature from 'ol/Feature';
import  format_WKT from 'ol/format/WKT';
import { transformExtent } from 'ol/proj';
import { ol_geom_createFromType } from 'ol-ext-4.0.4/geom/GeomUtils';

	
Feature.State = {
	UNKNOWN: 'Unknown',
	INSERT: 'Insert',
	UPDATE: 'Update',
	DELETE: 'Delete'    
};

/** 
 * Get feature state
 * @return {Feature.State}
 */
Feature.prototype.getState = function() {
	return this._state ?? Feature.State.UNKNOWN;
};

/** 
 * Set feature state
 * @param {Feature.State}
 */
Feature.prototype.setState = function(state)
{	this._state = state;
};

/**
 * TODO A VOIR
 * Get feature detruit field
 * @return string
 */
Feature.prototype._getDetruitField = function() {
	let detruit = this.get("detruit");
	return (detruit !== undefined) ? 'detruit' : 'gcms_detruit';
}

/** 
 * Get modified attributes
 * @return {Object} key object where keys are the modified fields names
 */
Feature.prototype.getModifiedFields= function() {
	if (!this._modifiedFields) this._modifiedFields = {};
    return this._modifiedFields;
}

/** 
 * Clear modified attributes
 */
Feature.prototype.clearModifiedFields = function() {
    this._modifiedFields = {};
};

/** 
 * Set modified attribute
 * @param {string|Array<string>} name attribute name or array of attr name
 */
Feature.prototype.setModifiedFields = function(name) {
	let fields = this.getModifiedFields();
	if (typeof name === 'string') name = [name];
	name.forEach(n => { fields[n] = true; });
};

class WebpartSource extends VectorSource
{
	/** ol.source.Vector.Webpart
	 * @constructor
	 * @extends {VectorSource}
	 * @param {olx.source.WebpartOptions}
	 *		- proxy {string} proxy path
	 *		- maxFeatures {integer} max number of feature to load before overload(default 1000)
	 *		- maxReload {integer} max number of feature before reload (for tiled layers)
	 *              - maxResolution (integer) max resolution for requesting features (default 50)
	 *		- featureType {featureType} REQUIRED
	 *		- filter {Object} Webpart filter, ie: {detruit:false}
	 *		- tileZoom {integer} tile zoom for tiled layers (tile size are requested at tileZoom) (default 12)
	 *		- tileSize {integer|undefined} size for tiles (default 256)
	 *		- preserved {ol.Collection} collection of objects to preserve when reload
	 *		- attribution {ol.Attribution} source attribution
	 *		- wrapX {bool}
	 */
	constructor(opt_options) {
		let options = opt_options ?? {};
		if (options.featureType === undefined) {
			throw 'featureType must be defined.';
		}
		
		let featureType = options.featureType;

		let parameters = {
			proxy: options.proxy ?? null,	// Proxy to load features
			featureType: featureType
		};
		
		let crs = null;
		if (featureType.geometryName) {
			crs = featureType.attributes[featureType.geometryName].crs;
		}
		
		parameters['srsName'] = crs ?? 'EPSG:4326';
		parameters['featureFilter'] = options.filter ?? {};
		parameters['maxResolution'] = options.maxResolution ?? 80;
		parameters['resolution'] 	= options.resolution ?? null;
		
		let tiled 		= false;
		let maxReload 	= null;

		// Strategy for loading source (bbox or tile)
		let strategy;
		if (options.tileZoom) {
			tiled = true;
			maxReload = options.maxReload ?? 50000;
			
			strategy = tile_strategy(createXYZ({
				minZoom: options.tileZoom ?? 12,
				maxZoom: options.tileZoom ?? 12,
				tileSize: options.tileSize ?? 256
			}));
		} else strategy = function (extent, resolution) {
			return this._loadingStrategyBbox(extent, resolution);
		}
		
		super({
			strategy: strategy,	// bbox strategy or tile loading strategy
			features: new Collection(),	// Features
			attributions: options.attribution,
			logo: options.logo,
			useSpatialIndex: true, // force to true for loading strategy tile
			wrapX: options.wrapX
		});
	
		this._tiled 		= tiled;
		this._tileloading	= 0;
		this._maxReload		= maxReload;
		this.setLoader(this._loaderFn);
		this._parameters = parameters;
		
		// Collection of feature we want to preserve when reloaded
		this.preserved_ = options.preserved ?? new Collection();
		
		// Inserted features
		this._insert = [];
		this.on ('addfeature', this._onAddFeature);
		
		// Deleted features
		this._delete = [];
		this.on ('removefeature', this._onDeleteFeature);
		
		// Modified features
		this._update = [];
		this.on ('changefeature', this._onUpdateFeature);
	}

	/*
	 * _reset edition
	 */
	reset() {
		this._insert = [];
		this._delete = [];
		this._update = [];
		this._preserved.clear();
		this._reload();
	};

	/** 
	 * Get save actions
	 * @return list of save actions + number of features in each states
	 */
	getSaveActions() {
		let self = this;
		
		let featureType = this._getParameter('featureType');

		let idName = featureType.idName;
		let geometryAttribute = featureType.geometryName;
		let typeName = featureType.name;
		let wkt = new format_WKT();

		/**
		 * @param {Feature} feature
		 * @returns {undefined}
		 */
		function getPropertiesToUpdate(feature) {
			let properties = feature.getProperties();

			let changes = Object.keys(feature.getModifiedFields());
			if (! changes.length) {
				throw "Update with no changes !!";
			}

			// Base historisee
			if (typeof feature.getProperties() !== 'undefined' && feature.getProperties()['gcms_fingerprint']) {
				changes.push('gcms_fingerprint');
			}

			// Get changes
			let changedProperties = {};
			changedProperties[idName] = properties[idName];
		
			for (const field of changes) {
				if (field in properties) {
					changedProperties[field] = properties[field];
				}
			}
			
			// Get geometry changes
			if ('geometry' in changedProperties) {
				let g = properties.geometry.clone();
				g.transform (self._projection, self._getParameter('srsName'));

				delete changedProperties.geometry;
				changedProperties[geometryAttribute] = wkt.writeGeometry(g);
			}

			return changedProperties;
		}

		/**
		 *
		 * @param {Array} features
		 * @param {ol.Feature.State} state
		 * @returns {Number|nb}
		 */
		function getActions (features, state)	{
			let nb = 0;
			for (const feature of features) {
				if (state !== feature.getState()) {
					return;
				}
				
				let properties = feature.getProperties();
				if (state === Feature.State.INSERT) {
					// GCMS fields
					let gcms_fields = ['gcms_detruit', 'gcms_date_creation', 'gcms_date_modification', 'gcms_date_destruction'];
					for (const field of gcms_fields) {
						if (field in properties) {
							delete properties[field];
						}
					}
					
					// Geometrie
					let g = properties.geometry.clone();
					g.transform (self._projection, self._getParameter('srsName'));

					delete properties.geometry;
					properties[geometryAttribute] = wkt.writeGeometry(g);
				} else if (state === Feature.State.DELETE) {
					// Pour un delete, on ne garde que l'id et gcms_fingerprint
					let prop = {};
					prop[idName] = properties[idName];
					if ('gcms_fingerprint' in properties) {
						prop['gcms_fingerprint'] = properties['gcms_fingerprint'];
					}
					properties = prop;
				} else if (state === Feature.State.UPDATE) {
					// Pour un update, on ne garde que les champs modifies
					properties = getPropertiesToUpdate(feature);
				} 

				actions.push({
					feature: properties,
					state: feature.getState(),
					typeName: typeName
				});
				nb++;
			}
	
			return nb;
		}

		let res = { actions: [] };

		// Insert
		res[Feature.State.INSERT] = getActions(this._insert, Feature.State.INSERT);
		
		// Delete
		res[Feature.State.DELETE] = getActions(this._delete, Feature.State.DELETE);
		
		// Update
		res[Feature.State.UPDATE] = getActions(this._update, Feature.State.UPDATE);

		return res;
	};

	/** 
	 * Count action by states
	 *
	 * @returns {unresolved}
	 */
	countActions() {
		let res = {};

		res[Feature.State.INSERT] = this._insert.length;
		res[Feature.State.DELETE] = this._delete.length;
		res[Feature.State.UPDATE] = this._update.length;
		return res;
	};

	/** 
	 * Get the created/deleted/modified features
	 * @return {*}
	 */
	getModifications() {
		return {
			inserted: this._insert,
			deleted: this._delete,
			updated: this._update
		}
	};

	/** 
	 * Test if something to save
	 *
	 * @returns {number}
	 */
	hasActions() {
		return  this._insert.length + this._delete.length + this._update.length;
	};

	/** 
	 * Save changes
	 */
	save(actions) {	
		actions = actions ?? [];

		try {
			if (actions.length == 0){
				actions = this.getSaveActions().actions;
			}
		} catch (e) {
			console.log("WebpartSource.prototype.save " + e);
			return;
		}
		this.dispatchEvent({ type:"savestart" });

		// Noting to save
		if (! actions.length) {
			return;
		}

		let featureType = this._getParameter('featureType');
		
		let databases = {};
		databases[featureType.database] = [featureType.name];

		// Post changes
		let params = {
			method: 'POST',
			actions: JSON.stringify(actions),
			typeName: featureType.name,
			databases: JSON.stringify(databases)
		};

		// TODO A VOIR
		let url = this._getParameter('proxy') ?? featureType.wfs_transactions;
		
		fetch(url, params)
			.then(response => {
				this._decodeXMl(response);
			}).catch(error =>  {
				console.log(error);
			});
	}

	/**
	 * Returns parameters whose name is name
	 * @param {string} name 
	 * @returns 
	 */	
	_getParameter(name) {
		return this._parameters[name] ?? null;
	}
	
	/**
	 * Set parameter (it must exist)
	 * @param {string} name 
	 * @param {*} value 
	 * @returns 
	 */
	_setParameter(name, value) {
		if (! (name in this._parameters)) return;
		this._parameters.name = value;
	}
	
	// TODO A VOIR SI CE N'EST PAS LE CONTRAIRE
	_getDetruitField() {
		let featureType = this._getParameter('featureType');
		return (featureType.database_type === 'bduni') ? 'detruit' : 'gcms_detruit';
	}
	
	/**
	 * Modify loading feature filter
	 */
	_setFeatureFilter(filter, options) {
		this._setParameter('featureFilter', {});
		this.addFeatureFilter(filter, options);
	}

	/**
	 * Ajout d'un filtre
	 * @param {string} filter 
	 * @param {string} options 
	 */
	_addFeatureFilter(filter, options) {
		switch (filter) {
			case 'detruit':
				filter = {};
				filter[this._getDetruitField()] = true;
				break;
			case 'vivant':
				filter = {};
				filter[this._getDetruitField()] = false;
				break;
			case 'depuis':	
				filter = { "daterec": {"$gt" : String(options) } }; 
				break;
			case 'jusqua':	
				filter = { "daterec": {"$lt" : String(options) } }; 
				break;
			default: break;
		}
		
		let featureFilter = this._getParameter('featureFilter');
		$.extend(featureFilter, filter);
		this._reload();
	}

	/** 
	 *Force source reload
	 * @warning use this function instead of clear() to avoid delete events on reload
	 */
	 _reload() {
		this._isloading = true;
		this.un ('removefeature', this._onDeleteFeature);

		// Send event clear
		this.clear(true);
		this.on ('removefeature', this._onDeleteFeature);
		this._isloading = true;
	};

	/**
	 * Triggered when a feature is added / update add actions
	 * @param {type} e
	 */
	_onAddFeature(e) {   
		if (! this._getParameter('isloading')) return;

		e.feature.setState(Feature.State.INSERT);
		this._insert.push(e.feature);
		this.dispatchEvent({ type:"updated" });
	};

	/*
	 * Triggered when a feature is removed / update remove actions
	 * @param {type} e
	 */
	_onDeleteFeature(e) {   
		if (! this._getParameter('isloading')) return;

		switch (e.feature.getState()) {
			case Feature.State.INSERT:
				this._removeFeature (this._insert, e.feature);
				break;
			case Feature.State.UPDATE:
				this._removeFeature (this._update, e.feature);
			default:
				this._delete.push(e.feature);
				break;
		}
		e.feature.setState(Feature.State.DELETE);
		this.dispatchEvent({ type:"updated" });
	};

	/**
	 * Triggered when a feature is updated / update update actions
	 * @param {type} e
	 */
	_onUpdateFeature(e) {
		if (! this._isloading) return;

		// if feature has already a state attribute (INSERT),
		// we don't need to add it in this._update
		if (e.feature.getState() !== Feature.State.UNKNOWN) return;

		e.feature.setState(Feature.State.UPDATE);
		this._update.push(e.feature);
		this.dispatchEvent({ type:"updated" });
	};

	/** 
	 *Find preserved feature (updated, deleted or preserved)
	 * @param {ol.Feature}
	 */
	_findFeature(feature) {
		let featureType = this._getParameter('featureType');

		let idName = featureType.idName;
		let fid = feature.get(idName);

		// Find feature in table
		function find(features) {
			let numFeatures = features.length;
			for (var i = 0; i < numFeatures; i++) {
				if (features[i].get(idName) === fid) {
					return true;
				}
			}
			return false;
		}

		// Already loaded (features on tile edges)
		if (this._tiled) {
			let g = feature.getGeometry();
			let p = g.getFirstCoordinate();
			if (find(this.getFeaturesInExtent([p[0]-1, p[1]-1, p[0]+1, p[1]+1]))) {
				return null;
			}
		}
		
		// Search deleted feature
		if (find(this._delete)) return null;
		// Search updated features
		if (find(this._update)) return feature;
		// Search preserved features
		if (find(this._preserved.getArray())) return feature;
		// Nothing found > return initial feature
		return feature;
	};

	_removeFeature(features, feature) {
		features.filter((f, index, array) => {
			if (f !== feature) return false;
			array.splice(index, 1);
			return true;
		});
	}
	
	/**
	 * The loader function used to load features
	 */
	_loaderFn(extent, resolution, projection) {
		let self = this;
		
		let featureType = this._getParameter('featureType');

		// Save projection for writing
		this.projection_ = projection;

		let bbox = transformExtent(extent, projection, this._getParameter('srsName'));
		let bboxStr = bbox.join(',');

		// WFS parameters
		let params = {
			service	: 'WFS',
			request: 'GetFeature',
			outputFormat: 'JSON',
			typeName: featureType.name,
			bbox: bboxStr,
			filter: JSON.stringify(this._getParameter('featureFilter')),
			maxFeatures: this._getParameter('maxFeatures'),
			version: '1.1.0'
		};

		let date = this.get('date');
		if (date) {
			params['date'] = date;
		}

		// Abort existing request
		if (this._request && !this._tiled) this._request.abort();

		// Reload all if maxFeatures
		this.dispatchEvent({ type:"loadstart", remains: ++this._tileloading } );
		if (this._maxReload && this._tileloading === 1 && this.getFeatures().length > this._maxReload) {
			this._reload();
		}

		let proxy = this._getParameter('proxy');
		let dataProjection = this._getParameter('srsName');
		
		// Ajax request to get features in bbox
		this.request_ = $.ajax({	
			url: proxy ?? featureType.wfs,
			dataType: 'json',
			data: params,
			success: function(data) {   
				let feature, features = [];
				let geometryAttribute = featureType.geometryName;
				let format = new format_WKT();
				let r3d = /([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+)/g;
				
				for (const f of data) {
					let geom = f[geometryAttribute];
					if (geom.type) {
						let g = ol_geom_createFromType(geom.type, geom.coordinates);
						g.transform (dataProjection, projection);
						feature = new Feature(g);
					} else {	// WKT
						geom = geom.replace (r3d, "$1 $3");
						feature = format.readFeature(geom, {
							dataProjection: dataProjection,
							featureProjection : projection
						});
					}

					let properties = f;
					delete properties[geometryAttribute];
					feature.setProperties(properties, true);

					// Find preserved features
					feature = self._findFeature(feature);
					if (feature) features.push( feature );
				}
				
				// Start replacing features
				self._isloading = true;
					
				if (!self._tiled) self.getFeaturesCollection().clear();
				self.addFeatures(features);
				
				// Add new inserted features
				var l = self._insert.length;
				for (var i=0; i<l; i++) {
					if (Feature.State.INSERT === self._insert[i].getState()) {
						try {
							self.addFeature( self._insert[i] );
						} catch(e) {}
					}
				}
				self._isloading = false;
				self.dispatchEvent({ type:"loadend", remains: --self._tileloading });
				if (data.length === self._maxFeatures) self.dispatchEvent({ type:"overload" });
			},
			// Error
			error: function(jqXHR, status, error)	{   
				if (status !== 'abort') {
					self.dispatchEvent({ type: "loadend", error: error, status: status, remains: --self._tileloading });
				} else {
					self.dispatchEvent({ type:"loadend", remains: --self._tileloading });
				}
			}
		});
	}

	/**
	 * le loading strategy bbox to force to reload features when zoom in (in case of maxFeatures is reached)
	 * @param {type} extent
	 * @param {type} resolution
	 * @returns {Array}
	 */
	_loadingStrategyBbox(extent, resolution) {
		if (this.getFeatures().length >= this._maxFeatures && resolution < this._getParameter('resolution')) {
			this._reload();
		}
		this._setParameter('resolution', resolution);
		return [extent];
	};
	
	/**
	 * Parse transaction
	 * @param {Element} data 
	 */
	_decodeXMl(data) {	// TODO VERIFIER QUE C'EST DU XML ET FAIRE PARSE A PART ?
		let x = data.getElementsByTagName('wfs:TransactionResult')[0];
		if (!x || x == null) {
			x = data.getElementsByTagName('TransactionResult')[0];
		}
		if (!x || x == null) {
			x = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'TransactionResult')[0];
		}

		let statusTag = x.getElementsByTagName('wfs:Status')[0];
		if (!statusTag || statusTag == null) {
			statusTag = data.getElementsByTagName('Status')[0];
		}
		if (!statusTag || statusTag == null) {
			statusTag = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'Status')[0];
		}
		let status = statusTag.childNodes[0].tagName;

		let messageTag = x.getElementsByTagName('wfs:Message')[0];
		if (!messageTag || messageTag == null) {
			messageTag = data.getElementsByTagName('Message')[0];
		}
		if (!messageTag || messageTag == null) {
			messageTag = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'Message')[0];
		}
		let message = messageTag.childNodes[0].nodeValue;

		if (status === 'wfs:SUCCESS') {
			this.reset();
		}

		this.dispatchEvent({ type: "saveend", status: status, message: message });
	}
}

export default WebpartSource;