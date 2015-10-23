var express     = require('express');
var app         = express();
var shopifyAPI  = require('shopify-node-api');
var $           = require('jQuery');
var request     = require('request');
var url         = require('url');
var fb          = require('fb');

// temp global to test changing the password
var newPassword = 'qwerty10';

var Shopify = new shopifyAPI({
    shop: 'arbor-natural',
    // use .env file for env vars with local heroku
    shopify_api_key: process.env.SHOPIFY_API_KEY,
    access_token: process.env.SHOPIFY_API_PASSWORD
});

app.set('port', (process.env.PORT || 5000));

app.get('/signin-with-facebook', function(request, response) {
    console.log("Request handler at root was called.");

    var url_parts = url.parse(request.url, true);
    var query = url_parts.query;

    var accessToken = query.access_token;
    fb.setAccessToken(accessToken);

    console.log('Welcome!  Fetching your information.... ');
    fb.api('/me', function(fbResponse) {
        console.log('WOOO======================================');
        console.log(fbResponse);
        console.log('Successful login for: ' + fbResponse.name);

        findCustomer('1742644675', function (data1) {
            var html = data1.body;

            console.log('CUSTOMER  DATA');
            console.log(data1);

            resetCustomerPassword('1742644675', function (data2) {
                console.log('PW RESET  DATA');
                console.log(data2);

                // createCustomer('newfirst1', 'newlast1', 'newfirst1@gmail.com', 'freefree', function(data) {
                //     response.writeHead(200, {"Content-Type": "application/json"});
                //     response.end(data);
                // });

                login('newfirst1@gmail.com', newPassword, function (data3) {
                    var html = data3.body;

                    console.log('data333333333333333333================================');
                    console.log(data3);
                    console.log('data333333333333333333================================');
                    console.log('data333333333333333333================================');
                    var loc = JSON.stringify(data3.response.headers.location);
                    console.log(loc);



                    if (html.indexOf('Invalid login credentials') !== -1) {
                        // invalid password - show a message to the user
                        console.log('INVALID PASSWORD');
                        response.writeHead(200, {"Content-Type": "application/json"});
                        response.end('IT DIDNT');
                    } else {
                        console.log('REDIRECTING AFTER LOGIN');
                        // var checkoutUrl = getCheckoutUrl();
                        // if (checkoutUrl) {
                        //     window.location.href = checkoutUrl;
                        // } else {
                        //     console.log('ERROR NO REDIRECT URL')
                        // }
                        response.writeHead(302, {
                            'Location': data3.response.headers.location
                            //add other headers here...
                        });
                        response.end();
                    }
                });
            });
        });
    });

    console.log('DONE GET FUNCTION');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function findCustomer(id, done) {
    Shopify.get('/admin/customers/' + id + '.json', function(err, data, headers) {
        // console.log(err);
        // console.log(data);
        // console.log(headers);

        var json = JSON.stringify({
            err: err,
            data: data,
            headers: headers
        });

        if (isFunction(done)) {
            done(json);
        }
    });
}

function resetCustomerPassword(id, done) {
    Shopify.put('/admin/customers/' + id + '.json', {
        "customer": {
            "password": newPassword,
            "password_confirmation": newPassword
        }
    }, function(err, data, headers) {
        // console.log(err);
        // console.log(data);
        // console.log(headers);

        var json = JSON.stringify({
            err: err,
            data: data,
            headers: headers
        });

        if (isFunction(done)) {
            done(json);
        }
    })
}

function createCustomer(firstName, lastName, email, password, done) {
    var postData = {
        "customer": {
            "first_name": firstName,
            "last_name": lastName,
            "email": email,
            "password": password,
            "password_confirmation": password,
            "send_email_welcome": false
        }
    };

    Shopify.post('/admin/customers.json', postData, function(err, data, headers){
        console.log(err);
        console.log(data);
        console.log(headers);

        var json = JSON.stringify({
            err: err,
            data: data,
            headers: headers
        });

        if (isFunction(done)) {
            done(json);
        }
    });
}

function login(email, password, done) {
    var data = {
        'customer[email]': email,
        'customer[password]': password,
        form_type: 'customer_login',
        utf8: '✓'
    };

    request({
        url: 'http://arbor-natural.myshopify.com/account/login', //URL to hit
        qs: '', //Query string data
        method: 'POST',
        //Lets post the following key/values as form
        form: data
    }, function(error, response, body){
        if (isFunction(done)) {
            done({
                error: error,
                response: response,
                body: body
            });
        }
    });
}

function getCheckoutUrl() {
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");

        var regex   = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    return getParameterByName('checkout_url');
}



