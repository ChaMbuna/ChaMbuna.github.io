// JavaScript Document
var locationData =
[
	{
		name : "Spider-Man",
		address : "Forest Hills, New York",
        id: 1009610
	},
	{
		name : "Wolverine",
		address : "Alberta, Canada",
        id: 1009718
	},
	{
		name : "Iron Man",
		address : "Long Island, New York",
        id: 1009368
	},
	{
		name : "3-D Man",
		address : "Los Angeles, California",
        id: 1011334
	},
	{
		name : "Captain America",
		address : "New York, New York",
        id: 1009220
	},
	{
		name : "Hulk",
		address : "Dayton, Ohio",
        id: 1009351
	},
	{
		name : "Black Widow",
		address : "Stalingrad, Russia",
        id: 1009189
	},
    {
		name : "Red Skull",
		address : "Germany",
        id: 1009535
	}
];

var Place= function(data)
{
	var self = this;

	this.name = data.name;
	this.address = data.address;
    this.id = data.id;
	this.placeData = data.placeData;
	this.visible = ko.observable(true);
	this.marker = data.marker;
	
	
	
};

var MapViewModel = function()
{
	var self = this;
	
	this.neighborhood,
	this.map,
	this.infoWindow,
	this.mapBounds;
	
	this.places = ko.observableArray([]);
	this.currentPlace= ko.observable();
	this.sortedPlaces = ko.computed( function()
	{
		var unsortedPlaces = self.places().slice();
		unsortedPlaces.sort( function(a, b)
		{
			return a.name.localeCompare(b.name);
		});
		return unsortedPlaces;
	});
	
    // toggles the list of characters
	this.characterListOpen = ko.observable(true);
	/*this.toggleButtonText = ko.computed( function()
	{
		if (self.characterListOpen())
		{
			return "Hide List";
		}
		else
		{
			return "Show List";
		}
	});*/
	this.characterListClass = ko.computed( function()
	{
		if (self.characterListOpen())
		{
			return "open";
		}
		else
		{
			return "closed";
		}
	});
	
	this.filterQuery = ko.observable("");
	this.filterWords = ko.computed( function()
	{
		return self.filterQuery().toLowerCase().split(' ');
	});
	
	this.init = function()
	{
         var styledMap = new google.maps.StyledMapType(styles, {
        name: "Styled Map"
    });

		this.neighborhood = new google.maps.LatLng(28.1519,-80.5950);
		
        var mapOptions = {
			disableDefaultUI : true,
			center : this.neighborhood,
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
            }
        }
		// This next line makes `map` a new Google Map JavaScript Object and attaches it to
		// <div id="map">, which is appended as part of an exercise late in the course.
		this.map = new google.maps.Map(document.getElementById('map'),mapOptions);
        this.map.mapTypes.set('map_style', styledMap);
        this.map.setMapTypeId('map_style');
		
		this.loadPlaces();
		
		// Vanilla JS way to listen for resizing of the window
		// and adjust map bounds
		window.addEventListener('resize', function(e)
		{
			// Make sure the map bounds get updated on page resize
			self.map.fitBounds(self.mapBounds);
		});

		google.maps.event.addListener(self.infoWindow,'closeclick',function(){
			self.currentPlace(null);
			self.resetCenter();
		});
	};
	
	this.loadPlaces = function()
	{
        self.infoWindow = new google.maps.InfoWindow();
		self.mapBounds = new google.maps.LatLngBounds();
		// creates a Google Placesearch service object. PlacesService does the work of
		// actually searching for location data.
		var service = new google.maps.places.PlacesService(self.map);
	
		// Iterates through the array of locations, creates a search object for each location
		locationData.forEach(function(location)
		{
			// the search request object
			var request =
			{
				query: location.address
			};
	
			// Actually searches the Google Maps API for location data and runs the callback
			// function with the search results after each search.
			service.textSearch(request, function(results, status)
			{
				if (status == google.maps.places.PlacesServiceStatus.OK)
				{
					self.addPlace(location.name,location.address,location.id, results[0]);
				} 
			});
		});
	};
	
	this.addPlace= function(name, address, id, placeData)
	{
		
		// The next lines save location data from the search result object to local variables
		var lat = placeData.geometry.location.lat();  // latitude from the Placeservice
		var lon = placeData.geometry.location.lng();  // longitude from the Placeservice
        
        var image = {
                url: 'img/marvel-mappin.png',
                scaledSize: new google.maps.Size(50, 50),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(20, 50)
            };

		// marker is an object with additional data about the pin for a single location
		var marker = new google.maps.Marker(
		{            
			map: self.map,
			position: placeData.geometry.location,
            icon: image,
			id: name.toLowerCase().replace(/[^a-zA-Z0-9]/g,'').slice(0,15)
		});
	
		google.maps.event.addListener(marker, 'click', function()
		{
            self.map.setZoom(8);
            self.map.setCenter(marker.getPosition());
			$('#'+marker.id).trigger('click');
		});
	
		// this is where the pin actually gets added to the map.
		// bounds.extend() takes in a map location object
		self.mapBounds.extend(new google.maps.LatLng(lat, lon));
		// fit the map to the new marker
		self.map.fitBounds(self.mapBounds);
		// center the map and
		// fit the map to the new marker
		self.resetCenter();
		
		self.places.push( new Place( {
			name : name,
			address : address,
            id: id,
			placeData : placeData,
			visible : ko.observable(true),
			marker : marker
		} ) );
	};
	
	this.displayInfo = function(place)
	{
		self.infoWindow.close();
		// infoWindows are the little helper windows that open when you click
		// or hover over a pin on a map. They usually contain more information
		// about a location.
		self.infoWindow.setContent(place.info());
		
		self.infoWindow.open(self.map,place.marker);
		
		self.map.panTo(place.marker.position);
	};
	
	this.filterSubmit = function()
	{
		self.filterWords().forEach(function(word)
		{
			self.places().forEach(function(place)
			{
				var name = place.name.toLowerCase();
				var address = place.address.toLowerCase();
				
				if ((name.indexOf(word) === -1) && (address.indexOf(word) === -1))
				{
					place.visible(false);
					place.marker.setMap(null);
				}
				else
				{
					place.visible(true);
					place.marker.setMap(self.map);
				}
			});
		});
		self.filterQuery("");
	};
	
	this.togglecharacterList = function()
	{
		self.characterListOpen(!self.characterListOpen());
	};
	
	this.setCurrentPlace= function(place)
	{
        
        
        
        
        var marvelAPIurl = 'http://gateway.marvel.com/v1/public/characters?id=' + place.id + '&ts=1&apikey=e0fb310884d9d2f6becaacb508f3b69f&hash=3ad897582261676d9a57067e959bc2d2';
    
    // error handling in case Marvel API does not respond within 8 seconds
    var MarvelRequestTimeout = setTimeout(function () {
        return alert('The Marvel API is not available right now');
    }, 8000);

    // perform AJAX request and store results in currentCharacter object
    var request = new XMLHttpRequest();
    request.open("GET", marvelAPIurl, true);
    request.onreadystatechange = function () {
        // prevent entering onreadystatechange before its ready
          if (request.readyState !== 4) return;
        // check if state and status are good to go, if not throw alert
          if (request.readyState != 4 && request.status != 200) {
            return alert('Google Maps is not available right now');
        }

        // convert string to JSON object & store data object we need
        var result = JSON.parse(request.response).data.results[0];
        console.log(result);
        //error handling when API did not provide character description
        if (result.description === "") {
            place.description = "Bummer, there is no description available for this character.";
        } else {
            // stores the character description if there is one
            place.description = result.description;
        }

        // stores the marvel universe wiki link for this character
        place.wiki = result.urls[1].url;

        // stores the url of the picture for this character
        place.pic = result.thumbnail.path + '.' + result.thumbnail.extension;
        
        
        
        place.info = ko.computed( function()
	{
		var output = '<div class="info-window">';
		output += '<img class="window-picture" src="'+place.pic+'"></img>';
        output += '<div class="window-name">'+place.name+'</div>';
		output += '<div class="window-address">'+place.address+'</div>';
        output += '<div class="window-description">'+place.description+'</div>';
        output += '<a class="window-wiki" href="'+place.wiki+'">Check out this character on the Marvel Universe Wiki</a>';
        output += '</div>';
		console.log(place)
        return output;
	});
        
        
        // resets timeout function
        clearTimeout(MarvelRequestTimeout);
        
        
        
        
        if (self.currentPlace() !== place)
		{
			self.currentPlace(place);
            console.log(place);
			self.displayInfo(place);
		}
		else
		{
			self.currentPlace(null);
			self.infoWindow.close();
			self.resetCenter();
		}
        
        self.characterListOpen(!self.characterListOpen());
        
    };

    request.send();


        
        
        
        
		
	};
	
	this.resetCenter = function()
	{
		self.map.fitBounds(self.mapBounds);
		self.map.panTo(self.mapBounds.getCenter());
	};
	
	this.init();

};

$(ko.applyBindings(new MapViewModel()));