var Parallaximus = new Class({

	Implements: [Options, Events],

	options: {

		/**
		 * @var {String} Link for
		 */
		link: false,

		/**
		 * @var {Number} Frame per second limit for rendering
		 */
		fpsLimit: 30,

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
		 * @var {Function} Returning transition
		 */
		transition: Fx.Transitions.Elastic.easeOut
	},

	/**
	 * Create parallaximus object
	 * @param {Element} container
	 * @param {Object} options
	 */
	initialize: function(container, options)
	{
		// Apply options
		this.setOptions(options);
		this.container = document.id(container);
		this.layers = this.container.getChildren();
		// Basic container / layers sizes
		this.baseCntSz = this.container.getSize();
		this.baseLayerSz = this.layers.getSize();
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
		this.container.addEvents({
			mousemove: function(e){
				var pos = this.container.getPosition();
				this._render((e.page.x - pos.x) / this.curCntSz.x, (e.page.y - pos.y) / this.curCntSz.y, true);
			}.bind(this),
			// Adding touchstart event to prevent mousemove events on touch devices
			// @link http://developer.apple.com/library/safari/#documentation/appleapplications/reference/safariwebcontent/HandlingEvents/HandlingEvents.html
			touchstart: function(e){}
		});
		// Ipad orientation controls
		if ('DeviceOrientationEvent' in window) window.addEventListener(
			"deviceorientation",
			function(e){
				// Prevent browser overload
				var gamma = Math.max(-45, Math.min(45, e.gamma)),
					beta = Math.max(-45, Math.min(45, e.beta)),
					x = (45 - gamma) / 90,
					y = (45 - beta) / 90;
				this._render(x, y, true);
			}.bind(this)
		);
		// Count frame rate
		this._frameRate = Math.round(1000 / this.options.fpsLimit);
		this._render(.5, .5, false);
		this._lastFrame = Date.now();
	},

	/**
	 * Check if browser supports css3 3d transforms and return browser css3 prefix
	 * Based on modernizer
	 * @link http://modernizr.com
	 * @private
	 * @return {String} Prefix or false if not supported
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
	 * Should be done after each container resizing
	 * @private
	 */
	_countRatios: function()
	{
		this.curCntSz = this.container.getSize();
		this.curLayerSz = this.layers.getSize();
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
	 * @param {Number} x Ranged in [0, 1]
	 * @param {Number} y Ranged in [0, 1]
	 * @param {Boolean} limitFps Prevent too frequent render on events to reduce processor overload
	 */
	_render: function(x, y, limitFps)
	{
		var now = Date.now();
		if (limitFps && this._lastFrame + this._frameRate > now) return;
		Array.each(this.layers, function(layer, index){
			layer
				.setStyle('left', this.layerMin[index].x + this.layerRatio[index].x * x)
				.setStyle('top', this.layerMin[index].y + this.layerRatio[index].y * y);
			if (this.options.use3d){
				layer.setStyle(this.cssPrefix+'transform',
					'perspective('+this.options.perspective+'px) ' +
					'rotateX('+(this.layerAngle[index].y*(y-.5))+'deg) ' +
					'rotateY('+(this.layerAngle[index].x*(x-.5))+'deg)'
				);
			}
		}, this);
		this._lastFrame = now;
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
		new Parallaximus(widget, options);
	});
});
