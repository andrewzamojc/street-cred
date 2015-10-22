var express     = require('express');
var app         = express();
var shopifyAPI  = require('shopify-node-api');


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    console.log("Request handler at root was called.");

    // API KEYS AND SECRET IN CODE
    // POTENTIAL SECURITY RISK WHEN STORE IS LIVE?

    var Shopify = new shopifyAPI({
            shop: 'arbor-natural', // MYSHOP.myshopify.com
            shopify_api_key: '3b207321ad5149095622b128806166cc', // Your API key
            access_token: 'b56d7404b510820527ef520c1958a5ae' // Your API Password
        });

    var postData = {
        "customer": {
            "first_name": "first11",
            "last_name": "last11",
            "email": "firstlast11@gmail.com"
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

        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(json);
    });

    console.log('DONE');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

