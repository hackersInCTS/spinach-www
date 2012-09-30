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
                    if (results[4]) {
                        return onSuccess(results[4].formatted_address);
                    }
                } else {
                    onError("reverseGeocode failed due to: " + status);
                }
            });
        }
    };
}(jQuery));

Spinach.GCM = (function ($) {
    return {
        gcmDeviceId:null,
        registerSuccess:function (obj) {
            console.log('Successfully registered. Waiting for GCM callback: ' + JSON.stringify(obj));
        },
        registerError:function (error) {
            console.log('Error in register: ' + JSON.stringify(error));
        },
        register:function () {
            window.GCM.register("237121290143",
                "Spinach.GCM.callback",
                Spinach.GCM.registerSuccess,
                Spinach.GCM.registerError);
        },
        callback:function (e) {
            console.log('GCM Event Received: ' + e.event);
            switch (e.event) {
                case 'registered':
                    // the definition of the e variable is json return defined in GCMReceiver.java
                    // In my case on registered I have EVENT and REGID defined
                    Spinach.Device.gcmDeviceId = e.regid;
                    if (Spinach.Device.gcmDeviceId.length > 0) {
                        console.log('Received GCM Device ID: ' + Spinach.Device.gcmDeviceId);
                        console.log('Calling \'Spinach.Device.add\' with empty APNS ID and valid GCM Device ID');
                        Spinach.Device.add('', e.regid);
                    }
                    break;
                case 'message':
                    // the definition of the e variable is json return defined in GCMReceiver.java
                    // In my case on registered I have EVENT, MSG and MSGCNT defined

                    // You will NOT receive any messages unless you build a HOST server application to send
                    // Messages to you, This is just here to show you how it might work
                    Spinach.Common.alert('Message: ' + e.message);
                    Spinach.Common.alert('Message Count: ' + e.msgcnt);
                    break;
                case 'error':
                    Spinach.Common.alert('Error: ' + e.msg);
                    break;
                default:
                    Spinach.Common.alert('An unknown event was received: ' + JSON.stringify(e));
                    break;
            }
        }

    };
}(jQuery));

Spinach.Common = (function ($) {
    return {
        alert:function (message) {
            try {
                navigator.notification.alert(message, $.noop, "Spinach");
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
            Parse.initialize("yMQl1IsnmiQZGS8TC1Y3mt4OQ05KwVxAZUvCvlD7", "qTKk5cT5J0xRifoYGm1BPyY9nE7jPWEkDSRA31aN");
            Spinach.Device.register();
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
            scanditSDK.scan(Spinach.QRCodeScanner.onScanSuccess,
                Spinach.QRCodeScanner.onScanCancel,
                "4ABoYAsrEeKA+T2bxul+mhOXR7pIOLby9vVmgFSTTOw",
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

Spinach.Capture = (function ($) {
    return {
        getFormatDataSuccess:function (mediaFileData) {
            console.log('Media File Data: ' + JSON.stringify(mediaFileData));
        },
        getFormatDataError:function (error) {
            console.log('Error in getFormatData function: ' + JSON.stringify(error));
        },
        captureAudioSuccess:function (mediaFile) {
            console.log('Media File: ' + JSON.stringify(mediaFile));
            mediaFile.getFormatData(Spinach.Capture.getFormatDataSuccess, Spinach.Capture.getFormatDataError);
        },
        captureAudioError:function (error) {
            console.log('Error in CaptureAudio function: ' + JSON.stringify(error));
        },
        captureAudio:function () {
            navigator.device.capture.captureAudio(
                Spinach.Capture.captureAudioSuccess,
                Spinach.Capture.captureAudioError,
                {
                    limit:1
                });
        }
    };
}(jQuery));

Spinach.Device = (function ($) {
    return {
        Class:Parse.Object.extend("SpinachDevice"),
        instance:null,
        getDeviceId:function () {
            return device.platform + "_" + device.name + "_" + device.uuid;
        },
        register:function () {
            var query = new Parse.Query(Spinach.Device.Class);
            query.equalTo('deviceId', Spinach.Device.getDeviceId());
            query.first({
                success:function (spinachDevice) {
                    if (spinachDevice) {
                        console.log('Successfully retrieved device...');
                        Spinach.Device.instance = spinachDevice;
                    } else {
                        console.log('Could not retrieve device... Registering with GCM before add...');
                        Spinach.GCM.register();
                    }
                },
                error:function (error) {
                    console.log('Error in find: ' + JSON.stringify(error));
                }
            });
        },
        add:function (apnsDeviceId, gcmDeviceId) {
            var spinachDevice = new Spinach.Device.Class();
            spinachDevice.save(
                {
                    deviceId:Spinach.Device.getDeviceId(),
                    name:device.name,
                    cordova:device.cordova,
                    platform:device.platform,
                    uuid:device.uuid,
                    version:device.version,
                    apnsDeviceId:apnsDeviceId,
                    gcmDeviceId:gcmDeviceId,
                    dateLastUsed:new Date()
                },
                {
                    success:function (spinachDevice) {
                        Spinach.Common.alert("Added device...");
                        Spinach.Device.instance = spinachDevice;
                    },
                    error:function (error) {
                        console.log('Error adding device: ' + JSON.stringify(error));
                    }
                });
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

    $(document).on('click', '#CaptureAudioButton', Spinach.Capture.captureAudio);
});