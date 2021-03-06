// Loads a maximum number of markers in the frame
// based upon the Leaflet-ContitionalLayer plugin, modified to support geoJson
// layers, and to add additional features and configuration options. 
// Some parts are inspired on the work of Ishmael Smyrnow

(function (factory) {
	var L;
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['leaflet'], factory);
	} else if (typeof module !== 'undefined') {
		// Node/CommonJS
		L = require('leaflet');
		module.exports = factory(L);
	} else {
		// Browser globals
		if (typeof window.L === 'undefined')
			throw 'Leaflet must be loaded first';
		factory(window.L);
	}
}(function (L) {

	L.GeoJSON.Advanced = L.GeoJSON.extend({
	  	
	  	options: {
			/**
			 * Defines the maximum number of markers or sub-layers which the layer can be desplay on the screen at any
			 * time. Note, this can also be passed as a function which returns the number. 
			 * @type {number|function} Default value: 500
			 */
	  		maxMarkers: 500,
	  		/**
			 * Sorts the markers before selecting the maximum number of results. 
			 */
	  		displaySort: function(a, b) {
				return b._leaflet_id - a._leaflet_id;
			},
			/**
			 * Filters locations as they are displayed on the map. Locations which fail the filter are not displayed, but 
			 * are retained in the layer.  This allows for faster on the fly changing of the visibility of locations with checkboxes, etc. 
			 */
			displayFilters: [
				function( properties ) {
					return true;
				}
			],
			
			/**
			 * If autohide is true, the layer will listen for zoom end, and check if the layer should still be displayed on the map.
			 * If the layer is outside of the min and max zooms the layer will not show on the map. 
			 * @type {boolean}
			 */
			autohide: true,
	
			/**
			 * The minimum zoom level in which the layer should show up on the map.
			 * @type {Integer}
			 */
			minZoom: 13,
	
			/**
			 * The maximum zoom level in which the layer should show up on the map.
			 * @type {Integer}
			 */
			maxZoom: Infinity
	  	},
	  	initialize: function (geojson, options) {
	  		L.setOptions(this, options);
	  		
			this._layers = {};
	
			var i, len;
	
			if ( geojson ) {
				len = geojson.length;
				for (i = 0; i < len; i++) {
					this.addLayer(geojson[i]);
				}
			}
			
	      		this._markers= [];
	    		this.onMap= false;
		},
		
		/**
		 * Used to update the maxMarkers limit with a new limit.
		 * @param {integer} i number of maxMarkers that the layer is allowed to show on the screen at any given time.
		 */
		setMaxMarkers: function ( i ) {
			if ( this.options.maxMarkers != undefined ) {
				this.options.maxMarkers=i;
			}
		},
	
		addLayer: function ( layer ) {
			this._markers.push(layer);
			if ( this._map !=undefined ) {
				this._update();
			}
		},
	    
		removeLayer: function (layer) {
			var markerIndex;
			
			for (var i = 0; i < this._markers.length; i++) {
				if (this._markers[i] == layer) {
					markerIndex = i;
					break;
				}
			}
			
			if (typeof markerIndex !== 'undefined') {
				this._markers.splice(markerIndex, 1);
				this._layer.removeLayer(layer);
			}
		},
		
		onAdd: function (map) {
			this._map = map;
			var self = this;
			this.onMap = true;
			if (map != null) {
				map.on("moveend", this._update, this );
			}
		
			// Add layer to the map
			this._layer = new L.geoJson(null, this.options);
			layer._parent = this;
			layer.options.filter = function(){return true;}//preventing the child from inheriting the parents filter. 
			this._map.addLayer(this._layer);
			
			if(this.options.autohide !== false) {
				var visible = this.checkZoom( map.getZoom() );
				if ( visible ) {
					this._addMarkers();
					this._cleanupMarkers();
				}
			}
			L.GeoJSON.prototype.onAdd.call(this, map);
		},
	
		onRemove: function() {
			this._removeMarkers();
			this.onMap = false;
			map.off("moveend", this._update);
		},
	    
		/**
		 * Checks whether a layer should be visible on the map based upon its minZoom, and then
		 * changes the visibility of the layer on the map.
		 * @param  {number} z current zoom level of the map
		 * @return {boolean}   Returns whether the layer is visible on the map.
		 */
		checkZoom: function(z) {
			var map = this._map || this._oldMap,
				opt = this.options;
				minZ = opt.minZoom,
				maxZ = opt.maxZoom;
		
			if ( (z  < minZ) || (z > maxZ) ) {
				if ( map.hasLayer(this) ) {
					map.removeLayer(this);
					this._oldMap = map;
					this.autoHidden = true;
				}
			} else {
				if ( !map.hasLayer(this) && this.autoHidden === true ) {
					map.addLayer(this);
					this.autoHidden = false;
				}
			}
			return map.hasLayer(this);
		},
	
		_update: function (e) {
			if(e && this.options.autohide !== false) {
				this.checkZoom(e.target._zoom);
			}
			// Perform updates to markers on map
			if (this.onMap==true) {
				this._removeMarkers()._addMarkers()._cleanupMarkers();
			}
		},
	
		_addMarkers: function () {
			// Add select markers to visible layer; skips existing ones automatically
			var i, marker,
			options = this.options,
			list = [];
			
			var markers = this._getMarkersInViewport(this._map);
			
			for (i = markers.length - 1; i >= 0; i--) {
				if( _checkDisplayFilter(markers[i].feature) ) {
					list.push(markers[i]);
				}
			}
			markers.sort(options.displaySort);
			
			for (i = 0; i < markers.length && i < options.maxMarkers; i++) {
				marker = markers[i];
				this._layer.addLayer(marker);
			}
			return this;
		},
	
		_removeMarkers: function () {
			if(this._layer) {
				this._layer.clearLayers();
			}
			return this;
		},
	
		_cleanupMarkers: function () {
			// Remove out-of-bounds markers
			// Also keep those with popups or in expanded clusters
			var bounds = this._map.getBounds();
			
			this._layer.eachLayer(function (marker) {
				if (!bounds.contains(marker.getLatLng()) && (!marker._popup || !marker._popup._container)) {
			  	this._layer.removeLayer(marker);
				}
			}, this);
		     return this;
		},

		_checkDisplayFilter: function( feature ) {
			var i, 
				list = this.displayFilterList,
				properties = feature.properties;
			for (i in list)  {
				if( list[i](properties) === false ) {
					return false; 
				}
			}
			return true;
		}
	
		_getMarkersInViewport: function ( map ) {
			var markers = [],
			bounds = map.getBounds(),
			i,
			marker;
			
			for (i = 0; i < this._markers.length; i++) {
				marker = this._markers[i];
				if (bounds.contains(marker.getLatLng())) {
					markers.push(marker);
				}
			}
			return markers;
		},
	    
		list: function(n) {
			return this._markers;
		},
	    
		eachLayer: function(method, context) {
		    	for (var i in this._markers) {
				method.call(context, this._markers[i]);
			}
			return this;
		},
	    
		clearLayers: function() {
			this._markers=[];
			return this;
		}
	});
	
	L.geojson.advanced = function (markers, options) {
		var layer = new L.GeoJSON.Advanced(null, options),
			i;
		for(i in markers) {
			layer._markers[i] = markers[i];
		}
		return layer;
	};
	
	return L.GeoJSON.Advanced;
}));
