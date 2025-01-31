'use strict';

const autoprefixer = require('autoprefixer');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const BundleBuddyWebpackPlugin = require("bundle-buddy-webpack-plugin");
const ManifestPlugin = require('webpack-manifest-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const paths = require('./paths');
const getClientEnvironment = require('./env');

// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
const publicPath = paths.servedPath;
// Some apps do not use client-side routing with pushState.
// For these, "homepage" can be set to "." to enable relative asset paths.
const shouldUseRelativeAssetPaths = publicPath === './';
// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = true;
// `publicUrl` is just like `publicPath`, but we will provide it to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
const publicUrl = publicPath.slice(0, -1);
// Get environment variables to inject into our app.
const env = getClientEnvironment(publicUrl);

// Assert this just to be safe.
// Development builds of React are slow and not intended for production.
if (env.stringified['process.env'].NODE_ENV !== '"production"') {
  throw new Error('Production builds must have NODE_ENV=production.');
}

// Note: defined here because it will be used more than once.
const cssFilename = 'static/css/[name].[contenthash:8].css';

// ExtractTextPlugin expects the build output to be flat.
// (See https://github.com/webpack-contrib/extract-text-webpack-plugin/issues/27)
// However, our output is structured with css, js and media folders.
// To have this structure working with relative paths, we have to use custom options.
const extractTextPluginOptions = shouldUseRelativeAssetPaths
  ? // Making sure that the publicPath goes back to to build folder.
    { publicPath: Array(cssFilename.split('/').length).join('../') }
  : {};

// This is the production configuration.
// It compiles slowly and is focused on producing a fast and minimal bundle.
// The development configuration is different and lives in a separate file.
let config = {
    // Don't attempt to continue if there are any errors.
    bail: true,
    // We generate sourcemaps in production. This is slow but gives good results.
    // You can exclude the *.map files from the build during deployment.
    devtool: shouldUseSourceMap ? 'source-map' : false,
    // In production, we only want to load the polyfills and the app code.
    entry: [
        require.resolve('./polyfills'),
        paths.appIndexJs
    ],
    output: {
        // The build folder.
        path: paths.appBuild,
        // Generated JS file names (with nested folders).
        // There will be one main bundle, and one file per asynchronous chunk.
        // We don't currently advertise code splitting but Webpack supports it.
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
        // // We inferred the "public path" (such as / or /my-project) from homepage.
        publicPath: '/',
        // Point sourcemap entries to original disk location (format as URL on Windows)
        devtoolModuleFilenameTemplate: info =>
        path
            .relative(paths.appSrc, info.absoluteResourcePath)
            .replace(/\\/g, '/'),
    },
    resolve: {
            // These are the reasonable defaults supported by the Node ecosystem.
            // We also include JSX as a common component filename extension to support
            // some tools, although we do not recommend using it, see:
            // https://github.com/facebookincubator/create-react-app/issues/290
            // `web` extension prefixes have been added for better support
            // for React Native Web.
            extensions: ['.web.js', '.js', '.json', '.web.jsx', '.jsx']
    },
    module: {
        strictExportPresence: true,
        rules: [
            // first run eslint on src files
            // {
            //     test: /\.(js|jsx)$/,
            //     enforce: 'pre',
            //     use: [
            //     {
            //         options: {
            //             eslintPath: require.resolve('eslint'),
            //         },
            //         loader: require.resolve('eslint-loader'),
            //     },
            //     ],
            //     include: paths.appSrc,
            // },
            {
                oneOf: [
                // "url" loader works just like "file" loader but it also embeds
                // assets smaller than specified size as data URLs to avoid requests.
                {
                    test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                    loader: require.resolve('url-loader'),
                    options: {
                    limit: 10000,
                    name: 'static/media/[name].[hash:8].[ext]',
                    },
                },
                // Process JS with Babel.
                {
                    test: /\.(js|jsx)$/,
                    include: paths.appSrc,
                    loader: require.resolve('babel-loader')
                },
                // LESS
                {
                    test: /\.less$/,
                    loader: ExtractTextPlugin.extract(
                        Object.assign(
                            {
                                fallback: require.resolve('style-loader'),
                                use: [
                                    {
                                        loader: require.resolve('css-loader'),
                                        options: {
                                            importLoaders: 1,
                                            minimize: true,
                                            sourceMap: shouldUseSourceMap,
                                            modules: true,
                                            // localIdentName: '__[hash:base64:10]__',
                                        },
                                    },
                                    {
                                        loader: require.resolve('postcss-loader'),
                                        options: {
                                            ident: 'postcss',
                                            plugins: () => [
                                                require('postcss-flexbugs-fixes'),
                                                autoprefixer({
                                                    browsers: [
                                                        '>1%',
                                                        'last 4 versions',
                                                        'Firefox ESR',
                                                        'not ie < 9'
                                                    ],
                                                    flexbox: 'no-2009',
                                                }),
                                            ],
                                        },
                                    },
                                    require.resolve('less-loader')
                                ],
                            },
                            extractTextPluginOptions
                        )
                    )
                },
                // The notation here is somewhat confusing.
                // "postcss" loader applies autoprefixer to our CSS.
                // "css" loader resolves paths in CSS and adds assets as dependencies.
                // "style" loader normally turns CSS into JS modules injecting <style>,
                // but unlike in development configuration, we do something different.
                // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
                // (second argument), then grabs the result CSS and puts it into a
                // separate file in our build process. This way we actually ship
                // a single CSS file in production instead of JS code injecting <style>
                // tags. If you use code splitting, however, any async bundles will still
                // use the "style" loader inside the async code so CSS from them won't be
                // in the main CSS file.
                {
                    test: /\.scss$/,
                    loader: ExtractTextPlugin.extract(
                        Object.assign(
                            {
                                fallback: require.resolve('style-loader'),
                                use: [
                                    {
                                        loader: require.resolve('css-loader'),
                                        options: {
                                            importLoaders: 1,
                                            minimize: true,
                                            sourceMap: shouldUseSourceMap,
                                            modules: true,
                                            localIdentName: '__[hash:base64:10]__',
                                        },
                                    },
                                    {
                                        loader: require.resolve('postcss-loader'),
                                        options: {
                                            ident: 'postcss',
                                            plugins: () => [
                                                require('postcss-flexbugs-fixes'),
                                                autoprefixer({
                                                    browsers: [
                                                        '>1%',
                                                        'last 4 versions',
                                                        'Firefox ESR',
                                                        'not ie < 9'
                                                    ],
                                                    flexbox: 'no-2009',
                                                }),
                                            ],
                                        },
                                    },
                                    require.resolve('sass-loader')
                                ],
                            },
                            extractTextPluginOptions
                        )
                    )
                },
                {
                    test: /\.css$/,
                    loader: ExtractTextPlugin.extract(
                        Object.assign(
                            {
                                fallback: require.resolve('style-loader'),
                                use: [
                                    {
                                        loader: require.resolve('css-loader'),
                                        options: {
                                            importLoaders: 1,
                                            minimize: true,
                                            sourceMap: shouldUseSourceMap,
                                        },
                                    },
                                    {
                                        loader: require.resolve('postcss-loader'),
                                        options: {
                                            ident: 'postcss',
                                            plugins: () => [
                                                require('postcss-flexbugs-fixes'),
                                                autoprefixer({
                                                    browsers: [
                                                        '>1%',
                                                        'last 4 versions',
                                                        'Firefox ESR',
                                                        'not ie < 9'
                                                    ],
                                                    flexbox: 'no-2009',
                                                }),
                                            ],
                                        },
                                    },
                                ],
                            },
                            extractTextPluginOptions
                        )
                    )
                },
                // "file" loader makes sure assets end up in the `build` folder.
                // When you `import` an asset, you get its filename.
                // This loader doesn't use a "test" so it will catch all modules
                // that fall through the other loaders.
                {
                    loader: require.resolve('file-loader'),
                    // Exclude `js` files to keep "css" loader working as it injects
                    // it's runtime that would otherwise processed through "file" loader.
                    // Also exclude `html` and `json` extensions so they get processed
                    // by webpacks internal loaders.
                    exclude: [/\.js$/, /\.html$/, /\.json$/],
                    options: {
                    name: 'static/media/[name].[hash:8].[ext]',
                    },
                },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
            ],
        },
        ],
    },
    plugins: [
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin({
            inject: true,
            template: paths.appHtml,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            },
        }),
        // Makes some environment variables available to the JS code, for example:
        // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
        // It is absolutely essential that NODE_ENV was set to production here.
        // Otherwise React will be compiled in the very slow development mode.
        new webpack.DefinePlugin(env.stringified),
        // Minify the code.
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                drop_console: true,
                unused: true,
                dead_code: true,
                warnings: false,
                comparisons: false,
            },
            output: {
                comments: false,
                ascii_only: true,
            },
            sourceMap: shouldUseSourceMap,
        }),
        // Split all codes from node_modules folder into a seperate chunk
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendors',
            filename: 'static/js/vendors.[chunkhash:8].js',
            minChunks(module, count) {
                var context = module.context;
                return context && context.indexOf('node_modules') >= 0;
            },
        }),
        // async vendor chunks
        new webpack.optimize.CommonsChunkPlugin({
            async: true,
            minChunks(module, count) {
                return count >= 2;
            },
        }),
        // Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
        new ExtractTextPlugin({
            filename: cssFilename,
        }),
        // Generate a manifest file which contains a mapping of all asset filenames
        // to their corresponding output file so that tools can pick it up without
        // having to parse `index.html`.
        new ManifestPlugin({
            fileName: 'asset-manifest.json',
        }),
        // Generate a service worker script that will precache, and keep up to date,
        // the HTML & assets that are part of the Webpack build.
        new SWPrecacheWebpackPlugin({
            // By default, a cache-busting query parameter is appended to requests
            // used to populate the caches, to ensure the responses are fresh.
            // If a URL is already hashed by Webpack, then there is no concern
            // about it being stale, and the cache-busting can be skipped.
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: 'service-worker.js',
            logger(message) {
                if (message.indexOf('Total precache size is') === 0) {
                // This message occurs for every build and is a bit too noisy.
                return;
                }
                if (message.indexOf('Skipping static resource') === 0) {
                // This message obscures real errors so we ignore it.
                // https://github.com/facebookincubator/create-react-app/issues/2612
                return;
                }
                console.log(message);
            },
            minify: true,
            // For unknown URLs, fallback to the index page
            navigateFallback: publicUrl + '/index.html',
            // Ignores URLs starting from /__ (useful for Firebase):
            // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
            navigateFallbackWhitelist: [/^(?!\/__).*/],
            // Don't precache sourcemaps (they're large) and build asset manifest:
            staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
        }),

        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
    ],
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        dgram: 'empty',
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty',
    },
    externals: { Dygraph: 'Dygraph'}
};

if(process.env.ANALYZE) {
    config.plugins.push(
        // generate bundle reports
        new BundleAnalyzerPlugin()
    )
}

if(process.env.BUNDLE_BUDDY) {
    config.plugins.push(
        new BundleBuddyWebpackPlugin({sam: true})
    )
}

module.exports = config;
