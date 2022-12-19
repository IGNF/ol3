/* Copyright (c) 2017 P.Prevautel
    released under the CeCILL-B license (French BSD license)
    (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/

/** ol.control.ScaleControl display numeric scale and allowed tio change it
* @param
*/
ol.control.ScaleControl = function(options)
{
	options = options || {};

    var div = document.createElement('div');
	div.className = 'ol-unselectable ol-scale-control';

    ol.control.Control.call(this,{
		element: div
    });
};

ol.inherits(ol.control.ScaleControl, ol.control.Control);


/**
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.ScaleControl.prototype.setMap = function (map)
{
    ol.control.Control.prototype.setMap.call(this, map);
};

/**
 *
 * @param {type} event
 * @returns {undefined}
 */
ol.control.ScaleControl.prototype.updateScale = function(event)
{
	var map = event.map;
	var view = map.getView();

	var projection = view.getProjection();

	var mpu = projection.getMetersPerUnit();
	var pointResolution = ol.proj.getPointResolution(projection, view.getResolution(), view.getCenter());
	pointResolution *= mpu;

	var scale = (pointResolution * 1000) / 0.28;	// 0.28 taille d'un pixel en metre (approximatif)
	var formatedStr = Math.round(scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

	var inputs = document.getElementsByClassName('ol-scale-control');
	inputs[0].innerHTML = '1 : ' + formatedStr;
};
