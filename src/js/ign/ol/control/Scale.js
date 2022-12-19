import ol_control_Scale from 'ol-ext-4.0.4/control/Scale';

class Scale extends ol_control_Scale
{
	constructor(options) {
		super(options);
	}

	formatScale(d) {
		d = (d > 100) ? Math.round(d / 100) * 100 : Math.round(d);
		return '1 : ' + d.toLocaleString();
	  }
}

export default Scale;