const FileSystem = require("fs")
const webpack = require("webpack");
const path = require("path");
const glob = require("glob");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const packages = require("./package.json");
const minimize = false;
const licenseText = FileSystem.readFileSync(path.resolve(__dirname, "license.txt"), "utf8");

module.exports = {
  mode: "development",

  entry: (() => {
    const e = {};
    glob.sync("./src/**/*.scss").forEach(v => {
      e[path.relative("./src", v).replace(/\.scss$/, "")] = path.resolve(__dirname, v);
    });
    return e;
  })(),

  output: {
    path: path.resolve(__dirname, "dist", packages.name),
    clean: true
  },

  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ],
      },
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),

    new webpack.BannerPlugin({
      banner: licenseText, 
      entryOnly: true,
      // NOTE : cela ne s’applique qu’aux JS. Les CSS auront besoin d’un autre traitement si tu veux que la licence soit en tête
    }),

    (function cleanupJsFile() {
      return {
        apply: compiler => {
          compiler.hooks.emit.tapAsync("RemoveJSChunks", (v, cb) => {
            Object.keys(v.assets)
              .filter(n => n.endsWith(".js"))
              .forEach(n => (delete v.assets[n]));
            cb();
          });
        }
      };
    })()
  ],

  optimization: {
    minimize,
    minimizer: [
      new CssMinimizerPlugin(),
    ],
  },

  resolve: {
    extensions: [
      ".scss"
    ]
  }

};
