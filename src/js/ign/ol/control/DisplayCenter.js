import { asString } from 'ol/color';
import ol_control_CanvasBase from 'ol-ext-4.0.5/control/CanvasBase';

/**
 * Display a cross in the middle of the map
 */
class DisplayCenter extends ol_control_CanvasBase
{
    constructor(opt_options) {
        let options = opt_options ?? {}; 

        let div = document.createElement('div');
        div.className = "ol-target ol-unselectable ol-control";
        super({ element: div });

        this._radius = options.radius;
        this._color  = options.color ?? '#000';
        this._width  = options.width ?? 1;
    } 

    _draw(e) {     
        let ctx = this.getContext(e);
        if (! ctx) return;

        let ratio = e.frameState.pixelRatio;
        ctx.save();
        ctx.scale(ratio,ratio);
    
        let cx = ctx.canvas.width/(2*ratio);
        let cy = ctx.canvas.height/(2*ratio);
    
        ctx.lineWidth   = this._width,
        ctx.strokeStyle = asString(this._color);   
            
        if (this._radius === undefined)    {
            ctx.beginPath();
            ctx.moveTo (cx, 0);
            ctx.lineTo (cx, ctx.canvas.height);
            ctx.moveTo (0, cy);
            ctx.lineTo( ctx.canvas.width, cy);
        } else {
            var m = this._radius;

            ctx.beginPath();
            ctx.moveTo (cx-m, cy);
            ctx.lineTo (cx+m, cy);
            ctx.moveTo (cx, cy-m);
            ctx.lineTo( cx, cy+m);
        }
    
        ctx.stroke();
        ctx.restore();
    };
}
 
export default DisplayCenter;