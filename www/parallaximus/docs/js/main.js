window.addEvent('domready', function(){
	var btns = document.getElements('.w-toggler-option'),
		values = btns.get('text').invoke('toLowerCase');
	window.docVersion = new VersionToggler(btns, values);
});

var VersionToggler = new Class({

	initialize: function(togglers, values)
	{
		this.togglers = togglers;
		this.values = values;
		this.togglers.each(function(toggler, index){
			toggler.addEvent('click', function(e){ this._show(index); }.bind(this));
		}, this);
		this.active = 0;
	},

	show: function(value)
	{
		var index = this.values.indexOf(value);
		if (index !== -1) return this._show(index);
	},

	_show: function(index)
	{
		if (index == this.active) return;
		document.getElements('.i-version.version_'+this.values[this.active]).dissolve();
		document.getElements('.i-version.version_'+this.values[index]).reveal();
		this.togglers[index].addClass('active');
		this.togglers[this.active].removeClass('active');
		this.active = index;
	}

});
