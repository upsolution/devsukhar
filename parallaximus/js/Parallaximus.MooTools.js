var Parallaximus = new Class({

	Extends: Fx,

	options: {

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
		perspective: 800,

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
		 * @var {Function} Returning transition
		 */
		transition: Fx.Transitions.Elastic.easeOut,

		/**
		 * @var {Number} Resize delay to reduce resize events
		 */
		resizeDelay: 50
	},

	/**
	 * Create parallaximus object
	 * @param {Element} container
	 * @param {Object} options
	 */
	initialize: function(container, options)
	{
		// Apply options
		this.parent(options);
		this.container = document.id(container);
		this.layers = this.container.getChildren();
		// Basic container / layers / images sizes
		this.baseCntSz = this.container.getSize();
		this.baseLayerSz = this.layers.getSize();
		this.baseImgSz = [];
		Array.each(this.layers, function(layer, index){
			this.baseImgSz[index] = layer.getElements('img').getStyles(['left', 'top', 'width', 'height']);
		}, this);
		// Current container / layer sizes
		this.curCntSz = this.container.getSize();
		this.curLayerSz = this.layers.getSize();
		// Ratios for quicker calculations
		this.layerMin = [];
		this.layerRatio = [];
		this.layerAngle = [];
		this._countRatios();
		// 3d transforms
		if (this.options.use3d){
			this.cssPrefix = this._get3DPrefix();
			if (this.cssPrefix === false) this.options.use3d = false;
		}
		// Count frame rate
		this._frameRate = Math.round(1000 / this.options.fps);
		// Mouse events for desktop browsers
		if (!('ontouchstart' in window) || ! ('DeviceOrientationEvent' in window)){
			this.container.addEvents({
				mousemove: function(e){
					var pos = this.container.getPosition(),
						now = Date.now();
					// Reducing processor load for too frequent event calls
					if (this._lastFrame + this._frameRate > now) return;
					this.stop().set([(e.page.x - pos.x) / this.curCntSz.x, (e.page.y - pos.y) / this.curCntSz.y]);
					this._lastFrame = now;
				}.bind(this),
				mouseout: function(e){
					this.start(this.options.basePoint.clone());
				}.bind(this)
			});
		}
		// Device orientation events for touch devices
		if ('ontouchstart' in window && 'DeviceOrientationEvent' in window){
			window.addEventListener("deviceorientation", function(e){ this._deviceOrientationChange(e); }.bind(this));
		}
		// Set to basepoint
		this.set(this.options.basePoint);
		// Fluid width
		if ( ! this.container.hasClass('width_fixed')){
			window.addEvent('resize', function(){
				clearTimeout(this._resizeTimer);
				this._resizeTimer = this._handleResize.delay(this.options.resizeDelay, this);
			}.bind(this));
			this.container.setStyle('width', '100%');
			this._handleResize();
		}
		this._lastFrame = Date.now();
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
	_deviceOrientationChange: function(e)
	{
		// todo Prevent browser overload?
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
		this.stop().set(coord);
	},

	/**
	 * Handle container resize
	 * @param {Event} e
	 * @private
	 */
	_handleResize: function()
	{
		this.curCntSz = this.container.getSize();
		var resizeRatio = this.curCntSz.x / this.baseCntSz.x,
			resizeHeight = ! this.container.hasClass('height_fixed'),
			propList = ['width', 'height', 'left', 'top'];
		// Resize layers
		Array.each(this.layers, function(layer, lrIndex){
			var layerImages = layer.getElements('img');
			this.curLayerSz[lrIndex].x = this.baseLayerSz[lrIndex].x * resizeRatio;
			layer.setStyle('width', this.curLayerSz[lrIndex].x);
			if (resizeHeight){
				this.curLayerSz[lrIndex].y = this.baseLayerSz[lrIndex].y * resizeRatio;
				layer.setStyle('height', this.curLayerSz[lrIndex].y);
			}
			// Resize layer images
			Array.each(layerImages, function(img, imgIndex){
				if (resizeHeight){
					// Resize width and height
					Array.each(propList, function(prop){
						img.setStyle(prop, parseInt(this.baseImgSz[lrIndex][imgIndex][prop]) * resizeRatio);
					}, this);
				}else{
					// Resize width with fixed height
					var imgHalfWidth = parseInt(this.baseImgSz[lrIndex][imgIndex].width) / 2,
						imgCenter = parseInt(this.baseImgSz[lrIndex][imgIndex].left) + imgHalfWidth;
					img.setStyle('left', imgCenter * resizeRatio - imgHalfWidth);
				}
			}, this);
		}, this);
		// Resize container height
		if (resizeHeight){
			this.curCntSz.y = this.baseCntSz.y * resizeRatio;
			this.container.setStyle('height', this.curCntSz.y);
		}
		this.curLayerSz = this.layers.getSize();
		this._countRatios();
		this.set(this.now);
	},

	/**
	 * Should be done after each container resizing
	 * @private
	 */
	_countRatios: function()
	{
		Array.each(this.curLayerSz, function(sz, index){
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
		}, this);
	},

	/**
	 * Render parallaximus frame.
	 * @param {Array} coord [x, y] Both x and y are ranged in [0, 1]
	 */
	set: function(coord)
	{
		Array.each(this.layers, function(layer, index){
			layer
				.setStyle('left', this.layerMin[index].x + this.layerRatio[index].x * coord[0])
				.setStyle('top', this.layerMin[index].y + this.layerRatio[index].y * coord[1]);
			if (this.options.use3d){
				layer.setStyle(this.cssPrefix+'transform',
					'perspective('+this.options.perspective+'px) ' +
					'rotateX('+(this.layerAngle[index].y*(coord[1]-.5))+'deg) ' +
					'rotateY('+(this.layerAngle[index].x*(coord[0]-.5))+'deg)'
				);
			}
		}, this);
		this.now = coord.clone();
		return this;
	},

	compute: function(from, to, delta)
	{
		return [(to[0] - from[0]) * delta + from[0], (to[1] - from[1]) * delta + from[1]];
	},

	start: function(to)
	{
		this.parent(this.now, to);
		return this;
	}

});

/**
 * Auto-init
 */
window.addEvent('domready', function(){
	Array.each(document.getElements('.w-parallaximus.i-autoinit'), function(widget){
		var options = {};
		if (widget.onclick != undefined){
			options = widget.onclick() || {};
			widget.erase('onclick');
		}
		window.pr = new Parallaximus(widget, options);
	});
});
