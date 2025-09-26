require('dotenv').config()
const path = require('path');
const webpack = require('webpack');

const config = {
    mode: 'development',
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
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
    node: {
        __dirname: false,
        __filename: false,
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.API_ID': JSON.stringify(process.env.API_ID),
            'process.env.API_HASH': JSON.stringify(process.env.API_HASH)
        })
    ]
};

module.exports = config;