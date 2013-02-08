!function($){

	/*
	 ********* Parallaximus class definition ***********/
	var Parallaximus = function(container, options){
		// Context
		var that = this;
		this.container = $(container);
		// Apply options
		if (container.onclick != undefined){
			options = $.extend({}, container.onclick() || {}, typeof options == 'object' && options);
			this.container.removeProp('onclick');
		}
		options = $.extend({}, $.fn.parallaximus.defaults, typeof options == 'object' && options);
		this.options = options;
		this.layers = this.container.children();
		// Basic container / layers / images sizes
		this.baseCntSz = {x: this.container.width(), y: this.container.height()};
		// TODO User-forgot-to-set-layer-width-or-height case
		this.baseLayerSz = this._getLayerSizes();
		this.baseImgSz = [];
		this.layers.each(function(lrIndex, layer){
			// TODO The Properties-are-not-defined case
			that.baseImgSz[lrIndex] = [];
			$(layer).find('img').each(function(imgIndex, img){
				that.baseImgSz[lrIndex][imgIndex] = $(img).css(['left', 'top', 'width', 'height']);
			});
		});
		// Current container / layer sizes
		this.curCntSz = $.extend({}, this.baseCntSz);
		this.curLayerSz = $.extend(true, [], this.baseLayerSz);
		// Ratios for quicker calculations
		this._countRatios();
		// 3d transforms
		if (this.options.use3d){
			this.cssPrefix = this._get3DPrefix();
			if (this.cssPrefix === false) this.options.use3d = false;
		}
		// Count frame rate
		this._frameRate = Math.round(1000 / this.options.fps);
		// Mouse events for desktop browsers
		if ( ! ('ontouchstart' in window) || ! ('DeviceOrientationEvent' in window)){
			this.container
				.mousemove(function(e){
					var offset = that.container.offset(),
						now = Date.now();
					// Reducing processor load for too frequent event calls
					if (that._lastFrame + that._frameRate > now) return;
					that.container.stop(true, true);
					that.set([(e.pageX - offset.left) / that.curCntSz.x, (e.pageY - offset.top) / that.curCntSz.y]);
					that._lastFrame = now;
				})
				.mouseleave(function(e){
					var from = $.extend({}, that.now),
						to = that.options.basePoint;
					that.container.css('delta', 0).animate({
						delta: 1
					}, {
						duration: that.options.duration,
						easing: that.options.transition,
						step: function(delta){
							that.set([(to[0] - from[0]) * delta + from[0], (to[1] - from[1]) * delta + from[1]]);
						},
						queue: false
					});
				});
		}
		// Device orientation events for touch devices
		if ('ontouchstart' in window && 'DeviceOrientationEvent' in window){
			window.addEventListener("deviceorientation", function(e){
				var now = Date.now();
				// Reducing processor load for too frequent event calls
				if (that._lastFrame + that._frameRate > now) return;
				that._deviceOrientationChange(e);
				that._lastFrame = now;
			});
		}
		// Link handling
		if (this.options.link !== false){
			this.container
				.click(function(e){ location.href = that.options.link; })
				.css('cursor', 'pointer');
		}
		// Set to basepoint
		this.set(this.options.basePoint);
		// Responsive width/height
		if ( ! this.container.hasClass('width_fixed')){
			$(window).resize(function(){
				clearTimeout(this._resizeTimer);
				this._resizeTimer = setTimeout(function(){that._handleResize();}, that.options.resizeDelay);
			});
			this.container.css('width', '100%');
			this._handleResize();
		}
		this._lastFrame = Date.now();
	};

	Parallaximus.prototype = {

		_getLayerSizes: function(){
			var sizes = [];
			this.layers.each(function(index, layer){
				sizes[index] = {x: $(layer).width(), y: $(layer).height()};
			});
			return sizes;
		},

		/**
		 * Obtain browser css3 prefix or false if 3d transforms are not supported
		 * Based on modernizer
		 * @link http://modernizr.com
		 * @private
		 * @return {String} Prefix or false
		 */
		_get3DPrefix: function() {
			var div = document.createElement('div'),
				ret = false,
				properties = ['perspectiveProperty', 'WebkitPerspective'],
				prefixes = ['', '-o-', '-moz-', '-webkit-'];
			for (var i = properties.length - 1; i >= 0; i--) ret = ret ? ret : div.style[properties[i]] != undefined;
			if (ret){
				var st = document.createElement('style');
				// webkit allows this media query to succeed only if the feature is enabled.
				// "@media (transform-3d),(-o-transform-3d),(-moz-transform-3d),(-ms-transform-3d),(-webkit-transform-3d),(modernizr){#modernizr{height:3px}}"
				document.getElementsByTagName('head')[0].appendChild(st);
				div.id = 'test3d';
				document.body.appendChild(div);
				for (var j in prefixes){
					st.textContent = '@media ('+prefixes[j]+'transform-3d){#test3d{height:3px}}';
					if (div.offsetHeight === 3){
						ret = prefixes[j];
						break;
					}
				}
				st.parentNode.removeChild(st);
				div.parentNode.removeChild(div);
			}
			return ret;
		},

		/**
		 * Event to fire on deviceorientation change
		 * @private
		 */
		_deviceOrientationChange: function(e){
			var gamma = e.gamma,
				beta = e.beta,
				coord;
			switch (window.orientation){
				case -90:
					gamma = Math.max(-45, Math.min(45, gamma - 20));
					beta = Math.max(-45, Math.min(45, beta));
					coord = [(45 - beta) / 90, (gamma + 45) / 90];
					coord = [(beta + 45) / 90, (45 - gamma) / 90];
					break;
				case 90:
					gamma = Math.max(-45, Math.min(45, gamma + 20));
					beta = Math.max(-45, Math.min(45, beta));
					coord = [(45 - beta) / 90, (gamma + 45) / 90];
					break;
				case 180:
					gamma = Math.max(-45, Math.min(45, gamma));
					beta = Math.max(-45, Math.min(45, beta + 20));
					coord = [(gamma + 45) / 90, (beta + 45) / 90];
					break;
				case 0:
				default:
					// Upside down
					if (gamma < -90 || gamma > 90) gamma = Math.abs(e.gamma)/e.gamma * (180 - Math.abs(e.gamma));
					gamma = Math.max(-45, Math.min(45, gamma));
					beta = Math.max(-45, Math.min(45, beta - 20));
					coord = [(45 - gamma) / 90, (45 - beta) / 90];
					break;
			}
			that.container.stop(true, true);
			this.set(coord);
		},

		/**
		 * Handle container resize
		 * @private
		 */
		_handleResize: function(){
			this.curCntSz = {x: this.container.width(), y: this.container.height()};
			var resizeRatio = this.curCntSz.x / this.baseCntSz.x,
				resizeHeight = ! this.container.hasClass('height_fixed'),
				propList = ['width', 'height', 'left', 'top'],
				that = this;
			// Resize layers
			for (var lrIndex = 0, lrLen = this.layers.length; lrIndex < lrLen; lrIndex++){
				var layer = $(this.layers[lrIndex]),
					layerImages = layer.find('img');
				this.curLayerSz[lrIndex].x = this.baseLayerSz[lrIndex].x * resizeRatio;
				layer.css('width', this.curLayerSz[lrIndex].x);
				if (resizeHeight){
					this.curLayerSz[lrIndex].y = this.baseLayerSz[lrIndex].y * resizeRatio;
					layer.css('height', this.curLayerSz[lrIndex].y);
				}
				// Resize layer images
				for (var imgIndex = 0, imgLen = layerImages.length; imgIndex < imgLen; imgIndex++){
					var img = $(layerImages[imgIndex]);
					if (resizeHeight){
						// Resize width and height
						for (var propIndex in propList){
							var prop = propList[propIndex];
							img.css(prop, parseInt(this.baseImgSz[lrIndex][imgIndex][prop]) * resizeRatio);
						}
					}else{
						// Resize width with fixed height
						var imgHalfWidth = parseInt(this.baseImgSz[lrIndex][imgIndex].width) / 2,
							imgCenter = parseInt(this.baseImgSz[lrIndex][imgIndex].left) + imgHalfWidth;
						img.css('left', imgCenter * resizeRatio - imgHalfWidth);
					}
				}
			}
			// Resize container height
			if (resizeHeight){
				this.curCntSz.y = this.baseCntSz.y * resizeRatio;
				this.container.css('height', this.curCntSz.y);
			}
			this.curLayerSz = this._getLayerSizes();
			this._countRatios();
			this.set(this.now);
		},

		/**
		 * Count ratios for quicker calculation and store them to this.layerAngle, this.layerMin, this.layerRatio
		 * @private
		 */
		_countRatios: function(){
			this.layerAngle = [];
			this.layerMin = [];
			this.layerRatio = [];
			for (var index = 0, len = this.layers.length; index < len; index++){
				var sz = this.curLayerSz[index];
				this.layerAngle[index] = {
					x: -1 * this.options.angleXRange * (index + 1) / this.layers.length,
					y: this.options.angleYRange * (index + 1) / this.layers.length
				};
				this.layerMin[index] = {x: 0, y: 0};
				if (this.curCntSz.x < this.curLayerSz[index].x){
					this.layerMin[index].x = .5 * this.curLayerSz[index].x * (1 - Math.cos(this.layerAngle[index].x/180*Math.PI));
				}
				if (this.curCntSz.y < this.curLayerSz[index].y){
					this.layerMin[index].y = .5 * this.curLayerSz[index].y * (1 - Math.cos(this.layerAngle[index].y/180*Math.PI));
				}
				this.layerRatio[index] = {
					x: this.curCntSz.x - this.curLayerSz[index].x - 2 * this.layerMin[index].x,
					y: this.curCntSz.y - this.curLayerSz[index].y - 2 * this.layerMin[index].y
				};
			}
		}

		/**
		 * Render parallaximus frame.
		 * @param {Array} coord [x, y] Both x and y are ranged in [0, 1]
		 */
	  , set: function(coord){
			for (var index = 0, len = this.layers.length; index < len; index++){
				var layer = $(this.layers[index]);
				layer
					.css('left', this.layerMin[index].x + this.layerRatio[index].x * coord[0])
					.css('top', this.layerMin[index].y + this.layerRatio[index].y * coord[1]);
				if (this.options.use3d){
					layer.css(this.cssPrefix+'transform',
						'perspective('+this.options.perspective+'px) ' +
							'rotateX('+(this.layerAngle[index].y*(coord[1]-.5))+'deg) ' +
							'rotateY('+(this.layerAngle[index].x*(coord[0]-.5))+'deg)'
					);
				}
			}
			this.now = coord.slice();
			return this;
		}


	};

	// EaseOutElastic easing
	if ($.easing.easeOutElastic == undefined){
		/**
		 * Original function by George McGinley Smith
		 * @link http://gsgd.co.uk/sandbox/jquery/easing/
		 */
		$.easing.easeOutElastic = function (x, t, b, c, d) {
			var s = 1.70158, p = 0, a = c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
		}
	}

	$.fn.parallaximus = function(options){
		return this.each(function(){
			var $this = $(this),
				data = $this.data('parallaximus');
			if ( ! data) $this.data('parallaximus', (data = new Parallaximus(this, options)))
		});
	};

	$.fn.parallaximus.defaults = {
		/**
		 * @var {String} Link for
		 */
		link: false,

		/**
		 * @var {Number} Frame per second limit for rendering
		 */
		fps: 30,

		/**
		 * @var {Boolean} Enable 3d transformations
		 */
		use3d: true,

		/**
		 * @var {Number} Perspective of 3d effects
		 */
	 	perspective: 400,

		/**
		 * @var {Number} Range of horisontal rotation
		 */
	 	angleXRange: 10,

		/**
		 * @var {Number} Range of vertical rotation
		 */
		angleYRange: 10,

		/**
		 * @var {Number} Point for basic position (after the cursor moves out of the container)
		 */
		basePoint: [.5, .5],

		/**
		 * @var {Number} Return to base point duration
		 */
		duration: 2000,

		/**
		 * @var {Function} Returning-to-basepoint transition
		 */
		transition: 'easeOutElastic',

		/**
		 * @var {Number} Resize delay to reduce resize event calls
		 */
		resizeDelay: 50
	};

	$.fn.parallaximus.Constructor = Parallaximus;

}(jQuery);

// Auto init
jQuery(document).ready(function($){
	$('.w-parallaximus.i-autoinit').parallaximus();
});
