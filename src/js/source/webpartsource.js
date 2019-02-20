/** Need proj4js to load projections
*/
if (!proj4) throw ("PROJ4 is not defined!");

/* Define Lambert projections
*/
if (!proj4.defs["EPSG:2154"]) proj4.defs("EPSG:2154","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
if (!proj4.defs["IGNF:LAMB93"]) proj4.defs("IGNF:LAMB93","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");


/** ol.source.Vector.Webpart
 * @constructor
 * @extends {ol.source.Vector}
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
 * @returns {ol.source.Vector.Webpart}
 */
ol.source.Vector.Webpart = function(opt_options)
{   var options = opt_options || {};
	// Proxy to load features
	this.proxy_ = options.proxy;

    // Source is loadingmodifies
	this.tileloading_	= 0;
    this.isloading_     = false;
	if (options.featureType === undefined) {
		throw 'featureType must be defined.';
	}
	this.featureType_ 	= options.featureType;
	this.maxFeatures_	= options.maxFeatures || 5000;
        if(this.featureType_.attributes[this.featureType_.geometryName]){
            var crs = this.featureType_.attributes[this.featureType_.geometryName].crs;
        }else{crs=null;};
	this.srsName_  = ( crs !== null ) ? crs : 'EPSG:4326';

	this.featureFilter_ = options.filter || {};
	this.maxResolution_ = options.maxResolution || 80;
        this.resolution = options.resolution || null ;

	// Strategy for loading source (bbox or tile)
	var strategy = ol.loadingstrategy.bbox;
	if (options.tileZoom)
	{	this.tiled_ = true;
		var tileGrid = ol.tilegrid.createXYZ({
			minZoom: options.tileZoom || 12,
			maxZoom: options.tileZoom || 12,
			tileSize:options.tileSize || 256
		}),
		strategy = ol.loadingstrategy.tile (tileGrid);
	}

	if (this.tiled_) this.maxReload_ = options.maxReload || 50000;

	ol.source.Vector.call(this, {// Loader function
		loader: this.loaderFn_,
		// bbox strategy or tile loading strategy
		strategy: strategy,
		// Features
		features: new ol.Collection(),
		// ol.source.Vector attributes
		attributions: options.attribution,
		logo: options.logo,
		useSpatialIndex: true, // force to true for loading strategy tile
		wrapX: options.wrapX
	});

    // Collection of feature we want to preserve when reloaded
	this.preserved_ = options.preserved || new ol.Collection();
    // Inserted features
    this.insert_ = [];
    this.on ('addfeature', this.onAddFeature_, this);
	// Deleted features
    this.delete_ = [];
    this.on ('removefeature', this.onDeleteFeature_, this);
	// Modified features
    this.update_ = [];
    this.on ('changefeature', this.onUpdateFeature_, this);
};
ol.inherits(ol.source.Vector.Webpart, ol.source.Vector);


/** Editing states for vector features
*/
ol.Feature.State = {
    UNKNOWN: 'Unknown',
    INSERT: 'Insert',
    UPDATE: 'Update',
    DELETE: 'Delete'
};

/** Get feature state
* @return { ol.Feature.State }
*/
ol.Feature.prototype.getState = function()
{	return this.state_ || ol.Feature.State.UNKNOWN;
};

/** Set feature state
* @param { ol.Feature.State }
*/
ol.Feature.prototype.setState = function(state)
{	this.state_ = state;
};

/** Get feature detruit field
* @return string
*/
ol.Feature.prototype.getDetruitField = function()
{
    if (this.get("detruit")) {
        return "detruit";
    }
    return "gcms_detruit";
};

/** Get modified attributes
 * @return {Object} key object where keys are the modified fields names
 */
ol.Feature.prototype.getModifiedFields = function() {
    if (!this.__modifiedFields__) this.__modifiedFields__ = {};
    return this.__modifiedFields__;
};

/** Clear modified attributes
 */
ol.Feature.prototype.clearModifiedFields = function() {
    this.__modifiedFields__ = {};
};

/** Set modified attribute
 * @param {string|Array<string>} name attribute name or array of attr name
 */
ol.Feature.prototype.setModifiedFields = function(name) {
    var fields = this.getModifiedFields();
    if (typeof name === 'string') name = [name];
    for (var i=0; i<name.length; i++) {
        fields[name[i]] = true;
    }
};

/**
 * listen/unlisten for changefeature event
 * @param {boolean} b
 * @returns {undefined}
 */
ol.source.Vector.Webpart.prototype.listenChanges = function(b)
{
    if (b) {
        this.on('changefeature', this.onUpdateFeature_, this);
    } else {
        this.un('changefeature', this.onUpdateFeature_, this);
    }
};

/** Get the layer featureType
* @return { featureType }
*/
ol.source.Vector.Webpart.prototype.getFeatureType = function()
{	return this.featureType_;
};

/**
 * Modify loading feature filter
 */
ol.source.Vector.Webpart.prototype.setFeatureFilter = function(filter, options)
{
    this.featureFilter_ = {};
    this.addFeatureFilter(filter);
};

ol.source.Vector.Webpart.prototype.addFeatureFilter = function(filter, options)
{
    switch (filter) {
        case 'detruit':	case 'detruit':
            filter = {};
            filter[this.getDetruitField()] = true;
            break;
        case 'vivant':
            filter = {};
            filter[this.getDetruitField()] = false;
            break;
        case 'depuis':	filter = { "daterec": {"$gt" : String(options) } }; break;
        case 'jusqua':	filter = { "daterec": {"$lt" : String(options) } }; break;
        default: break;
    }
    $.extend(this.featureFilter_, filter);
    this.reload();
};

ol.source.Vector.Webpart.prototype.getDetruitField = function()
{
    if (this.featureType_.database_type == "bduni") {
        return "detruit";
    }
    return "gcms_detruit";
};

/** Reset edition
*/
ol.source.Vector.Webpart.prototype.reset = function()
{	this.insert_ = [];
	this.delete_ = [];
	this.update_ = [];
	this.preserved_.clear();
	this.reload();
};

/** Force source reload
* @warning use this function instead of clear() to avoid delete events on reload
*/
ol.source.Vector.Webpart.prototype.reload = function()
{	this.isloading_ = true;
    this.un ('removefeature', this.onDeleteFeature_, this);
	// Clear without event ???
	// this.getFeaturesCollection().clear(true);
	// Send event clear
	this.clear(true);
    this.on ('removefeature', this.onDeleteFeature_, this);
	this.isloading_ = false;
};

/** Get save actions
* @return list of save actions + number of features in each states
*/
ol.source.Vector.Webpart.prototype.getSaveActions = function()
{	var self = this;
	var idName = this.featureType_.idName;
	var geometryAttribute = this.featureType_.geometryName;
	var typeName = this.featureType_.name;
	var actions = [];
	var wkt = new ol.format.WKT();

    /**
     *
     * @param {ol.Feature} feature
     * @returns {undefined}
     */
    function getPropertiesToUpdate(feature) {
        var properties = feature.getProperties();

        var changes = Object.keys(feature.getModifiedFields());
        if (!changes.length) {
            throw "Update with no changes !!";
        }

        // Get changes
        var changedProperties = {};
        changedProperties[idName] = properties[idName];
        for (var i=0; i<changes.length; ++i) {
            var field = changes[i];
            if (properties.hasOwnProperty(field)) {
                changedProperties[field] = properties[field];
            }
        }

        // Get geometry changes
        if (changedProperties.hasOwnProperty('geometry')) {
            var g = properties.geometry.clone();
            g.transform (self.projection_, self.srsName_);

            delete changedProperties.geometry;
            changedProperties[geometryAttribute] = wkt.writeGeometry(g);
        }

        return changedProperties;
    }

    /**
     *
     * @param {Array} t
     * @param {ol.Feature.State} state
     * @returns {Number|nb}
     */
	function getActions (t, state)	{
		nb=0;
		for (var i=0; i<t.length; i++)	{
			var f = t[i];
			if (f.getState() === state)	{
				// Pour un update, on ne garde que les champs modifies
				var properties = f.getProperties();
				if (state === ol.Feature.State.UPDATE) {
                    properties = getPropertiesToUpdate(f);
                } else {
                    var g = properties.geometry.clone();
                    g.transform (self.projection_, self.srsName_);

                    delete properties.geometry;
                    properties[geometryAttribute] = wkt.writeGeometry(g);
                }

				// delete a.feature._id;
				actions.push({
                    feature: properties,
                    state: f.getState(),
                    typeName: typeName
                });
				nb++;
			}
		}
		return nb;
	}

	var res = {};
	res.actions = actions;
	// Insert
	res[ol.Feature.State.INSERT] = getActions (this.insert_, ol.Feature.State.INSERT);
	// Delete
	res[ol.Feature.State.DELETE] = getActions (this.delete_, ol.Feature.State.DELETE);
	// Update
	res[ol.Feature.State.UPDATE] = getActions (this.update_, ol.Feature.State.UPDATE);

	return res;
};

/** Count action by states
 *
 * @returns {unresolved}
 */
ol.source.Vector.Webpart.prototype.countActions = function()
{
    var res = {};

    res[ol.Feature.State.INSERT] = this.insert_.length;
    res[ol.Feature.State.DELETE] = this.delete_.length;
    res[ol.Feature.State.UPDATE] = this.update_.length;
    return res;
};

/** Get the created/deleted/modified features 
 * @return {*}
 */
ol.source.Vector.Webpart.prototype.getModifications = function() {
    return {
        inserted: this.insert_,
        deleted: this.delete_,
        updated: this.update_
    }
};

/** test if something to save
 *
 * @returns {number}
 */
ol.source.Vector.Webpart.prototype.hasActions = function() {
    return  this.insert_.length + this.delete_.length + this.update_.length;
};


/** Save changes
*/
ol.source.Vector.Webpart.prototype.save = function(actions)
{	var self = this;

	var actions = actions || [];
	
	
    try{
      if (actions.length == 0){
	  	actions = this.getSaveActions().actions;
      }
    }catch (e){
    	console.log("ol.source.Vector.Webpart.prototype.save " + e);
    	return;
    }
	self.dispatchEvent({ type:"savestart" });

    // Noting to save
	if (!actions.length) {
		return ;
	}

    var databases = {};
    databases[this.featureType_.database] = [this.featureType_.name];

	// Post changes
	var param = {
        actions: JSON.stringify(actions),
		typeName: this.featureType_.name,
		databases: JSON.stringify(databases)
	};

	//if (this.proxy_) param.url = this.featureType_.wfs + "transaction/";
    $.ajax({
        url: this.proxy_ || this.featureType_.wfs_transactions,
        method: 'POST',
        data: param,
        success: function (data) {
            var x = data.getElementsByTagName('wfs:TransactionResult')[0];
            if (!x || x == null) {
                x = data.getElementsByTagName('TransactionResult')[0];
            }
            if (!x || x == null) {
                x = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'TransactionResult')[0];
            }

            var statusTag = x.getElementsByTagName('wfs:Status')[0];
            if (!statusTag || statusTag == null) {
                statusTag = data.getElementsByTagName('Status')[0];
            }
            if (!statusTag || statusTag == null) {
                statusTag = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'Status')[0];
            }
            var status = statusTag.childNodes[0].tagName;

            var messageTag = x.getElementsByTagName('wfs:Message')[0];
            if (!messageTag || messageTag == null) {
                messageTag = data.getElementsByTagName('Message')[0];
            }
            if (!messageTag || messageTag == null) {
                messageTag = data.getElementsByTagNameNS('http://www.opengis.net/wfs', 'Message')[0];
            }
            var message = messageTag.childNodes[0].nodeValue;

            if (status === 'wfs:SUCCESS') {
                self.reset();
            }

            self.dispatchEvent({type: "saveend", status: status, message: message});
        },
        error: function (jqXHR, status, error) {
            self.dispatchEvent({type: "saveend", status: jqXHR.status, message: jqXHR.responseText});
        }
    });
};

/**
 * Triggered when a feature is added / update add actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onAddFeature_ = function(e)
{   if (this.isloading_) return;

    e.feature.setState(ol.Feature.State.INSERT);
    this.insert_.push(e.feature);
    this.dispatchEvent({type:"updated"});
};

/*
 * Triggered when a feature is removed / update remove actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onDeleteFeature_ = function(e)
{   if (this.isloading_) return;

	function removeFeature(features, f)
	{	for (var i=0, l=features.length; i<l; i++)
		{	if (features[i] === f)
			{	features = features.splice(i, 1);
				return;
			}
		}
	}

	switch (e.feature.getState())
	{	case ol.Feature.State.INSERT:
			removeFeature (this.insert_, e.feature);
			break;
		case ol.Feature.State.UPDATE:
			removeFeature (this.update_, e.feature);
		default:
			this.delete_.push(e.feature);
			break;
	}
    e.feature.setState(ol.Feature.State.DELETE);
    this.dispatchEvent({type:"updated"});
};

/**
 * Triggered when a feature is updated / update update actions
 * @param {type} e
 */
ol.source.Vector.Webpart.prototype.onUpdateFeature_ = function(e)
{   if (this.isloading_) return;

    // if feature has already a state attribute (INSERT),
    // we don't need to add it in this.update_
    if (e.feature.getState() !== ol.Feature.State.UNKNOWN) return;

    e.feature.setState(ol.Feature.State.UPDATE);
    this.update_.push(e.feature);
    this.dispatchEvent({type:"updated"});
};

/** Find preserved feature (updated, deleted or preserved)
* @param {ol.Feature}
*/
ol.source.Vector.Webpart.prototype.findFeature_ = function(f)
{   var idName = this.featureType_.idName;
	var fid = f.get(idName);

	// Find feature in table
	function find(features)
	{	var l = features.length;
		for (var i=0; i<l; i++)
		{   if (features[i].get(idName)===fid)
			{	f = features[i];
				return true;
			}
		}
		return false;
	}

	// Already loaded (features on tile edges)
	if (this.tiled_)
	{	var g = f.getGeometry();
		var p = g.getFirstCoordinate();
        if (find(this.getFeaturesInExtent([p[0]-1, p[1]-1, p[0]+1, p[1]+1]))) {
            return null;
		}
	}
	// Search deleted feature
	if (find(this.delete_)) return null;
	// Search updated features
	if (find(this.update_)) return f;
	// Search preserved features
	if (find(this.preserved_.getArray())) return f;
	// Nothing found > return initial feature
    return f;
};

/**
 * The loader function used to load features
 */
ol.source.Vector.Webpart.prototype.loaderFn_ = function (extent, resolution, projection)
{
	// if (resolution > this.maxResolution_) return;
	var self = this;

	// Save projection for writing
	this.projection_ = projection;

    // TODO self.srsName_
	var bbox = ol.proj.transformExtent(extent, projection, this.srsName_);
    var bboxStr = bbox.join(',');

	// WFS parameters
	var parameters = {
		service	: 'WFS',
		request: 'GetFeature',
		outputFormat: 'JSON',
		typeName: this.featureType_.name,
		bbox: bboxStr,
		filter: JSON.stringify(this.featureFilter_),
		maxFeatures: this.maxFeatures_,
		version: '1.1.0'
	};
	if (this.proxy_) parameters.url = this.featureType_.wfs;

    var date = this.get('date');
    if (date) {
        parameters.date = date;
    }

	// Abort existing request
    if (this.request_ && !this.tiled_) this.request_.abort();

    this.dispatchEvent({type:"loadstart", remains:++this.tileloading_ } );

	// Reload all if maxFeatures
	if (this.maxReload_ && this.tileloading_=== 1 && this.getFeatures().length > this.maxReload_)
	{	// console.log('clear: '+this.getFeatures().length)
		this.reload();
	}

	// Ajax request to get features in bbox
	this.request_ = $.ajax(
	{	url: this.proxy_ || this.featureType_.wfs,
		dataType: 'json',
		data: parameters,
		success: function(data)
		{   var feature, features = [];
            var geometryAttribute = self.featureType_.geometryName;
            var format = new ol.format.WKT();
            var r3d = /([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+) ([-+]?(\d*[.])?\d+)/g;

            for (var f=0; f<data.length; f++)
			{	var geom = data[f][geometryAttribute];
				//
				if (geom.type)
				{	var g = new ol.geom[geom.type] (geom.coordinates);
					g.transform (self.srsName_, projection);
					feature = new ol.Feature (g);
				}
				// WKT
				else
				{   geom = geom.replace (r3d, "$1 $3");
                    feature = format.readFeature(geom,
						{   dataProjection: self.srsName_,
							featureProjection : projection
						});
				}

                var properties = data[f];
                delete properties[geometryAttribute];
                feature.setProperties(properties, true);

				// Find preserved features
                feature = self.findFeature_(feature);
                if (feature) features.push( feature );
            }

            // Start replacing features
            self.isloading_ = true;
                if (!self.tiled_) self.getFeaturesCollection().clear();
                self.addFeatures(features);
                // Add new inserted features
                var l = self.insert_.length;
                for (var i=0; i<l; i++) {
                    if (self.insert_[i].getState()===ol.Feature.State.INSERT) {
                        try {
                            self.addFeature( self.insert_[i] );
                        } catch(e) {}
                    }
                }
            self.isloading_ = false;
            self.dispatchEvent({ type:"loadend", remains:--self.tileloading_ });
			if (data.length === self.maxFeatures_) self.dispatchEvent({ type:"overload" });
        },
		// Error
        error: function(jqXHR, status, error)
		{   if (status !== 'abort')
			{	// console.log(jqXHR);
				self.dispatchEvent({ type:"loadend", error:error, status:status, remains:--self.tileloading_ });

			}
			else
			{	self.dispatchEvent({ type:"loadend", remains:--self.tileloading_ });
			}
        }
    });
};


/**
 * le loading strategy bbox to force to reload features when zoom in (in case of maxFeatures is reached)
 * @param {type} extent
 * @param {type} resolution
 * @returns {Array}
 */
ol.loadingstrategy.bbox = function(extent, resolution) {
    if(this.getFeatures().length >= this.maxFeatures_ && resolution<this.resolution){
        this.reload();
    }
    this.resolution = resolution;
    return [extent];
};
