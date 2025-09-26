const path = require('path');
const webpack = require('webpack');

const config = {
    mode: 'development',
    target: 'electron-preload',
    entry: './src/preload/preload.ts',
    output: {
        path: path.resolve(__dirname, 'dist/preload'),
        filename: 'preload.js',
        libraryTarget: 'commonjs2'
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                },
            },
        ],
    },
    externals: {
        electron: 'commonjs electron'
    }
};

module.exports = config;