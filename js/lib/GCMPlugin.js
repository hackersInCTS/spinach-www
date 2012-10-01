var GCM = function () {

};

GCM.prototype.register = function (senderID, successCallback, failureCallback) {
    return cordova.exec(
        successCallback,
        failureCallback,
        'GCMPlugin',
        'register',
        [
            { senderID:senderID }
        ]);
};

GCM.prototype.unregister = function (successCallback, failureCallback) {
    return cordova.exec(
        successCallback,
        failureCallback,
        'GCMPlugin',
        'unregister',
        [
            { }
        ]);
};
window.GCM = new GCM();
