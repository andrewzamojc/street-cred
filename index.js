var express     = require('express');
var app         = express();
var shopifyAPI  = require('shopify-node-api');
var request     = require('request');
var url         = require('url');
var FB          = require('fb');
var Q           = require('q');
var Parse       = require('parse/node');

var Shopify = new shopifyAPI({
    shop: 'arbor-natural',
    // use .env file for env vars with local heroku
    shopify_api_key: process.env.SHOPIFY_API_KEY,
    access_token: process.env.SHOPIFY_API_PASSWORD
});

Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
var ParseCustomer = Parse.Object.extend("Customer");



app.set('port', (process.env.PORT || 5000));

app.get('/signin-with-facebook', function(request, response) {
    console.log("/signin-with-facebook was called");

    var accessToken = getQueryParamValue(request.url, 'access_token');

    FB.setAccessToken(accessToken);

    var facebookProfile = null;
    var customer = null;
    var randomPassword = getRandomPassword();

    getCustomerFacebookData()
    .then(function(data) {
        facebookProfile = data;
        return getCustomerIdByFacebookId(data.id);
    })
    .then(function (customerId) {
        if (!customerId) {
            customer = {
                facebookId: facebookProfile.id,
                firstName: facebookProfile.first_name,
                lastName: facebookProfile.last_name,
                email: facebookProfile.email // need a check for this property
            };
            return  createCustomer(customer.firstName, customer.lastName, customer.email, customer.facebookId, randomPassword)
                    .then(function(result) {
                        console.log(JSON.stringify(result.data));
                        return addCustomerToParse(result.data.customer.id, customer.facebookId);
                    });
        } else {
            return  getCustomerById(customerId)
                    .then(function(foundCustomer) {
                        customer = foundCustomer;
                        return resetCustomerPassword(customerId, randomPassword);
                    });
        }
    })
    .then(function(response) {
        return loginCustomer(customer.email, randomPassword);
    })
    .then(function success(data) {
        console.log('redirect customer to shop');
        //console.log(data);
        var sid = getQueryParamValue(data.res.headers.location, 'sid');
        response.writeHead(302, {
            'Location': 'http://arbornatural.com/pages/refer?sid=' + sid
        });
        response.end();
    }, function error(data) {
        response.writeHead(500, {"Content-Type": "application/json"});
        console.log('ERROR');
        console.log(JSON.stringify(data));
        response.end(data);
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


// auth flow functions

function getCustomerFacebookData() {
    var deferred = Q.defer();

    FB.api('/me?fields=email,first_name,last_name', function(response) {
        console.log('FB DATA');
        // console.log(response);
        deferred.resolve(response);
    });
    return deferred.promise;
}

function getCustomerIdByFacebookId(facebookId) {
    var query    = new Parse.Query(ParseCustomer);

    query.equalTo("facebookId", facebookId);
    return query.first().then(function(result) {
        if (!result || !result.get) {
            return;
        }
        return result.get('shopifyCustomerId');
    });
}

function addCustomerToParse(shopifyCustomerId, facebookId) {
    var newCustomer = new ParseCustomer();
    newCustomer.set('shopifyCustomerId', shopifyCustomerId.toString());
    newCustomer.set('facebookId', facebookId);
    return newCustomer.save();
}

function getCustomerById(customerId) {
    var deferred = Q.defer();
    Shopify.get('/admin/customers/' + customerId + '.json', function(err, data, headers) {
        var response = {
            err: err,
            data: data,
            headers: headers
        };
        if (err) {
            deferred.reject(response);
        } else if(!data || !data.customer) {
            response.err = 'Query did not return a customer';
            deferred.reject(response);
        } else {
            console.log('CUSTOMER DATA');
            deferred.resolve(data.customer);
        }
    });
    return deferred.promise;
}

function resetCustomerPassword(customerId, newPassword) {
    var deferred = Q.defer();
    Shopify.put('/admin/customers/' + customerId + '.json', {
        "customer": {
            "password": newPassword,
            "password_confirmation": newPassword
        }
    }, function(err, data, headers) {
        var response = {
            err: err,
            data: data,
            headers: headers
        };

        console.log(JSON.stringify(data));

        // console.log(response);
        deferred.resolve(response);
    });
    return deferred.promise;
}

function createCustomer(firstName, lastName, email, facebookId, password) {
    var deferred = Q.defer();
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

    console.log('CREATING CUSTOMER');
    Shopify.post('/admin/customers.json', postData, function(err, data, headers){
        var response = {
            err: err,
            data: data,
            headers: headers
        };

        if (err) {
            deferred.reject(response);
        }
        deferred.resolve(response);
    });
    return deferred.promise;
}

function loginCustomer(email, password) {
    var deferred = Q.defer();
    var data = {
        'customer[email]': email,
        'customer[password]': password,
        form_type: 'customer_login',
        utf8: '✓'
    };

    request({
        url: 'http://arbornatural.com/account/login', //URL to hit
        qs: '', //Query string data
        method: 'POST',
        //Lets post the following key/values as form
        form: data
    }, function(error, res, body){
        var response = {
            error: error,
            res: res,
            body: body
        };

        if (body.indexOf('Invalid login credentials') !== -1) {
            // invalid password - show a message to the user
            response.message = 'Invalid Password';
            deferred.reject(response);
        } else {
            console.log('LOGIN DATA');
            // console.log(response);
            deferred.resolve(response);
        }
    });
    return deferred.promise;
}



// ===============================================================

function getQueryParamValue(givenUrl, queryParamKey) {
    var urlParts = url.parse(givenUrl, true);
    var query    = urlParts.query;
    return query[queryParamKey];
}

function getRandomPassword() {
    // need better algorithm here, maybe a guid is good enough?
    return Math.floor((Math.random() * 100000000) + 1);
}
