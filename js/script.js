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
var Swoosh = Swoosh || {};

Swoosh.Common = (function ($) {
    return {
        alert:function (message) {
            try {
                navigator.notification.alert(message, $.noop, "Swoosh");
            }
            catch (e) {
                alert(message);
            }
        },
        getQueryStringValue:function (name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(window.location.search);
            if (results == null)
                return "";
            else
                return decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        adjustHeights:function (me) {
            var the_height = ($(window).height() - me.find('[data-role="header"]').height() - me.find('[data-role="footer"]').height());
            //me.height($(window).height());
            me.find('[data-role="content"]').height(the_height);
        },
        populateDropDown:function (dropdownId, items, selectedValue) {
            var dropdown = $(dropdownId);
            dropdown.find('option').remove();
            $(items).each(function (index, value) {
                    if (value === selectedValue) {
                        dropdown.append($("<option />").val(value).text(value)).attr('selected', true);
                    }
                    else {
                        dropdown.append($("<option />").val(value).text(value));
                    }
                }
            );
        }
    };
}(jQuery));

Swoosh.Home = (function ($) {
    return {
        deviceReady:function () {
            Parse.initialize("yMQl1IsnmiQZGS8TC1Y3mt4OQ05KwVxAZUvCvlD7", "qTKk5cT5J0xRifoYGm1BPyY9nE7jPWEkDSRA31aN");
            Swoosh.Device.register();
            var pushedMessage = Swoosh.Common.getQueryStringValue("jsonData");
            console.log(pushedMessage);
            if (pushedMessage !== "") {
                Swoosh.PushNotification.show(JSON.parse(pushedMessage).message);
            }
        },
        currentLocationClick:function () {
            $('#CurrentLocationFlag').val(true);
            Swoosh.Home.goToMapPage();
        },
        goToMapPage:function () {
            Swoosh.Map.resetMaps();
            $.mobile.changePage($('#map'));
        },
        getCurrentAcceleration:function () {
            var alertAcceleration = function (acceleration) {
                Swoosh.Common.alert('Acceleration X: ' + acceleration.x + '\n' +
                    'Acceleration Y: ' + acceleration.y + '\n' +
                    'Acceleration Z: ' + acceleration.z + '\n' +
                    'Timestamp     : ' + acceleration.timestamp + '\n');
            };
            var alertAccelerationError = function () {
                Swoosh.Common.alert('onError!');
            };
            Swoosh.Accelerometer.getAcceleration(alertAcceleration, alertAccelerationError);
        },
        getSpeedAndLocation:function () {
            Swoosh.Map.getSpeedAndLocation();
        }
    };
}(jQuery));

Swoosh.LocationDialog = (function ($) {
    return {
        plotSpecificLocationClick:function (e) {
            debugger;
            if ($('#currentAddress').val()) {
                Swoosh.Home.goToMapPage();
            } else {
                e.preventDefault();
            }
        }
    };
}(jQuery));

Swoosh.Map = (function ($) {
    return {
        initialize:function () {
            Swoosh.Map.getSpecificLocation();
        },
        resetMaps:function () {
            $('#mapPlotImg').attr('src', '');
            $('#LocationMarker').empty();
        },
        getSpecificLocation:function () {
            var userInput = $('#currentAddress').val();
            var onGeocodeSuccess = function (location) {
                var mapViewModel = new MapViewModel();
                mapViewModel.location = location.latitude + ', ' + location.longitude;
                mapViewModel.markers = [location.address];
                $('#LocationMarker').text(location.address);
                Swoosh.Map.plotMap(mapViewModel);
            };
            var onGeocodeError = function (mapViewModel) {
                return function (errorReason) {
                    console.log(errorReason);
                };
            };
            Swoosh.GoogleMaps.geocode(userInput, onGeocodeSuccess, onGeocodeError);
        },
        getCurrentPosition:function (onSuccess) {
            var onGetPositionError = function (error) {
                Swoosh.Common.alert('Code   : ' + error.code + '\n' +
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
//                    Swoosh.Map.plotMap(mapViewModel);
                    $('#currentAddress').val(resolvedCity);

                };
            };
            var onReverseGeocodeError = function (mapViewModel) {
                return function (errorReason) {
                    console.log(errorReason);
//                    Swoosh.Map.plotMap(mapViewModel);
                };
            };
            var onGetPositionSuccess = function (position) {
                var mapViewModel = new MapViewModel();
                var location = position.coords.latitude + ', ' + position.coords.longitude;
                $('#CurrentLocation').val(location.latitude + ', ' + location.longitude);
                mapViewModel.location = location;
                mapViewModel.markers = [location];
                Swoosh.GoogleMaps.reverseGeocode(position.coords.latitude,
                    position.coords.longitude,
                    onReverseGeocodeSuccess(mapViewModel),
                    onReverseGeocodeError(mapViewModel));
            };
            Swoosh.Map.getCurrentPosition(onGetPositionSuccess);
        },
        getSpeedAndLocation:function () {
            var onGetSpeedAndLocationSuccess = function (position) {
                Swoosh.Common.alert('Latitude : ' + position.coords.latitude + '\n' +
                    'Longitude: ' + position.coords.longitude + '\n' +
                    'Speed    : ' + position.coords.speed + '\n');
            };
            Swoosh.Map.getCurrentPosition(onGetSpeedAndLocationSuccess);
        },
        plotMap:function (mapViewModel) {
            $('#mapPlotImg').attr('src', mapViewModel.getMapUrl());
        }
    };
}(jQuery));

Swoosh.AccelerationDialog = (function ($) {
    return {
        watchAcceleration:function () {
            var interval = parseInt($('#interval :radio:checked').val(), 10);
            var options = { frequency:interval };
            var onSuccess = function (acceleration) {
                Swoosh.Common.alert('Acceleration X: ' + acceleration.x + '\n' +
                    'Acceleration Y: ' + acceleration.y + '\n' +
                    'Acceleration Z: ' + acceleration.z + '\n' +
                    'Timestamp: ' + acceleration.timestamp + '\n');
            };
            var onError = function (error) {
                Swoosh.Common.alert('error!');
            };
            if (interval) {
                $('#startWatchButton').hide();
                $('#clearWatchButton').show();
                Swoosh.Accelerometer.watchAcceleration(onSuccess, onError, options);
            }
        }
    };
}(jQuery));

Swoosh.GetPhotoDialog = (function ($) {
    return {
        fromLibrary:function () {
            Swoosh.GetPhotoDialog.getPhoto(navigator.camera.PictureSourceType.PHOTOLIBRARY);
        },
        fromCamera:function () {
            Swoosh.GetPhotoDialog.getPhoto(navigator.camera.PictureSourceType.CAMERA);
        },
        getPhoto:function (sourceType) {
            var destinationType,
                selectedDestinationType = $('#destinationType :radio:checked').val();
            if (selectedDestinationType === "0") {
                destinationType = navigator.camera.DestinationType.DATA_URL;
            } else if (selectedDestinationType === "1") {
                destinationType = navigator.camera.DestinationType.FILE_URI;
            } else {
                Swoosh.Common.alert('Please select the destination type (\'Data URL\' or \'File URI\')');
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

Swoosh.ShowPhotoDialog = (function ($) {
    return {
        close:function () {
            $('#photoDisplay').attr('src', '').hide();
        }
    };
}(jQuery));

Swoosh.QRCodeScanner = (function ($) {
    return {
        onScanSuccess:function (results) {
            console.log(results[0]);
            Swoosh.LossDetails.setScannedText(results[0]);
            $.mobile.changePage($('#lossDetail'));
        },
        onScanCancel:function () {
            console.log('QR Code Scan canceled.');
        },
        scan:function () {
            scanditSDK.scan(Swoosh.QRCodeScanner.onScanSuccess,
                Swoosh.QRCodeScanner.onScanCancel,
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

Swoosh.Capture = (function ($) {
    return {
        getFormatDataSuccess:function (mediaFileData) {
            console.log('Media File Data: ' + JSON.stringify(mediaFileData));
        },
        getFormatDataError:function (error) {
            console.log('Error in getFormatData function: ' + JSON.stringify(error));
        },
        captureAudioSuccess:function (mediaFile) {
            console.log('Media File: ' + JSON.stringify(mediaFile));
            mediaFile.getFormatData(Swoosh.Capture.getFormatDataSuccess, Swoosh.Capture.getFormatDataError);
        },
        captureAudioError:function (error) {
            console.log('Error in CaptureAudio function: ' + JSON.stringify(error));
        },
        captureAudio:function () {
            navigator.device.capture.captureAudio(
                Swoosh.Capture.captureAudioSuccess,
                Swoosh.Capture.captureAudioError,
                {
                    limit:1
                });
        }
    };
}(jQuery));

Swoosh.Capture.Image = (function ($) {
    var images = [];

    var thumbnailSize = function () {
        return ($(window).width() - 50) / 2;
    };

    var showImagePreview = function (ev) {
        $("#imagePreview").find("img").attr("src", $(ev.target).attr("src"));
    };

    var addToThumbnailContainer = function (imagePath) {
        var columnDiv;
        if (images.length % 2 === 1) {
            columnDiv = $("<div class='ui-block-a'></div>").appendTo("#thumbnailContainer");
        } else {
            columnDiv = $("<div class='ui-block-b'></div>").appendTo("#thumbnailContainer");
        }

        var anchor = $('<a data-rel="popup" data-position-to="window" data-transition="fade" href="#imagePreview"></a>').appendTo(columnDiv).on({ click:showImagePreview });
        $("<img>").appendTo(anchor).attr("src", imagePath).width(thumbnailSize());
    };

    var captureImageSuccess = function (imagePath) {
        images.push(imagePath);
        addToThumbnailContainer(imagePath);
    };

    var captureImageError = function (error) {
        alert('Error in capturing image : ' + JSON.stringify(error));
    };

    return {
        capturePhotoMain:function () {
            $.mobile.changePage($('#thumbnailImage'));
            Swoosh.Capture.Image.capturePhoto();
        },
        capturePhoto:function () {
            var imageOption = {
                quality:75,
                destinationType:navigator.camera.DestinationType.FILE_URI,
                sourceType:navigator.camera.PictureSourceType.CAMERA,
                allowEdit:true,
                encodingType:navigator.camera.EncodingType.JPEG,
                mediaType:navigator.camera.MediaType.PICTURE,
                correctOrientation:true,
                popoverOptions:{
                    //only relevant for iOS
                },
                saveToPhotoAlbum:false
            };

            navigator.camera.getPicture(captureImageSuccess,
                captureImageError, imageOption);
        },
        clearImages:function () {
            images = [];
        },
        getImages:function () {
            return images;
        }
    };
}(jQuery));

Swoosh.LossDetails = (function ($) {
    return {
        setScannedText:function (text) {
            var position = text.indexOf('?policyJson=') + 12;
            console.log(position.toString());
            var scannedText = text.substring(position, text.length);
            console.log(scannedText);
            Swoosh.LossDetails.populatePolicyData(scannedText);
        },
        populatePolicyData:function (scannedText) {
            var policyData = $.parseJSON(scannedText);
            $('#PolicyKey').text(policyData.PolicyKey);
            $('#VehicleMake').text(policyData.VehicleMake);
            $('#VehicleModel').text(policyData.VehicleModel);
            $('#VehicleVIN').text(policyData.VehicleVIN);
            $('#VehicleColor').text(policyData.VehicleColor);

            Swoosh.Common.populateDropDown('#select-choice-driver', policyData.Driver, policyData.PrimaryInsured);

            var d = new Date();
            var dayIndex = d.getDate() + "";
            var monthIndex = d.getMonth() + "";
            var yearIndex = d.getFullYear() + "";
            var hourIndex = d.getHours() + "";
            var minuteIndex = d.getMinutes() + "";

            $('#select-choice-day option:eq(' + dayIndex + ')').prop('selected', true);
            $('#select-choice-month option:eq(' + monthIndex + ')').prop('selected', true);
            $('#select-choice-year option[value="' + yearIndex + '"]').prop('selected', true);

            $('#select-choice-hour option[value="' + hourIndex + '"]').prop('selected', true);
            $('#select-choice-minute option[value="' + minuteIndex + '"]').prop('selected', true);
        },
        clearImages:function () {
            images = [];
        },
        getImages:function () {
            return images;
        }
    };
}(jQuery))

Swoosh.Accelerometer = (function ($) {
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

Swoosh.Device = (function ($) {
    return {
        Class:Parse.Object.extend("SwooshDevice"),
        instance:null,
        getDeviceId:function () {
            return device.platform + "_" + device.name + "_" + device.uuid;
        },
        registerQuerySuccess:function (spinachDevice) {
            if (spinachDevice) {
                console.log('Successfully retrieved device... Dummy save' + JSON.stringify(spinachDevice));
                spinachDevice.save({
                    success:function (spinachDevice) {
                        console.log('Successfully updated device...' + JSON.stringify(spinachDevice));
                        Swoosh.Device.instance = spinachDevice;
                        navigator.splashscreen.hide();
                    },
                    error:function (error) {
                        console.log('Error in update-date: ' + JSON.stringify(error));
                        navigator.splashscreen.hide();
                    }
                });
            } else {
                console.log('Could not retrieve device... Registering with GCM before add...');
                Swoosh.GCM.register();
            }
        },
        register:function () {
            var query = new Parse.Query(Swoosh.Device.Class);
            query.equalTo('deviceId', Swoosh.Device.getDeviceId());
            query.first({
                success:Swoosh.Device.registerQuerySuccess,
                error:function (error) {
                    console.log('Error in find: ' + JSON.stringify(error));
                    navigator.splashscreen.hide();
                }
            });
        },
        add:function (apnsDeviceId, gcmDeviceId) {
            var spinachDevice = new Swoosh.Device.Class();
            spinachDevice.save(
                {
                    deviceId:Swoosh.Device.getDeviceId(),
                    name:device.name,
                    cordova:device.cordova,
                    platform:device.platform,
                    uuid:device.uuid,
                    version:device.version,
                    apnsDeviceId:apnsDeviceId,
                    gcmDeviceId:gcmDeviceId
                },
                {
                    success:function (spinachDevice) {
                        console.log("Added device...: " + JSON.stringify(spinachDevice));
                        Swoosh.Device.instance = spinachDevice;
                        Swoosh.Common.alert('Added device to database...');
                        navigator.splashscreen.hide();
                    },
                    error:function (error) {
                        console.log('Error adding device: ' + JSON.stringify(error));
                        navigator.splashscreen.hide();
                    }
                });
        },
        remove:function () {
            Swoosh.Device.instance.destroy({
                success:function (spinachDevice) {
                    console.log('Device deleted successfully: ' + JSON.stringify(spinachDevice));
                },
                error:function (spinachDevice, error) {
                    console.log('Error deleting device: ' + JSON.stringify(error));
                }
            });
        }
    };
}(jQuery));

Swoosh.GoogleMaps = (function ($) {
    return {
        geocode:function (address, onSuccess, onError) {
            var geoCoder = new google.maps.Geocoder();
            geoCoder.geocode({ 'address':address }, function (results, status) {
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

Swoosh.PushNotification = (function ($) {
    return {
        show:function (message) {
            Swoosh.Common.alert(message);
        }
    };
}(jQuery));

Swoosh.GCM = (function ($) {
    return {
        gcmDeviceId:null,
        registerSuccess:function (obj) {
            console.log('Successfully registered. Waiting for GCM callback: ' + JSON.stringify(obj));
        },
        registerError:function (error) {
            console.log('Error in register: ' + JSON.stringify(error));
            navigator.splashscreen.hide();
        },
        register:function () {
            window.GCM.register("237121290143",
                Swoosh.GCM.registerSuccess,
                Swoosh.GCM.registerError);
        },
        unRegisterSuccess:function (obj) {
            console.log('Successfully unregistered. Waiting for GCM callback: ' + JSON.stringify(obj));
        },
        unRegisterError:function (error) {
            console.log('Error in unregister: ' + JSON.stringify(error));
        },
        unRegister:function () {
            Swoosh.Device.remove();
            window.GCM.unregister("237121290143",
                Swoosh.GCM.unRegisterSuccess,
                Swoosh.GCM.unRegisterError);
        },
        callback:function (e) {
            console.log('GCM Event Received: ' + e.event);
            switch (e.event) {
                case 'registered':
                    Swoosh.Device.gcmDeviceId = e.regid;
                    if (Swoosh.Device.gcmDeviceId.length > 0) {
                        console.log('Received GCM Device ID: ' + Swoosh.Device.gcmDeviceId);
                        console.log('Calling \'Swoosh.Device.add\' with empty APNS ID and valid GCM Device ID');
                        Swoosh.Device.add('', e.regid);
                    }
                    break;
                case 'unregistered':
                    console.log('Received confirmation on Unregister');
                    Swoosh.Common.alert('Unregistered device successfully.');
                    break;
                case 'message':
                    Swoosh.PushNotification.show(e.message);
                    break;
                case 'error':
                    Swoosh.Common.alert('Error: ' + e.msg);
                    break;
                default:
                    Swoosh.Common.alert('An unknown event was received: ' + JSON.stringify(e));
                    break;
            }
        }

    };
}(jQuery));

Swoosh.Navigation = (function ($) {
    return {
        showHideButtons:function (page) {
            $('div[data-role="navigation"]').each(function () {
                $(this).hide();
            });
            window.setTimeout(function () {
                page.find('div[data-role="navigation"]').css('top', ($(window).height() / 2)).show('slow');
            }, 500);
        },
        noBarCodeButton:function () {
            $.mobile.changePage($('#lossDetail'));
        },
        lossDetailForward:function () {
            if (Swoosh.Capture.Image.getImages().length) {
                $.mobile.changePage($('#thumbnailImage'));
            } else {
                $.mobile.changePage($('#addPhoto'));
            }
        },
        addPhotoBack:function () {
            $.mobile.changePage($('#lossDetail'));
        },
        addPhotoForward:function () {
            $.mobile.changePage($('#addAudio'));
        },
        thumbnailImageBack:function () {
            $.mobile.changePage($('#lossDetail'));
        },
        thumbnailImageForward:function () {
            $.mobile.changePage($('#addAudio'));
        },
        addAudioBack:function () {
            if (Swoosh.Capture.Image.getImages().length) {
                $.mobile.changePage($('#thumbnailImage'));
            } else {
                $.mobile.changePage($('#addPhoto'));
            }
        },
        addAudioForward:function () {
            $.mobile.changePage($('#summaryPage'));
        },
        summaryPageBack:function () {
            $.mobile.changePage($('#addAudio'));
        }
    };
}(jQuery));

Swoosh.Submit = (function ($) {
    return {
        send:function () {
            debugger;
            Parse.initialize("yMQl1IsnmiQZGS8TC1Y3mt4OQ05KwVxAZUvCvlD7", "qTKk5cT5J0xRifoYGm1BPyY9nE7jPWEkDSRA31aN");
            var LossDetails = Parse.Object.extend("LossDetails");
            var lossDetails = new LossDetails();
            lossDetails.save(
                {
                    DeviceId:Swoosh.Device.getDeviceId(),
                    PolicyKey:$('#PolicyKey').val(),
                    VehicleMake:$('#VehicleMake').text(),
                    VehicleModel:$('#VehicleModel').text(),
                    VehicleVIN:$('#VehicleVIN').text(),
                    VehicleColor:$('#VehicleColor').text(),
                    Driver:$('#select-choice-driver').val(),
                    PrimaryInsured:$('#select-choice-driver').val(),
                    LossDetailsText:"",
                    LossLocation:$('#CurrentLocation').val(),
                    LossDate:$('#select-choice-month').val() + "/" + $('#select-choice-day').val() + "/" + $('#select-choice-year').val(),
                    LossTime:$('#select-choice-hour').val() + ":" + $('#select-choice-minute').val(),
                    LossImages:[""],
                    LossAudio:""

                },
                {
                    success:function (lossDetailsInstance) {
                        alert("Thank you! Your claim information has been updated!");
                        $.mobile.changePage($('#index'));
                    },
                    error:function (error) {
                        alert("Oops! Sorry there was an error updating your claim information.");
                        $.mobile.changePage($('#index'));
                    }
                });
        },

    };
}(jQuery));


//Page specific initialize events
$(document).on("pageshow", "#map", function () {
    Swoosh.Map.initialize();
});

//Document initialize events
$(document).ready(function () {
    $(document).on('deviceready', Swoosh.Home.deviceReady);

    /* OLD STUFF
     $(document).on('click', '#CurrentLocation', Swoosh.Home.currentLocationClick);
     $(document).on('click', '#GetSpeedAndLocation', Swoosh.Home.getSpeedAndLocation);
     $(document).on('click', '#GetAcceleration', Swoosh.Home.getCurrentAcceleration);

     $(document).on('click', '#PlotSpecificLocationButton', Swoosh.LocationDialog.plotSpecificLocationClick);

     $(document).on('click', '#startWatchButton', Swoosh.AccelerationDialog.watchAcceleration);
     $(document).on('click', '#clearWatchButton', Swoosh.Accelerometer.clearWatch);

     $(document).on('click', '#FromLibraryButton', Swoosh.GetPhotoDialog.fromLibrary);
     $(document).on('click', '#FromCameraButton', Swoosh.GetPhotoDialog.fromCamera);

     $(document).on('click', '#ShowPhotoCancelButton', Swoosh.ShowPhotoDialog.close);

     $(document).on('click', '#CaptureAudioButton', Swoosh.Capture.captureAudio);

     $(document).on('click', '#UnregisterGCMButton', Swoosh.GCM.unRegister);
     */

    $(document).on('click', '#ScanButton', Swoosh.QRCodeScanner.scan);
    $(document).on('click', '#noBarCodeButton', Swoosh.Navigation.noBarCodeButton);

    $(document).on('click', '#MainAddPhotoButton', Swoosh.Capture.Image.capturePhotoMain);
    $(document).on('click', '#addImageButton', Swoosh.Capture.Image.capturePhoto);

    $(document).on('click', '#AddAudioButton', Swoosh.Capture.captureAudio);

    $(document).on('click', '#lossDetailForward', Swoosh.Navigation.lossDetailForward);
    $(document).on('click', '#addPhotoBack', Swoosh.Navigation.addPhotoBack);
    $(document).on('click', '#addPhotoForward', Swoosh.Navigation.addPhotoForward);
    $(document).on('click', '#thumbnailImageBack', Swoosh.Navigation.thumbnailImageBack);
    $(document).on('click', '#thumbnailImageForward', Swoosh.Navigation.thumbnailImageForward);
    $(document).on('click', '#addAudioBack', Swoosh.Navigation.addAudioBack);
    $(document).on('click', '#addAudioForward', Swoosh.Navigation.addAudioForward);
    $(document).on('click', '#summaryPageBack', Swoosh.Navigation.summaryPageBack);
    $(document).on('click', '#PlotMapAnchor', Swoosh.LocationDialog.plotSpecificLocationClick);
    $(document).on('click', '#SubmitButton', Swoosh.Submit.send);
    Swoosh.Map.getCurrentPositionAndGeocode();

});

$(document).delegate('div[data-role="page"]', 'pageshow', function () {
    Swoosh.Navigation.showHideButtons($(this));
    //Swoosh.Common.adjustHeights($(this));
});

$(document).bind('backbutton', function (e) {
    e.preventDefault();
}, true);

$(document).bind("mobileinit", function () {
    $.mobile.defaultPageTransition = "none";
});

$(window).bind('orientationchange', function () {
    Swoosh.Navigation.showHideButtons($.mobile.activePage);
    //Swoosh.Common.adjustHeights($.mobile.activePage);
});