var path = require('path');
var webpack = require('webpack');
var pkg = require('./package.json');
var name = 'grapesjs-preset-newsletter';
var auth = require('basic-auth');
var env = process.env.WEBPACK_ENV;
var plugins = [];

var settings = {
  host: 'localhost',
  port: 8083,
  login:'admin', 
  pass:'password',
  apiKey: '', 
  domainName: '',
};

if(env !== 'dev'){
  plugins.push(new webpack.optimize.UglifyJsPlugin({ compressor: { warnings: false } }));
  plugins.push(new webpack.BannerPlugin(pkg.name + ' - ' + pkg.version));
}

if(!settings.apiKey || !settings.domainName){
  throw new Error('Enter MailGun API key and domain name in webpack.config.js');
}

module.exports = {
  entry: './src',
  output: {
      filename: './dist/' + name + '.min.js',
      library: name,
      libraryTarget: 'umd',
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      include: /src/,
      exclude: /node_modules/
    }],
  },
  externals: {'grapesjs': 'grapesjs'},
  devServer: {
    before: function(app, server) {
      app.all('*', function (req, res, next) {
        if (settings.login && settings.pass) {
          var credentials = auth(req)

          if (!credentials || credentials.name !== settings.login || credentials.pass !== settings.pass) {
            res.statusCode = 401
            res.setHeader('WWW-Authenticate', 'Basic realm="Prototype Access"')
            res.end('Access denied')
          } else {
            next()
          }
        } else {
          next()
        }
      })
    },
    contentBase: '.', 
    publicPath: '.', 
    host: settings.host,
    port: settings.port,
    hot: true,
    proxy: { 
      '/api': {
        target: `https://api.mailgun.net`,
        pathRewrite: {'^/api' : '/v3/'+settings.domainName+'/templates'},
        changeOrigin: true,
        logLevel: 'debug',
        onProxyReq(proxyReq, req) {
          proxyReq.setHeader('Authorization', 'Basic '+btoa('api:'+settings.domainName));
        },
        selfHandleResponse: true,
        onProxyRes(proxyRes, req, res) {
          console.log('proxyResproxyResproxyRes');

          let originalBody = new Buffer('');
          proxyRes.on('data', function (data) {
            originalBody = Buffer.concat([originalBody, data]);
          });
          proxyRes.on('end', function () {
            const bodyString = originalBody;
            let objectToModify = JSON.parse(bodyString)
            if(objectToModify.template && objectToModify.template.version && objectToModify.template.version.template)
              res.end(JSON.stringify({html:objectToModify.template.version.template}));
            else
            res.end(bodyString);
          });
        }
      }
    }
  },
  plugins: plugins
};
