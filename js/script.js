// View models
var MapViewModel = function () {
    this.location = "New York, NY";
    this.zoom = 14;
    this.width = 288;
    this.height = 200;
    this.markers = ["New York, NY"];
    this.sensor = true;
    this.getMapUrl = function () {
        return 'https://maps.googleapis.com/maps/api/staticmap?center=' + this.location +
            '&zoom=' + this.zoom + '&size=' + this.width + 'x' + this.height +
            '&markers=' + this.markers.join('|') + '&sensor=' + this.sensor;
    };
};

//Namespaced JS
var Spinach = Spinach || {};

Spinach.GoogleMaps = (function ($) {
    return {
        geocode:function (address, onSuccess, onError) {
            var geoCoder = new google.maps.Geocoder();
            geoCoder.geocode({ 'address':address}, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var location = {
                        longitude:results[0].geometry.location.lng,
                        latitude:results[0].geometry.location.lat,
                        address:results[0].formatted_address
                    };
                    onSuccess(location);
                } else {
                    onError('Geocode was not successful for the following reason: ' + status);
                }
            });
        },
        reverseGeocode:function (latitude, longitude, onSuccess, onError) {
            var latLong = new google.maps.LatLng(latitude, longitude);
            var geoCoder = new google.maps.Geocoder();
            geoCoder.geocode({
                'latLng':latLong
            }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if (results[5]) {
                        return onSuccess(results[5].formatted_address);
                    }
                } else {
                    onError("reverseGeocode failed due to: " + status);
                }
            });
        }
    };
}(jQuery));

Spinach.Common = (function ($) {
    return {
        alert:function (message) {
            try {
                navigator.notification.alert(message, $.noop, "Spinach POCs");
            }
            catch (e) {
                alert(message);
            }
        }
    };
}(jQuery));

Spinach.Home = (function ($) {
    return {
        deviceReady:function () {
            Spinach.Common.alert("PhoneGap is alive and kicking!!");
        },
        currentLocationClick:function () {
            $('#CurrentLocationFlag').val(true);
            Spinach.Home.goToMapPage();
        },
        goToMapPage:function () {
            Spinach.Map.resetMaps();
            $.mobile.changePage($('#map'));
        },
        getCurrentAcceleration:function () {
            var alertAcceleration = function (acceleration) {
                Spinach.Common.alert('Acceleration X: ' + acceleration.x + '\n' +
                    'Acceleration Y: ' + acceleration.y + '\n' +
                    'Acceleration Z: ' + acceleration.z + '\n' +
                    'Timestamp     : ' + acceleration.timestamp + '\n');
            };
            var alertAccelerationError = function () {
                Spinach.Common.alert('onError!');
            };
            Spinach.Accelerometer.getAcceleration(alertAcceleration, alertAccelerationError);
        },
        getSpeedAndLocation:function () {
            Spinach.Map.getSpeedAndLocation();
        }
    };
}(jQuery));

Spinach.LocationDialog = (function ($) {
    return {
        plotSpecificLocationClick:function (e) {
            if ($('#address').val()) {
                $('#CurrentLocationFlag').val(false);
                Spinach.Home.goToMapPage();
            } else {
                e.preventDefault();
            }
        }
    };
}(jQuery));

Spinach.Map = (function ($) {
    return {
        initialize:function () {
            if ($('#CurrentLocationFlag').val() === 'true') {
                Spinach.Map.getCurrentPositionAndGeocode();
            } else {
                Spinach.Map.getSpecificLocation();
            }
        },
        resetMaps:function () {
            $('#mapPlotImg').attr('src', '');
            $('#LocationMarker').empty();
        },
        getSpecificLocation:function () {
            var userInput = $('#address').val();
            $('#address').val('');
            var onGeocodeSuccess = function (location) {
                var mapViewModel = new MapViewModel();
                mapViewModel.location = location.latitude + ', ' + location.longitude;
                mapViewModel.markers = [location.address];
                $('#LocationMarker').text(location.address);
                Spinach.Map.plotMap(mapViewModel);
            };
            var onGeocodeError = function (mapViewModel) {
                return function (errorReason) {
                    console.log(errorReason);
                };
            };
            Spinach.GoogleMaps.geocode(userInput, onGeocodeSuccess, onGeocodeError);
        },
        getCurrentPosition:function (onSuccess) {
            var onGetPositionError = function (error) {
                Spinach.Common.alert('Code   : ' + error.code + '\n' +
                    'Message: ' + error.message + '\n');
            };
            var geoLocationOptions = {
                maximumAge:1000,
                timeout:3000,
                enableHighAccuracy:true
            };
            navigator.geolocation.getCurrentPosition(onSuccess, onGetPositionError, geoLocationOptions);
        },
        getCurrentPositionAndGeocode:function () {
            var onReverseGeocodeSuccess = function (mapViewModel) {
                return function (resolvedCity) {
                    $('#LocationMarker').text(resolvedCity);
                    Spinach.Map.plotMap(mapViewModel);
                };
            };
            var onReverseGeocodeError = function (mapViewModel) {
                return function (errorReason) {
                    console.log(errorReason);
                    Spinach.Map.plotMap(mapViewModel);
                };
            };
            var onGetPositionSuccess = function (position) {
                var mapViewModel = new MapViewModel();
                var location = position.coords.latitude + ', ' + position.coords.longitude;
                mapViewModel.location = location;
                mapViewModel.markers = [location];
                Spinach.GoogleMaps.reverseGeocode(position.coords.latitude,
                    position.coords.longitude,
                    onReverseGeocodeSuccess(mapViewModel),
                    onReverseGeocodeError(mapViewModel));
            };
            Spinach.Map.getCurrentPosition(onGetPositionSuccess);
        },
        getSpeedAndLocation:function () {
            var onGetSpeedAndLocationSuccess = function (position) {
                Spinach.Common.alert('Latitude : ' + position.coords.latitude + '\n' +
                    'Longitude: ' + position.coords.longitude + '\n' +
                    'Speed    : ' + position.coords.speed + '\n');
            };
            Spinach.Map.getCurrentPosition(onGetSpeedAndLocationSuccess);
        },
        plotMap:function (mapViewModel) {
            $('#mapPlotImg').attr('src', mapViewModel.getMapUrl());
        }
    };
}(jQuery));

Spinach.Accelerometer = (function ($) {
    var watchID;
    return {
        getAcceleration:function (onSuccess, onError) {
            navigator.accelerometer.getCurrentAcceleration(onSuccess, onError);
        },
        watchAcceleration:function (onSuccess, onError, options) {
            watchID = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
        },
        clearWatch:function () {
            $('#startWatchButton').show();
            $('#clearWatchButton').hide();
            if (watchID) {
                navigator.accelerometer.clearWatch(watchID);
                watchID = null;
            }
        }
    };
}(jQuery));

Spinach.AccelerationDialog = (function ($) {
    return {
        watchAcceleration:function () {
            var interval = parseInt($('#interval :radio:checked').val(), 10);
            var options = { frequency:interval };
            var onSuccess = function (acceleration) {
                Spinach.Common.alert('Acceleration X: ' + acceleration.x + '\n' +
                    'Acceleration Y: ' + acceleration.y + '\n' +
                    'Acceleration Z: ' + acceleration.z + '\n' +
                    'Timestamp: ' + acceleration.timestamp + '\n');
            };
            var onError = function (error) {
                Spinach.Common.alert('error!');
            };
            if (interval) {
                $('#startWatchButton').hide();
                $('#clearWatchButton').show();
                Spinach.Accelerometer.watchAcceleration(onSuccess, onError, options);
            }
        }
    };
}(jQuery));

Spinach.GetPhotoDialog = (function ($) {
    return {
        fromLibrary:function () {
            Spinach.GetPhotoDialog.getPhoto(navigator.camera.PictureSourceType.PHOTOLIBRARY);
        },
        fromCamera:function () {
            Spinach.GetPhotoDialog.getPhoto(navigator.camera.PictureSourceType.CAMERA);
        },
        getPhoto:function (sourceType) {
            var destinationType,
                selectedDestinationType = $('#destinationType :radio:checked').val();
            if (selectedDestinationType === "0") {
                destinationType = navigator.camera.DestinationType.DATA_URL;
            } else if (selectedDestinationType === "1") {
                destinationType = navigator.camera.DestinationType.FILE_URI;
            } else {
                Spinach.Common.alert('Please select the destination type (\'Data URL\' or \'File URI\')');
                return;
            }
            var cameraOptions = {
                quality:75,
                destinationType:destinationType,
                sourceType:sourceType,
                allowEdit:true,
                encodingType:navigator.camera.EncodingType.JPEG,
                mediaType:navigator.camera.MediaType.PICTURE,
                correctOrientation:true,
                popoverOptions:{
                    //only relevant for iOS
                },
                saveToPhotoAlbum:false
            };
            var onGetPhotoSuccess = function (imageData) {
                var formattedImageData = (destinationType === navigator.camera.DestinationType.DATA_URL) ?
                    'data:image/jpeg;base64,' + imageData : imageData;
                $('#photoDisplay').attr('src', formattedImageData)
                    .css({
                        width:$(window).width() - 50
                    })
                    .show();
                $.mobile.changePage($('#showPhotoDialog'));
            };
            var onGetPhotoError = function (message) {
                console.log('navigator.camera.getPicture failed with message: ' + message);
            };
            navigator.camera.getPicture(onGetPhotoSuccess, onGetPhotoError, cameraOptions);
        }
    };
}(jQuery));

Spinach.ShowPhotoDialog = (function ($) {
    return {
        close:function () {
            $('#photoDisplay').attr('src', '').hide();
        }
    };
}(jQuery));

Spinach.QRCodeScanner = (function ($) {
    return {
        onScanSuccess:function (results) {
            Spinach.Common.alert('Scan result: ' + results[0]);
        },
        onScanCancel:function () {
            console.log('QR Code Scan canceled.');
        },
        scan:function () {
            ScanditSDK.scan(Spinach.QRCodeScanner.onScanSuccess,
                Spinach.QRCodeScanner.onScanCancel,
                "RGdrxgQ1EeKL/xUUWaD/JXoOqW06EAl13a1NJfBl5dU",
                {
                    'beep':true,
                    'qr':true,
                    'scanningHotspot':'0.5/0.5',
                    'vibrate':true,
                    'torch':true,
                    'titleMessage':'Scan the QR Code'
                }
            );
        }
    };
}(jQuery));

//Page specific initialize events
$(document).on("pageshow", "#map", function () {
    Spinach.Map.initialize();
});

//Document initialize events
$(document).ready(function () {
    $(document).on('deviceready', Spinach.Home.deviceReady);
    $(document).on('click', '#CurrentLocation', Spinach.Home.currentLocationClick);
    $(document).on('click', '#GetSpeedAndLocation', Spinach.Home.getSpeedAndLocation);
    $(document).on('click', '#GetAcceleration', Spinach.Home.getCurrentAcceleration);

    $(document).on('click', '#PlotSpecificLocationButton', Spinach.LocationDialog.plotSpecificLocationClick);

    $(document).on('click', '#startWatchButton', Spinach.AccelerationDialog.watchAcceleration);
    $(document).on('click', '#clearWatchButton', Spinach.Accelerometer.clearWatch);

    $(document).on('click', '#ScanQRCodeButton', Spinach.QRCodeScanner.scan);

    $(document).on('click', '#FromLibraryButton', Spinach.GetPhotoDialog.fromLibrary);
    $(document).on('click', '#FromCameraButton', Spinach.GetPhotoDialog.fromCamera);

    $(document).on('click', '#ShowPhotoCancelButton', Spinach.ShowPhotoDialog.close);
});