/* global $ */
/* global FileSaver */


/** Print control to manage print preview on an ol3 map
 * @require printcontrol.css
 * @require printcontrolprint.css media="print"
 *
 * @constructor
 * @extends {ol.control.Control}
 * @trigger: preview, close, print, error, change:orientation
 * @param {} options
 *	@param {portrait|landscape} options.orientation
*	@param {bool} options.extended extended mode
*/
ol.control.Print = function(options) {
  options = options || {};
  var self = this;

  // Control
  var element;
  if (options.target) {
    $(options.target).click(function() {
      self.preview();
    });
    element = $('<div>').css('display', 'none');
  } else {
    element = $('<div>').addClass('ol-printpreview ol-unselectable ol-control ol-collapsed');
    $('<button>').appendTo(element)
      .click(function() {
        self.preview();
      });
  }

  // Init
  ol.control.Control.call(this, {
    element: element.get(0),
    target: options.target,
  });

  // Options
  this.setOrientation(options.orientation);
  this.setMargin(options.margin);
  this.set('extended', !!options.extended);
  this.setPaperSize(options.paperSize||'a4');

  this.page2 = $('<div>').addClass('ol-print-page').appendTo('body');
};
ol.inherits(ol.control.Print, ol.control.Control);

/** Test if copy is OK
* @param {function} cback callback with cbak
*/
ol.control.Print.prototype.testCORS = function(cback) {
  this.getMap().once('precompose', function(e) {
    try {
      var canvas = e.context.canvas;
      var data = canvas.toDataURL('image/jpeg');
      if (data && typeof(cback)=='function') cback(true);
    } catch (e) {
      if (typeof(cback)=='function') cback(false);
    }
  });
  this.getMap().renderSync();
};

/** Show preview
*	@param {bool} false to close the preview, default true
*/
ol.control.Print.prototype.preview = function(b, extended) {	// Set the control bar
  this.setControlBar_();
  var legendCtrl = this.getControl_(ol.control.Legend);
  var titleCtrl = this.getControl_(ol.control.CanvasTitle);

  var map = this.getMap();
  if (b===false) {
    if ($('body').hasClass('ol-print-preview')) {
      $('body').removeClass('ol-print-preview ol-extended');
      $(map.getViewport()).parent().attr('style', this.saveStyle_ || '')
        .removeClass('olmap-print-preview');
      // restore ctrl values
      if (legendCtrl) {
        legendCtrl.setVisible(this.saveCtrl_.legend);
        legendCtrl.drawInMap(this.saveCtrl_.inMap);
      }
      if (titleCtrl) titleCtrl.setVisible(this.saveCtrl_.title);
      map.updateSize();
      this.dispatchEvent({type: 'close'});
    }
    return;
  }
  if (!$('body').hasClass('ol-print-preview')) {
    $('body').addClass('ol-print-preview');
    this.saveStyle_ = $(map.getViewport()).parent().attr('style');
    // save ctrl values
    this.saveCtrl_ = {};
    if (legendCtrl) {
      this.saveCtrl_.legend = legendCtrl.getVisible();
      this.saveCtrl_.inMap = legendCtrl.inMap();
      legendCtrl.drawInMap(true);
    }
    if (titleCtrl) this.saveCtrl_.title = titleCtrl.getVisible();
    if ((typeof(extended)=='undefined' && this.get('extended')) || extended) $('body').addClass('ol-extended');
    $(map.getViewport()).parent().addClass('olmap-print-preview');
    // map.updateSize();
    this.calcPaperSize_();
    this.dispatchEvent({type: 'preview'});
  }
};

/** Show preview
*	@param {bool} false to close the preview, default true
*/
ol.control.Print.prototype.setControlBar_ = function() {
  var self = this;

  // Map controls to modify
  var titleCtrl = this.getControl_(ol.control.CanvasTitle);
  var legendCtrl = this.getControl_(ol.control.Legend);
  var bar = this.bar;

  if (!this.bar) {
    bar = this.bar = $('<div>').addClass('ol-print-bar').appendTo('body');

    // Print buttons
    $('<a>').addClass('closeBox')
      .attr('title', 'Fermer')
      .click(function() {
        self.preview(false);
      })
      .appendTo(bar);

    $('<p>').addClass('extended').html('Impression :').appendTo(bar);

    $('<button>').html('Annuler')
      .attr('title', 'annuler')
      .addClass('cancelBt extended')
      .click(function() {
        self.preview(false);
      })
      .appendTo(bar);
    $('<button>').html('Imprimer...')
      .attr('title', 'Imprimer...')
      .addClass('printBt')
      .click(function() {
        self.print();
      })
      .appendTo(bar);
    $('<hr>').addClass('extended').appendTo(bar);

    // Portrait/landscape
    $('<a>').html('Portrait')
      .addClass('portraitBt')
      .click(function() {
        self.setOrientation('portrait');
      })
      .appendTo(bar);
    $('<a>').html('Paysage')
      .addClass('landscapeBt')
      .click(function() {
        self.setOrientation('landscape');
      })
      .appendTo(bar);

    var d, i;
      // Paper format
    d = $('<div>').addClass('format').appendTo(bar);
    $('<label>').text('Taille : ').appendTo(d);
    var format = $('<select>').appendTo(d);
    for (i in this.paperSize) {
      $('<option>').text(i.toUpperCase()+' - '+this.paperSize[i][0]+'x'+this.paperSize[i][1]+'mm')
        .val(i).appendTo(format);
    }
    format.on('change', function() {
      self.setPaperSize(this.value);
    });

    // Margin
    d = $('<div>').addClass('margin extended').appendTo(bar);
    $('<label>').text('Marges : ').appendTo(d);
    var margin = $('<select>').appendTo(d);
    var m = {Aucune: 0, Etroites: 5, Simples: 10};
    for (i in m) {
      $('<option>').text(i+' - '+m[i]+' mm')
        .val(m[i]).appendTo(margin);
    }
    margin.on('change', function() {
      self.setMargin(Number(this.value));
      console.log(this.value);
    });

    // Save buttons
    var addSaveButtons = function(title, onclick, className) {
      var menu = $('<div>');
      $('<a>').appendTo(bar)
        .html('&nbsp;')
        .append(menu)
        .append($('<span>').addClass('extended').html(title))
        .on('mouseleave', function() {
          menu.hide();
        })
        .addClass('saveBt '+(className?className:''))
        .attr('title', 'Télécharger...')
        .click(function() {
          menu.toggle();
        });
      var saveBt = {};
      function addSaveButton(format) {
        saveBt[format] = $('<a>').html('Enregister en '+format)
          .attr('title', 'Télécharger...')
          .attr('download', 'map.'+format==='jpeg'?'jpg':format)
          .attr('target', '_new')
          .addClass(format+'Bt')
          .click(function() {
            onclick(format); menu.hide();
          })
          .appendTo(menu);
      }
      addSaveButton('jpeg');
      addSaveButton('png');
      if (window.jsPDF) addSaveButton('pdf');
      return saveBt;
    }
    this.saveBt_ = addSaveButtons('Enregistrer sous...', function(format) {
      self.save({format: format});
    });

    // Close button
    $('<button>').html('Fermer')
      .attr('title', 'Fermer')
      .addClass('closeBt simple')
      .click(function() {
        self.preview(false);
      })
      .appendTo(bar);

    var bdiv;
    // Title
    bdiv = $('<div>').addClass('title extended').appendTo(bar);
    if (titleCtrl) {
      $('<input type=\'checkbox\'>')
        .on('change', function() {
          titleCtrl.setVisible($(this).prop('checked'));
        })
        .appendTo(bdiv);
    }
    $('<label>').text('Afficher le titre de la carte').click(function() {
      $(this).prev().click();
    }).appendTo(bdiv);
    $('<input type=\'text\'>')
      .attr('placeholder', 'sans titre...')
      .on('keyup', function() {
        if (titleCtrl) titleCtrl.setTitle(this.value);
        self.title = this.value;
      })
      .appendTo(bdiv);

    // Legend
    if (legendCtrl) {
      legendCtrl.set('newPage', false);
      bdiv = $('<div>').addClass('legend extended').text('Légende :').appendTo(bar);
      var lmenu = $('<select>').appendTo(bdiv);
      $('<option>').val(0).text('Masquer la légende').appendTo(lmenu);
      $('<option>').val(1).text('Afficher la légende').appendTo(lmenu);
      $('<option>').val(2).text('Légende en page 2 (pdf)').appendTo(lmenu);
      lmenu.on('change', function() {
        switch ($(this).val()) {
          case '2':
            legendCtrl.set('newPage', true);
            legendCtrl.setVisible(false);
            self.page2.addClass('visible');
            self.page2.html('');
            var img = $('<img>').appendTo(self.page2);
            img.attr('src', legendCtrl.getImage().toDataURL('image/jpeg'));
            break;
          default:
            legendCtrl.set('newPage', false);
            legendCtrl.setVisible($(this).val()==1);
            self.page2.removeClass('visible');
            break;
        }
      });

      // Save legend
      this.saveBt_ = addSaveButtons('Enregistrer la légende...', function(format) {
        self.saveCanvas_(legendCtrl.getImage(), {format: format, scale: 0.2646});
      }, 'extended legend');
    }

    // User div (to addnew functions)
    this.userOptionsDiv_ = $('<div>').addClass('ol-useroptions').appendTo(bar);
  }
  // Default values
  $('.format select', bar).val(this.getPaperSize());
  $('.margin select', bar).val(this.getMargin());
  if (titleCtrl) {
      $('.title input[type=\'checkbox\']', bar).prop('checked', titleCtrl.getVisible());
      $('.title input[type=\'text\']', bar).val(titleCtrl.getTitle());
  }
  if (legendCtrl) {
      $('.legend select', bar).val(legendCtrl.getVisible()?'1':'0');
      legendCtrl.set('newPage', false);
  }
  this.page2.removeClass('visible');
};

/** Get control by class
*/
ol.control.Print.prototype.getControl_ = function(className) {
  var c = null;
  if (className) {
      this.getMap().getControls().forEach(function(ct) {
        if (ct instanceof className) c = ct;
      });
  }
  return c;
};

/** saveCanvas
*/
ol.control.Print.prototype.saveCanvas_ = function(canvas, options) {
  if (!options) options={};
  var format = options.format || 'jpeg';
  var img;
  switch (format) {
      case 'pdf':
        if (!jsPDF) return;
        var data;
        try {
            data = canvas.toDataURL('image/jpeg');
        } catch (e) {
            this.dispatchEvent({type: 'error'});
            return;
        }
        var size, w, h, orient, psize, mx, my;
        var margin = this.getMargin();
        orient = this.getOrientation();
        // Calculate size
        psize= this.getPaperSize();
        size = this.getPaperSize(true);
        var sc = options.scale || Math.min((size[0]-2*margin)/canvas.width, (size[1]-2*margin)/canvas.height);
        w = sc * canvas.width;
        h = sc * canvas.height;
        // Center
        mx = (size[0] - w)/2;
        my = (size[1] - h)/2;
        // Export!
        var pdf = new jsPDF(orient, 'mm', psize);
        var drawMarks = function(mx, my, w, h, d, l) {
            pdf.line(mx-l, my, mx-d, my);
            pdf.line(mx, my-l, mx, my-d);
            pdf.line(mx+w+l, my, mx+w+d, my);
            pdf.line(mx+w, my-l, mx+w, my-d);
            pdf.line(mx+w+l, my+h, mx+w+d, my+h);
            pdf.line(mx+w, my+h+l, mx+w, my+h+d);
            pdf.line(mx-l, my+h, mx-d, my+h);
            pdf.line(mx, my+h+l, mx, my+h+d);
        };
        pdf.addImage(data, 'JPEG', mx, my, w, h);
        if (options.scale) drawMarks(mx, my, w, h, 10, 2);

        // New page for legend
        if (options.page2) {
            pdf.addPage();
            var legend = options.page2;
            w = sc * legend.width;
            h = sc * legend.height;
            mx = (size[0] - w)/2;
            my = (size[1] - h)/2;
            try {
              pdf.addImage(legend.toDataURL('image/jpeg'), 'JPEG', mx, my, w, h);
            } catch (e) {
              self.dispatchEvent({type: 'error'});
              return;
            }
            drawMarks(mx, my, w, h, 10, 2);
        }

        pdf.save((this.title||'map')+'.pdf');
        return;
      default:
        if (window.FileSaver) {
            var self = this;
            try {
              canvas.toBlob(function(blob) {
                  FileSaver.saveAs(blob, (self.title||'map')+'.'+format);
              }, 'image/'+format);
            } catch (e) {
              self.dispatchEvent({type: 'error'});
              return;
            }
            return;
        } else img = canvas.toDataURL('image/'+format, options.quality);
        break;
  }
  if (this.saveBt_[format].attr('download')) {
      this.saveBt_[format].attr('href', img);
  } else {
      var win = window.open('', '_blank');
      win.location.href = img;
  }
};

/** Print document
*	@param {ol.printControlOptions}
*		- format {jpeg|gif|png|pdf}, default jpeg
*		- quality {number}
*/
ol.control.Print.prototype.save = function(options) {
  var self = this;
  if (!options) options = {format: 'jpeg'};
  // Clear background
  this.getMap().once('precompose', function(e) {
      var canvas = e.context.canvas;
      e.context.fillStyle = '#fff';
      e.context.fillRect(0, 0, canvas.width, canvas.height);
  });
  // Copy the map
  this.getMap().once('postcompose', function(e) {
      var lctrl = self.getControl_(ol.control.Legend);
      if (lctrl && lctrl.get('newPage')) options.page2 = lctrl.getImage();
      self.saveCanvas_(e.context.canvas, options);
  });

  this.getMap().renderSync();
  this.dispatchEvent({type: 'save', format: options.format||'jpeg'});
};

/** Print document
*/
ol.control.Print.prototype.print = function() {
  this.dispatchEvent({type: 'print'});
  window.print();
};

/** Set print orientation
*	@param {number} margin size
*/
ol.control.Print.prototype.setMargin = function(margin) {
  this.margin_ = typeof(margin)=='number' ? margin : 10;
  if ($('body').hasClass('ol-print-preview')) {
      this.calcPaperSize_();
  }
};

/** Set print orientation
*	@param {number} margin size
*/
ol.control.Print.prototype.getMargin = function() {
  return this.margin_ || 0;
};

/** Set print orientation
*	@param {portrait|landscape}
*/
ol.control.Print.prototype.setOrientation = function(ori) {
  if (ori=='landscape') {
      $('body').removeClass('portrait');
      $('body').addClass('landscape');
  } else {
      $('body').removeClass('landscape');
      $('body').addClass('portrait');
  }
  if ($('body').hasClass('ol-print-preview')) {
      this.calcPaperSize_();
  }
  this.dispatchEvent({type: 'change:orientation', orientation: this.getOrientation()});
};

/** Get the current orientation
*	@return {portrait|landscape}
*/
ol.control.Print.prototype.getOrientation = function() {
  if ($('body').hasClass('landscape')) return 'landscape';
  $('body').addClass('portrait');
  return 'portrait';
};

/** Get the user option div to add new components (only in extended mode)
*	@return {HTMLElement} a DOM element
*/
ol.control.Print.prototype.getUserDiv = function() {
  return this.userOptionsDiv_.get(0);
};

/** List of paper size (mm)
*/
ol.control.Print.prototype.paperSize =
{a4: [210, 297],
  a5: [148, 210],
  b4: [257, 364],
  b5: [182, 257],
};

/** Set Paper size
*	@param {a3|a4|a5|b4|b5}
*/
ol.control.Print.prototype.setPaperSize = function(psize) {
  if (this.paperSize[psize]) {
      this.paperSize_ = psize;
  }
  if ($('body').hasClass('ol-print-preview')) {
      this.calcPaperSize_();
  }
};

/** Get Paper size
*	@param {bool} true to get an array of size
*	@return {a3|a4|a5|b4|b5|ol.size} paper size
*/
ol.control.Print.prototype.getPaperSize = function(mm) {
  if (mm) {
      var ori = this.getOrientation();
      var size = this.paperSize[this.paperSize_];
      if (ori=='landscape') size = [size[1], size[0]];
      return size;
  } else return this.paperSize_;
};

ol.control.Print.prototype.calcPaperSize_ = function() {
  if (!this.getMap()) return;

  var ori = this.getOrientation();
  var m = $(this.getMap().getViewport()).parent();
  var psize = this.paperSize_;
  if (ori=='landscape') {
      m.css(
        {width: (this.paperSize[psize][1]-2*this.margin_) +'mm',
            height: (this.paperSize[psize][0]-2*this.margin_) +'mm',
            padding: this.margin_+'mm',
        });
      this.page2.css(
        {width: (this.paperSize[psize][1]-2*this.margin_) +'mm',
            height: (this.paperSize[psize][0]-2*this.margin_) +'mm',
            top: (this.paperSize[psize][0]/2 + 10) +'mm',
            padding: this.margin_+'mm',
        });
  } else {
      m.css(
        {width: (this.paperSize[psize][0]-2*this.margin_) +'mm',
            height: (this.paperSize[psize][1]-2*this.margin_) +'mm',
            padding: this.margin_+'mm',
        });
      this.page2.css(
        {width: (this.paperSize[psize][0]-2*this.margin_) +'mm',
            height: (this.paperSize[psize][1]-2*this.margin_) +'mm',
            top: (this.paperSize[psize][1]/2 + 10) +'mm',
            padding: this.margin_+'mm',
        });
  }
  this.getMap().updateSize();
};

/**
*/
ol.control.Print.prototype.setMap = function(map) {
  ol.control.Control.prototype.setMap.call(this, map);
};

