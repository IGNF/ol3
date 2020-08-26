ol.interaction.Shortpath = function(options) {
    this._layer          = options.layer;
    this._layerReference = options._layerReference;
    
    this._start; this._end;
    
    // l'overlay pour le marquage du point de depart et d'arrivee
    var div = document.createElement('DIV');
    div.setAttribute('id', 'marker-' + utils.guid());
    div.style.width             = '10px';
    div.style.height            = '10px';
    div.style.border            = '1px solid red';
    div.style.borderRadius      = '5px';
    div.style.backgroundColor   = 'red';
    div.style.opacity           = '0.5';
    
    this._overlay = new ol.Overlay({
        element: div,
        positioning: 'center-center'
    });
    
    ol_interaction_Interaction.call(this, {
        handleEvent: function(e) {
            if (e.type === 'singleclick') {
                return this.handleDownEvent(e);
            }
        }
    });
};