/* 
*  Add a marker style to use with font symbols
*/
/**
 * @requires ol.style.Text
 */



/** 
 *	Font defs
 */
ol.style.Text.prototype.defs = { 'fonts':{}, 'glyphs':{} };

/**
 *	Static function : add new font defs 
 */
 ol.style.Text.addDefs = function(font, glyphs)
 {	var thefont = font;
	if (typeof(font) == "string") thefont = {"font":font, "name":font, "copyright":"" };
	if (!thefont.font || typeof(thefont.font) != "string") 
	{	console.log("bad font def");
		return;
	}
	var fontname = thefont.font;
	ol.style.Text.prototype.defs.fonts[fontname] = thefont;
	for (var i in glyphs)
	{	var g = glyphs[i];
		if (typeof(g) == "string" && g.length==1) g = { 'char': g };
		ol.style.Text.prototype.defs.glyphs[i] =
			{	font: thefont.font,
				'char': g['char'] || ""+String.fromCharCode(g.code) || "",
				theme: g.theme || thefont.name,
				name: g.name || i,
				search: g.search || ""
			};
	}
 }


/**
 * Get the stroke style for the symbol.
 * @return {ol.style.Stroke} Stroke style.
 * @api
 */
ol.style.Text.prototype.getGlyph = function(name) 
{
    if (name) return ol.style.Text.prototype.defs.glyphs[name] || { "font":"none","char":name.charAt(0),"theme":"none","name":"none", "search":""};
	else return "";
};