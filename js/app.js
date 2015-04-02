// stores character data required for view and API requests.
var Place = function (data) {
    var self = this;

    this.name = data.name;
    this.address = data.address; // needed for Google Places API
    this.id = data.id; // needed for Marvel API
    this.placeData = data.placeData; // needed for Google Maps API
    this.visible = ko.observable(true);
    this.marker = data.marker; // needed for Google Maps API
};

// this is our main function using KnockoutJS. It keeps track of all data and dynamically updates the DOM on changes.
var MapViewModel = function () {
    var self = this;

    this.map, // for rending map
    this.infoWindow, // for popup window on marker click
    this.mapBounds; // for setting map bounds

    // keeps track of all our characters
    this.places = ko.observableArray([]);
    
    // keeps track of our focus character
    this.currentPlace = ko.observable();
    
    // sorts the characters alphabetically
    this.sortedPlaces = ko.computed(function () {
        var unsortedPlaces = self.places().slice();
        unsortedPlaces.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        return unsortedPlaces;
    });

    // toggles the list view
    this.characterListOpen = ko.observable(true);
    
    // toggles the css class
    this.characterListClass = ko.computed(function () {
        if (self.characterListOpen()) {
            return "open";
        } else {
            return "closed";
        }
    });

    this.filterQuery = ko.observable("");
    this.filterWords = ko.computed(function () {
        return self.filterQuery().toLowerCase().split(' ');
    });

    // initializes google maps and renders all markers
    this.init = function () {

        // handles google api errors if no response within 3 seconds
        var GoogleRequestTimeout = setTimeout(function () {
            
            // set overlay with error message
            document.getElementById('error-message').innerHTML = 'Ha Ha Ha. Google Maps is down!';
            document.getElementById('error-screen').style.display="inherit";
            return false;
        }, 2000);

        // sets the map to be marvel themed
        var styledMap = new google.maps.StyledMapType(styles, {
            name: "Styled Map"
        });

        var mapOptions = {
            minZoom: 3, // sets minimum zoom to prevent borders around map
            disableDefaultUI: true, // removes google UI
            mapTypeControlOptions: {
                    mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
            }
        }
            // Assigns a new Google Map to the viewModel and loads it in the <div id="map">
        this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
        
        // sets the style of the map
        this.map.mapTypes.set('map_style', styledMap);
        this.map.setMapTypeId('map_style');

        this.loadPlaces();
        
        // Adjust map bounds based on window resizes
        window.addEventListener('resize', function (e) {
            self.map.fitBounds(self.mapBounds);
        });

        // resets the view when the infowindow of a character is closed
        google.maps.event.addListener(self.infoWindow, 'closeclick', function () {
            self.currentPlace(null);
            self.resetCenter();
        });

        // resets timeout function
        clearTimeout(GoogleRequestTimeout);
    };

    // loads all our character's locations on the map
    this.loadPlaces = function () {
        
        // asign an infowindow to each character
        self.infoWindow = new google.maps.InfoWindow();
        self.mapBounds = new google.maps.LatLngBounds();
        // use Google places to get latitudes and longitudes for each address
        var service = new google.maps.places.PlacesService(self.map);

        locationData.forEach(function (location) {
            var request = {
                query: location.address
            };

            // returns the latitudes and longitudes as they become available
            service.textSearch(request, function (results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    self.addPlace(location.name, location.address, location.id, results[0]);
                }
            });
        });
    };

    // builds the place object
    this.addPlace = function (name, address, id, placeData) {

        // save API returned location datato to local variables
        var lat = placeData.geometry.location.lat();
        var lon = placeData.geometry.location.lng();

        // image and coordinates for the map markers
        var image = {
            url: 'img/marvel-mappin.png',
            scaledSize: new google.maps.Size(50, 50),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 50)
        };

        // puts marker on the map
        var marker = new google.maps.Marker({
            map: self.map,
            position: placeData.geometry.location,
            icon: image,
            id: name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 15)
        });

        // handles users clicking on a marker
        google.maps.event.addListener(marker, 'click', function () {
            self.map.setZoom(8); // zoom in
            self.map.setCenter(marker.getPosition()); // center on marker
            $('#' + marker.id).trigger('click');
        });

        self.mapBounds.extend(new google.maps.LatLng(lat, lon));
        // fit the map around the new marker
        self.map.fitBounds(self.mapBounds);
        // center and fit the map around the current character(s)
        self.resetCenter();

        // pushes each character and all the data to the Places object
        self.places.push(new Place({
            name: name,
            address: address,
            id: id,
            placeData: placeData,
            visible: ko.observable(true),
            marker: marker
        }));
    };

    // handles opening/closing different infowindows
    this.displayInfo = function (place) {
        self.infoWindow.close();

        self.infoWindow.setContent(place.info());

        self.infoWindow.open(self.map, place.marker);

        self.map.panTo(place.marker.position);
        
        // moves the map down a bit so the infobox is readable on the entire phone screen
        setTimeout(moveMap, 500);
        function moveMap(){
            self.map.panBy(0, -100);
        }
    };

    // this function filters our list of characters
    this.filterSubmit = function () {

        // first check if the list is visible, if not open it
        if (!self.characterListOpen()) {
            self.togglecharacterList();
        }

        // compare if the user input is part of any character name
        self.filterWords().forEach(function (word) {
            self.places().forEach(function (place) {
                var name = place.name.toLowerCase();
                var address = place.address.toLowerCase();

                if ((name.indexOf(word) === -1) && (address.indexOf(word) === -1)) {
                    // if string is not found in character name(s)
                    place.visible(false); // hide in list
                    place.marker.setMap(null); // hide on map
                } else {
                    // if string is found in character name(s)
                    place.visible(true); // show in list
                    place.marker.setMap(self.map); // show on map
                }
            });
        });
        self.filterQuery("");
    };

    // toggle function used to hide/show the list
    this.togglecharacterList = function () {
        self.characterListOpen(!self.characterListOpen());
    };

    // sets the place for the current character and gets Marvel Data.
    this.setCurrentPlace = function (place) {

        // if the list is open, close it so the infowindow will not overlap
        if (self.characterListOpen()) {
            self.togglecharacterList();
        }

        // url for the Marvel AJAX request
        var marvelAPIurl = 'http://gateway.marvel.com/v1/public/characters?id=' + place.id + '&ts=1&apikey=e0fb310884d9d2f6becaacb508f3b69f&hash=3ad897582261676d9a57067e959bc2d2';

        // error handling in case Marvel API does not respond within 5 seconds
        var MarvelRequestTimeout = setTimeout(function () {
            // set overlay with error message
            document.getElementById('error-message').innerHTML = 'Ha Ha Ha. the Marvel API is down!';
            document.getElementById('error-screen').style.display="inherit";
            return false;
        }, 5000);

        // perform AJAX request and store results in character place object
        var request = new XMLHttpRequest();
        request.open("GET", marvelAPIurl, true);
        request.onreadystatechange = function () {
            // prevent entering onreadystatechange before its ready
            if (request.readyState !== 4) return;
            // check if state and status are good to go, if not throw alert
            if (request.readyState != 4 && request.status != 200) {
                // set overlay with error message
            document.getElementById('error-message').innerHTML = 'Ha Ha Ha. Google Maps is down!';
            document.getElementById('error-screen').style.display="inherit";
                return false;
            }

            // convert string to JSON object & store data object we need
            var result = JSON.parse(request.response).data.results[0];

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

            // builds the infowindow for this character
            place.info = ko.computed(function () {
                var output = '<div class="info-window">';
                output += '<img class="window-picture" src="' + place.pic + '"></img>';
                output += '<div class="window-name">' + place.name + '</div>';
                output += '<div class="window-address">' + place.address + '</div>';
                output += '<div class="window-description">' + place.description + '</div>';
                output += '<a class="window-wiki" href="' + place.wiki + '">Check out this character on the Marvel Universe Wiki</a>';
                output += '</div>';
                return output;
            });

            // resets timeout function
            clearTimeout(MarvelRequestTimeout);

            // toggle zoom with each click on a marker
            if (self.currentPlace() !== place) {
                self.currentPlace(place);
                self.displayInfo(place);
            } else {
                self.currentPlace(null);
                self.infoWindow.close();
                self.resetCenter();
            }

        };

        request.send();

    };

    // resets the view to match the markers on screen
    this.resetCenter = function () {
        self.map.fitBounds(self.mapBounds);
        self.map.panTo(self.mapBounds.getCenter());
        // move global map off center so mobile view doesn't initialize in ocean
        self.map.setCenter({lat: 50, lng: -95});
    };

    this.init();

};

$(ko.applyBindings(new MapViewModel()));