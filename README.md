#L.GeoJSON.Advanced
Note: This is still a work in progress

A geojson layer which sorts and limits how many sublayers are visible in the viewport, and limits when the layers are shown. Based upon the leaflet-conditionalLayer plugin by Eclipse1979 for featureGroups.

Check out the [Demo](http://eclipse1979.github.io/Leaflet.ConditionalLayer/example/leaflet-conditionalLayer2.html). Note that on this page there are more than 40 000 circles.

## Using Leaflet-AdvancedGeoJSON :

G(http://leafletjs.com/reference.html#ilayer).
The default preference order of an ILayer shown depends its id in Layers, but other layer properties can be used to define the preference by passing through a new sort function with the displaySort option. 

## Simple usage example :

    var markerArray = [
    	L.circle(pos, radius, options),
    	L.marker(pos, options),
    	…
    ],
    options = {
    maxMarkers: 100,
    displaySort: function(a, b) {return b.feature.properties.score - a.feature.properties.score;}
    displayFilters: [
        function( properties ) {
            return (properties.value1 === 'value1');
        },
        function ( properties ) {
            return (properties.value2 !=== 'value2');
        }
    ]
    };
    var Layer = L.geojson.advanced(geojson, options).addTo(map);

## Methods :

Methods are the same as those of [GeoJSON](http://leafletjs.com/reference-1.0.0.html#geojson).

## Options :
* `maxMarkers:` maximal number of markers
* `DisplaySort`: function to sort/order markers so that the maxMarkers shown are highest priority. By default it recieves feature a, b, and returns (b - a); 
* `DisplayFilters`: An array of functions which are used to check whether a marker should be shown on the map.  If any of the functions in the array return false the marker will not be shown. Allows for display filters to be dynamically added and removed from a layer. 


