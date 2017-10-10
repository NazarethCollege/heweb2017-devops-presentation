var isProd = process.env.TWEETHEAT_ENV == 'prod';
var version = process.env.TWEETHEAT_VERSION;

var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var plugins = [];
plugins.push(
  new ExtractTextPlugin('tweetheat.bundle.' + version + '.css', {
        allChunks: true
  })
);
plugins.push(
    new HtmlWebpackPlugin({
        title: 'Tweetheat'
    })
);

module.exports = {
    watch: !isProd,
    progress: !isProd,
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
    },
    entry: './app.tsx',
    output: {
        path: '../../build/',
        filename: 'tweetheat.bundle.' + version + '.js'
    },
    ts: {
        configFileName: './tsconfig.json',
        transpileOnly: true
    },
    plugins: plugins,
    externals:[{
        xmlhttprequest: '{XMLHttpRequest:XMLHttpRequest}'
    }],
    module: {
        loaders: [
            { test: /\.tsx$/, loader: 'ts-loader' },
            { test: /\.scss$/, loader: ExtractTextPlugin.extract('css-loader!sass-loader') },            
            { test: /\.(png|jpg|jpeg|gif|woff)$/, loader: 'url-loader' }            
        ]
    }
 };