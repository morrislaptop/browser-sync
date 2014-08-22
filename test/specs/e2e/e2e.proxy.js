"use strict";

var browserSync = require("../../../index");

var http        = require("http");
var connect     = require("connect");
var serveStatic = require("serve-static");
var _           = require("lodash");
var request     = require("supertest");
var assert      = require("chai").assert;
var client      = require("socket.io-client");
var portScanner = require("portscanner-plus");

describe("E2E proxy test", function () {

    var instance, stubServer;

    before(function (done) {

        portScanner.getPorts(1).then(function (ports) {

            var config = {
                proxy: "localhost:" + ports[0],
                debugInfo: false,
                open: false
            };

            var testApp = connect()
                .use(serveStatic(__dirname + "/../../fixtures"));

            // server to proxy
            stubServer = http.createServer(testApp).listen(ports[0]);

            instance = browserSync.init([], config, done);
        });
    });

    after(function () {
        instance.cleanup();
        stubServer.close();
    });

    it("can init proxy & serve a page", function (done) {

        assert.isString(instance.options.snippet);
        assert.isDefined(instance.server);

        request(instance.server)
            .get("/index-large.html")
            .set("accept", "text/html")
            .expect(200)
            .end(function (err, res) {
                assert.isTrue(_.contains(res.text, "browser-sync-client"));
                done();
            });
    });

    it("Can proxy websockets", function(done){

        var called;
        instance.io.sockets.on("connection", function (client) {
            if (!called) {
                called = true;
                done();
            }
        });

        var clientSockets = client.connect(instance.options.urls.local, {"force new connection": true});

        clientSockets.emit("shane", {name:"shane"});
    });

    it("Can serve the script", function (done) {

        request(instance.server)
            .get(instance.options.scriptPaths.versioned)
            .expect(200)
            .end(function (err, res) {
                assert.isTrue(_.contains(res.text, "Connected to BrowserSync"));
                done();
            });
    });

    it("Can serve files with snippet added", function (done) {
        request(instance.options.urls.local)
            .get("/")
            .set("accept", "text/html")
            .expect(200)
            .end(function (err, res) {
                assert.isTrue(_.contains(res.text, instance.options.snippet));
                done();
            });
    });
});
