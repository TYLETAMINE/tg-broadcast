const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = {
    mode: 'development',
    target: 'web',
    entry: './src/renderer/renderer.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'renderer.js',
    },
    resolve: {
        extensions: ['.ts', '.js', '.css'],
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
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/renderer/index.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: './src/renderer/style.css', to: './style.css' },
            ],
        }),
    ],
    devtool: 'source-map',
};

module.exports = config;